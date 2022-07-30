import {isJidGroup, proto, WASocket} from "@adiwajshing/baileys";
import {BlockedReason} from "../../../blockable";
import {Chat} from "../../../chats";
import {messagingService, userRepository} from "../../../constants/services";
import {ChatLevel, DeveloperLevel} from "../../../database/models";
import CommandHandler from "../../../handlers/command_handler";
import Message from "../../../message/message";
import Command from "../../command";
import CommandTrigger from "../../command_trigger";
import languages from "../../../constants/language.json";
import {applyPlaceholders} from "../../../utils/message_utils";
import User from "../../../user/user";
import {logger} from "../../../constants/logger";

export default class HelpCommand extends Command {
    private commandHandler: CommandHandler;
    private language: typeof languages.commands.help[Language];
    private langCode: Language;

    constructor(language: Language, commandHandler: CommandHandler) {
        const langs = languages.commands.help;
        const lang = langs[language];
        super({
            triggers: langs.triggers.map((e) => new CommandTrigger(e)),
            announcedAliases: lang.triggers,
            usage: lang.usage,
            category: lang.category,
            description: lang.description,
        });

        this.language = lang;
        this.langCode = language;
        this.commandHandler = commandHandler;
    }

    async execute(client: WASocket, chat: Chat, message: Message, body?: string, ...args: string[]) {
        const prefix = chat.model.commandPrefix;

        const user = await userRepository.get(message.sender ?? "");
        const cmdArg = body?.trim().startsWith(prefix) ? body.trim() : prefix + body?.trim();
        const cmdArgRes = await chat.getCommandByTrigger(cmdArg);
        const isBlocked = cmdArgRes ? await this.commandHandler.isBlocked(message, cmdArgRes, false) : undefined;
        if (
            cmdArgRes &&
            (isBlocked == undefined ||
                ![BlockedReason.InsufficientDeveloperLevel, BlockedReason.NotWhitelisted].includes(isBlocked))
        ) {
            let id = 0;
            const desc =
                `*${prefix}${cmdArgRes.name}*\n\n` +
                (await applyPlaceholders(this.getCommandExtendedDescription(cmdArgRes), {
                    message,
                    command: cmdArgRes,
                    chat: chat,
                    user,
                }));
            const buttons: proto.IButton[] = cmdArgRes.announcedAliases.map((alias) => {
                return {buttonId: (id++).toString(), buttonText: {displayText: prefix + alias}};
            });
            return messagingService.replyAdvanced(
                message,
                {text: desc, buttons: buttons, footer: `(${prefix}help ${cmdArgRes.name})`},
                true,
            );
        }

        args = body!.split(" ") as string[];
        let [filteredCommands, sendInGroup] = await this.getFilteredCommands(message);
        const categories = [
            ...new Set(
                filteredCommands.map((e) => e.category?.toLowerCase() ?? this.language.execution.misc.toLowerCase()),
            ),
        ];
        const argsSet = new Set(args.map((e) => e.toLowerCase()));
        let allowedCategories = new Set(Array.from(categories).filter((cat) => argsSet.has(cat.toLowerCase())));
        let allowedCategoriesList = [...allowedCategories];
        if (allowedCategoriesList.length === 0) {
            allowedCategoriesList = categories;
            allowedCategories = new Set(categories);
        }

        const isSpecificSectionRequest = allowedCategoriesList.length != categories.length;
        if (!isSpecificSectionRequest) {
            allowedCategories.delete(languages.image_gen[this.langCode].category.toLowerCase());
        }
        let sections = await this.getHelpSections(filteredCommands, chat, message, user, [...allowedCategories]);

        let helpMessage = `${this.language.execution.prefix}\n${
            isSpecificSectionRequest
                ? (sections.size > 1
                      ? this.language.execution.categories_help
                      : this.language.execution.category_help
                  ).replace(
                      "{category}",
                      Array.from(sections.values())
                          .map((e) => e.title)
                          .join(", "),
                  )
                : ""
        }\n${isSpecificSectionRequest ? "\n" : ""}`;

        if (isSpecificSectionRequest) sendInGroup = true;
        if (!isSpecificSectionRequest) {
            sections = new Map([
                [
                    languages.image_gen[this.langCode].category.toLowerCase(),
                    {
                        title: languages.image_gen[this.langCode].category.toUpperCase(),
                        rows: [
                            {
                                title: languages.image_gen[this.langCode].title.replace("{prefix}", prefix),
                                description: languages.image_gen[this.langCode].description,
                            },
                        ],
                    },
                ],
                ...sections.entries()
            ]);
        }

        const sendFull = !["תפריט", "menu"].some((e) => body?.toLowerCase()?.includes(e));
        if (sendFull) helpMessage += await this.getHelpText(sections);

        helpMessage += `${this.language.execution.suffix}`;
        if (sendFull) {
            helpMessage += `\n\n${this.language.execution.footer}`;
        }

        if (sendInGroup || ["here", "כאן"].some((e) => message.content?.trim().toLowerCase().includes(e))) {
            if (!sendFull) await messagingService.reply(message, languages.tagged_info[this.langCode].difference, true);
            await messagingService.replyAdvanced(
                message,
                {
                    text: helpMessage,
                    buttonText: sendFull ? undefined : this.language.execution.button,
                    sections: sendFull
                        ? undefined
                        : Array.from(sections.entries()).map((arr) => arr[1] as proto.ISection),
                    footer: sendFull ? undefined : this.language.execution.footer,
                },
                true,
            );
        } else {
            if (isJidGroup(message.to))
                messagingService.replyAdvanced(message, {text: this.language.execution.dms}, true);

            if (!sendFull)
                await messagingService.reply(message, languages.tagged_info[this.langCode].difference, true, {
                    privateReply: true,
                });
            await messagingService.replyAdvanced(
                message,
                {
                    text: helpMessage,
                    buttonText: sendFull ? undefined : this.language.execution.button,
                    sections: sendFull
                        ? undefined
                        : Array.from(sections.entries()).map((arr) => arr[1] as proto.ISection),
                    footer: sendFull ? undefined : this.language.execution.footer,
                },
                true,
                {privateReply: true},
            );
        }
    }

    onBlocked(data: Message, blockedReason: BlockedReason) {}

    public async getHelpSections(
        commands: Command[],
        chat: Chat,
        message: Message,
        user: User | undefined,
        allowedCategories: string[],
    ): Promise<Map<string, proto.ISection>> {
        const allowedCategoriesSet = new Set(allowedCategories);

        const sections: Map<string, proto.ISection> = new Map();
        let id = 0;
        for (const command of commands) {
            const sectionKey = command.category?.toLowerCase() ?? this.language.execution.misc.toLowerCase();
            if (!allowedCategoriesSet.has(sectionKey)) continue;
            if (!sections.has(sectionKey)) {
                sections.set(sectionKey, {
                    title: command.category?.toUpperCase() ?? this.language.execution.misc.toUpperCase(),
                    rows: new Array<proto.IRow>(),
                });
            }

            const section = sections.get(sectionKey);
            const formattedDescription = await applyPlaceholders(this.getCommandExtendedDescription(command), {
                message,
                command,
                chat,
                user,
            });
            section?.rows?.push({
                title: this.commandHandler.prefix + command.name,
                description: await applyPlaceholders(command.description, {message, command, chat, user}),
                rowId: `HELP_COMMAND-${id}\n${command.announcedAliases
                    .map((e) => `{prefix}${e}`)
                    .join("\n")}\n\r${formattedDescription}`,
            });

            id++;
        }

        return sections;
    }

    private async getFilteredCommands(message: Message): Promise<[Command[], boolean]> {
        const allCommands = this.commandHandler.blockables;
        const filteredCommands: Array<Command> = [];
        let sendInGroup = true;

        for (const command of allCommands) {
            if (!command.mainTrigger.command) continue;
            if (command.mainTrigger.command == this.mainTrigger.command) continue;

            if ((await this.commandHandler.isBlocked(message, command, false)) != undefined) continue;

            if (command.developerLevel >= DeveloperLevel.Moderator) sendInGroup = false;
            filteredCommands.push(command);
        }

        return [filteredCommands, sendInGroup];
    }

    public async getHelpText(sections: Map<string, proto.ISection>): Promise<string> {
        let help = "";
        for (const section of sections.values()) {
            help += `*${section.title}*\n`;
            for (const row of section.rows ?? []) {
                help += `● ${row.title}\n${row.description}\n\n`;
            }

            // remove last newline
            help = help.slice(0, -1);
            help += "=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=\n";
        }

        return applyPlaceholders(help, {command: this});
    }

    private getCommandExtendedDescription(command: Command) {
        return `*${this.language.execution.description}:*\n${command.description}${
            command.extendedDescription ? "\n\n" : ""
        }${command.extendedDescription}\n\n*${this.language.execution.aliases}:*\n${command.triggers
            .map((e) => e.command)
            .join(", ")}\n\n*${this.language.execution.cooldowns}:*\n${Array.from(command.cooldowns.entries())
            .map((e) => `${languages.ranks[this.langCode][ChatLevel[e[0]].toLowerCase()]}: ${e[1] / 1000}s`)
            .join("\n")}`;
    }
}
