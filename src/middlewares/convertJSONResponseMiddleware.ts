import { ResponseContext } from "../common/types/context";
import { RosettaError } from "../common/types/error";

export class ConvertJSONResponseMiddleware{
    public static KnowErrorJSONResponse(ctx:ResponseContext,error:RosettaError){
        ctx.status = 500;
        ctx.body = error;
    }

    public static BodyDataToJSONResponse(ctx:ResponseContext,body:unknown){
        ctx.status = 200;
        ctx.body = body;
    }
}