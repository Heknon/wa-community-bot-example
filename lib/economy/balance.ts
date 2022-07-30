export default class Balance {
    public readonly wallet: number;
    public readonly bank: number;

    constructor(wallet: number, bank: number) {
        this.wallet = wallet;
        this.bank = bank;
    }

    public toMap(): Map<string, any> {
        return new Map(
            Object.entries({
                wallet: this.wallet,
                bank: this.bank,
            }),
        );
    }

    public static fromMap(map: Map<string, any>): Balance {
        return new Balance(map["wallet"] ?? 0, map["bank"] ?? 0);
    }
}
