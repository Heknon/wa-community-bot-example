import {jidDecode, WASocket} from "@adiwajshing/baileys";
import {BlockedReason} from "../../../blockable/blocked_reason";
import {Chat} from "../../../chats";
import {messagingService, userRepository} from "../../../constants/services";
import Message from "../../../message/message";
import {buildVCardFromJID, extractNumberFromString, formatNumberToJID} from "../../../utils/utils";
import Command from "../../command";
import CommandTrigger from "../../command_trigger";
import languages from "../../../constants/language.json";

export default class VCardCommand extends Command {
    private language: typeof languages.commands.vcard[Language];

    constructor(language: Language) {
        const langs = languages.commands.vcard;
        const lang = langs[language];
        super({
            triggers: langs.triggers.map((e) => new CommandTrigger(e)),
            announcedAliases: lang.triggers,
            usage: lang.usage,
            category: lang.category,
            description: lang.description,
        });

        this.language = lang;
    }

    async onBlocked(msg: Message, blockedReason: BlockedReason) {}

    async execute(client: WASocket, chat: Chat, msg: Message, body: string) {
        let jid = body
            .replace(" ", "")
            .split(" ")
            .shift()
            ?.replace("+", "")
            .replace(/-/g, "")
            .replace(/(?<=\d\d\d) /g, "");
        if (jid?.startsWith("0")) {
            jid = "972" + jid.slice(1);
        }
        if (jid && !jid.endsWith("@s.whatsapp.net")) jid += "@s.whatsapp.net";
        const vcard = jid ? await buildVCardFromJID(jid) : undefined;
        const user = jid ? await userRepository.get(jid) : undefined;
        if (!vcard || !jid) {
            return await messagingService.reply(msg, this.language.execution.no_number, true);
        }

        const name = user?.getFullDefaultingName() || jidDecode(jid)!.user;
        await messagingService.sendMessage(msg.raw?.key.remoteJid!, {
            contacts: {
                contacts: [
                    {
                        vcard: vcard.toString(),
                        displayName: name,
                    },
                ],
            },
        });
    }
}
