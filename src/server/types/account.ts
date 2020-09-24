export class AccountIdentifier{
    public address:string = "";
    public sub_account:SubAccountIdentifier | undefined;
    public metadata:any | undefined;
}

export class SubAccountIdentifier{
    public address:string = "";
    public metadata:any | undefined;
}