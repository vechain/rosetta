import { GlobalEnvironment, iConfig } from "../../app/globalEnvironment";
import { NetworkType } from "../types/networkType";
import { ActionResultWithData, ActionResultWithData2 } from "../../utils/components/actionResult";
import { NetworkIdentifier, NetworkOptionsResponse, Peer, SyncStatus } from "../types/network";
import { RosettaErrorDefine, IRosettaError } from "../types/rosettaError";
import { ConstructionMetaData } from "../types/constructionMetaData";
import ConnexEx from "../../utils/helper/connexEx";
import { OperationStatus, IOperationStatus, RosettaAllow, RosettaVersion, BalanceExemption, BalanceExemptionType } from "../types/rosetta";
import { OperationType } from "../types/transaction";
import ThorPeer from "../types/peer";
import { HttpClientHelper } from "../../utils/helper/httpClientHelper";
import { BlockIdentifier } from "../types/block";
import { BigNumberEx } from "../../utils/helper/bigNumberEx";
import { Currency } from "../types/amount";

export class BaseInfoService {
    private _environment: GlobalEnvironment;

    constructor(environment: GlobalEnvironment) {
        this._environment = environment;
    }

    public getVeChainNetInfo(type: NetworkType): ActionResultWithData<NetworkIdentifier> {
        let result = new ActionResultWithData<NetworkIdentifier>();
        let connex = this._environment.getConnex(type);
        if (connex) {
            result = this._getVeChainMainNet();
        } else {
            result.Result = false;
            result.ErrorData = RosettaErrorDefine.NODECONNETCONNECTION;
        }
        return result;
    }

    public getNetworkList(): ActionResultWithData<Array<NetworkIdentifier>> {
        let result = new ActionResultWithData<Array<NetworkIdentifier>>();
        result.Data = new Array<NetworkIdentifier>();

        if((this._environment.config.mode as string) == "online"){
            if (this._environment.netconnex != null && this._environment.netconnex.NetWorkType == NetworkType.MainNet) {
                result.Data.push((this._getVeChainMainNet()).Data!);
                result.Result = true;
            }
    
            if (this._environment.netconnex != null && this._environment.netconnex.NetWorkType == NetworkType.TestNet) {
                result.Data.push((this._getVeChainTestNet()).Data!);
                result.Result = true;
            }
    
            if (!result.Result) {
                result.ErrorData = RosettaErrorDefine.NODECONNETCONNECTION;
            }
        } else {
            result.Data.push((this._getVeChainMainNet()).Data!);
            result.Data.push((this._getVeChainTestNet()).Data!);
            result.Result = true;
        }

        return result;
    }

    public getConstructionMetadata(type: NetworkType): ActionResultWithData<ConstructionMetaData> {
        let result = new ActionResultWithData<ConstructionMetaData>();
        let connex = this._environment.getConnex(type);
        if (connex) {
            result = this._getConstructionMetadata(connex);
        } else {
            result.Result = false;
            result.ErrorData = RosettaErrorDefine.NODECONNETCONNECTION;
        }
        return result;
    }

    public getNetworkOptions(type: NetworkType): ActionResultWithData<NetworkOptionsResponse> {
        let result = new ActionResultWithData<NetworkOptionsResponse>();
        let connex = this._environment.getConnex(type);

        if (connex) {
            let versionInfo = new RosettaVersion();
            versionInfo.rosetta_version = (this._environment.config as iConfig).rosetta_version;
            versionInfo.node_version = this._environment.config.netconfig.node_version as String;

            let allow = new RosettaAllow();
            allow.operation_statuses = this._getOperationStatuses();
            allow.operation_types = this._getOperationTypes();
            allow.errors = this._getOperationErrors();
            allow.historical_balance_lookup = true;
            allow.balance_exemptions = this._getBalanceExemptions();

            result.Data = new NetworkOptionsResponse();
            result.Data.version = versionInfo;
            result.Data.allow = allow;
            result.Result = true;

        } else {
            result.Result = false;
            result.ErrorData = RosettaErrorDefine.NODECONNETCONNECTION;
        }

        return result;
    }

    public async getSyncStatus(type: NetworkType): Promise<ActionResultWithData2<SyncStatus,Array<ThorPeer>>> {
        let result = new ActionResultWithData2<SyncStatus,Array<ThorPeer>>();
        let connex = this._environment.getConnex(type);

        if (connex) {
            let peersResult = await this._getPeers(connex);
            if(peersResult.Result){
                result.Data2 = peersResult.Data;
                if(connex.thor.status.progress == 1){
                    result.Data = undefined;
                } else {
                    result.Data = new SyncStatus();
                    result.Data.current_index = connex.thor.status.head.number;
                    result.Data.target_index = this._getTargetBlockIdentifier(peersResult.Data!).index;
                    result.Data.stage = "block sync";
                }
                result.Result = true;
            }else{
                result.copyBase(peersResult);
            }
        } else {
            result.Result = false;
            result.ErrorData = RosettaErrorDefine.NODECONNETCONNECTION;
        }

        return result;
    }

    public async getPeers(type: NetworkType): Promise<ActionResultWithData<Array<ThorPeer>>> {
        let result = new ActionResultWithData<Array<ThorPeer>>();
        let connex = this._environment.getConnex(type);

        if (connex) {
            result = await this._getPeers(connex);
        } else {
            result.Result = false;
            result.ErrorData = RosettaErrorDefine.NODECONNETCONNECTION;
        }
        return result;
    }

    private _getVeChainMainNet(): ActionResultWithData<NetworkIdentifier> {
        let result = new ActionResultWithData<NetworkIdentifier>();

        let networkIdentifier = new NetworkIdentifier();
        networkIdentifier.blockchain = "vechainthor";
        networkIdentifier.network = NetworkType.MainNet.toString();

        result.Result = true;
        result.Data = networkIdentifier;
        return result;
    }

    private _getVeChainTestNet(): ActionResultWithData<NetworkIdentifier> {
        let result = new ActionResultWithData<NetworkIdentifier>();

        let networkIdentifier = new NetworkIdentifier();
        networkIdentifier.blockchain = "vechainthor";
        networkIdentifier.network = NetworkType.TestNet.toString();

        result.Result = true;
        result.Data = networkIdentifier;
        return result;
    }

    private _getConstructionMetadata(connex: ConnexEx): ActionResultWithData<ConstructionMetaData> {
        let result = new ActionResultWithData<ConstructionMetaData>();

        if (connex.thor.status.progress == 1) {
            let construction = new ConstructionMetaData();
            construction.chainTag = connex.chainTag;
            construction.blockRef = connex.blockRef;

            result.Data = construction;
            result.Result = true;
        } else {
            result.Result = false;
            result.ErrorData = RosettaErrorDefine.NODESYNCNOTCOMPLETE;
        }

        return result;
    }

    private _getOperationStatuses(): Array<IOperationStatus> {
        let result = new Array<IOperationStatus>();
        for (const property of Object.getOwnPropertyNames(OperationStatus)) {
            if (['length', 'prototype', 'name'].indexOf(property) < 0) {
                result.push((OperationStatus as any)[property]);
            }
        }
        return result;
    }

    private _getOperationTypes(): Array<String> {
        let result = new Array<String>();
        for (const property of Object.getOwnPropertyNames(OperationType)) {
            if (['length', 'prototype', 'name'].indexOf(property) < 0) {
                result.push((OperationType as any)[property]);
            }
        }
        return result;
    }

    private _getOperationErrors(): Array<IRosettaError> {
        let result = new Array<IRosettaError>();
        for (const property of Object.getOwnPropertyNames(RosettaErrorDefine)) {
            if (['length', 'prototype', 'name'].indexOf(property) < 0) {
                result.push((RosettaErrorDefine as any)[property]);
            }
        }
        return result;
    }

    private async _getPeers(connex: ConnexEx): Promise<ActionResultWithData<Array<ThorPeer>>> {
        let result = new ActionResultWithData<Array<ThorPeer>>();
        result.Data = new Array<ThorPeer>();

        let apiUrl = connex.baseUrl + "/node/network/peers";

        let client = new HttpClientHelper(apiUrl);
        let httpResult = await client.doRequest("GET", undefined, undefined, undefined);
        if (httpResult.Result && httpResult.Data && httpResult.Data.constructor.name == "Array") {
            for (let item of httpResult.Data) {
                result.Data.push((item as ThorPeer));
            }
            result.Result = true;
        }
        else {
            result.Result = false;
            result.ErrorData = RosettaErrorDefine.NODEAPIERROR;
        }
        return result;
    }

    private _getTargetBlockIdentifier(peers:Array<ThorPeer>):BlockIdentifier
    {
        let result = new BlockIdentifier();
        for(const peer of peers){
            let bestBlockNumber = new BigNumberEx(peer.bestBlockID.substr(0,10)).toNumber();
            if(bestBlockNumber > result.index){
                result.index = bestBlockNumber;
                result.hash = peer.bestBlockID;
            }
        }
        return result;
    }

    private _getBalanceExemptions():Array<BalanceExemption>
    {
        let result = new Array<BalanceExemption>();
        let vthoBalanceExemption = new BalanceExemption();
        //vthoBalanceExemption.sub_account_address = "0x0000000000000000000000000000456e65726779";
        vthoBalanceExemption.currency = new Currency();
        vthoBalanceExemption.currency.symbol = "VTHO";
        vthoBalanceExemption.currency.decimals = 18;
        vthoBalanceExemption.currency.metadata = undefined;
        vthoBalanceExemption.exemption_type = BalanceExemptionType.BalanceGreaterOrEqual;
        result.push(vthoBalanceExemption);
        return result;
    }
}