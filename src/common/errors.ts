import { RosettaError } from "./types/error";

export function getError(code:number,description?:string,details?:any):RosettaError {
    let error = Errors.get(code) || Errors.get(500)!;
    error.description = error.description || description,
    error.details = error.details || details;
    return error;
}

export const Errors = new Map<number,RosettaError>([
    [500,{code:500,message:'Internal server error.',retriable:true}],
    [1,{code:1,message:'Account subaccount address not in tokenlist.',retriable:false}],
    [3,{code:3,message:'Not found the block identifier.',retriable:true}],
    [4,{code:4,message:'Not found the transaction identifier.',retriable:true}],
    [5,{code:5,message:'The request parame public_key object invalid.',retriable:false}],
    [6,{code:6,message:'The transaction have mutil origins.',retriable:false}],
    [7,{code:7,message:'The transaction origin not exists.',retriable:false}],
    [8,{code:8,message:'The transaction have mutil delegators.',retriable:false}],
    [9,{code:9,message:'There is no any transfer operation involved.',retriable:false}],
    [10,{code:10,message:'Have unregistered token operations.',retriable:false}],
    [11,{code:11,message:'Get metadata on blockchain error.',retriable:true}],
    [12,{code:12,message:'The request parame signed_transaction invalid.',retriable:false}],
    [13,{code:13,message:'Submit transaction raw error.',retriable:false}],
    [14,{code:14,message:'Preprocess request invalid.',retriable:false}],
    [15,{code:15,message:'The request parame options array invalid.',retriable:false}],
    [16,{code:16,message:'The request parame metadata object invalid.',retriable:false}],
    [17,{code:17,message:'The request parame transaction can not decode.',retriable:false}],
    [18,{code:18,message:'The parse request parames invalid.',retriable:false}],
    [19,{code:19,message:'The request parame signed_transaction invalid.',retriable:false}],
    [20,{code:20,message:'The combine request parames invalid.',retriable:false}],
    [21,{code:21,message:'The blocks request parames invalid.',retriable:false}],
    [22,{code:22,message:'The request parame network_identifier invalid.',retriable:false}],
    [23,{code:23,message:'The request parame account_identifier invalid.',retriable:false}],
    [24,{code:24,message:'The request parame block_identifier invalid.',retriable:false}],
    [25,{code:25,message:'The request parame transaction_identifier invalid.',retriable:false}],
    [26,{code:26,message:'The api not support offline.',retriable:false}]
]);

