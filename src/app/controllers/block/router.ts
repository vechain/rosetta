import { BaseRouter } from "../../../utils/components/baseRouter";
import { RequestInfoVerifyMiddleware } from "../../middleware/requestInfoVerifyMiddleware";
import BlockController from "./controller";

export class BlockRouter extends BaseRouter
{
    constructor(env:any){
        super(env);
        let controller = new BlockController(env);
        this.post("/block",RequestInfoVerifyMiddleware.CheckNetWorkRequestInfo,
        RequestInfoVerifyMiddleware.CheckNetWorkTypeRequestInfo,
        RequestInfoVerifyMiddleware.CheckBlockRequestInfo,
        RequestInfoVerifyMiddleware.CheckRunMode,
        controller.getBlock);

        this.post("/block/transaction",RequestInfoVerifyMiddleware.CheckNetWorkRequestInfo,
        RequestInfoVerifyMiddleware.CheckNetWorkTypeRequestInfo,
        RequestInfoVerifyMiddleware.CheckBlockRequestInfo,
        RequestInfoVerifyMiddleware.CheckTransactionRequestInfo,
        RequestInfoVerifyMiddleware.CheckRunMode,
        controller.getTransactionByBlock);
    }
}