import { Chat } from "../chats";
import { ChatLevel } from "../database/models/user/chat_level";
import { DeveloperLevel } from "../database/models/user/developer_level";
import { GroupLevel } from "../models/group_level";
import { BlockedReason } from "./blocked_reason";
import Triggerable from "./triggerable";

/**
 * @template In data received from block
 */
export default interface Blockable<In> {
    triggers: Array<Triggerable<any>>;

    blockedChats: Array<"group" | "dm">

    chatLevel: ChatLevel;

    groupLevel: GroupLevel;

    developerLevel: DeveloperLevel;

    blacklistedJids: Array<string>;

    whitelistedJids: Array<string>;

    onBlocked(data: In, blockedReason: BlockedReason): Promise<any> | any;
}

export abstract class EmptyBlockable<In> implements Blockable<In> {
    triggers: Array<Triggerable<any>> = [];

    blockedChats: Array<"group" | "dm"> = [];

    chatLevel: ChatLevel = ChatLevel.Free;

    developerLevel: DeveloperLevel = DeveloperLevel.None;

    groupLevel: GroupLevel = GroupLevel.None;

    blacklistedJids: Array<string> = [];

    whitelistedJids: Array<string> = [];

    abstract onBlocked(data: In, blockedReason: BlockedReason): Promise<any> | any;
}