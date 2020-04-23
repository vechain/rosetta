import Router from "koa-router";
import NetworkController from "./networkController";

class NetworkRouter extends Router
{
    constructor(){
        super();
        this.post("/network/list",this.controller.getNetworkList);
    }

    private controller:NetworkController = new NetworkController();
}

let router = new NetworkRouter();

module.exports = router;