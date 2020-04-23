module.exports = {
    env:"local",
    serviceName:"Rosetta-VET-Serve",
    logLevel:"trace",
    logEnvLevel:"local",
    port:8030,
    vechainThorNodeConfig:{
        mainnet_node_api_addr:"http://47.57.94.244:8669",
        testnet_node_api_addr:"https://sync-testnet.vechain.org"
    },
    rosettaConfig:{
        version:""
    }
}