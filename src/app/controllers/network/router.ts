import Router from "koa-router";
import NetworkController from "./networkController";
import { environment } from "../..";
import { RequestInfoVerifyMiddleware } from "../../middleware/requestInfoVerifyMiddleware";

class NetworkRouter extends Router
{
    constructor(){
        super();
        this.post("/network/list",this._controller.getNetworkList);
        this.post("/network/options",RequestInfoVerifyMiddleware.CheckNetWorkRequestInfo,this._controller.getNetworkOptions);
        this.post("/network/status",RequestInfoVerifyMiddleware.CheckNetWorkRequestInfo,this._controller.getNetworkStatus);
    }

    private _controller:NetworkController = new NetworkController();
}

let router = new NetworkRouter();

module.exports = router;