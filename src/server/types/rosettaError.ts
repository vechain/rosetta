export interface IRosettaError{
    code:number;
    message:string;
    retriable:boolean;
}

export class RosettaErrorDefine{
    public static INTERNALSERVERERROR:IRosettaError = {code:500,message:"Internal server error",retriable:false};
    public static BADREQUEST:IRosettaError = {code:1000,message:"Bad request",retriable:false};
    public static MODEISOFFLINE:IRosettaError = {code:1001,message:"Offline Mode can't support the api",retriable:false};
    public static NODECONNETCONNECTION:IRosettaError = {code:1002,message:"Unable to connect node",retriable:false};
    public static NODESYNCNOTCOMPLETE:IRosettaError = {code:1003,message:"Node synchronization is not complete",retriable:false};
    public static NODEAPIERROR:IRosettaError = {code:1004,message:"Node api return error",retriable:false};
    
    public static BLOCKNOTEXISTS:IRosettaError = {code:1100,message:"Block not exists",retriable:true};
    public static TRANSACTIONNOTEXISTS:IRosettaError = {code:1101,message:"Transaction not exists",retriable:true};
    public static SIGNEDTRANSACTIONINVALID:IRosettaError = {code:1102,message:"Signed Transaction is invalid",retriable:false};
    public static VIP180ADDRESSNOTINLIST:IRosettaError = {code:1103,message:"The VIP180 Address not in list",retriable:false};
    public static VMRETURNERROR:IRosettaError = {code:1104,message:"VM Return Error",retriable:false};
    public static ISNOTVIP180TOKEN:IRosettaError = {code:1105,message:"This address is not VIP180 Token",retriable:false};
    public static NETWORKINVALID:IRosettaError = {code:1106,message:"Network identifier invalid",retriable:false};
    public static PUBLICKEYPAYLOADINVALID:IRosettaError = {code:1107,message:"publickey info invalid",retriable:false};
    public static TRANSACTIONISNOTHEX:IRosettaError = {code:1108,message:"transaction is not hex",retriable:false};
    public static TRANSACTIONINVALID:IRosettaError = {code:1109,message:"transaction invalid",retriable:false};
    public static TRANSACTIONNOTSUPPORT:IRosettaError = {code:1110,message:"the transaction type not support",retriable:false}
    public static ABIDECODEERROR:IRosettaError = {code:1111,message:"ABI decode error",retriable:false};
    public static OPERATIONINVALID:IRosettaError = {code:1112,message:"Operation array invalid",retriable:false}
    public static METADATAINVALID:IRosettaError = {code:1113,message:"Metadata invalid",retriable:false}
    public static NOSETORIGIN:IRosettaError = {code:1114,message:"No set transaction origin",retriable:false};
    public static ORIGINSIGNTUREINVALID:IRosettaError = {code:1115,message:"the origin signature invalid",retriable:false};
    public static DELEGATORSIGNATUREINVALID:IRosettaError = {code:1116,message:"the delegator signature invalid",retriable:false};
    public static NOSETDELEGATORSINGTURE:IRosettaError = {code:1117,message:"noset delegator signature",retriable:false};
    public static TRANSACTIONCHAINTAGINVALID:IRosettaError = {code:1118,message:"transaction chaintag invalid",retriable:false};

    public static NETWORKIDENTIFIERINVALID:IRosettaError = {code:1119,message:"network_identifier invalid",retriable:false};
    public static ACCOUNTIDENTIFIERINVALID:IRosettaError = {code:1120,message:"account_identifier invalid",retriable:false};
    public static BLOCKIDENTIFIERINVALID:IRosettaError = {code:1121,message:"block_identifier invalid",retriable:false};
    public static TRANSACTIONIDENTIFIERINVALID:IRosettaError = {code:1122,message:"transaction_identifier invalid",retriable:false};
    public static MULTIORIGIN:IRosettaError = {code:1123,message:"No support multi orgin",retriable:false};
    public static MULTIDELEGATOR:IRosettaError = {code:1124,message:"No support multi delegator",retriable:false};
}
