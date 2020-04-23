import { IKnowErrorInfo } from "./baseKnowError";

export class ActionResult
{
    public Result:boolean;
    public Code:string;
    public Message:string;
    public ErrorData:any|null|undefined;
    private _ErrorData:any|null|undefined;

    constructor(){
        this.Result = false;
        this.Code = "";
        this.Message = "";
        this.ErrorData = undefined;
    }

    public copyBase(source:ActionResult)
    {
        this.Result = source.Result;
        this.Code = source.Code;
        this.Message = source.Message;
        this._ErrorData = source.ErrorData;
    }

    public initKnowError(knowerror:IKnowErrorInfo)
    {
        this.Result = false;
        this.Code = String(knowerror.code);
        this.Message = knowerror.message;
        this.ErrorData = knowerror;
    }
}

export class ActionResultWithData<T> extends ActionResult
{
    public Data:T|undefined;
}

export class ActionResultWithData2<T1,T2> extends ActionResultWithData<T1>
{
    public Data2:T2|undefined;
}

export class ActionResultWithData3<T1,T2,T3> extends ActionResultWithData2<T1,T2>
{
    public Data3:T3|undefined;
}

export class ActionResultWithData4<T1,T2,T3,T4> extends ActionResultWithData3<T1,T2,T3>
{
    public Data4:T4|undefined;
}

export class ActionResultWithData5<T1,T2,T3,T4,T5> extends ActionResultWithData4<T1,T2,T3,T4>
{
    public Data5:T5|undefined;
}

export class ActionResultWithData6<T1,T2,T3,T4,T5,T6> extends ActionResultWithData5<T1,T2,T3,T4,T5>
{
    public Data6:T6|undefined;
}

export class BaseResultWithData<T>
{
    public Data:T|undefined;
}

export class BaseResultWithData2<T1,T2> extends BaseResultWithData<T1>
{
    public Data2:T2|undefined;
}

export class BaseResultWithData3<T1,T2,T3> extends BaseResultWithData2<T1,T2>
{
    public Data3:T3|undefined;
}

export class BaseResultWithData4<T1,T2,T3,T4> extends BaseResultWithData3<T1,T2,T3>
{
    public Data4:T4|undefined;
}

export class BaseResultWithData5<T1,T2,T3,T4,T5> extends BaseResultWithData4<T1,T2,T3,T4>
{
    public Data5:T5|undefined;
}

Object.defineProperty(ActionResult.prototype,"ErrorData",{
    get:function(){
        return ((this as any)._ErrorData);
    },
    set:function(err:Error){
        if(!(err == undefined || err == null && (this as any)._ErrorData == undefined || (this as any)._ErrorData == null || JSON.stringify(err) == undefined ||
        JSON.stringify(err) == null || JSON.stringify(err) == "{}" || (this as any)._ErrorData == err))
        {
            console.error(JSON.stringify(err));
        }
        (this as any)._ErrorData = err;
    }
})