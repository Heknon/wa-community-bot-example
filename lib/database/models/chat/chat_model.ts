import {ChatType} from "./chat_type";

export default class ChatModel {
    readonly jid: string;
    readonly type: ChatType;
    readonly commandPrefix: string;
    readonly sentDisclaimer: boolean;
    readonly language: Language;

    constructor(jid: string, type: ChatType, commandPrefix: string, sentDisclaimer: boolean, language: Language) {
        this.jid = jid;
        this.commandPrefix = commandPrefix;
        this.type = type;
        this.sentDisclaimer = sentDisclaimer;
        this.language = language;
    }

    public toMap(): Map<string, any> {
        return new Map(
            Object.entries({
                jid: this.jid,
                command_prefix: this.commandPrefix,
                type: this.type,
                sent_disclaimer: this.sentDisclaimer,
                language: this.language,
            }),
        );
    }

    public static fromMap(map: Map<string, any>) {
        return new ChatModel(
            map["jid"],
            map["type"],
            map["command_prefix"],
            map["sent_disclaimer"] ?? false,
            map["language"] ?? "hebrew",
        );
    }
}
