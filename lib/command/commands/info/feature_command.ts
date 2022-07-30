import {WASocket} from "@adiwajshing/baileys";
import VCard from "vcard-creator";
import {BlockedReason} from "../../../blockable";
import {Chat} from "../../../chats";
import {messagingService} from "../../../constants/services";
import Message from "../../../message/message";
import Command from "../../command";
import CommandTrigger from "../../command_trigger";
import dotenv from "dotenv";
import languages from "../../../constants/language.json";
import { jidDecode } from "@adiwajshing/baileys/lib/WABinary/jid-utils";
import { AnyMessageContent } from "@adiwajshing/baileys/lib/Types/Message";

dotenv.config();

export default class CreatorCommand extends Command {
    private language: typeof languages.commands.feature[Language];

    constructor(language: Language) {
        const langs = languages.commands.feature;
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

    async execute(client: WASocket, chat: Chat, message: Message, body?: string) {
        if ((!message.mediaPath || !(await message.media)) && (!body || body.trim().length == 0)) {
            return await messagingService.reply(message, this.language.execution.no_body, true, {
                placeholder: this.getDefaultPlaceholder({chat, message})
            });
        }

        await messagingService.sendMessage(process.env["CREATOR_JID"]!, {
            text: this.language.execution.creator_message_receive,
        });
        const vcard = new VCard();
        vcard.addName(undefined, message.raw?.pushName ?? this.language.execution.vcard_default_name);
        vcard.setProperty(
            "TEL",
            `TEL;type=CELL;waid=${jidDecode(message.from)?.user}`,
            `+${jidDecode(message.from)?.user}`,
        );
        await messagingService.sendMessage(process.env["CREATOR_JID"]!, {
            contacts: {
                contacts: [
                    {
                        vcard: vcard.toString(),
                        displayName: message.raw?.pushName ?? this.language.execution.vcard_default_name,
                    },
                ],
            },
        });

        const media = await message.media;
        const msg: AnyMessageContent = media ? {caption: body ?? "", image: media} : {text: body ?? ""};
        await messagingService.sendMessage(process.env["CREATOR_JID"]!, msg);
        await messagingService.reply(message, this.language.execution.success_message, true);
    }

    onBlocked(data: Message, blockedReason: BlockedReason) {}
}
