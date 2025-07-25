import { RosettaError } from "./types/error";

export function getError(code:number,description?:string,details?:any):RosettaError {
    const error = Object.assign({},Errors.get(code) || Errors.get(500)!);
    error.description = error.description || description,
    error.details = error.details || details;
    return error;
}

export const Errors = new Map<number,RosettaError>([
    [500,{code:500,message:'Internal server error.',retriable:true}],
    [1,{code:1,message:'Contract address not found in token list.',retriable:false}],
    [3,{code:3,message:'Block identifier not found.',retriable:true}],
    [4,{code:4,message:'Transaction identifier not found.',retriable:true}],
    [5,{code:5,message:'Invalid public key parameter.',retriable:false}],
    [6,{code:6,message:'Transaction has multiple origins.',retriable:false}],
    [7,{code:7,message:'Transaction origin does not exist.',retriable:false}],
    [8,{code:8,message:'Transaction has multiple delegators.',retriable:false}],
    [9,{code:9,message:'No transfer operation involved.',retriable:false}],
    [10,{code:10,message:'Unregistered token operations found.',retriable:false}],
    [11,{code:11,message:'Error getting blockchain metadata.',retriable:true}],
    [12,{code:12,message:'Invalid signed transaction parameter.',retriable:false}],
    [13,{code:13,message:'Error submitting raw transaction.',retriable:false}],
    [14,{code:14,message:'Invalid preprocess request.',retriable:false}],
    [15,{code:15,message:'Invalid options array parameter.',retriable:false}],
    [16,{code:16,message:'Invalid metadata object parameter.',retriable:false}],
    [17,{code:17,message:'Unable to decode transaction parameter.',retriable:false}],
    [18,{code:18,message:'Invalid request parameters.',retriable:false}],
    [19,{code:19,message:'Invalid unsigned transaction parameter.',retriable:false}],
    [20,{code:20,message:'Invalid combine request parameters.',retriable:false}],
    [21,{code:21,message:'Invalid blocks request parameters.',retriable:false}],
    [22,{code:22,message:'Invalid network identifier parameter.',retriable:false}],
    [23,{code:23,message:'Invalid account identifier parameter.',retriable:false}],
    [24,{code:24,message:'Invalid block identifier parameter.',retriable:false}],
    [25,{code:25,message:'Invalid transaction identifier parameter.',retriable:false}],
    [26,{code:26,message:'API does not support offline mode.',retriable:false}],
    [27,{code:27,message:'Contract was not created at the specified block identifier.',retriable:false}],
    [28,{code:28,message:'Delegator public key not set.',retriable:false}],
    [29,{code:29,message:'Operation account and public key do not match.',retriable:false}],
    [30,{code:30,message:'Origin public key not set.',retriable:false}],
    [31,{code:31,message:'Invalid currencies parameter.',retriable:false}],
]);

