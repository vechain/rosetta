export class RosettaVersion{
    public rosetta_version:String = "";
    public node_version:String = "";
    public middleware_version:String | undefined;
    public metadata:any | undefined;
}

export class RosettaAllow{
    public operation_statuses:Array<RosettaOperationStatus> = new Array<RosettaOperationStatus>();
    public operation_types:Array<String> = new Array<String>();
    public errors:Array<RosettaError> = new Array<RosettaError>();
}

export class RosettaOperationStatus
{
    public status:String = "";
    public successful:boolean = false;
}

export class RosettaError{
    public code:number = 0;
    public message:String = "";
    public retriable:boolean = false;

    constructor(code:number,message:String,retriable:boolean = false){
        this.code = code;
        this.message = message;
        this.retriable = retriable;
    }
}