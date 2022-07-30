import { ObjectId, ReturnDocument, WithId } from "mongodb";
import { messagesCollection } from "../database";
import { MessageModel } from "../database/models";
import Message from "./message";

export default class MessageRepository {
    private repository: Map<string, Message> = new Map<string, Message>();

    public async get(id: string, update: boolean = false): Promise<Message | undefined> {
        let message: Message | undefined = this.repository[id];

        if (update || !message) {
            message = await this.fetch(id)
        }

        if (message) this.updateLocal(message);
        return message;
    }

    public async update(
        id: string | undefined,
        update: any,
    ): Promise<Message | undefined> {
        if (!id) return;

        if (!this.repository.has(id)) {
            const chat = await this.fetch(id);
            if (chat) this.updateLocal(chat);
        }

        let message = this.repository.get(id);
        if (!message) return;
        if (!update || update.size === 0) return message;

        const res = await messagesCollection.findOneAndUpdate({ jid: id }, update, { returnDocument: ReturnDocument.AFTER });
        if (res.ok) {
            const model = res.value ? MessageModel.fromMap(res.value as WithId<Map<string, object>>) ?? undefined : undefined;
            if (model) {
                message.model = model;
            }

            return message;
        }

        const model = (await this.fetch(id)) ?? undefined;
        if (model) message.model = model.model;
        return message;
    }

    public async getAll(update: boolean = false): Promise<Array<Message>> {
        if (!update) return Array.from(this.repository.values());

        await this.fetchAll();
        return Array.from(this.repository.values());
    }

    public async fetch(id: string | undefined): Promise<Message | undefined> {
        if (!id) return;

        let doc = await messagesCollection.findOne<Map<string, object>>({ id })
        if (!doc) return;
        const model = MessageModel.fromMap(doc);
        let message = this.repository.get(id);
        if (!message) message = new Message(model);
        else message.model = model;

        this.updateLocal(message);
        return message;
    }

    public async fetchMany(...ids: Array<ObjectId | undefined>): Promise<Message[]> {
        if (ids.length == 0) return [];

        let docs = messagesCollection.find<Map<string, object>>({ "_id": { "$in": ids } })
        if (!docs) return [];
        const result: Message[] = [];
        for await (const doc of docs) {
            const message = new Message(MessageModel.fromMap(doc));
            result.push(message)
            this.updateLocal(message)
        }

        return result;
    }

    private async fetchAll(): Promise<Array<Message> | undefined> {
        const docs = messagesCollection.find<Map<string, object>>({})
        if (!docs) return undefined;
        const result: Array<Message> = [];

        const repository: Map<string, Message> = new Map<string, Message>();
        for await (const doc of docs) {
            const message = new Message(MessageModel.fromMap(doc));
            repository.set(message.id, message);
            result.push(message);
        }

        this.repository = repository;
        return result;
    }


    public async create(model: MessageModel): Promise<Message> {
        await messagesCollection.insertOne(model.toMap());

        const message = new Message(model);
        this.updateLocal(message);
        return message;
    }

    public updateLocal(message: Message): Message {
        this.repository.set(message.id, message);
        return message;
    }
}