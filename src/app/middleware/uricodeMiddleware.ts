import * as Router from 'koa-router';

export class URLCodeMiddleware
{
    public static async URLDecoder(ctx:Router.IRouterContext,next:()=>Promise<any>){
        if(ctx.querystring != undefined && ctx.querystring.length>0){
            (ctx as any).jmeQueryString = ctx.querystring;
            ctx.querystring = decodeURIComponent(ctx.querystring);
        }
        await next();
    }
}