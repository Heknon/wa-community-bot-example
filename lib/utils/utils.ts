import {jidDecode} from "@adiwajshing/baileys";
import moment from "moment";
import VCard from "vcard-creator";
import {userRepository} from "../constants/services";

/**
 * standardize means to set the tiem to 00-00-00 the start of a day
 * @param time moment to standardize
 */
export function standardizeMoment(time: moment.Moment) {
    const copy = moment(time);
    copy.set("minute", 0);
    copy.set("hour", 0);
    copy.set("second", 0);
    copy.set("millisecond", 0);
    return copy;
}

async function timeout(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sleep(fn: () => Promise<any> | any, ms: number) {
    await timeout(ms);
    await fn();
}

export function extractNumberFromString(str: string) {
    return str
        .replace(/(?<=\d\d\d) /gi, "")
        .split(" ")[0]
        .replace(/-/g, "")
        .replace(/(?<=\d\d\d) /, "");
}

export function formatNumberToJID(str: string) {
    if (!str.endsWith("@s.whatsapp.net")) {
        str += "@s.whatsapp.net";
    }

    if (str.startsWith("05")) {
        str = "972" + str.slice(1);
    }

    return str;
}

export async function buildVCardFromJID(jid: string) {
    jid = extractNumberFromString(jid);
    jid = formatNumberToJID(jid);
    if (!jid || jid.length == 0) {
        return;
    }

    const user = await userRepository.get(jid);
    const vcard = new VCard();
    const name = user?.getFullDefaultingName()?.split(" ") ?? [];
    const firstName = name.shift() ?? jidDecode(jid)!.user;
    const lastName = name.join(" ") ?? "";
    vcard.addName(lastName.length == 0 ? undefined : lastName, firstName);
    vcard.setProperty("TEL", `TEL;type=CELL;waid=${jidDecode(jid)!.user}`, `+${jidDecode(jid)!.user}`);

    return vcard;
}

export function formatNumberCommas(number: number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export const commas = (number: number) => formatNumberCommas(number);
