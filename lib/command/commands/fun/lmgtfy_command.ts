import {proto, WASocket} from "@adiwajshing/baileys";
import url from "node:url";
import {Chat} from "../../../chats";
import {messagingService} from "../../../constants/services";
import Message from "../../../message/message";
import {DeveloperLevel} from "../../../database/models/user/developer_level";
import Command from "../../command";
import CommandTrigger from "../../command_trigger";
import {BlockedReason} from "../../../blockable";
import languages from "../../../constants/language.json";

export default class LmgtfyCommand extends Command {
    private language: typeof languages.commands.lmgtfy[Language];

    constructor(language: Language) {
        const langs = languages.commands.lmgtfy;
        const lang = langs[language];
        super({
            triggers: langs.triggers.map((e) => new CommandTrigger(e)),
            announcedAliases: lang.triggers,
            usage: lang.usage,
            category: lang.category,
            description: lang.description,
            extendedDescription: lang.extended_description,
        });

        this.language = lang;
    }

    private readonly base_link = "https://lmgtfy.app/?q=";

    async execute(client: WASocket, chat: Chat, message: Message, body?: string) {
        if (!body) {
            return await messagingService.reply(message, this.language.execution.no_body, true);
        }

        const link = url.format(this.base_link + body + "&iie=1");
        await messagingService.reply(message, this.language.execution.message, true, {
            placeholder: {chat, custom: new Map([["link", link]])},
        });
    }

    onBlocked(data: Message, blockedReason: BlockedReason) {}
}
