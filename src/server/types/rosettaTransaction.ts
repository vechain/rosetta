import { RLP } from "thor-devkit";

export class RosettaTransaction{

    public static encode(tx:RosettaTransactionStruct):Buffer{
        let rlp = new RLP(RosettaTransactionStruct.rlpProfile);
        if(tx.delegator || (tx.delegator && tx.delegator.length == 42)){
            tx.delegator = "0x";
        }
        tx.delegator = tx.delegator?.toLocaleLowerCase()
        return rlp.encode(tx);
    }

    public static decode(raw:Buffer,):RosettaTransactionStruct{
        let rlp = new RLP(RosettaTransactionStruct.rlpProfile);
        let rosettaTx = rlp.decode(raw);
        if((rosettaTx.delegator as string).toLocaleLowerCase() == "0x"){
            rosettaTx.delegator = undefined;
        }
        return rosettaTx;
    }
}

export class RosettaTransactionStruct{
    public raw:string;
    public isSign:number;
    public origin:string;
    public delegator:string|undefined;

    constructor(raw:string,isSign:number,origin:string,delegator:string = "0x"){
        this.raw = raw;
        this.isSign = isSign;
        this.origin = origin;
        this.delegator = delegator;
    }

    public static readonly rlpProfile:RLP.Profile = {
        name:"rosettatx",
        kind:[
            { name:"raw",kind:new RLP.BlobKind()},
            { name:"isSign",kind:new RLP.NumericKind(1)},
            { name:"origin",kind:new RLP.NullableFixedBlobKind(20)},
            { name:"delegator",kind:new RLP.BlobKind()}
        ]
    }
}