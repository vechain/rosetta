import { GlobalEnvironment, iConfig } from "./globalEnvironment";
import ActiveSupportServices from "./activeSupportService";
import { ActionResult } from "../utils/components/actionResult";
import { LogHelperLevel } from "../utils/helper/logHelper";
import { VeChainKoaServer } from "./rosettaServer";
import path = require('path');

let configPath = path.join(__dirname, "../../config/config.json");
let config = require(configPath);

let tokenConfigPath = path.join(__dirname, "../../config/tokenconfig.json");
let tokenConfig = require(tokenConfigPath);

process.setMaxListeners(50);

let globalEnvironment = new GlobalEnvironment(config as iConfig);
globalEnvironment.loadIP180TokenConfig(tokenConfig);

globalEnvironment.config.netconfig.network = process.env["MAINNET"] as string;
globalEnvironment.config.netconfig.node_version = process.env["THORNODE_VERSION"] as string;

export let environment = globalEnvironment;
export let logHelper = globalEnvironment.logHelper;

ActiveSupportServices.activieSupportServices(globalEnvironment).then(actionResult =>{
    if(actionResult.Result){
        let port = globalEnvironment.config.port || 8030;
        let app = new VeChainKoaServer(environment);
        app.listen(globalEnvironment.config.port || 8030);
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
