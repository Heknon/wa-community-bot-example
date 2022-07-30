import {BlockedReason} from "../../../blockable";
import {Chat} from "../../../chats";
import {messagingService, userRepository} from "../../../constants/services";
import {MessageMetadata} from "../../../message";
import Message from "../../../message/message";
import Command from "../../command";
import CommandTrigger from "../../command_trigger";
import languages from "../../../constants/language.json";
import {createCanvas} from "canvas";
import moment from "moment";
import { WASocket } from "@adiwajshing/baileys";
import { StickerTypes } from "wa-sticker-formatter/dist/internal/Metadata/StickerTypes";
import Sticker from "wa-sticker-formatter/dist";
import { jidDecode } from "@adiwajshing/baileys/lib/WABinary/jid-utils";

export default class StickerCommand extends Command {
    private language: typeof languages.commands.sticker[Language];

    constructor(language: Language) {
        const langs = languages.commands.sticker;
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

    async execute(client: WASocket, chat: Chat, message: Message, body?: string) {
        const ogMedia = await message.media;
        const quoted = ogMedia ? undefined : await message.getQuoted();
        const quotedMedia = ogMedia ? undefined : await quoted?.media;
        let messageMedia = ogMedia ?? quotedMedia;

        // 2mb in bytes
        if (messageMedia && messageMedia.length > 3 * 1024 * 1024) {
            return await messagingService.reply(message, this.language.execution.too_big, true);
        }

        if (!messageMedia) {
            return await messagingService.reply(message, this.language.execution.no_media, true);
        }

        this.sendSticker(message, messageMedia, 40);
    }

    private async sendSticker(message: Message, media: Buffer, quality: number) {
        try {
            const stickerBuffer = await this.createSticker(media, "bot", "bot", quality).toBuffer();
            if (stickerBuffer.length < 50) {
                return await messagingService.reply(message, this.language.execution.no_media, true);
            } else if (stickerBuffer.length > 2 * 1024 * 1024) {
                // if bigger than 2mb error.
                return await messagingService.reply(message, this.language.execution.too_big, true);
            }

            await messagingService.replyAdvanced(message, {sticker: stickerBuffer}, true, {
                metadata: new MessageMetadata(new Map([["media", false]])),
            });
        } catch (err) {
            return await messagingService.reply(message, this.language.execution.too_big, true);
        }
    }

    private createSticker(buffer: Buffer, author: string = "bot", pack: string = "bot", quality: number) {
        return new Sticker(buffer, {
            pack: pack,
            author: author,
            type: StickerTypes.FULL,
            quality: quality,
        });
    }

    onBlocked(data: Message, blockedReason: BlockedReason) {}
}

function getTextSize(text: string | undefined, font: string) {
    if (text === undefined) return {width: 0, height: {ascent: 0, descent: 0}};

    const canvas = createCanvas(1, 1);
    const ctx = canvas.getContext("2d");
    ctx.font = font;
    const size = ctx.measureText(text);
    return {width: size.width, height: {ascent: size["emHeightAscent"], descent: size["emHeightDescent"]}};
}

function formatJidToCleanNumber(jid?: string) {
    const num = jidDecode(jid)?.user;
    if (!num) return;

    const match = num.match(/^(\d{3})(\d{2})(\d{3})(\d{4})$/);
    if (match) {
        return `+${match[1]} ${match[2]}-${match[3]}-${match[4]}`;
    }
}
function getTextLines(bodyText: string, bodyFont: string, maxWidth: number) {
    const lines: string[] = [];
    let currentLine = "";
    const words = bodyText.split("");
    for (const word of words) {
        const wordSize = getTextSize(word, bodyFont);
        if (wordSize.width + getTextSize(currentLine, bodyFont).width > maxWidth) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine += `${word}`;
        }
    }

    lines.push(currentLine);
    return lines;
}
