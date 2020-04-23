import Router from "koa-router";
import { environment } from "../..";

export default class AccountController{
    public getAccountBalance:Router.IMiddleware;

    constructor(){
        this._environment = environment;
        
        this.getAccountBalance = async (ctx:Router.IRouterContext,next: () => Promise<any>)=>{

            ctx.status = 200;
            ctx.body = {
                code:200
            }
            await next();
        }
    }

    private _environment:any;
}