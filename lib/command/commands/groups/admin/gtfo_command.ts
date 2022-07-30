import {isJidGroup, WASocket} from "@adiwajshing/baileys";
import {Chat} from "../../../../chats";
import {messagingService} from "../../../../constants/services";
import Message from "../../../../message/message";
import Command from "../../../command";
import CommandTrigger from "../../../command_trigger";
import {GroupLevel} from "../../../../models";
import {BlockedReason} from "../../../../blockable";
import languages from "../../../../constants/language.json";

export default class GtfoCommand extends Command {
    private language: typeof languages.commands.gtfo[Language];

    constructor(language: Language) {
        const langs = languages.commands.gtfo;
        const lang = langs[language];
        super({
            triggers: langs.triggers.map((e) => new CommandTrigger(e)),
            announcedAliases: lang.triggers,
            usage: lang.usage,
            category: lang.category,
            description: lang.description,
            groupLevel: GroupLevel.Admin,
            blockedChats: ["dm"],
        });

        this.language = lang;
    }

    async execute(client: WASocket, chat: Chat, message: Message, body: string) {
        if (!isJidGroup(message.to)) {
        }

        await messagingService.reply(message, this.language.execution.success, true);
        return await client.groupLeave(message.to);
    }

    onBlocked(data: Message, blockedReason: BlockedReason) {
        switch (blockedReason) {
            case BlockedReason.InsufficientGroupLevel:
                return messagingService.reply(data, this.language.execution.only_admin, true);
            case BlockedReason.BlockedChat:
                return messagingService.reply(data, this.language.execution.only_group, true);
            default:
                return;
        }
    }
}
