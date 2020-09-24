# VeChain Rosetta Data API

Implementing Rosetta Data API of VeChainThor BlockChain

[![](https://badgen.net/badge/VeChainThorNode/=1.3.4)]()
[![](https://badgen.net/badge/Network/main,test?list=|)]()
[![](https://badgen.net/badge/Rosetta/=1.3.4)]()

[![](https://badgen.net/badge/node/>=12.16)]()
[![](https://badgen.net/badge/typescript/>=3.8.3?icon=typescript&label)]()
[![](https://badgen.net/badge/docker/>=19.03.8?icon=docker&label)]()


## Installation

### Getting the source

- Clone the Thor repo

``` sh
    git clone https://github.com/vechain/rosetta-data-api-vechainthor.git
    cd rosetta-data-api-vechainthor
```
### Building

- Building Docker

``` sh
    docker build ./ -t vechain/rosetta-api-server:laster
```

### Docker

``` sh
    docker run -d\
    -v {path-to-thornode-data-directory}:/root/.org.vechain.thor\
    -p {host_address_port}:8080 -p {host_address_port}:8669 -p 11235:11235 -p 11235:11235/udp\
    --env MAINNET={network_type} --env THORNODE_VERSION={thornode_version} --env MODE={run_mode}\
    vechain/rosetta-api-server:laster
```

- `path-to-thornode-data-directory` directory for block-chain databases
- `host_address_port` rosetta api service listening address
- `network_type` rosetta and thornode to join network type (main|test)
- `thornode_version` thornode version
- `run_mode` the api service run mode (online|offline),if the mode is offline, some apis can not be used.

#### example
``` sh
    docker run -d\
    -v /Users/rosetta/data/:/root/.org.vechain.thor\
    -p 0.0.0.0:8080:8080 -p 0.0.0.0:8669:8669 -p 11235:11235 -p 11235:11235/udp\
    --env MAINNET=main --env THORNODE_VERSION=v1.3.4 --env MODE=online\
    vechain/rosetta-api-server:laster
```

## Endpoints

### Account

Method| Endpoint | Implemented | Description | Mode
---------|----------|---------|---------|---------
POST | /account/balance | Yes || online

### Block

Method| Endpoint | Implemented | Description | Mode
---------|----------|---------|---------|---------
POST | /block | Yes || online
POST | /block/transaction | Yes || online

### Construction

Method| Endpoint | Implemented | Description | Mode
---------|----------|---------|---------|---------
POST | /construction/combine | Yes || online & offline
POST | /construction/derive | Yes || online & offline
POST | /construction/hash | Yes || online & offline
POST | /construction/metadata | Yes || online
POST | /construction/parse | Yes || online & offline
POST | /construction/payloads | Yes || online & offline
POST | /construction/preprocess | Yes || online & offline
POST | /construction/submit | Yes || online

### Mempool

Method| Endpoint | Implemented | Description | Mode
---------|----------|---------|---------|---------
POST | /construction/metadata | No | Node Api no support
POST | /construction/submit | No | Node Api no support

### Network

Method| Endpoint | Implemented | Description | Mode
---------|----------|---------|---------|---------
POST | /network/list | Yes || online & offline
POST | /network/options | Yes || online & offline
POST | /network/status | Yes || online
