import { GlobalEnvironment, iConfig } from "./globalEnvironment";
import ActiveSupportServices from "./activeSupportService";
import { ActionResult } from "../utils/components/actionResult";
import { LogHelperLevel } from "../utils/helper/logHelper";
import { VeChainKoaServer } from "./rosettaServer";
import path = require('path');

let configPath = path.join(__dirname, "../../config/config.json");
let config = require(configPath);

process.setMaxListeners(50);

let globalEnvironment = new GlobalEnvironment(config as iConfig);

//set rosetta version
globalEnvironment.config.rosetta_version = "1.3.1";

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
