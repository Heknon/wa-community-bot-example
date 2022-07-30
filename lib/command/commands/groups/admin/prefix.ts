import {WASocket} from "@adiwajshing/baileys";
import {BlockedReason} from "../../../../blockable";
import {Chat} from "../../../../chats";
import {chatRepository, messagingService} from "../../../../constants/services";
import {Message} from "../../../../message";
import {GroupLevel} from "../../../../models";
import CommandTrigger from "../../../command_trigger";
import InteractableCommand from "../../../interactable_command";
import languages from "../../../../constants/language.json";

export default class PrefixCommand extends InteractableCommand {
    private language: typeof languages.commands.prefix[Language];

    constructor(language: Language) {
        const langs = languages.commands.prefix;
        const lang = langs[language];
        super({
            triggers: langs.triggers.map((e) => new CommandTrigger(e)),
            announcedAliases: lang.triggers,
            usage: lang.usage,
            category: lang.category,
            description: lang.description,
            groupLevel: GroupLevel.Admin,
        });

        this.language = lang;
    }

    async execute(client: WASocket, chat: Chat, message: Message, body?: string) {
        const newPrefix = body?.trim();
        if (!newPrefix) {
            return messagingService.reply(message, this.language.execution.no_content);
        } else if (newPrefix.length > 10) {
            return messagingService.reply(message, this.language.execution.too_long);
        }

        await chatRepository.update(chat.model.jid, {$set: {command_prefix: newPrefix}});
        chat.updatePrefix(newPrefix);

        return messagingService.reply(message, this.language.execution.success, true, {
            placeholder: {
                custom: new Map([["prefix", newPrefix]]),
            },
        });
    }

    async onBlocked(data: Message, blockedReason: BlockedReason) {
        if (blockedReason === BlockedReason.InsufficientGroupLevel) {
            await messagingService.reply(data, this.language.execution.only_admin, true);
        }
        return "";
    }
}
