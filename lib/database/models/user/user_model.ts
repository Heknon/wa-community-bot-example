import {ObjectId} from "bson";
import {Reputation} from ".";
import {ChatLevel} from "../../../chats";
import {Balance} from "../../../economy";
import {InventoryItem} from "../inventory";
import {DeveloperLevel} from "./developer_level";
import config from "../../../config.json";

export default class UserModel {
    public readonly _id: ObjectId;
    public readonly jid: string;
    public readonly name: string | undefined;

    public readonly chatLevel: ChatLevel;
    public readonly developerLevel: DeveloperLevel;
    public readonly cooldowns: Map<string, Map<string, number>>;
    public readonly reputation: Reputation;
    public readonly balance: Balance;
    public readonly inventory: InventoryItem[];
    public readonly bankCapacity: number;
    public readonly metadata: Map<string, any>;

    constructor(
        _id: ObjectId,
        jid: string,
        name: string | undefined,
        chatLevel: ChatLevel,
        developerLevel: DeveloperLevel,
        cooldowns: Map<string, Map<string, number>>,
        reputation: Reputation,
        balance: Balance,
        inventory: InventoryItem[],
        bankCapacity: number,
        metadata: Map<string, any>,
    ) {
        this._id = _id;
        this.jid = jid;
        this.name = name;
        this.chatLevel = chatLevel;
        this.developerLevel = developerLevel;
        this.cooldowns = cooldowns;
        this.reputation = reputation;
        this.inventory = inventory;
        this.balance = balance;
        this.bankCapacity = bankCapacity;
        this.metadata = metadata;
    }

    public toMap() {
        return {
            _id: this._id,
            jid: this.jid,
            name: this.name,
            chat_level: this.chatLevel,
            developer_level: this.developerLevel,
            cooldowns: this.cooldowns,
            reputation: this.reputation.toMap(),
            balance: this.balance.toMap(),
            inventory: this.inventory.map((item) => item.toMap()),
            bank_capacity: this.bankCapacity,
            metadata: this.metadata,
        };
    }

    public static fromMap(map: Map<string, object>) {
        return new UserModel(
            map["_id"],
            map["jid"],
            map["name"],
            map["chat_level"] ?? 0,
            map["developer_level"] ?? 0,
            map["cooldowns"] ?? new Map(),
            map["reputation"] ? Reputation.fromMap(map["reputation"]) : new Reputation(0, []),
            map["balance"] ? Balance.fromMap(map["balance"]) : new Balance(0, 0),
            map["inventory"] ? map["inventory"].map((item) => InventoryItem.fromMap(item)) : [],
            map["bank_capacity"] ?? config.bank_start_capacity,
            new Map(Object.entries(map["metadata"] ?? {})),
        );
    }
}
