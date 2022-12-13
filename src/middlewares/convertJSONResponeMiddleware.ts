import Router from "koa-router";
import { RosettaError } from "../common/types/error";

export class ConvertJSONResponeMiddleware{
    public static KnowErrorJSONResponce(ctx:any,error:RosettaError){
        ctx.status = 500;
        ctx.body = error;
    }

    public static BodyDataToJSONResponce(ctx:any,body:any){
        ctx.status = 200;
        ctx.body = body;
    }
}