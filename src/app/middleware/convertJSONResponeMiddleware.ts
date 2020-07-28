import Router from "koa-router";
import { ActionResult } from "../../utils/components/actionResult";
import { IRosettaError, RosettaErrorDefine } from "../../server/datameta/rosettaError";

export class ConvertJSONResponeMiddleware{
    public static ActionResultJSONResponse(ctx:Router.IRouterContext,action:ActionResult,resultData?:any)
    {
        if(action.Result){
            ctx.status = 200;
            ctx.body = resultData
        }
        else if((action.ErrorData as IRosettaError) != null){
            ctx.status = 500;
            ctx.body = action.ErrorData;
        }
        else{
            ctx.status = 500;
            ctx.body = RosettaErrorDefine.INTERNALSERVERERROR;
        }
    }

    public static KnowErrorJSONResponce(ctx:Router.IRouterContext,error:IRosettaError){
        ctx.status = 500;
        ctx.body = error;
    }

    public static BodyDataToJSONResponce(ctx:Router.IRouterContext,body:any){
        ctx.status = 200;
        ctx.body = body;
    }
}