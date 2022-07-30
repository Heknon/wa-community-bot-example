import {generateWAMessage, isJidGroup, isJidUser} from "@adiwajshing/baileys";
import moment from "moment";
import {Document, ObjectId, UpdateFilter} from "mongodb";
import {remindersCollection} from "../..";
import {messagingService} from "../../../constants/services";
import {normalizeJid} from "../../../utils/group_utils";
import ReminderModel from "./reminder_model";

export default class ReminderService {
    private readonly repository: Map<string, ReminderModel> = new Map<string, ReminderModel>();

    constructor() {
        remindersCollection.find<Map<string, any>>({}).forEach((reminder) => {
            this.updateLocal(ReminderModel.fromMap(reminder));
        });

        setInterval(async () => {
            const checkTime = moment().utc().unix();
            for (const [id, reminder] of this.repository) {
                if (reminder.remindTimestamp <= checkTime) {
                    await messagingService.sendMessage(reminder.jid, {text: `*⏰Reminder*\n\n${reminder.reminder}`});
                    await this.delete(ObjectId.createFromHexString(id));
                }
            }
        }, 1000 * 5);
    }

    public async get(id: ObjectId | undefined, update: boolean = false): Promise<ReminderModel | undefined> {
        if (!id) return;

        let reminder: ReminderModel | undefined = this.repository.get(id.toString());

        if (update || !reminder) {
            reminder = await this.fetch(id);
        }

        if (reminder) this.repository.set(id.toString(), reminder);
        else this.repository.delete(id.toString());

        return reminder;
    }

    async update(id: ObjectId | undefined, update: UpdateFilter<Document>): Promise<ReminderModel | undefined> {
        if (!id) return;

        const res = await remindersCollection.updateOne({_id: id}, update);
        if (res.acknowledged) {
            const reminder = await this.get(id, true);
            return reminder;
        }
        return undefined;
    }

    async create(reminder: ReminderModel): Promise<ReminderModel | undefined> {
        const res = await remindersCollection.insertOne(reminder.toMap());
        if (res.acknowledged) {
            this.updateLocal(reminder);
            return this.get(reminder._id);
        }
        return undefined;
    }

    async createSimple(
        jid: string | undefined,
        reminderText: string,
        remindTime: number,
        id?: ObjectId,
    ): Promise<ReminderModel | undefined> {
        if (!jid) return;
        jid = normalizeJid(jid);

        if (!jid || (!isJidUser(jid) && !isJidGroup(jid))) {
            return;
        }

        const reminder = new ReminderModel(id ?? new ObjectId(), jid, reminderText, remindTime);
        return this.create(reminder);
    }

    async fetch(id: ObjectId | undefined): Promise<ReminderModel | undefined> {
        if (!id) return;
        const res = await remindersCollection.findOne<Map<string, any>>({_id: id});
        return res ? ReminderModel.fromMap(res) : undefined;
    }

    async delete(id: ObjectId | undefined): Promise<void> {
        if (!id) return;
        const res = await remindersCollection.deleteOne({_id: id});
        if (res.acknowledged) {
            this.repository.delete(id.toString());
        }
    }

    updateLocal(reminder: ReminderModel | undefined): void {
        if (!reminder) return;
        this.repository.set(reminder._id.toString(), reminder);
    }
}
