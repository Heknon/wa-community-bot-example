export default class Reputation {
    // data class that holds the reputation of a user, the give history and the take history
    public readonly reputation: number;
    public readonly given: number[];

    constructor(reputation: number, given: number[]) {
        this.reputation = reputation;
        this.given = given;
    }

    public toMap(): Map<string, any> {
        return new Map(
            Object.entries({
                reputation: this.reputation,
                given: this.given,
            }),
        );
    }

    public static fromMap(map: Map<string, any>): Reputation {
        return new Reputation(map["reputation"] ?? 0, map["given"] ?? []);
    }
}
