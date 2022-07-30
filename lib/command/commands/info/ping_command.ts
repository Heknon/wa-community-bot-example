import {WASocket} from "@adiwajshing/baileys";
import {BlockedReason} from "../../../blockable/blocked_reason";
import {Chat, ChatLevel} from "../../../chats";
import {messagingService} from "../../../constants/services";
import Message from "../../../message/message";
import Command from "../../command";
import CommandTrigger from "../../command_trigger";
import languages from "../../../constants/language.json";

export default class PingCommand extends Command {
    private language: typeof languages.commands.ping[Language];

    constructor(language: Language) {
        const langs = languages.commands.ping;
        const lang = langs[language];
        super({
            triggers: langs.triggers.map((e) => new CommandTrigger(e)),
            announcedAliases: lang.triggers,
            usage: lang.usage,
            category: lang.category,
            description: lang.description,
            cooldowns: new Map([
                [ChatLevel.Free, 500],
                [ChatLevel.Premium, 250],
                [ChatLevel.Sponsor, 0],
            ]),
        });

        this.language = lang;
    }

    async onBlocked(msg: Message, blockedReason: BlockedReason) {}

    async execute(client: WASocket, chat: Chat, msg: Message, body: string) {
        const time = Math.abs(Date.now() - Number(msg.raw!.messageTimestamp!) * 1000);
        await messagingService.reply(msg, this.language.execution.success_message, true, {
            placeholder: {
                custom: new Map([["time", time.toString()]]),
            },
        });
    }
}
