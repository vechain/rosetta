import Router from "koa-router";
import { ActionResult } from "../../utils/components/actionResult";

export class ConvertJSONResponeMiddleware{
    public static ActionResultJSONResponce(ctx:Router.IRouterContext,action:ActionResult,resultData?:any)
    {
        if(action.Result){
            ctx.status = 200;
            ctx.body = resultData
        }
        else{
            ctx.status = 500;
            ctx.body = action.ErrorData;
        }
    }
}