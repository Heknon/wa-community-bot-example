import {WASocket} from "@adiwajshing/baileys";
import {BlockedReason} from "../../../blockable/blocked_reason";
import {Chat} from "../../../chats";
import {messagingService} from "../../../constants/services";
import Message from "../../../message/message";
import Command from "../../command";
import CommandTrigger from "../../command_trigger";
import languages from "../../../constants/language.json";
import config from "../../../config.json";

export default class CodeCommand extends Command {
    private language: typeof languages.commands.code[Language];

    constructor(language: Language) {
        const langs = languages.commands.code;
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
        await messagingService.reply(
            msg,
            config.github_repo +
                "\n\nכרגע לא ניתן לצפות בקוד בגלל שיקולים מסוימים... כנראה שיהיה אפשר בעתיד.\nנעשה שימוש ב: https://github.com/adiwajshing/Baileys",
            true,
        );
    }
}
