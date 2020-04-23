import { AccountIdentifier } from "./account";
import { Amount } from "./amount";

export class Transaction {
    public transaction_identifier:TransactionIdentifier = new TransactionIdentifier();
    public operations:Operation = new Operation();
    public metadata:any | undefined;
}

export class TransactionIdentifier {
    public hash:String = "";
}

export class Operation{
    public operation_identifier:OperationIdentifier = new OperationIdentifier();
    public related_operations:Array<OperationIdentifier> | undefined;
    public type:OperationType = OperationType.Transfer;
    public status:OperationStatus = OperationStatus.None;
    public account:AccountIdentifier | undefined;
    public amount:Amount | undefined;
    public metadata:any | undefined;
}

export class OperationIdentifier {
    public index:number = 0;
    public network_index:number | undefined;
}

export enum OperationType{
    Transfer = "Transfer"
}

export enum OperationStatus{
    None = "None",
    Succeeded = "Succeeded",
    Reverted = "Reverted",
    Pendding = "Pendding"
}