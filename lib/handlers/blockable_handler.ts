import Blockable from "../blockable/blockable";
import { BlockedReason } from "../blockable/blocked_reason";
import Triggerable from "../blockable/triggerable";

/**
 * @template In data received from pipline to find a handler
 */
export default abstract class BlockableHandler<In> {
    protected blockables: Blockable<In>[];

    constructor(...blockables: Blockable<In>[]) {
        this.blockables = blockables;
    }

    abstract find(data: In): Promise<Array<[Triggerable<any> | undefined, Blockable<In>]>> | Array<[Triggerable<any> | undefined, Blockable<In>]>;
    abstract appliable(data: In): Promise<boolean> | boolean;
    abstract isBlocked(data: In, blockable: Blockable<In>, checkCooldown: boolean, trigger?: Triggerable<In>): Promise<BlockedReason | undefined> | BlockedReason | undefined

    add(...blockable: Blockable<In>[]) {
        this.blockables.push(...blockable);
    }
}