import {WASocket} from "@adiwajshing/baileys";
import {Chat} from "../../../../chats";
import {messagingService} from "../../../../constants/services";
import Message from "../../../../message/message";
import Command from "../../../command";
import CommandTrigger from "../../../command_trigger";
import {GroupLevel} from "../../../../models";
import {BlockedReason} from "../../../../blockable";
import languages from "../../../../constants/language.json";

export default class EveryoneCommand extends Command {
    private language: typeof languages.commands.everyone[Language];
    public languageData: typeof languages.commands.everyone;
    public languageCode: Language;

    constructor(language: Language) {
        const langs = languages.commands.everyone;
        const lang = langs[language];
        super({
            triggers: langs.triggers.map((e) => new CommandTrigger(e)),
            announcedAliases: lang.triggers,
            usage: lang.usage,
            category: lang.category,
            description: lang.description,
            groupLevel: GroupLevel.Admin,
            blockedChats: ["dm"],
            extendedDescription: lang.extended_description,
        });

        this.languageData = langs;
        this.language = lang;
        this.languageCode = language;
    }

    async execute(client: WASocket, chat: Chat, message: Message, body?: string) {
        const group = await client.groupMetadata(message.to);

        const mentions = group.participants.map((participant) => participant.id);
        const quoted = (await message.getQuoted()) ? (await message.getQuoted())?.raw ?? message.raw : message.raw;

        messagingService.sendMessage(
            message.to,
            {
                text: this.language.execution.success,
                mentions: mentions,
            },
            {quoted: quoted ?? undefined},
            {
                placeholder: {
                    chat,
                    command: this,
                    custom: new Map([["tags", mentions.map((mention) => `@${mention.split("@")[0]}`).join(" ")]]),
                },
            },
        );
    }

    onBlocked(data: Message, blockedReason: BlockedReason) {
        switch (blockedReason) {
            case BlockedReason.InsufficientGroupLevel:
                return messagingService.reply(data, this.language.execution.only_admin, true);
            case BlockedReason.BlockedChat:
                return messagingService.reply(data, this.language.execution.only_group);
            default:
                return;
        }
    }
}
