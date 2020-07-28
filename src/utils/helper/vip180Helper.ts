import ConnexEx from "./connexEx";
import { Amount, Currency } from "../../server/datameta/amount";
import { VIP180Config } from "../../app/globalEnvironment";
import { ActionResultWithData } from "../components/actionResult";
import { abi } from "thor-devkit";
import { DriverInterface } from "@vechain/connex-driver/dist/driver-interface";
import { RosettaErrorDefine } from "../../server/datameta/rosettaError";
import { fn } from "moment-timezone";

export default class VIP180Helper
{
    public constructor(connex:ConnexEx,token:VIP180Config)
    {
        this._connex = connex;
        this._token = token;
    }

    public async getTokenBalance(address:string,revision:string):Promise<ActionResultWithData<Amount>>
    {
        let result = new ActionResultWithData<Amount>();

        let fun = new abi.Function(this._balanceOfABI);
        let data = fun.encode(address);

        let explainArg:DriverInterface.ExplainArg = {
            clauses:[{
                to:this._token.address,
                value:'',
                data:data
            }]
        }
        try {
            let vmResult = await this._connex.Driver.explain(explainArg,revision);
            if((vmResult[0].data as string) != "0x"){
                let decode = fun.decode(vmResult[0].data);
                let amount = new Amount();
                amount.value = decode.balance;
                amount.currency = new Currency(this._token.symbol,this._token.decimals,undefined);
                result.Data = amount;
                result.Result = true;
            }
            else
            {
                result.Result = false;
                result.ErrorData = RosettaErrorDefine.ISNOTVIP180TOKEN;
            }
        } catch (error) {
            result.Result = false;
            result.ErrorData = RosettaErrorDefine.VMRETURNERROR;
        }
        return result;
    }

    private _connex:ConnexEx;
    private _token:VIP180Config;

    private _balanceOfABI:any = {"constant": true,"inputs": [{"name": "_owner","type": "address"}],"name": "balanceOf","outputs": [{"name": "balance","type": "uint256"}],"payable": false,"stateMutability": "view","type": "function"};
}