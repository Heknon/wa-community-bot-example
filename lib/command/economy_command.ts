import {RandomSeed} from "random-seed";
import {userRepository} from "../constants/services";
import {Balance} from "../economy";
import InteractableCommand from "./interactable_command";

export default abstract class EconomyCommand extends InteractableCommand {
    public async setBalance(jid: string, balance: Balance): Promise<boolean> {
        // enforce bank capacity
        const user = await userRepository.get(jid);
        if (!user) return false;

        const bank = Math.min(balance.bank, user.model.bankCapacity);
        const leftOutOfBank = balance.bank - bank;
        const wallet = balance.wallet + leftOutOfBank;

        const update = await userRepository.update(jid, {
            $set: {
                "balance.wallet": wallet,
                "balance.bank": bank,
            },
        });

        return update !== undefined;
    }

    public async addBalance(jid: string, balance: Balance): Promise<boolean> {
        const user = await userRepository.get(jid);
        if (!user) return false;

        return this.setBalance(
            jid,
            new Balance(user.model.balance.wallet + balance.wallet, user.model.balance.bank + balance.bank),
        );
    }

    public async removeBalance(jid: string, balance: Balance): Promise<boolean> {
        return this.addBalance(jid, new Balance(-balance.wallet, -balance.bank));
    }

    public async getBalance(jid: string): Promise<Balance | undefined> {
        const user = await userRepository.get(jid);
        if (!user) return;

        return user.model.balance;
    }
}
