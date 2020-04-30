export interface IRosettaError{
    code:number;
    message:string;
    retriable:boolean;
}

export class RosettaErrorDefine{
    public static INTERNALSERVERERROR:IRosettaError = {code:500,message:"Internal server error",retriable:false};
    public static BADREQUEST:IRosettaError = {code:1000,message:"Bad request",retriable:false};
    public static NODECONNETCONNECTION:IRosettaError = {code:1001,message:"Unable to connect node",retriable:false};
    public static NODESYNCNOTCOMPLETE:IRosettaError = {code:1002,message:"Node synchronization is not complete",retriable:false};
    public static NODEAPIERROR:IRosettaError = {code:1003,message:"Node api return error",retriable:false};
    
    public static BLOCKNOTEXISTS:IRosettaError = {code:1100,message:"Block not exists",retriable:true};
    public static TRANSACTIONNOTEXISTS:IRosettaError = {code:1101,message:"Transaction not exists",retriable:true};
    public static SIGNEDTRANSACTIONINVALID:IRosettaError = {code:1102,message:"Signed Transaction is invalid",retriable:false}
}
