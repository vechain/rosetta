import { RosettaError } from "../common/types/error";

export class ConvertJSONResponseMiddleware{
    public static KnowErrorJSONResponse(ctx:any,error:RosettaError){
        ctx.status = 500;
        ctx.body = error;
    }

    public static BodyDataToJSONResponse(ctx:any,body:any){
        ctx.status = 200;
        ctx.body = body;
    }
}