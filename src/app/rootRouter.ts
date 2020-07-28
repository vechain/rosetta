import Router   from 'koa-router'
import * as path from 'path';
const stringformat = require('string-format');

export default class RootRouter extends Router{
    constructor(){
        super();
        let routerArray = new Array<string>();
        routerArray.push("account","block","construction","network");
        if(routerArray && routerArray.length>0){
            for(let routerName of routerArray){
                let routerFilePath = path.join(__dirname,stringformat("./controllers/{router}/router",{router:routerName}));
                let router = require(routerFilePath);
                if(router instanceof Router){
                    this.use("",router.routes()).use(router.allowedMethods());
                }
            }
        }
    }
}

