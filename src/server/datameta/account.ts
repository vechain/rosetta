export class AccountIdentifier{
    public address:String = "";
    public sub_account:SubAccountIdentifier | undefined;
    public metadata:any | undefined;
}

export class SubAccountIdentifier{
    public address:String = "";
    public metadata:any | undefined;
}