import {WASocket} from "@adiwajshing/baileys";
import {Chat} from "../../../../chats";
import {messagingService} from "../../../../constants/services";
import Message from "../../../../message/message";
import Command from "../../../command";
import CommandTrigger from "../../../command_trigger";
import {GroupLevel} from "../../../../models";
import {getGroupPrivilegeMap} from "../../../../utils/group_utils";
import {BotClient} from "../../../../bot/whatsapp_bot";
import {BlockedReason} from "../../../../blockable";
import languages from "../../../../constants/language.json";

export default class DeleteCommand extends Command {
    private language: typeof languages.commands.delete[Language];

    constructor(language: Language) {
        const langs = languages.commands.delete;
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

    async execute(client: WASocket, chat: Chat, message: Message, body: string) {
        const raw = message.raw!;
        const quoted = await message.getQuoted();
        if (!quoted) {
            return messagingService.reply(message, this.language.execution.no_reply, true);
        }

        if (quoted?.from != BotClient.currentClientId) {
            return messagingService.reply(message, this.language.execution.not_from_bot, true);
        }

        try {
            await client.sendMessage(raw.key.remoteJid!, {delete: quoted.raw?.key!});
        } catch (err) {
            return messagingService.reply(message, this.language.execution.failed, true);
        }
    }

    onBlocked(data: Message, blockedReason: BlockedReason) {
        switch (blockedReason) {
            case BlockedReason.InsufficientGroupLevel:
                return messagingService.reply(data, this.language.execution.only_admin, true);
            default:
                return;
        }
    }
}
