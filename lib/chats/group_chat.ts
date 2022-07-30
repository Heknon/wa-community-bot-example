import { Chat } from ".";
import { ChatModel } from "../database/models";

export default class GroupChat extends Chat {
    constructor(
        model: ChatModel,
    ) {
        super(model);
    }
}