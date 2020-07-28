import {BigNumber} from 'bignumber.js';
BigNumber.config({ EXPONENTIAL_AT: 1e+9 });

export class BigNumberEx extends BigNumber
{
    constructor(value:number|string|BigNumber,base?: number|undefined){
        switch(value.constructor.name){
            case "String":{
                try {
                    super(value,base);
                } catch (error) {
                    throw error;
                }
                break;
            }
            case "BigNumber":{
                super(value,base);
                break;
            }
            case "Number":{
                if(Number(value) >= Number.MIN_SAFE_INTEGER && Number(value) <= Number.MAX_SAFE_INTEGER){
                    super(value,base);
                }
                else{
                    throw Error("no safe integer")
                }
                break;
            }
        }
    }

    public static safeSet(value:number|string|BigNumber,base?: number|undefined):BigNumber{
        let resultValue = new BigNumber(0);
        switch(value.constructor.name){
            case "String":{
                try {
                    resultValue = new BigNumber(value,base);
                } catch (error) {
                    throw error;
                }
                break;
            }
            case "BigNumber":{
                resultValue = new BigNumber(value);
                break;
            }
            case "Number":{
                if(Number(value) >= Number.MIN_SAFE_INTEGER && Number(value) <= Number.MAX_SAFE_INTEGER){
                    resultValue = new BigNumber(value,base);
                }
                else{
                    throw Error("no safe integer")
                }
                break;
            }
        }

        return resultValue;
    }
}