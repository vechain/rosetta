import NetworkController from "./networkController";
import { environment } from "../..";
import { RequestInfoVerifyMiddleware } from "../../middleware/requestInfoVerifyMiddleware";
import { BaseRouter } from "../../../utils/components/baseRouter";

export class NetworkRouter extends BaseRouter
{
    constructor(env:any){
        super(env);
        let controller = new NetworkController(env);
        this.post("/network/list",controller.getNetworkList);

        this.post("/network/options",RequestInfoVerifyMiddleware.CheckNetWorkRequestInfo,
        controller.getNetworkOptions);

        this.post("/network/status",RequestInfoVerifyMiddleware.CheckNetWorkRequestInfo,
        RequestInfoVerifyMiddleware.CheckNetWorkTypeRequestInfo,
        RequestInfoVerifyMiddleware.CheckRunMode,
        controller.getNetworkStatus);
    }
}