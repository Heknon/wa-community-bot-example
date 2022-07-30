import {ObjectId} from "mongodb";
import {ItemCategory} from "./item_category";

export default class ItemModel {
    public readonly _id: ObjectId;
    public readonly category: ItemCategory;
    public readonly name: string;
    public readonly id: string;
    public readonly value: number;

    constructor(_id: ObjectId, category: ItemCategory, name: string, id: string, value: number) {
        this._id = _id;
        this.category = category;
        this.name = name;
        this.id = id;
        this.value = value;
    }

    public toMap(): Map<string, any> {
        return new Map(
            Object.entries({
                _id: this._id,
                category: this.category,
                name: this.name,
                id: this.id,
                value: this.value,
            }),
        );
    }

    public static fromMap(map: Map<string, any>) {
        return new ItemModel(map["_id"], map["category"], map["name"], map["id"], map["value"]);
    }
}
