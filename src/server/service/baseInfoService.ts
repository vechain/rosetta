import { GlobalEnvironment, iConfig } from "../../app/globalEnvironment";
import { NetworkType } from "../datameta/networkType";
import { ActionResultWithData, ActionResultWithData2 } from "../../utils/components/actionResult";
import { NetworkIdentifier, NetworkOptionsResponse, SyncStatus } from "../datameta/network";
import { RosettaErrorDefine, IRosettaError } from "../datameta/rosettaError";
import { ConstructionMetaData } from "../datameta/constructionMetaData";
import { BigNumberEx } from "../../utils/helper/bigNumberEx";
import ConnexEx from "../../utils/helper/connexEx";
import { OperationStatus, IOperationStatus, RosettaAllow, RosettaVersion } from "../datameta/rosetta";
import { OperationType } from "../datameta/transaction";

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
            versionInfo.node_version = connex.NodeVersion;

            let allow = new RosettaAllow();
            allow.operation_statuses = this._getOperationStatuses();
            allow.operation_types = this._getOperationTypes();
            allow.errors = this._getOperationErrors();
            allow.historical_balance_lookup = true;

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

    public getSyncStatus(type: NetworkType): ActionResultWithData<SyncStatus> {
        let result = new ActionResultWithData<SyncStatus>();
        let connex = this._environment.getConnex(type);

        if (connex) {
            if (connex.thor.status.progress == 1) {
                result.Data = undefined;
            } else {
                result.Data = new SyncStatus();
                result.Data.current_index = connex.thor.status.head.number;
                result.Data.target_index = undefined;
                result.Data.stage = "block sync";
            }
            result.Result = true;
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
}