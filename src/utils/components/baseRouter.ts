import Router from "koa-router";

export abstract class BaseRouter extends Router {
    constructor(env:any){
        super();
        this.environment = env;
        (this.environment.routerArray as Array<BaseRouter>).push(this);
    }

    public addRootRouter:boolean = true;
    protected environment:any;
}