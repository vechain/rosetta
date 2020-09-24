import ConstructionController from "./controller";
import { RequestInfoVerifyMiddleware } from "../../middleware/requestInfoVerifyMiddleware";
import { BaseRouter } from "../../../utils/components/baseRouter";

export class ConstructionRouter extends BaseRouter
{
    constructor(env:any){
        super(env);
        let controller = new ConstructionController(env);
        
        this.post("/construction/metadata",RequestInfoVerifyMiddleware.CheckNetWorkRequestInfo,
        RequestInfoVerifyMiddleware.CheckNetWorkTypeRequestInfo,
        RequestInfoVerifyMiddleware.CheckRunMode,
        controller.getConstructionMetadata);

        this.post("/construction/submit",RequestInfoVerifyMiddleware.CheckNetWorkRequestInfo,
        RequestInfoVerifyMiddleware.CheckNetWorkTypeRequestInfo,
        RequestInfoVerifyMiddleware.CheckSignedTransactionRequestInfo,
        RequestInfoVerifyMiddleware.CheckRunMode,
        controller.submitTransaction);

        this.post("/construction/combine",RequestInfoVerifyMiddleware.CheckNetWorkRequestInfo,
        controller.createCombine);

        this.post("/construction/derive",RequestInfoVerifyMiddleware.CheckNetWorkRequestInfo,
        controller.derivePublickey);

        this.post("/construction/hash",RequestInfoVerifyMiddleware.CheckNetWorkRequestInfo,
        controller.getHash);

        this.post("/construction/parse",RequestInfoVerifyMiddleware.CheckNetWorkRequestInfo,
        controller.parseTransaction);

        this.post("/construction/payloads",RequestInfoVerifyMiddleware.CheckNetWorkRequestInfo,
        controller.payloads);

        this.post("/construction/preprocess",RequestInfoVerifyMiddleware.CheckNetWorkRequestInfo,
        controller.preprocess);
    }
}