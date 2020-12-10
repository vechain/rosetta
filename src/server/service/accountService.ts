import { GlobalEnvironment } from "../../app/globalEnvironment";
import { ActionResultWithData, ActionResultWithData2 } from "../../utils/components/actionResult";
import { NetworkType } from "../types/networkType";
import { BlockIdentifier } from "../types/block";
import { RosettaErrorDefine } from "../types/rosettaError";
import { Amount, Currency } from "../types/amount";
import { BigNumberEx } from "../../utils/helper/bigNumberEx";
import { HttpClientHelper } from "../../utils/helper/httpClientHelper";
import ConnexEx from "../../utils/helper/connexEx";
import { BlockChainInfoService } from "./blockchainInfoService";
import VIP180Helper from "../../utils/helper/vip180Helper";

export class AccountService{

    private _environment:GlobalEnvironment;

    private _methodABI = {"constant": true,"inputs": [{"name": "_owner","type": "address"}],"name": "balanceOf","outputs": [{"name": "balance","type": "uint256"}],"payable": false,"stateMutability": "view","type": "function"};

    constructor(environment:GlobalEnvironment){
        this._environment = environment;
    }

    public async getAccountBalance(type:NetworkType,address:string,revision:number | string,currencies:Array<Currency>):Promise<ActionResultWithData2<BlockIdentifier,Array<Amount>>>{
        let result = new ActionResultWithData2<BlockIdentifier,Array<Amount>>();
        let connex = this._environment.getConnex(type);
        if(connex){
            let blockDetail = await (new BlockChainInfoService(this._environment)).getBlockDetail(type,revision);
            if(blockDetail.Result)
            {
                result.Data = blockDetail.Data!.block_identifier;
            }
            else
            {
                result.copyBase(blockDetail);
                return result;
            }

            if(currencies && currencies.length > 0)
            {
                let balanceResult = await this._getVIP180TokenBalance(connex,address,result.Data!,currencies);
                if(balanceResult.Result)
                {
                    result.Data2 = balanceResult.Data;
                    result.Result = true;
                }
                else
                {
                    result.copyBase(balanceResult);   
                }
            }
            else
            {
                let balanceResult = await this._getAccoutBalance(connex,address,result.Data!);
                if(balanceResult.Result)
                {
                    result.Data2 = balanceResult.Data;
                    result.Result = true;
                }
                else
                {
                    result.copyBase(balanceResult);   
                }
            }
        }else{
            result.Result = false;
            result.ErrorData = RosettaErrorDefine.NODECONNETCONNECTION;
        }
        return result;
    }

    private async _getAccoutBalance(connex:ConnexEx,address:string,blockIdentifier:BlockIdentifier):Promise<ActionResultWithData<Array<Amount>>>{
        let result = new ActionResultWithData<Array<Amount>>();

        let apiUrl = connex.baseUrl + "/accounts/" + address;
        let client = new HttpClientHelper(apiUrl);
        let httpResult = await client.doRequest("GET",[{key:"revision",value:blockIdentifier.hash}],undefined,undefined);
        if(httpResult.Result && httpResult.Data){
            let VET = Amount.CreateVET();
            let VTHO = Amount.CreateVTHO();
            VET.value = new BigNumberEx(httpResult.Data.balance).toString();
            VTHO.value = new BigNumberEx(httpResult.Data.energy).toString();
            result.Data = new Array<Amount>();
            result.Data.push(VET,VTHO);
            result.Result = true;
        }else{
            result.Result = false;
            result.ErrorData = RosettaErrorDefine.NODEAPIERROR;
        }
        return result;
    }

    private async _getVIP180TokenBalance(connex:ConnexEx,address:string,blockIdentifier:BlockIdentifier,currencies:Array<Currency>):Promise<ActionResultWithData<Array<Amount>>>
    {
        let result = new ActionResultWithData<Array<Amount>>();
        result.Data = new Array<Amount>();
        let vip180list = this._environment.getVIP180TokenList();

        for(const currency of currencies){
            if(currency.symbol.toLowerCase() == "VET".toLowerCase()){
                let balanceResult = await this._getAccoutBalance(connex,address,blockIdentifier);
                if(balanceResult.Result && balanceResult.Data){
                    result.Data.push(balanceResult.Data[0]);
                } else {
                    result.copyBase(balanceResult);
                    return result;
                }
                continue;
            }

            let vip180Info = vip180list.find(token => {return token.symbol.toLowerCase() === currency.symbol.toLowerCase() && token.decimals == currency.decimals});
            if(vip180Info)
            {
                let balanceResult = await VIP180Helper.getTokenBalance(connex,vip180Info,address,blockIdentifier.hash);
                if(balanceResult.Result && balanceResult.Data)
                {
                    result.Data.push(balanceResult.Data);
                }
                else
                {
                    result.copyBase(balanceResult);
                    return result;
                }
            }
            else
            {
                result.Result = false;
                result.ErrorData = RosettaErrorDefine.VIP180ADDRESSNOTINLIST;
                return result;
            }
        }
        result.Result = true;
        return result;
    }
}