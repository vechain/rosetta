import Router from "koa-router";

export class Mempool extends Router {  
    constructor(_env:any){
        super();
        this.post('/mempool', async (_ctx,_next) => {});
        this.post('/mempool/transaction',async (_ctx,_next) => {});
    }
}