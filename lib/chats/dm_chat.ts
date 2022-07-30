import { Chat } from ".";
import { ChatModel } from "../database/models";

export default class DMChat extends Chat {
    constructor(
        model: ChatModel,
    ) {
        super(model);
    }
}