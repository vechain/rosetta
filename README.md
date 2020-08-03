# VeChain Rosetta Data API

Implementing Rosetta Data API of VeChainThor BlockChain

[![](https://badgen.net/badge/VeChainThorNode/=1.3.1)]()
[![](https://badgen.net/badge/Network/main,test?list=|)]()
[![](https://badgen.net/badge/Rosetta/=1.3.1)]()

[![](https://badgen.net/badge/node/>=12.16)]()
[![](https://badgen.net/badge/typescript/>=3.8.3?icon=typescript&label)]()
[![](https://badgen.net/badge/docker/>=19.03.8?icon=docker&label)]()

## Endpoints

### Account

Method| Endpoint | Implemented | Description
---------|----------|---------|---------
POST | /account/balance | Yes

### Block

Method| Endpoint | Implemented | Description
---------|----------|---------|---------
POST | /block | Yes
POST | /block/transaction | Yes

### Construction

Method| Endpoint | Implemented | Description
---------|----------|---------|---------
POST | /construction/metadata | Yes
POST | /construction/submit | Yes

### Mempool

Method| Endpoint | Implemented | Description
---------|----------|---------|---------
POST | /construction/metadata | No | Node Api no support
POST | /construction/submit | No | Node Api no support

### Network

Method| Endpoint | Implemented | Description
---------|----------|---------|---------
POST | /network/list | Yes |
POST | /network/options | Yes |
POST | /network/status | Yes |
