import { GlobalEnvironment, iConfig } from "./globalEnvironment";
import ActiveSupportServices from "./activeSupportService";
import { ActionResult } from "../utils/components/actionResult";
import { LogHelperLevel } from "../utils/helper/logHelper";
import { VeChainKoaServer } from "./rosettaServer";
import path = require('path');
import * as file from 'fs';


process.setMaxListeners(50);

let configPath = path.join(__dirname, "../../config/config.json");
let config = require(configPath);

let tokenConfig:any|undefined;
let tokenConfigPath = path.join(__dirname, "../../config/tokenconfig.json");
if(file.existsSync(tokenConfigPath)){
    tokenConfig = require(tokenConfigPath);
}

let globalEnvironment = new GlobalEnvironment(config as iConfig);
globalEnvironment.loadIP180TokenConfig(tokenConfig);

globalEnvironment.config.netconfig.network = process.env["NETWORK"] as string || "main";
globalEnvironment.config.netconfig.node_version = process.env["THORNODE_VERSION"] as string;
globalEnvironment.config.mode = process.env["MODE"] as string || "online";

export let environment = globalEnvironment;
export let logHelper = globalEnvironment.logHelper;

ActiveSupportServices.activieSupportServices(globalEnvironment).then(actionResult =>{
    if(actionResult.Result){
        let port = globalEnvironment.config.port || 8080;
        let app = new VeChainKoaServer(environment);
        app.listen(port);
        logHelper.log(LogHelperLevel.INFO,"VeChain TokenSwap Server Active Successful Port:"+port);
    }
    else{
        logHelper.log(LogHelperLevel.ERROR,"Support Active Faild: " + actionResult.Message);
        process.exit();
    }
}).catch(error => {
    logHelper.log(LogHelperLevel.ERROR,"Support Active Faild");
    process.exit();
});
