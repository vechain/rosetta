export class Amount{
    public value:String = "";
    public currency:Currency = new Currency();
    public metadata:any | undefined;
}

export class Currency {
    public symbol:String = "";
    public decimals:number = 0;
    public metadata:any | undefined;
}