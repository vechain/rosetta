import AccountController from "./controller";
import { RequestInfoVerifyMiddleware } from "../../middleware/requestInfoVerifyMiddleware";
import { BaseRouter } from "../../../utils/components/baseRouter";

export class AccountRouter extends BaseRouter
{
    constructor(env:any){
        super(env);
        let controller = new AccountController(env);
        this.post("/account/balance",RequestInfoVerifyMiddleware.CheckNetWorkRequestInfo,
        RequestInfoVerifyMiddleware.CheckNetWorkTypeRequestInfo,
        RequestInfoVerifyMiddleware.CheckAccountRequestInfo,
        RequestInfoVerifyMiddleware.CheckRunMode,
        controller.getAccountBalance);
    }
}