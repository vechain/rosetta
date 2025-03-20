# VeChain Rosetta Data API

Implementing Rosetta Data API of VeChainThor BlockChain

[![](https://badgen.net/badge/VeChainThorNode/>=2.0.1)]()
[![](https://badgen.net/badge/Network/main,test?list=|)]()
[![](https://badgen.net/badge/Rosetta/=1.4.12)]()

[![](https://badgen.net/badge/node/>=16.6)]()
[![](https://badgen.net/badge/typescript/>=4.7.4?icon=typescript&label)]()
[![](https://badgen.net/badge/docker/>=20.10.17?icon=docker&label)]()
[![](https://badgen.net/badge/Status/testing/orange)]()

## Installation

### Getting the source

- Clone the repo

``` shell
    git clone https://github.com/vechain/rosetta.git
    cd rosetta
```

### Building

- Building Docker

``` shell
    docker build ./ -t vechain/rosetta-server:latest
```

### Docker

``` sh
    docker run -d\
    -v {path-to-data-directory}:/data\
    -p {host_address_port}:8080 -p {host_address_port}:8669 -p 11235:11235 -p 11235:11235/udp\
    --env NETWORK={network_type} --env MODE={run_mode}\
    vechain/rosetta-server:latest
```

- `path-to-data-directory` directory for data
- `host_address_port` rosetta api service listening address
- `network_type` rosetta and thornode to join network type (main|test)
- `run_mode` the api service run mode (online|offline),if the mode is offline, some apis can not be used.

#### Example

``` shell
    docker run -d\
    -v /Users/rosetta/data/:/data\
    -p 0.0.0.0:8080:8080 -p 0.0.0.0:8669:8669 -p 11235:11235 -p 11235:11235/udp\
    --env NETWORK=main --env MODE=online\
    vechain/rosetta-server:latest
```

## Endpoints

This implementation is meant to cover [this reference](https://docs.cdp.coinbase.com/mesh/docs/api-reference).

### Account

Method| Endpoint | Implemented | Description | Mode
---------|----------|---------|---------|---------
POST | /account/balance | Yes | Get an Account Balance | online
POST | /account/coins | No |

### Block

Method| Endpoint | Implemented | Description | Mode
---------|----------|---------|---------|---------
POST | /block | Yes | Get a Block | online
POST | /block/transaction | Yes | Get a Block Transaction | online

### Call

Method| Endpoint | Implemented | Description | Mode
---------|----------|---------|---------|---------
POST | /call | No | |

### Construction

Method| Endpoint | Implemented | Description | Mode
---------|----------|---------|---------|---------
POST | /construction/combine | Yes | Create Network Transaction from Signatures | online & offline
POST | /construction/derive | Yes | Derive an AccountIdentifier from a PublicKey | online & offline
POST | /construction/hash | Yes | Get the Hash of a Signed Transaction | online & offline
POST | /construction/metadata | Yes | Get Metadata for Transaction Construction | online
POST | /construction/parse | Yes | Parse a Transaction | online & offline
POST | /construction/payloads | Yes | Generate an Unsigned Transaction and Signing Payloads | online & offline
POST | /construction/preprocess | Yes | Create a Request to Fetch Metadata | online & offline
POST | /construction/submit | Yes | Submit a Signed Transaction | online

### Events

Method| Endpoint | Implemented | Description | Mode
---------|----------|---------|---------|---------
POST | /events/blocks | Yes | [INDEXER] Get a range of BlockEvents | online

### Mempool

Method| Endpoint | Implemented | Description | Mode
---------|----------|---------|---------|---------
POST | /mempool | No | Get All Mempool Transactions
POST | /mempool/transaction | No | Get a Mempool Transaction

### Network

Method| Endpoint | Implemented | Description | Mode
---------|----------|---------|---------|---------
POST | /network/list | Yes | Get List of Available Networks | online & offline
POST | /network/options | Yes | Get Network Options | online & offline
POST | /network/status | Yes | Get Network Status | online

### Search

Method| Endpoint | Implemented | Description | Mode
---------|----------|---------|---------|---------
POST | /search/transactions | Yes | [INDEXER] Search for Transactions | online

## About Fee Delegation (VIP191)

- VeChain Rosetta implement support Fee Delegation (**[VIP-191](https://github.com/vechain/VIPs/blob/master/vips/VIP-191.md)**).

### Why exchanges need VIP191

- The exchange will transfer currencies from hot wallet to the safe cold wallet from time to time. When there's not enough VTHO in the hot wallet or want to transfer all currencies includ VTHO, the exchange can use VIP191 function to pay the transaction fee.

### How to use it

- Step 1: Create a VIP191 payload

Create a VIP191 payload, add `FeeDelegation` operation to operations, `account` is fee delegator address, `amount.value` default 0.

``` json
    {
    "network_identifier": {
        "blockchain": "vechainthor",
        "network": "test"
    },
    "operations": [
        {
            "operation_identifier": {
                "index": 0,
                "network_index": 0
            },
            "type": "Transfer",
            "status": "None",
            "account": {
                "address": "0x16277a1ff38678291c41d1820957c78bb5da59ce"
            },
            "amount": {
                "value": "10000",
                "currency": {
                    "symbol": "VET",
                    "decimals": 18
                },
                "metadata": {}
            }
        },
        {
            "operation_identifier": {
                "index": 0,
                "network_index": 1
            },
            "type": "Transfer",
            "status": "None",
            "account": {
                "address": "0xc05c334533c673582616ac2bf404b6c55efa1087"
            },
            "amount": {
                "value": "-10000",
                "currency": {
                    "symbol": "VET",
                    "decimals": 18
                },
                "metadata": {}
            }
        },
        {
            "operation_identifier": {
                "index": 0,
                "network_index": 2
            },
            "type": "FeeDelegation",
            "status": "None",
            "account": {
                "address": "0x4251630dc820e90a5a6d14d79cac7acb93917983"
            },
            "amount": {
                "value": "-210000000000000000",
                "currency": {
                    "symbol": "VTHO",
                    "decimals": 18,
                    "metadata": {
                        "contractAddress": "0x0000000000000000000000000000456E65726779"
                    }
                },
                "metadata": {}
            }
        }
    ]
}
```

- Step 2: Call /construction/preprocess

When calling /construction/preprocess use VIP191 payloads, the api will return options and two required_public_keys, the first is transaction origin's public key,the second is fee-dalegation payer's public key.
``` json
  {
    "options": {
        "clauses": [
            {
                "to": "0x16277a1ff38678291c41d1820957c78bb5da59ce",
                "value": "10000",
                "data": "0x00"
            }
        ]
    },
    "required_public_keys": [
        {
            "address": "0xc05c334533c673582616ac2bf404b6c55efa1087"
        },
        {
            "address": "0x4251630dc820e90a5a6d14d79cac7acb93917983"
        }
    ]
}
```

- Step 3: Call /construction/metadata

Use step 2 return value to call /construction/metadata, the api will calculate the gas online, return `metadata` and `suggested_fee`.
``` json
{
    "metadata": {
        "blockRef": "0x00d88b4ab127a39e",
        "chainTag": 39,
        "gas": 25200
    },
    "suggested_fee": [
        {
            "value": "2520000000",
            "currency": {
                "symbol": "VTHO",
                "decimals": 18,
                "metadata": {
                    "contractAddress": "0x0000000000000000000000000000456E65726779"
                }
            }
        }
    ]
}
```

- Step 4: Call /construction/payloads

``` json
{
    "network_identifier": {
        "blockchain": "vechainthor",
        "network": "test"
    },
    "operations": [
        {
            "operation_identifier": {
                "index": 0,
                "network_index": 0
            },
            "type": "Transfer",
            "status": "None",
            "account": {
                "address": "0x16277a1ff38678291c41d1820957c78bb5da59ce"
            },
            "amount": {
                "value": "10000",
                "currency": {
                    "symbol": "VET",
                    "decimals": 18
                },
                "metadata": {}
            }
        },
        {
            "operation_identifier": {
                "index": 0,
                "network_index": 1
            },
            "type": "Transfer",
            "status": "None",
            "account": {
                "address": "0xc05c334533c673582616ac2bf404b6c55efa1087"
            },
            "amount": {
                "value": "-10000",
                "currency": {
                    "symbol": "VET",
                    "decimals": 18
                },
                "metadata": {}
            }
        },
        {
            "operation_identifier": {
                "index": 0,
                "network_index": 2
            },
            "type": "FeeDelegation",
            "status": "None",
            "account": {
                "address": "0x4251630dc820e90a5a6d14d79cac7acb93917983"
            },
            "amount": {
                "value": "-210000000000000000",
                "currency": {
                    "symbol": "VTHO",
                    "decimals": 18,
                    "metadata": {
                        "contractAddress": "0x0000000000000000000000000000456E65726779"
                    }
                },
                "metadata": {}
            }
        }
    ],
    "metadata": {
        "blockRef": "0x00d88b4ab127a39e",
        "chainTag": 39,
        "gas": 25200
    },
    "public_keys": [
        {
            "hex_bytes": "02d992bd203d2bf888389089db13d2d0807c1697091de377998efe6cf60d66fbb3",
            "curve_type": "secp256k1"
        },
        {
            "hex_bytes": "03a7e5b27bf35f3b1a863851a02b4d722927cd12f92bfb21f69c81c22fc4a1c6d3",
            "curve_type": "secp256k1"
        }
    ]
}
```

The api will return `unsigned_transaction` and `payloads`.

``` json
{
    "unsigned_transaction": "0xf85d278800d88b4ab127a39e81b4dad99416277a1ff38678291c41d1820957c78bb5da59ce822710808262708827c7571b85f5271594c05c334533c673582616ac2bf404b6c55efa1087944251630dc820e90a5a6d14d79cac7acb93917983",
    "payloads": [
        {
            "address": "0xc05c334533c673582616ac2bf404b6c55efa1087",
            "hex_bytes": "3fec5f2cfdd172e1372879992644513578a9917355488e23d5abf846990c1fe2",
            "signature_type": "ecdsa_recovery"
        },
        {
            "address": "0x4251630dc820e90a5a6d14d79cac7acb93917983",
            "hex_bytes": "16ff81dd942a6e42c6a352dbcf5615693c3659feb35cdc177d27a2851b73ee40",
            "signature_type": "ecdsa_recovery"
        }
    ]
}
```

- Step 5: Sign with transaction orgin and fee-delegation payer private keys and call `/construction/combine`

```json
{
    "network_identifier": {
        "blockchain": "vechainthor",
        "network": "test"
    },
    "unsigned_transaction": "0xf85d278800d852ba843f1d4181b4dad99416277a1ff38678291c41d1820957c78bb5da59ce8227108082627088556581012357229594c05c334533c673582616ac2bf404b6c55efa1087944251630dc820e90a5a6d14d79cac7acb93917983",
    "signatures": [
        {
            "signing_payload": {
                "address": "0xc05c334533c673582616ac2bf404b6c55efa1087",
                "hex_bytes": "3fec5f2cfdd172e1372879992644513578a9917355488e23d5abf846990c1fe2",
                "signature_type": "ecdsa_recovery"
            },
            "public_key": {
                "hex_bytes": "02d992bd203d2bf888389089db13d2d0807c1697091de377998efe6cf60d66fbb3",
                "curve_type": "secp256k1"
            },
            "signature_type": "ecdsa_recovery",
            "hex_bytes": "4ad82781abf5866020c9bf6a7b07f94ba4bb9e95ac1ca3c858ded24c08b6856213589bac265f656a87da255b855cfab9a96020d450593df2481015188ae7927000"
        },
        {
            "signing_payload": {
                "address": "0x4251630dc820e90a5a6d14d79cac7acb93917983",
                "hex_bytes": "16ff81dd942a6e42c6a352dbcf5615693c3659feb35cdc177d27a2851b73ee40",
                "signature_type": "ecdsa_recovery"
            },
            "public_key": {
                "hex_bytes": "036aafc0aa461c6b2de2ca8a254ebc6685946a08dd7656dbb935ce4ce5cfac355b",
                "curve_type": "secp256k1"
            },
            "signature_type": "ecdsa_recovery",
            "hex_bytes": "7d6df64de2c4084b7809bdeba85784c6d031dd943e96271ac1cd22f3da9b5c3f2e610ec2d50e576583cff2d386fd6f7069b2883ca023b6000575ec0fcf4ddc9800"
        }
    ]
}
```