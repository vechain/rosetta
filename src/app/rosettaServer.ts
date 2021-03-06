import Koa from 'koa';
import RootRouter  from './rootRouter';
import bodyParser from "koa-bodyparser"
import { GlobalEnvironment } from './globalEnvironment';
import { URLCodeMiddleware } from './middleware/uricodeMiddleware';

export class VeChainKoaServer extends Koa
{
    constructor(globalEnvironment:GlobalEnvironment){
        super();
        this.rootRouter = new RootRouter();
        this.use(URLCodeMiddleware.URLDecoder);
        this.use(bodyParser());
        this.use(globalEnvironment.logHelper.httpLogger);
        this.use(this.rootRouter.routes()).use(this.rootRouter.allowedMethods());
    }

    private rootRouter:RootRouter;
}