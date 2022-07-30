import {proto, WASocket} from "@adiwajshing/baileys";
import {Configuration, OpenAIApi} from "openai";
import {BlockedReason} from "../../../blockable";
import {Chat, ChatLevel} from "../../../chats";
import {messagingService} from "../../../constants/services";
import Message from "../../../message/message";
import Command from "../../command";
import CommandTrigger from "../../command_trigger";
import languages from "../../../constants/language.json";

export default class GptCommand extends Command {
    private language: typeof languages.commands.gpt[Language];
    private texts: string[];

    constructor(language: Language) {
        const langs = languages.commands.gpt;
        const lang = langs[language];
        super({
            triggers: langs.triggers.map((e) => new CommandTrigger(e)),
            announcedAliases: lang.triggers,
            usage: lang.usage,
            category: lang.category,
            chatLevel: ChatLevel.Premium,
            description: lang.description,
            cooldowns: new Map([
                [ChatLevel.Premium, 20 * 1000],
                [ChatLevel.Sponsor, 10 * 1000],
            ]),
        });

        this.language = lang;

        this.configuration = new Configuration({
            apiKey: process.env.OPENAI_API_KEY,
        });

        this.openai = new OpenAIApi(this.configuration);

        this.texts = lang.execution.thinking_texts;
    }

    configuration: Configuration;
    openai: OpenAIApi;

    async execute(client: WASocket, chat: Chat, message: Message, body?: string) {
        if (!body) {
            return await messagingService.reply(message, this.language.execution.no_question, true, {
                placeholder: this.getDefaultPlaceholder({chat, message}),
            });
        }

        // body can only contain english and special characters
        if (!/^[a-zA-Z0-9\s\.,;:!?\(\)\[\]\{\}'"-\*&\$#@%\^\-\+]+$/.test(body)) {
            return await messagingService.reply(message, this.language.execution.only_english, true);
        }

        messagingService.reply(message, this.texts[Math.floor(Math.random() * this.texts.length)], true);

        this.openai
            .createCompletion({
                model: "text-davinci-002",
                prompt: body,
                temperature: 0.7,
                max_tokens: 1800,
                top_p: 1,
                frequency_penalty: 0,
                presence_penalty: 0,
            })
            .then((response) => {
                const blank = this.language.execution.too_long;
                const text = response.data.choices ? response.data.choices[0].text ?? blank : blank;
                messagingService.reply(message, text.trim(), true);
            })
            .catch((err) => {
                messagingService.reply(message, this.language.execution.too_long, true);
            });
    }

    onBlocked(data: Message, blockedReason: BlockedReason) {}
}
