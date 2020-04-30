import Router from "koa-router";
import { RequestInfoVerifyMiddleware } from "../../middleware/requestInfoVerifyMiddleware";
import BlockController from "./controller";

class BlockRouter extends Router
{
    constructor(){
        super();

        this.post("/block",RequestInfoVerifyMiddleware.CheckNetWorkRequestInfo,
        RequestInfoVerifyMiddleware.CheckBlockRequestInfo,
        this.controller.getBlock);

        this.post("/block/transaction",RequestInfoVerifyMiddleware.CheckNetWorkRequestInfo,
        RequestInfoVerifyMiddleware.CheckBlockRequestInfo,
        RequestInfoVerifyMiddleware.CheckTransactionRequestInfo,
        this.controller.getTransactionByBlock);
    }

    private controller:BlockController = new BlockController();
    
}

let router = new BlockRouter();

module.exports = router;