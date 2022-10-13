export type RosettaError = {
    code:number,
    message:string,
    description?:string,
    retriable:boolean,
    details?:any
}