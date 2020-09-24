import Router   from 'koa-router'
import { environment } from '.';
import { AccountRouter } from './controllers/account/router';
import { BlockRouter } from './controllers/block/router';
import { ConstructionRouter } from './controllers/construction/router';
import { NetworkRouter } from './controllers/network/router';

export default class RootRouter extends Router{
    constructor(){
        super();
        new AccountRouter(environment);
        new BlockRouter(environment);
        new ConstructionRouter(environment);
        new NetworkRouter(environment);
        for(const router of environment.routerArray){
            if(router.addRootRouter){
                this.use("",router.routes()).use(router.allowedMethods());
            }
        }
    }
}

