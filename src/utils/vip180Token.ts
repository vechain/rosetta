import Axios from "axios";
import { Contract } from "myvetools";
import { abi } from "thor-devkit";
import ConnexPro from "./connexPro";

interface AccountDataResponse {
    hasCode: boolean;
}

export class VIP180Token {
    private readonly contract:Contract;

    constructor(addr:string,connex:ConnexPro){
        this.connex = connex ;
        this.contract = new Contract({abi:VIP180Token.contractAbi,connex:this.connex,address:addr});
    }

    public async name():Promise<string>{
        const call = await this.contract.call('name');
        return String(call.decoded[0]);
    }

    public async symbol():Promise<string>{
        const call = await this.contract.call('symbol');
        return String(call.decoded[0]);
    }

    public async decimals():Promise<number>{
        const call = await this.contract.call('decimals');
        return Number(call.decoded[0]);
    }

    public async totalSupply():Promise<bigint>{
        const call = await this.contract.call('totalSupply');
        return BigInt(call.decoded[0]);
    }

    public async balanceOf(owner:string,revision?:string):Promise<bigint>{
        const balanceOfAbi = (VIP180Token.contractAbi as Array<any>).find( i => {return i.name == 'balanceOf';})
        const fun = new abi.Function(balanceOfAbi);
        const data = fun.encode(owner);
        const explainArg = {
            clauses:[{
                to:this.contract.address,
                value:'',
                data:data
            }]
        }
        const vmResult = await this.connex.driver.explain(explainArg,revision || 'best');
        if(vmResult[0].data != '0x'){
            const decode = fun.decode(vmResult[0].data);
            return BigInt(decode[0]);
        }
        return BigInt(0);
    }

    public async allowance(owner:string,spender:string):Promise<bigint>{
        const call = await this.contract.call('allowance',owner,spender);
        return BigInt(call.decoded[0]);
    }

    public async baseInfo():Promise<{name:string,symbol:string,decimals:number}>{
        const name = await this.name();
        const symbol = await this.symbol();
        const decimals = await this.decimals();
        return {name:name,symbol:symbol,decimals:decimals};
    }

    public async created(revision?:string):Promise<boolean>{
        const url = this.connex.baseUrl + '/accounts/' + this.contract.address;
        const acc = await Axios({url:url,method:'Get',responseType:'json',params:{revision:revision}});
        const data = acc.data as unknown as AccountDataResponse;
        return data.hasCode;
    }

    public static readonly contractAbi = JSON.parse(`[
        {
            "inputs": [
                {
                    "internalType": "string",
                    "name": "_name",
                    "type": "string"
                },
                {
                    "internalType": "string",
                    "name": "_symbol",
                    "type": "string"
                },
                {
                    "internalType": "uint8",
                    "name": "_decimals",
                    "type": "uint8"
                },
                {
                    "internalType": "address",
                    "name": "_bridge",
                    "type": "address"
                }
            ],
            "stateMutability": "nonpayable",
            "type": "constructor"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "_from",
                    "type": "address"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "_to",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "_amount",
                    "type": "uint256"
                }
            ],
            "name": "Approval",
            "type": "event",
            "signature": "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925"
        },
        {
            "anonymous": false,
            "inputs": [
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "_from",
                    "type": "address"
                },
                {
                    "indexed": true,
                    "internalType": "address",
                    "name": "_to",
                    "type": "address"
                },
                {
                    "indexed": false,
                    "internalType": "uint256",
                    "name": "_amount",
                    "type": "uint256"
                }
            ],
            "name": "Transfer",
            "type": "event",
            "signature": "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                },
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "name": "allowance",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function",
            "constant": true,
            "signature": "0xdd62ed3e"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "_spender",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "_amount",
                    "type": "uint256"
                }
            ],
            "name": "approve",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            "stateMutability": "nonpayable",
            "type": "function",
            "signature": "0x095ea7b3"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "name": "balanceOf",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function",
            "constant": true,
            "signature": "0x70a08231"
        },
        {
            "inputs": [],
            "name": "bridge",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function",
            "constant": true,
            "signature": "0xe78cea92"
        },
        {
            "inputs": [],
            "name": "decimals",
            "outputs": [
                {
                    "internalType": "uint8",
                    "name": "",
                    "type": "uint8"
                }
            ],
            "stateMutability": "view",
            "type": "function",
            "constant": true,
            "signature": "0x313ce567"
        },
        {
            "inputs": [],
            "name": "name",
            "outputs": [
                {
                    "internalType": "string",
                    "name": "",
                    "type": "string"
                }
            ],
            "stateMutability": "view",
            "type": "function",
            "constant": true,
            "signature": "0x06fdde03"
        },
        {
            "inputs": [],
            "name": "symbol",
            "outputs": [
                {
                    "internalType": "string",
                    "name": "",
                    "type": "string"
                }
            ],
            "stateMutability": "view",
            "type": "function",
            "constant": true,
            "signature": "0x95d89b41"
        },
        {
            "inputs": [],
            "name": "totalSupply",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function",
            "constant": true,
            "signature": "0x18160ddd"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "_to",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "_amount",
                    "type": "uint256"
                }
            ],
            "name": "transfer",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            "stateMutability": "nonpayable",
            "type": "function",
            "signature": "0xa9059cbb"
        },
        {
            "inputs": [
                {
                    "internalType": "address",
                    "name": "_from",
                    "type": "address"
                },
                {
                    "internalType": "address",
                    "name": "_to",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "_amount",
                    "type": "uint256"
                }
            ],
            "name": "transferFrom",
            "outputs": [
                {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                }
            ],
            "stateMutability": "nonpayable",
            "type": "function",
            "signature": "0x23b872dd"
        }
    ]`); 

    public static filterEvents(events:Connex.VM.Event[],address:string,eventName:string):Connex.VM.Event[] {
        const result = Array<Connex.VM.Event>();
        const eventAbi = new abi.Event((VIP180Token.contractAbi as Array<any>).find( i => {return i.name == eventName;}));
        for(const ev of events){
            if(ev.address.toLowerCase() == address.toLowerCase() && (ev.topics[0] || '').toLowerCase() == eventAbi.signature.toLowerCase()){
                result.push(ev);
            }
        }
        return result;
    }

    public static decodeCallData(data:string,fName:string):abi.Decoded{
        const funAbi = new abi.Function((VIP180Token.contractAbi as Array<any>).find( i => {return i.name == fName;}));
        return abi.decodeParameters(funAbi.definition.inputs,'0x' + data.substring(10));
    }

    public static encode(fName:string,...args:any[]):string{
        const funAbi = new abi.Function((VIP180Token.contractAbi as Array<any>).find( i => {return i.name == fName;}));
        return funAbi.encode(...args);
    }
    
    
    private connex:ConnexPro;
}