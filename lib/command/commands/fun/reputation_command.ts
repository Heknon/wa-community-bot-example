import {jidDecode, WASocket} from "@adiwajshing/baileys";
import url from "node:url";
import {Chat} from "../../../chats";
import {messagingService, userRepository} from "../../../constants/services";
import Message from "../../../message/message";
import Command from "../../command";
import CommandTrigger from "../../command_trigger";
import {BlockedReason} from "../../../blockable";
import moment from "moment";
import {havePluralS} from "../../../utils/message_utils";
import languages from "../../../constants/language.json";

export default class ReputationCommand extends Command {
    private language: typeof languages.commands.reputation[Language];

    constructor(language: Language) {
        const langs = languages.commands.reputation;
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
        if (!message.sender) {
            return await messagingService.reply(message, "An error occurred while processing this message.", true);
        }

        const givingUser = await userRepository.get(message.sender);
        if (!givingUser) {
            return await messagingService.reply(message, "An error occurred while processing this message.", true);
        }

        const givenReps = givingUser.model.reputation.given;

        let userPointsCanGive = 3;
        // redact reputation point for each reputation given in the last 24 hours
        for (const rep of givenReps) {
            if (moment().diff(moment.unix(rep), "hours") < 24) {
                userPointsCanGive--;
            }
        }

        userPointsCanGive = Math.max(0, userPointsCanGive);

        if (!body) {
            // send reputation info about sender user
            const userRep = givingUser.model.reputation.reputation;
            return await messagingService.reply(message, this.language.execution.self_stats, true, {
                placeholder: {
                    chat,
                    custom: new Map([
                        ["total", userRep.toString()],
                        ["left", userPointsCanGive.toString()],
                    ]),
                },
            });
        } else if (
            body.toLowerCase().startsWith("stats") ||
            body.toLowerCase().startsWith("סטטיסטיקה") ||
            body.toLowerCase().startsWith("statistics") ||
            body.toLowerCase().startsWith("stat")
        ) {
            const mentions = message.raw?.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
            const userStatToCheck = mentions.length > 0 ? mentions[0] : message.sender;
            let user = await userRepository.get(userStatToCheck);
            if (!user) {
                user = await userRepository.simpleCreate(userStatToCheck);
                if (!user) return await messagingService.reply(message, this.language.execution.no_user, true);
            }

            return await messagingService.replyAdvanced(
                message,
                {
                    text: this.language.execution.stats,
                    mentions: [userStatToCheck],
                },
                true,
                {
                    placeholder: {
                        chat,
                        custom: new Map([
                            ["total", user.model.reputation.reputation.toString()],
                            ["tag", `@${jidDecode(userStatToCheck)?.user}`],
                        ]),
                    },
                },
            );
        }

        const arg1 = body.split(" ")[0];
        const repPointsToGive = parseInt(arg1) === 0 ? 0 : parseInt(arg1) || 1;
        if (repPointsToGive != 0 && !repPointsToGive) {
            return await messagingService.reply(message, this.language.execution.not_reputation_amount, true, {
                placeholder: {chat, custom: new Map([["text", arg1]])},
            });
        }

        const mentions = message.raw?.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
        if (mentions.length === 0) {
            return await messagingService.reply(message, this.language.execution.no_mention, true);
        }

        const reppedJid = mentions[0];
        if (reppedJid == message.sender) {
            return await messagingService.reply(message, this.language.execution.no_self_rep, true);
        }

        // if rep points is less than or equal to 0, don't give any reputation
        if (userPointsCanGive <= 0 || repPointsToGive > userPointsCanGive) {
            return await messagingService.reply(message, this.language.execution.not_enough_rep, true, {
                placeholder: {
                    custom: new Map([
                        ["pointsGive", repPointsToGive.toString()],
                        ["pointsLeft", userPointsCanGive.toString()],
                    ]),
                },
            });
        }

        let reppedUser = await userRepository.get(reppedJid);
        if (!reppedUser) {
            reppedUser = await userRepository.simpleCreate(reppedJid);
            if (!reppedUser) {
                return await messagingService.reply(message, this.language.execution.no_user, true);
            }
        }
        const previousRep = reppedUser.model.reputation.reputation;

        await userRepository.update(reppedJid, {
            $set: {"reputation.reputation": reppedUser.model.reputation.reputation + repPointsToGive},
        });
        reppedUser = await userRepository.get(reppedJid);
        if (!reppedUser) {
            return await messagingService.reply(message, this.language.execution.no_user, true);
        }

        await userRepository.update(message.sender, {$push: {"reputation.given": moment().unix()}});

        await messagingService.replyAdvanced(
            message,
            {
                text: this.language.execution.success_give,
                mentions: [reppedJid],
            },
            true,
            {
                placeholder: {
                    custom: new Map([
                        ["previous", previousRep.toString()],
                        ["current", reppedUser.model.reputation.reputation.toString()],
                        ["given", repPointsToGive.toString()],
                        ["left", (userPointsCanGive - repPointsToGive).toString()],
                        ["tag", `@${jidDecode(reppedJid)?.user}`],
                    ]),
                },
            },
        );
    }

    onBlocked(data: Message, blockedReason: BlockedReason) {}
}
