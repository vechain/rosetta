import type Koa from "koa";

export class URLCodeMiddleware
{
    public static async URLDecoder(ctx:Koa.Context,next:Koa.Next){
        if(ctx.querystring != undefined && ctx.querystring.length>0){
            ctx.querystring = decodeURIComponent(ctx.querystring);
        }
        await next();
    }
}