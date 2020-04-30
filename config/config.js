module.exports = {
    env:"local",
    serviceName:"Rosetta-VET-Serve",
    logLevel:"trace",
    logEnvLevel:"local",
    port:8030,
    vechainThorNodeConfig:{
        mainnet_node_api_addr:"https://sync-mainnet.vechain.org",
        testnet_node_api_addr:"https://sync-testnet.vechain.org",
        mainnet_node_version:"1.3.3",
        testnet_node_version:"1.3.3"
    },
    rosettaConfig:{
        version:"1.3.1"
    }
}