import {ObjectId} from "mongodb";

export default class InventoryItem {
    public readonly item: ObjectId;
    public readonly quantity: number;

    constructor(item: ObjectId, quantity: number) {
        this.item = item;
        this.quantity = quantity;
    }

    public toMap(): Map<string, any> {
        return new Map(
            Object.entries({
                item: this.item,
                quantity: this.quantity,
            }),
        );
    }

    public static fromMap(map: Map<string, any>) {
        return new InventoryItem(map["item"], map["quantity"]);
    }
}
