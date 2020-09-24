export class Amount{
    public value:string = "";
    public currency:Currency = new Currency();
    public metadata:any | undefined;

    public static CreateVET():Amount{
        let amount = new Amount();
        amount.value = "0";
        amount.currency = new Currency("VET",18,undefined);
        return amount;
    }

    public static CreateVTHO():Amount{
        let amount = new Amount();
        amount.value = "0";
        amount.currency = new Currency("VTHO",18,undefined);
        return amount;
    }
}

export class Currency {
    public symbol:string = "";
    public decimals:number = 0;
    public metadata:any | undefined;

    public constructor(symbol:string = "",decimals:number = 0,metadata?:any){
        this.symbol = symbol;
        this.decimals = decimals;
        this.metadata = metadata;
    }
}