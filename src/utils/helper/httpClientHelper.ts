import httpRequest from 'request';
import { ActionResultWithData } from '../components/actionResult';
var format = require('string-format');

export class HttpClientHelper
{
    public Url:string;

    public constructor(url:string){
        this.Url = url;
    }

    public async doRequest(method:string,parames:Array<{key:string,value:string}>|undefined,headers:any|undefined,body:any|undefined):Promise<ActionResultWithData<any>>
    {
        let url = this._addParamesToURL(this.Url,parames);
        let options:httpRequest.CoreOptions = {
            method:method,
            json:true,
            headers:headers,
            body:body,
            timeout:40000
        };
        let debuginfo = `url${url} options ${JSON.stringify(options)}`;
        console.log(debuginfo);
        return new Promise((resolve:(result:ActionResultWithData<any>)=>void)=>{
            httpRequest(url,options,(error: any, response: httpRequest.RequestResponse, body: any) =>{
                let httpResult = new ActionResultWithData<any>();
                if(!error && response && response.statusCode && response.statusCode == 200){
                    httpResult.Result = true;
                    httpResult.Data = body;
                } else if (!response){
                    httpResult.Result = false;
                    httpResult.Code = String(400);
                    httpResult.Message = `response null ${debuginfo}`;
                    httpResult.ErrorData = error;
                }
                else if (response.statusCode && response.statusCode>=300){
                    httpResult.Result = false;
                    httpResult.Code = String(response.statusCode);
                    httpResult.Message = `response.statusCode && response.statusCode>=300 ${debuginfo}`;
                    httpResult.ErrorData = error;
                }
                else{
                    httpResult.Result = false;
                    httpResult.Code = "-500";
                    httpResult.Message =`Http request error ${debuginfo}`;
                    httpResult.ErrorData = error;
                }
                resolve(httpResult);
            });
        });
    }

    private _addParamesToURL(url:string,parames:Array<{key:string,value:string}>|undefined):string
    {
        let resultString = url;
        let paramesString = "";
        if(parames && parames.length>0){
            for(let index = 0;index<parames.length;index++){
                if(index>0){
                    paramesString += "&";
                }
                paramesString += format("{key}={value}",{key:parames[index].key,value:parames[index].value});
            }
        }
        if(paramesString && paramesString.length>0){
            resultString = url+"?"+paramesString;
        }
        return resultString;
    }
}