import Router from "koa-router";
import AccountController from "./controller";
import { RequestInfoVerifyMiddleware } from "../../middleware/requestInfoVerifyMiddleware";

class AccountRouter extends Router
{
    constructor(){
        super();
        this.post("/account/balance",RequestInfoVerifyMiddleware.CheckNetWorkRequestInfo,
        RequestInfoVerifyMiddleware.CheckAccountRequestInfo,
        RequestInfoVerifyMiddleware.CheckBlockRequestInfo,
        this._controller.getAccountBalance);
    }

    private _controller:AccountController = new AccountController();
}

let router = new AccountRouter();

module.exports = router;