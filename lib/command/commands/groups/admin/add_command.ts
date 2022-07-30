import {WASocket} from "@adiwajshing/baileys";
import {Chat} from "../../../../chats";
import {messagingService} from "../../../../constants/services";
import Message from "../../../../message/message";
import Command from "../../../command";
import CommandTrigger from "../../../command_trigger";
import vCard from "vcard-parser";
import {GroupLevel} from "../../../../models";
import {getGroupPrivilegeMap} from "../../../../utils/group_utils";
import {BotClient} from "../../../../bot/whatsapp_bot";
import {BlockedReason} from "../../../../blockable";
import languages from "../../../../constants/language.json";
import { logger } from "../../../../constants/logger";
import { isJidUser } from "@adiwajshing/baileys/lib/WABinary/jid-utils";

export default class AddCommand extends Command {
    private language: typeof languages.commands.add[Language];

    constructor(language: Language) {
        const langs = languages.commands.add;
        const lang = langs[language];
        super({
            triggers: langs.triggers.map((e) => new CommandTrigger(e)),
            announcedAliases: lang.triggers,
            usage: lang.usage,
            category: lang.category,
            description: lang.description,
            blockedChats: ['dm'],
            groupLevel: GroupLevel.Admin,
        });

        this.language = lang;
    }

    async execute(client: WASocket, chat: Chat, message: Message, body?: string) {
        const adminMap = await getGroupPrivilegeMap(client, message.to);
        const iAmAdmin: boolean = adminMap[BotClient.currentClientId!] > 0;

        if (!iAmAdmin) {
            return await messagingService.reply(message, this.language.execution.bot_no_admin, true);
        }

        let vcards =
            message.raw!.message?.extendedTextMessage?.contextInfo?.quotedMessage?.contactMessage?.vcard ||
            message.raw!.message?.extendedTextMessage?.contextInfo?.quotedMessage?.contactsArrayMessage?.contacts!.map(
                (contact) => contact.vcard,
            ) ||
            [];

        if (vcards.length > 0) {
            const allNumbers = new Set<string>();
            if (vcards && typeof vcards == typeof "") {
                vcards = [vcards as string];
            }

            (vcards as string[]).forEach(async (vcard) => {
                const vc = vCard.parse(vcard);
                const numbers = vc.tel.map((telObject) => {
                    return telObject.meta["waid"] + "@s.whatsapp.net";
                });

                numbers.forEach((n) => allNumbers.add(n));
            });

            let failedList: Array<string> = [];
            for (const number of allNumbers) {
                try {
                    await client.groupParticipantsUpdate(message.to, [number], "add");
                } catch (error) {
                    logger.error(error);
                    failedList.push(number);
                }
            }
            if (failedList.length > 0) {
                return messagingService.reply(message, this.language.execution.failed_add, true, {
                    placeholder: {chat, custom: new Map([["text", failedList.join(", ")]])},
                });
            }

            return messagingService.reply(message, this.language.execution.success, true);
        }

        if (!body) {
            return messagingService.reply(message, this.language.execution.no_body, true);
        }

        const numbers = [
            ...body
                .replace(/-/g, "")
                .replace(/(?<=\d\d\d) /g, "")
                .replace("+", "")
                .matchAll(/\d+/gim),
        ]
            .map((num) => {
                let number = parseInt(num[0]).toString();
                if (number.startsWith("5")) {
                    number = "972" + number;
                }
                if (!number.endsWith("@s.whatsapp.net")) number += "@s.whatsapp.net";
                return number;
            })
            .filter((num) => isJidUser(num));

        let failedList: Array<string> = [];
        for (const number of numbers) {
            try {
                await client.groupParticipantsUpdate(message.to, [number], "add");
            } catch (error) {
                logger.error(error);
                failedList.push(number);
            }
        }
        if (failedList.length > 0) {
            return messagingService.reply(message, this.language.execution.failed_add, true, {
                placeholder: {chat, custom: new Map([["text", failedList.join(", ")]])},
            });
        }

        return messagingService.reply(message, this.language.execution.success, true);
    }

    onBlocked(data: Message, blockedReason: BlockedReason) {
        if (blockedReason === BlockedReason.BlockedChat) {
            return messagingService.reply(data, this.language.execution.blocked_chat, true);
        }
    }
}
