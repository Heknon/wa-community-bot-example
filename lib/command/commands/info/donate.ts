import {WASocket} from "@adiwajshing/baileys";
import {BlockedReason} from "../../../blockable/blocked_reason";
import {Chat} from "../../../chats";
import {messagingService} from "../../../constants/services";
import Message from "../../../message/message";
import Command from "../../command";
import CommandTrigger from "../../command_trigger";
import languages from "../../../constants/language.json";

export default class DonateCommand extends Command {
    private language: typeof languages.commands.donate[Language];

    constructor(language: Language) {
        const langs = languages.commands.donate;
        const lang = langs[language];
        super({
            triggers: langs.triggers.map((e) => new CommandTrigger(e)),
            announcedAliases: lang.triggers,
            category: lang.category,
            description: lang.description,
        });

        this.language = lang;
    }

    async onBlocked(msg: Message, blockedReason: BlockedReason) {}

    async execute(client: WASocket, chat: Chat, msg: Message, body: string) {
        await messagingService.reply(msg, this.language.execution.text, true, {
            placeholder: this.getDefaultPlaceholder({chat, message: msg})
        });
    }
}
