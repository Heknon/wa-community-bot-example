import {
    AnyMessageContent,
    isJidGroup,
    MiscMessageGenerationOptions,
    proto,
    WAMessage,
    WASocket,
} from "@adiwajshing/baileys";
import {assert} from "console";
import {ObjectId} from "mongodb";
import {createImportSpecifier} from "typescript";
import Message from "./message/message";
import Metadata from "./database/models/metadata";
import User from "./user/user";
import {Command} from "./command";
import {Chat} from "./chats";
import {whatsappBot} from ".";
import {applyPlaceholders} from "./utils/message_utils";
import moment from "moment";
import {logger} from "./constants/logger";

export type Placeholder = {
    chat?: Chat;
    message?: Message;
    user?: User;
    command?: Command;
    custom?: Map<string, string> | {[key: string]: string};
};

export default class MessagingService {
    private client: WASocket | undefined;
    private metadataEnabled: boolean;
    private metadataAssignment: Map<string, Metadata>;
    private messageCallbacks: [
        callbackId: ObjectId,
        filter: (message: Message) => Promise<boolean> | boolean,
        callback: (message: Message) => Promise<any> | any,
    ][];

    private sentMessagesCache: Map<string, proto.IMessage> = new Map();

    private _shouldIgnore: boolean = false;

    constructor(client?: WASocket, metadataEnabled: boolean = true) {
        this.client = client;
        this.metadataAssignment = new Map();
        this.messageCallbacks = [];
        this.metadataEnabled = metadataEnabled;

        setInterval(() => {
            // clear references in sentMessagesCache
            this.sentMessagesCache.clear();
        }, 1000 * 60 * 2);
    }

    /**
     * must be ran in order to have messaging services enabled
     * @param message raw message from socket
     * @returns message model with metadata
     */
    public async messageInterceptor(message: WAMessage): Promise<Message> {
        let metadata: Metadata | undefined;
        if (this.metadataEnabled) {
            metadata = this.metadataAssignment.get(message.key.id!);
            this.metadataAssignment.delete(message.key.id!);
        }

        const msg = await Message.fromWAMessage(message, metadata);
        for (const callbackData of this.messageCallbacks) {
            const [callbackId, filter, callback] = callbackData;
            if (await filter(msg)) {
                await callback(msg);
                this.removeMessageCallback(callbackId);
            }
        }

        return msg;
    }

    public async reply(
        message: Message,
        content: string,
        quote: boolean = false,
        {
            privateReply = false,
            metadata,
            placeholder,
        }: {
            privateReply?: boolean;
            metadata?: Metadata;
            placeholder?: Placeholder;
        } = {},
    ) {
        return await this.replyAdvanced(message, {text: content}, quote, {privateReply, metadata, placeholder});
    }

    public async replyAdvanced(
        message: Message,
        content: AnyMessageContent,
        quote: boolean = false,
        {
            privateReply = false,
            metadata,
            placeholder,
        }: {
            privateReply?: boolean;
            metadata?: Metadata;
            placeholder?: Placeholder;
        } = {},
    ) {
        if (quote) {
            message.raw!.key.fromMe = false;
        }

        let recipient: string;
        if (isJidGroup(message.to)) {
            recipient = privateReply ? message.from : message.to;
        } else {
            recipient = message.fromMe ? message.to : message.from;
        }

        return this._internalSendMessage(
            recipient,
            content,
            {quoted: quote ? message.raw ?? undefined : undefined},
            metadata,
            placeholder,
        );
    }

    public async sendMessage(
        recipient: string,
        content: AnyMessageContent,
        options?: MiscMessageGenerationOptions,
        {
            metadata,
            placeholder,
        }: {
            metadata?: Metadata;
            placeholder?: Placeholder;
        } = {},
    ) {
        return this._internalSendMessage(recipient, content, options, metadata, placeholder);
    }

    private async _internalSendMessage(
        recipient: string,
        content: AnyMessageContent,
        options?: MiscMessageGenerationOptions,
        metadata?: Metadata,
        placeholder?: Placeholder,
    ): Promise<Message> {
        try {
            assert(this.client, "Client must be set using setClient() method!");

            if (metadata) {
                metadata.meta.set("ignore", this._shouldIgnore);
            } else {
                metadata = new Metadata(new Map<string, any>([["ignore", this._shouldIgnore]]));
            }

            if (options?.quoted) {
                options.quoted.key.fromMe = false;
            }

            const text = (content as any).text;
            const caption = (content as any).caption;
            if (text != undefined && text.length > 0)
                (content as any).text = await applyPlaceholders(text, placeholder);
            if (caption != undefined && caption.length > 0)
                (content as any).caption = await applyPlaceholders(caption, placeholder);

            const response = await this.client!.sendMessage(recipient, content, options);
            if (response && response.message)
                this.sentMessagesCache.set(`${response.key.remoteJid}-${response.key.id}`, response.message);

            if (this.metadataEnabled && metadata) {
                this.metadataAssignment.set(response?.key.id!, metadata);
            }

            return Message.fromWAMessage(response!, metadata);
        } catch (error) {
            logger.error("FAILED TO SEND MESSAGE", content, options, error);
            const response = await this.client!.sendMessage(recipient, {text: "Failed to send this message."}, options);
            return Message.fromWAMessage(response!, metadata);
        }
    }

    public getSentMessage(jid: string | undefined, id: string): proto.IMessage | undefined {
        return this.sentMessagesCache.get(`${jid ? `${jid}-` : ""}${id}`);
    }

    public addMessageCallback(
        filter: (message: Message) => boolean | Promise<boolean>,
        callback: (message: Message) => Promise<any> | any,
    ) {
        const id = new ObjectId();
        this.messageCallbacks.push([id, filter, callback]);
        return id;
    }

    public removeMessageCallback(id: ObjectId) {
        this.messageCallbacks = this.messageCallbacks.filter((e) => e[0] != id);
    }

    public setClient(client: WASocket) {
        this.client = client;
    }

    public setIgnoreMode(flag: boolean) {
        this._shouldIgnore = flag;
    }
}
