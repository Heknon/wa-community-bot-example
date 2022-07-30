import ItemModel from "../../database/models/items/item_model";
import {Message} from "../../message";
import User from "../../user/user";

export default abstract class Item {
    public readonly model: ItemModel;

    constructor(model: ItemModel) {
        this.model = model;
    }

    public abstract onUse(activatingJid: string, message?: Message): any | Promise<any>;

    public static async fromModel(model: ItemModel): Promise<Item | undefined> {
        throw 'Not implemented';
    }
}
