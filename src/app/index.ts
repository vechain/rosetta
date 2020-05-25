import { GlobalEnvironment, iConfig } from "./globalEnvironment";
import ActiveSupportServices from "./activeSupportService";
import { ActionResult } from "../utils/components/actionResult";
import { LogHelperLevel } from "../utils/helper/logHelper";
import { VeChainKoaServer } from "./rosettaServer";
import path = require('path');

let configPath = path.join(__dirname, "../../config/config");
let config = require(configPath);

// let config = {
//     env:process.env["env"] || "local",
//     serviceName:"Rosetta-VET-Serve",
//     logLevel:process.env["logLevel"] || "trace",
//     logEnvLevel:process.env["logEnvLevel"] || "local",
//     port:8030,
//     vechainThorNodeConfig:{
//         mainnet_node_api_addr:process.env["mainnet_node_api_addr"] || "https://sync-mainnet.vechain.org",
//         testnet_node_api_addr:process.env["testnet_node_api_addr"] || "https://sync-testnet.vechain.org",
//         mainnet_node_version: "1.3.3",
//         testnet_node_version: "1.3.3"
//     },
//     rosettaConfig:{
//         version:"1.3.1"
//     }
// };

process.setMaxListeners(50);

let globalEnvironment = new GlobalEnvironment(config as iConfig);

//set rosetta version
globalEnvironment.config.rosettaConfig.version = "1.3.1";

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
