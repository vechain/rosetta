export abstract class BaseController {
    constructor(env:any) {
        this.environment = env;
    }

    protected environment:any;
}