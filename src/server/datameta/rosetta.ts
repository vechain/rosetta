import { IRosettaError } from "./rosettaError";


export class RosettaVersion{
    public rosetta_version:String = "";
    public node_version:String = "";
    public middleware_version:String | undefined;
    public metadata:any | undefined;
}

export class RosettaAllow{
    public operation_statuses:Array<OperationStatus> = new Array<OperationStatus>();
    public operation_types:Array<String> = new Array<String>();
    public errors:Array<IRosettaError> = new Array<IRosettaError>();
    public historical_balance_lookup:boolean = true;
}

export interface IOperationStatus{
    status:string;
    successful:boolean
}

export class OperationStatus{
    public static None:IOperationStatus = {status:"None",successful:true};
    public static Succeeded:IOperationStatus = {status:"Succeeded",successful:true};
    public static Reverted:IOperationStatus = {status:"Reverted",successful:false};
    public static Pendding:IOperationStatus = {status:"Pendding",successful:true};
}
