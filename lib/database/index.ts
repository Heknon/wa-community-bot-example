import {MongoClient} from "mongodb";
import { logger } from "../constants/logger";
import {
    databaseName,
    databaseUrl,
    chatsCollectionName,
    usersCollectionName,
    messagesCollectionName,
    remindersCollectionName,
    itemsCollectionName,
} from "./config";

export const client = new MongoClient(databaseUrl);
export const database = client.db(databaseName);

export const usersCollection = database.collection(usersCollectionName);
export const chatsCollection = database.collection(chatsCollectionName);
export const messagesCollection = database.collection(messagesCollectionName);
export const remindersCollection = database.collection(remindersCollectionName);
export const itemsCollection = database.collection(itemsCollectionName);

usersCollection.createIndex({jid: 1}, {unique: true});
chatsCollection.createIndex({jid: 1}, {unique: true});

export async function connectToDatabase() {
    await client.connect();
    logger.info("Established connection to database");
}
