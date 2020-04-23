import Router from "koa-router";
import { ActionResultWithData } from "../../utils/components/actionResult";
import { NetworkIdentifier } from "../../server/datameta/network";

export default class VerifyRequestMiddleware{
    public static async networkIdentifiersVerify(ctx:Router.IRouterContext,necessary:boolean = false):Promise<ActionResultWithData<NetworkIdentifier>>{
        let result = new ActionResultWithData<NetworkIdentifier>();

        return result;
    }
}