import { MediaType } from "@adiwajshing/baileys/lib/Types/Message";
import Metadata from "./metadata";

export default class MessageModel {
    public id: string;
    public timestamp: number;
    public content: string | undefined;
    public mediaPath: string | undefined;
    public mediaType: MediaType | undefined;
    public quoted: string | undefined;
    public from: string;
    public to: string;
    public metadata: Metadata | undefined;

    constructor(
        id: string,
        timestamp: number,
        content: string | undefined,
        mediaPath: string | undefined,
        mediaType: MediaType | undefined,
        quoted: string | undefined,
        from: string,
        to: string,
        metadata: Metadata | undefined = undefined,
    ) {
        this.id = id;
        this.timestamp = timestamp;
        this.content = content;
        this.mediaPath = mediaPath;
        this.mediaType = mediaType;
        this.quoted = quoted;
        this.from = from;
        this.to = to;
        this.metadata = metadata;
    }

    public toMap() {
        return {
            "id": this.id,
            "timestamp": this.timestamp,
            "content": this.content,
            "media_path": this.mediaPath,
            'media_type': this.mediaType,
            "quoted": this.quoted,
            "from": this.from,
            "to": this.to,
            'metadata': this.metadata?.toMap()
        }
    }

    public static fromMap(map: Map<String, object>) {
        return new MessageModel(
            map['_id'],
            map['timestamp'],
            map['content'],
            map['media_path'],
            map['media_type'],
            map['quoted'],
            map['from'],
            map['to'],
            map['metadata'] ? Metadata.fromMap(map['metadata']) : undefined
        );
    }
}