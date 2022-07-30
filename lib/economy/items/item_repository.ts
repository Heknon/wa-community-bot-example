import {ObjectId} from "mongodb";
import {itemsCollection} from "../../database";
import {ItemModel} from "../../database/models/items";
import Item from "./item";

export default class ItemRepository {
    private items: Map<string, Item>;
    private _initialized: boolean = false;
    public get initialized() {
        return this._initialized;
    }

    constructor() {
        this.items = new Map();
        this.getAll(true).then(() => {
            this._initialized = true;
        });
    }

    async get(id: ObjectId | string, update: boolean = false): Promise<Item | undefined> {
        const standardizedId = this.standardizeId(id);

        let item = this.items.get(standardizedId);
        if (update || !item) {
            item = await this.fetch(id);
        }

        if (item) this.updateLocal(item);
        else this.items.delete(standardizedId);

        return item;
    }

    async fetch(id: ObjectId | string): Promise<Item | undefined> {
        const standardizedId = this.standardizeId(id);

        const doc = await itemsCollection.findOne<Map<string, any>>({_id: standardizedId});
        if (!doc) return;

        const itemModel = ItemModel.fromMap(doc);
        if (!itemModel) return;

        return Item.fromModel(itemModel);
    }

    async getAll(update: boolean = false): Promise<Array<Item>> {
        if (!update) return Array.from(this.items.values());

        for await (const item of this.fetchAll()) {
            this.updateLocal(item);
        }

        return Array.from(this.items.values());
    }

    async *fetchAll(): AsyncIterableIterator<Item> {
        const cursor = itemsCollection.find<Map<string, any>>({});
        while (await cursor.hasNext()) {
            const doc = await cursor.next();
            if (!doc) continue;
            const itemModel = ItemModel.fromMap(doc);
            if (!itemModel) continue;

            const item = await Item.fromModel(itemModel);
            if (!item) continue;

            yield item;
        }
    }

    private updateLocal(item: Item): void {
        this.items.set(item.model._id.toString(), item);
    }

    private standardizeId(id: ObjectId | string): string {
        return typeof id === "string" ? id : id.toString();
    }
}
