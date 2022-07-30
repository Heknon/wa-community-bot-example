import moment from "moment";
import {Command} from "../command";
import {itemRepository, userRepository} from "../constants/services";
import {UserModel} from "../database/models";
import {RandomSeed, create as createRandom} from "random-seed";
import crypto from "crypto";
import {ItemModel} from "../database/models/items";
import {Item} from "../economy";

export default class User {
    public model: UserModel;
    private _random: RandomSeed | undefined;
    private _inventory: [Item, number][] | undefined;

    constructor(model: UserModel) {
        this.model = model;
    }

    public async init() {
        // initialize user inventory
        await this.getInventory();
    }

    public async addCooldown(jid: string, command: Command) {
        const cooldowns = this.model.cooldowns;
        const commandCooldowns = cooldowns[jid] ?? new Map<string, number>();
        commandCooldowns[command.mainTrigger.command] = Date.now();
        cooldowns[jid] = commandCooldowns;

        // update user cooldowns in database
        return await userRepository.update(this.model.jid, {$set: {cooldowns}});
    }

    /**
     * checks if the user has a cooldown for the given command
     * @param command The command to check for
     * @returns true if the user has a cooldown for the given command and false otherwise
     */
    public hasCooldown(command: Command) {
        return command.cooldowns.get(this.model.chatLevel) !== undefined;
    }

    public timeTillCooldownEnd(jid: string, command: Command) {
        const cooldowns = this.model.cooldowns;
        const commandCooldowns = cooldowns[jid] ?? new Map<string, number>();
        const cooldownEnd =
            (commandCooldowns[command.mainTrigger.command] ?? 0) + (command.cooldowns.get(this.model.chatLevel) ?? 0);
        return Math.max(0, cooldownEnd - Date.now());
    }

    public getDefaultingName(fallback?: string) {
        return this.getFullDefaultingName(fallback)?.split(" ")[0];
    }

    public getFullDefaultingName(fallback?: string) {
        return this.model.name ?? fallback;
    }

    async calculateNetBalance() {
        const bal = this.model.balance;
        const inventory = await this.getInventory();
        return (
            bal.bank + bal.wallet + inventory.reduce((acc, [item, quantity]) => acc + item.model.value * quantity, 0)
        );
    }

    public get random(): RandomSeed {
        if (this._random === undefined) {
            this._random = createRandom(this.generateSeedFromUser(this));
        }

        return this._random;
    }

    public async getInventory(): Promise<[Item, number][]> {
        if (this._inventory !== undefined) return this._inventory;
        const invModel = this.model.inventory;

        const inv: [Item, number][] = [];
        for (const item of invModel) {
            const fetchedItem = await itemRepository.get(item.item.toString());
            if (!fetchedItem) continue;
            inv.push([fetchedItem, item.quantity]);
        }

        this._inventory = inv;
        return inv;
    }

    private generateSeedFromUser(user: User) {
        // generate a hash seed based on user using crypto
        const hash = crypto.createHash("sha256");
        hash.update(user.model.jid + user.model._id.toString() + Date.now().toString());
        return hash.digest("hex");
    }
}
