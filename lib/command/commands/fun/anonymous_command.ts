import {AnyMessageContent, WASocket} from "@adiwajshing/baileys";
import {Chat, ChatLevel} from "../../../chats";
import {chatRepository, messagingService, userRepository} from "../../../constants/services";
import Message from "../../../message/message";
import Command from "../../command";
import CommandTrigger from "../../command_trigger";
import {BlockedReason} from "../../../blockable";
import languages from "../../../constants/language.json";

export default class AnonymousCommand extends Command {
    private language: typeof languages.commands.anonymous[Language];

    constructor(language: Language) {
        const langs = languages.commands.anonymous;
        const lang = langs[language];
        super({
            triggers: langs.triggers.map((e) => new CommandTrigger(e)),
            announcedAliases: lang.triggers,
            chatLevel: ChatLevel.Premium,
            usage: lang.usage,
            category: lang.category,
            description: lang.description,
            extendedDescription: lang.extended_description,
        });

        this.language = lang;
    }

    async execute(client: WASocket, chat: Chat, message: Message, body?: string) {
        if (!message.mediaPath && !body) {
            return await messagingService.reply(message, this.language.execution.no_content, true, {
                placeholder: {command: this, chat, message},
            });
        }

        const splitData = body?.split(" ") ?? [];
        let number = splitData.shift();
        number = number
            ?.replace(/-/g, "")
            ?.replace(/(?<=\d\d\d) /, "")
            ?.replace("+", "");
        if (number?.startsWith("0")) number = "972" + number.substring(1);
        if (number) number += "@s.whatsapp.net";
        if (!number) {
            return await messagingService.reply(message, this.language.execution.no_number, true, {
                placeholder: {command: this, chat, message},
            });
        }

        let content = splitData.join(" ");
        if (!message.media && content.length === 0) {
            return await messagingService.reply(message, this.language.execution.no_content, true);
        }

        const existsRes = await client.onWhatsApp(number);
        if (!existsRes || existsRes.length == 0 || !existsRes[0].exists) {
            return await messagingService.reply(message, this.language.execution.no_whatsapp, true);
        }

        const sendToJid = existsRes[0].jid;
        const sentToChat = await chatRepository.get(sendToJid, true);
        const sentToUser = await userRepository.get(sendToJid, true);
        if (!sentToUser) {
            return await messagingService.reply(message, this.language.execution.not_bot_user, true);
        }

        const sentToLanguage = languages.commands.anonymous[sentToChat?.model.language ?? "english"];
        content = `${sentToLanguage.execution.received_title}\n${content}`;
        const media = await message.media;
        const msg: AnyMessageContent = media ? {caption: content, image: media} : {text: content.trim()};
        await messagingService.sendMessage(sendToJid, msg);
        await messagingService.reply(message, this.language.execution.success, true);
    }

    async onBlocked(msg: Message, blockedReason: BlockedReason) {
        // if chat level is not high enough, say that a membership is required
        if (blockedReason == BlockedReason.InsufficientChatLevel) {
            return await messagingService.reply(msg, this.language.execution.membership, true);
        }
    }
}
