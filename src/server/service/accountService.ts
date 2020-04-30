import { GlobalEnvironment, iConfig } from "../../app/globalEnvironment";
import { ActionResultWithData, ActionResultWithData2 } from "../../utils/components/actionResult";
import { NetworkType } from "../datameta/networkType";
import { BlockIdentifier } from "../datameta/block";
import { RosettaErrorDefine } from "../datameta/rosettaError";
import { Amount } from "../datameta/amount";
import { BigNumberEx } from "../../utils/helper/bigNumberEx";
import { HttpClientHelper } from "../../utils/helper/httpClientHelper";
import ConnexEx from "../../utils/helper/connexEx";

export class AccountService{

    private _environment:GlobalEnvironment;

    constructor(environment:GlobalEnvironment){
        this._environment = environment;
    }

    public async getAccountBalance(type:NetworkType,address:string,revision:number | string ):Promise<ActionResultWithData2<BlockIdentifier,Array<Amount>>>{
        let result = new ActionResultWithData2<BlockIdentifier,Array<Amount>>();
        let connex = this._environment.getConnex(type);
        if(connex){
            result = await this._getAccoutBalance(connex,address,revision);
        }else{
            result.Result = false;
            result.ErrorData = RosettaErrorDefine.NODECONNETCONNECTION;
        }
        return result;
    }

    private async _getAccoutBalance(connex:ConnexEx,address:string,revision:number | string):Promise<ActionResultWithData2<BlockIdentifier,Array<Amount>>>{
        let result = new ActionResultWithData2<BlockIdentifier,Array<Amount>>();
        let blockIdentifier:BlockIdentifier = new BlockIdentifier();

        if(connex.thor.status.progress === 1){
            let blockVisitor = connex.thor.block(revision);
            try{
                let blockInfo = await blockVisitor.get();
                if(blockInfo){
                    blockIdentifier = new BlockIdentifier();
                    blockIdentifier.hash = blockInfo!.id;
                    blockIdentifier.index = blockInfo!.number;
                }else{
                    result.Result = false;
                    result.ErrorData = RosettaErrorDefine.BLOCKNOTEXISTS;
                    return result;
                }
            }catch{
                result.Result = false;
                result.ErrorData = RosettaErrorDefine.NODEAPIERROR;
                return result;
            }
        }else{
            result.Result = false;
            result.ErrorData = RosettaErrorDefine.NODESYNCNOTCOMPLETE;
            return result;
        }
        

        let apiUrl = connex.baseUrl + "/accounts/" + address;

        let client = new HttpClientHelper(apiUrl);
        let httpResult = await client.doRequest("GET",[{key:"revision",value:blockIdentifier.hash}],undefined,undefined);
        if(httpResult.Result && httpResult.Data){
            let VET = Amount.CreateVET();
            let VTHO = Amount.CreateVTHO();
            VET.value = new BigNumberEx(httpResult.Data.balance).toString();
            VTHO.value = new BigNumberEx(httpResult.Data.energy).toString();

            result.Data = blockIdentifier;
            result.Data2 = new Array<Amount>();
            result.Data2.push(VET,VTHO);
            result.Result = true;
        }else{
            result.Result = false;
            result.ErrorData = RosettaErrorDefine.NODEAPIERROR;
        }
        return result;
    }
    
}