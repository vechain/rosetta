import Router from "koa-router";

export class Mempool extends Router {  
    constructor(_:any){
        super();
        this.post('/mempool', async (_,next) => {});
        this.post('/mempool/transaction',async (_,next) => {});
    }
}