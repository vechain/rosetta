import { AccountIdentifier } from "./account";
import { Amount } from "./amount";
import { OperationStatus } from "./rosetta";

export class Transaction {
    public transaction_identifier:TransactionIdentifier = new TransactionIdentifier();
    public operations:Array<Operation> = new Array<Operation>();
    public metadata:any | undefined;
}

export class TransactionIdentifier {
    public hash:string = "";
}

export class Operation{
    public operation_identifier:OperationIdentifier = new OperationIdentifier();
    public related_operations:Array<OperationIdentifier> | undefined;
    public type:OperationType = OperationType.None;
    public status:OperationStatus = OperationStatus.None;
    public account:AccountIdentifier | undefined;
    public amount:Amount | undefined;
    public metadata:any | undefined;
}

export class OperationIdentifier {
    public index:number = 0;
    public network_index:number | undefined;
}

export class OperationType{
    public static None:string = "None";
    public static Send:string = "Send";
    public static Receive:string = "Receive";
}

