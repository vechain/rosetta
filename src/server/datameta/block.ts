import { Transaction } from "./transaction";

export class Block{
    public block_identifier:BlockIdentifier = new BlockIdentifier();
    public parent_block_identifier:BlockIdentifier = new BlockIdentifier();
    public timestamp:number = 0;
    public transactions:Array<Transaction> = new Array<Transaction>();
    public metadata:any | undefined;
}

export class BlockIdentifier{
    public index:number = 0;
    public hash:String = "";
}