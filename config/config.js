module.exports = {
    env:process.env["env"] || "local",
    serviceName:"Rosetta-VET-Serve",
    logLevel:process.env["logLevel"] || "trace",
    logEnvLevel:process.env["logEnvLevel"] || "local",
    port:8030,
    vechainThorNodeConfig:{
        mainnet_node_api_addr:process.env["mainnet_node_api_addr"] || "https://sync-mainnet.vechain.org",
        testnet_node_api_addr:process.env["testnet_node_api_addr"] || "https://sync-testnet.vechain.org",
        mainnet_node_version: "1.3.1",
        testnet_node_version: "1.3.1"
    },
    rosettaConfig:{
        version:"1.3.1"
    }
}