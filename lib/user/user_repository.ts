import {isJidUser, jidDecode} from "@adiwajshing/baileys";
import {Document, ObjectId, ReturnDocument, UpdateFilter, WithId} from "mongodb";
import {ChatLevel} from "../chats";
import {usersCollection} from "../database";
import {DeveloperLevel, UserModel} from "../database/models";
import {Reputation} from "../database/models/user";
import {Balance} from "../economy";
import {normalizeJid} from "../utils/group_utils";
import User from "./user";
import config from "../config.json";
import {logger} from "../constants/logger";

export default class UserRepository {
    private repository: Map<string, User> = new Map<string, User>();

    public async get(jid: string, update: boolean = false): Promise<User | undefined> {
        let user: User | undefined = this.repository[jid];

        if (update || !user) {
            user = await this.fetch(jid);
        }

        if (user) this.updateLocal(user);
        return user;
    }

    public async update(jid: string | undefined, update: any): Promise<User | undefined> {
        if (!jid) return;
        jid = normalizeJid(jid);

        if (!jid || !isJidUser(jid)) return;

        if (!this.repository.has(jid)) {
            const user = await this.fetch(jid);
            if (user) this.updateLocal(user);
        }

        let user = this.repository.get(jid);
        if (!user) return;
        if (!update || update.size === 0) return user;

        const res = await usersCollection.findOneAndUpdate({jid}, update, {returnDocument: ReturnDocument.AFTER});
        if (res.ok) {
            const model = res.value
                ? UserModel.fromMap(res.value as WithId<Map<string, object>>) ?? undefined
                : undefined;
            if (model) {
                user.model = model;
            }

            return user;
        }

        const model = (await this.fetch(jid)) ?? undefined;
        if (model) user.model = model.model;
        return user;
    }

    public async getAll(update: boolean = false): Promise<Array<User>> {
        if (!update) return Array.from(this.repository.values());

        await this.fetchAll();
        return Array.from(this.repository.values());
    }

    public async fetch(jid: string | undefined): Promise<User | undefined> {
        if (!jid) return;
        jid = normalizeJid(jid);

        if (!jid || !isJidUser(jid)) return;

        let doc = await usersCollection.findOne<Map<string, object>>({jid});
        if (!doc) return;
        const model = UserModel.fromMap(doc);
        let user = this.repository.get(jid);
        if (!user) {
            user = new User(model);
            await user.init();
        } else user.model = model;

        this.updateLocal(user);
        return user;
    }

    private async fetchAll(): Promise<Array<User> | undefined> {
        const docs = usersCollection.find<Map<string, object>>({});
        if (!docs) return undefined;
        const result: Array<User> = [];

        const repository: Map<string, User> = new Map<string, User>();
        const promises: Promise<any>[] = [];
        for await (const doc of docs) {
            const user = new User(UserModel.fromMap(doc));
            promises.push(user.init());
            repository.set(user.model.jid, user);
            result.push(user);
        }

        await Promise.all(promises);

        this.repository = repository;
        return result;
    }

    public async create(model: UserModel): Promise<User | undefined> {
        try {
            logger.verbose(`Creating user`, {jid: model.jid});
            await usersCollection.insertOne(model.toMap());
            logger.verbose(`User created`, {jid: model.jid});

            const user = new User(model);
            await user.init();
            logger.verbose(`Created user has been initailized`, {jid: model.jid});
            this.updateLocal(user);
            return user;
        } catch (err) {
            logger.error('ATTEMPTED TO CREATE USER BUT ALREADY EXISTS', {jid: model.jid});
            logger.error(err);
        }
    }

    public async simpleCreate(jid: string, pushName?: string) {
        const model = new UserModel(
            new ObjectId(),
            jid,
            pushName,
            ChatLevel.Free,
            DeveloperLevel.None,
            new Map(),
            new Reputation(0, []),
            new Balance(0, 0),
            [],
            config.bank_start_capacity,
            new Map(),
        );

        return await this.create(model);
    }

    public updateLocal(user: User): User {
        this.repository.set(user.model.jid, user);
        return user;
    }
}
