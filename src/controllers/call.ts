import Router from "koa-router";

export class Call extends Router {
    constructor(env:any){
        super();
        this.env = env;
    }
    private env:any;
}