import ConnexEx from "./connexEx";
import { Amount, Currency } from "../../server/types/amount";
import { VIP180Config } from "../../app/globalEnvironment";
import { ActionResultWithData, ActionResultWithData2 } from "../components/actionResult";
import { abi } from "thor-devkit";
import { DriverInterface } from "@vechain/connex-driver/dist/driver-interface";
import { RosettaErrorDefine } from "../../server/types/rosettaError";
import { BigNumberEx } from "./bigNumberEx";

export default class VIP180Helper
{

    public static async getTokenBalance(connex:ConnexEx,token:VIP180Config,account:string,revision:string):Promise<ActionResultWithData<Amount>>
    {
        let result = new ActionResultWithData<Amount>();

        let fun = new abi.Function(this._balanceOfABI);
        let data = fun.encode(account);

        let explainArg:DriverInterface.ExplainArg = {
            clauses:[{
                to:token.address,
                value:'',
                data:data
            }]
        }
        try {
            let vmResult = await connex.Driver.explain(explainArg,revision);
            if((vmResult[0].data as string) != "0x"){
                let decode = fun.decode(vmResult[0].data);
                let amount = new Amount();
                amount.value = decode.balance;
                amount.currency = new Currency(token.symbol,token.decimals,undefined);
                result.Data = amount;
            }
            else
            {
                let amount = new Amount();
                amount.value = "0";
                amount.currency = new Currency(token.symbol,token.decimals,undefined);
                result.Data = amount;
            }
            result.Result = true;
        } catch (error) {
            result.Result = false;
            result.ErrorData = RosettaErrorDefine.VMRETURNERROR;
        }
        return result;
    }

    public static decodeTransferCall(data:string):ActionResultWithData2<string,BigNumberEx> {
        let result = new ActionResultWithData2<string,BigNumberEx>();
        let abiFun = new abi.Function(this._transferABI);

        try {
            var paramesData = "0x" + data.substring(10);
            var decode = abi.decodeParameters(abiFun.definition.inputs,paramesData);
            if(decode != null && decode[0] != null && decode[1] != null){
                result.Data = decode[0] as string;
                result.Data2 = new BigNumberEx(decode[1] as string);
                result.Result = true;
            }
            else{
                result.Result = false;
                result.ErrorData = RosettaErrorDefine.ABIDECODEERROR;
            }
            
        } catch (error) {
            result.Result = false;
            result.ErrorData = RosettaErrorDefine.ABIDECODEERROR;
        }
        
        return result;
    }

    public static encodeTransferCall(address:string,amount:BigNumberEx):string {
        let abiFun = new abi.Function(this._transferABI);
        return abiFun.encode(address,amount.toString());
    }

    private static _balanceOfABI:any = {"constant": true,"inputs": [{"name": "_owner","type": "address"}],"name": "balanceOf","outputs": [{"name": "balance","type": "uint256"}],"payable": false,"stateMutability": "view","type": "function"};
    private static _transferABI:any = {"constant": false,"inputs": [{"name": "_to","type": "address"},{"name": "_value","type": "uint256"}],"name": "transfer","outputs": [{"name": "success","type": "bool"}],"payable": false,"stateMutability": "nonpayable","type": "function"}
}