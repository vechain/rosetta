import Router from "koa-router";

export class Mempool extends Router {
    constructor(env:any){
        super();
        this.env = env;
        this.post('/mempool', async (ctx,next) => {});
        this.post('/mempool/transaction',async (ctx,next) => {});
    }
    private env:any;
}