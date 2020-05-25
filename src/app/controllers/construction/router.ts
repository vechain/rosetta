import Router from "koa-router";
import ConstructionController from "./controller";
import { RequestInfoVerifyMiddleware } from "../../middleware/requestInfoVerifyMiddleware";

class ConstructionRouter extends Router
{
    constructor(){
        super();
        
        this.post("/construction/metadata",RequestInfoVerifyMiddleware.CheckNetWorkRequestInfo,
        this._controller.getConstructionMetadata);

        this.post("/construction/submit",RequestInfoVerifyMiddleware.CheckNetWorkRequestInfo,
        RequestInfoVerifyMiddleware.CheckSignedTransactionRequestInfo,
        this._controller.submitTransaction);
    }

    private _controller:ConstructionController = new ConstructionController();
}

let router = new ConstructionRouter();

module.exports = router;