import Router from "koa-router";
import AccountController from "./controller";

class AccountRouter extends Router
{
    constructor(){
        super();
        this.post("/account/balance",this.controller.getAccountBalance);
    }

    private controller:AccountController = new AccountController();
}

let router = new AccountRouter();

module.exports = router;