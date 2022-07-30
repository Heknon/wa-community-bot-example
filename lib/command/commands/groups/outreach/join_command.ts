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

export default class JoinCommand extends Command {
    private language: typeof languages.commands.join[Language];

    constructor(language: Language) {
        const langs = languages.commands.join;
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

    private groupInviteRegex: RegExp = RegExp(/(https?:\/\/)?chat\.whatsapp\.com\/(?:invite\/)?([a-zA-Z0-9_-]{22})/g);

    async execute(client: WASocket, chat: Chat, message: Message, body: string) {
        let matches = this.groupInviteRegex.exec(body ?? "");
        const quoted = await message.getQuoted();
        if ((!matches || (matches && matches.length == 0)) && quoted)
            matches = this.groupInviteRegex.exec(quoted.content ?? "");

        if (!matches || (matches && matches.length == 0)) {
            return await messagingService.reply(message, this.language.execution.no_invite, true);
        }

        const code = matches[2];
        try {
            client.groupAcceptInvite(code).then(async (res) => {
                if (!res) {
                    return await messagingService.reply(message, this.language.execution.failed, true);
                }
                const meta = await client.groupMetadata(res);
                await messagingService.reply(message, this.language.execution.joined, true, {
                    placeholder: {custom: new Map([["group", meta.subject]])},
                });
            });
            await messagingService.reply(message, this.language.execution.joining, true);
        } catch (e) {
            await messagingService.reply(message, this.language.execution.failed, true);
        }
    }

    onBlocked(data: Message, blockedReason: BlockedReason) {}
}
