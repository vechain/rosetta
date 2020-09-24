import { AccountIdentifier } from "./account";
import { Amount } from "./amount";

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
    public static Transfer:string = "Transfer";
    public static Fee:string = "Fee";
    public static FeeDelegation:string = "FeeDelegation";
}

export class OperationStatus{
    public static None:string = "None";
    public static Succeeded:string = "Succeeded";
    public static Reverted:string = "Reverted";
    public static Pendding:string = "Pendding";
}