import { RosettaError } from "./types/error";

export function getError(code:number,description?:string,details?:any):RosettaError {
    let error = Errors.get(code) || Errors.get(500)!;
    error.Description = error.Description || description,
    error.Details = error.Details || details;
    return error;
}

export const Errors = new Map<number,RosettaError>([
    [500,{Code:500,Message:'Internal server error.',Retriable:true}],
    [1,{Code:1,Message:'Account subaccount address not in tokenlist.',Retriable:false}],
    [3,{Code:3,Message:'Not found the block identifier.',Retriable:true}],
    [4,{Code:4,Message:'Not found the transaction identifier.',Retriable:true}],
    [5,{Code:5,Message:'The request parame public_key object invalid.',Retriable:false}],
    [6,{Code:6,Message:'The transaction have mutil origins.',Retriable:false}],
    [7,{Code:7,Message:'The transaction origin not exists.',Retriable:false}],
    [8,{Code:8,Message:'The transaction have mutil delegators.',Retriable:false}],
    [9,{Code:9,Message:'There is no any transfer operation involved.',Retriable:false}],
    [10,{Code:10,Message:'Have unregistered token operations.',Retriable:false}],
    [11,{Code:11,Message:'Get metadata on blockchain error.',Retriable:true}],
    [12,{Code:12,Message:'The request parame signed_transaction invalid.',Retriable:false}],
    [13,{Code:13,Message:'Submit transaction raw error.',Retriable:false}],
    [14,{Code:14,Message:'Preprocess request invalid.',Retriable:false}],
    [15,{Code:15,Message:'The request parame options array invalid.',Retriable:false}],
    [16,{Code:16,Message:'The request parame metadata object invalid.',Retriable:false}],
    [17,{Code:17,Message:'The request parame transaction can not decode.',Retriable:false}],
    [18,{Code:18,Message:'The parse request parames invalid.',Retriable:false}],
    [19,{Code:19,Message:'The request parame signed_transaction invalid.',Retriable:false}],
    [20,{Code:20,Message:'The combine request parames invalid.',Retriable:false}],
    [21,{Code:21,Message:'The blocks request parames invalid.',Retriable:false}],
    [22,{Code:22,Message:'The request parame network_identifier invalid.',Retriable:false}],
    [23,{Code:23,Message:'The request parame account_identifier invalid.',Retriable:false}],
    [24,{Code:24,Message:'The request parame block_identifier invalid.',Retriable:false}],
    [25,{Code:25,Message:'The request parame transaction_identifier invalid.',Retriable:false}],
    [26,{Code:26,Message:'The api not support offline.',Retriable:false}]
]);

