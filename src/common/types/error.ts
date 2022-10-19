export type RosettaError = {
    Code:number,
    Message:string,
    Description?:string,
    Retriable:boolean,
    Details?:any
}