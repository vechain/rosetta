import localVarRequest from "request";

export * from "./accountBalanceRequest";
export * from "./accountBalanceResponse";
export * from "./accountCoinsRequest";
export * from "./accountCoinsResponse";
export * from "./accountIdentifier";
export * from "./allow";
export * from "./amount";
export * from "./balanceExemption";
export * from "./block";
export * from "./blockEvent";
export * from "./blockEventType";
export * from "./blockIdentifier";
export * from "./blockRequest";
export * from "./blockResponse";
export * from "./blockTransaction";
export * from "./blockTransactionRequest";
export * from "./blockTransactionResponse";
export * from "./callRequest";
export * from "./callResponse";
export * from "./case";
export * from "./coin";
export * from "./coinAction";
export * from "./coinChange";
export * from "./coinIdentifier";
export * from "./constructionCombineRequest";
export * from "./constructionCombineResponse";
export * from "./constructionDeriveRequest";
export * from "./constructionDeriveResponse";
export * from "./constructionHashRequest";
export * from "./constructionMetadataRequest";
export * from "./constructionMetadataResponse";
export * from "./constructionParseRequest";
export * from "./constructionParseResponse";
export * from "./constructionPayloadsRequest";
export * from "./constructionPayloadsResponse";
export * from "./constructionPreprocessRequest";
export * from "./constructionPreprocessResponse";
export * from "./constructionSubmitRequest";
export * from "./currency";
export * from "./curveType";
export * from "./direction";
export * from "./eventsBlocksRequest";
export * from "./eventsBlocksResponse";
export * from "./exemptionType";
export * from "./mempoolResponse";
export * from "./mempoolTransactionRequest";
export * from "./mempoolTransactionResponse";
export * from "./metadataRequest";
export * from "./modelError";
export * from "./networkIdentifier";
export * from "./networkListResponse";
export * from "./networkOptionsResponse";
export * from "./networkRequest";
export * from "./networkStatusResponse";
export * from "./operation";
export * from "./operationIdentifier";
export * from "./operationStatus";
export * from "./operator";
export * from "./partialBlockIdentifier";
export * from "./peer";
export * from "./publicKey";
export * from "./relatedTransaction";
export * from "./searchTransactionsRequest";
export * from "./searchTransactionsResponse";
export * from "./signature";
export * from "./signatureType";
export * from "./signingPayload";
export * from "./subAccountIdentifier";
export * from "./subNetworkIdentifier";
export * from "./syncStatus";
export * from "./transaction";
export * from "./transactionIdentifier";
export * from "./transactionIdentifierResponse";
export * from "./version";

import * as fs from "fs";

export interface RequestDetailedFile {
  value: Buffer;
  options?: {
    filename?: string;
    contentType?: string;
  };
}

export type RequestFile = string | Buffer | fs.ReadStream | RequestDetailedFile;

import { AccountBalanceRequest } from "./accountBalanceRequest";
import { AccountBalanceResponse } from "./accountBalanceResponse";
import { AccountCoinsRequest } from "./accountCoinsRequest";
import { AccountCoinsResponse } from "./accountCoinsResponse";
import { AccountIdentifier } from "./accountIdentifier";
import { Allow } from "./allow";
import { Amount } from "./amount";
import { BalanceExemption } from "./balanceExemption";
import { Block } from "./block";
import { BlockEvent } from "./blockEvent";
import { BlockEventType } from "./blockEventType";
import { BlockIdentifier } from "./blockIdentifier";
import { BlockRequest } from "./blockRequest";
import { BlockResponse } from "./blockResponse";
import { BlockTransaction } from "./blockTransaction";
import { BlockTransactionRequest } from "./blockTransactionRequest";
import { BlockTransactionResponse } from "./blockTransactionResponse";
import { CallRequest } from "./callRequest";
import { CallResponse } from "./callResponse";
import { Case } from "./case";
import { Coin } from "./coin";
import { CoinAction } from "./coinAction";
import { CoinChange } from "./coinChange";
import { CoinIdentifier } from "./coinIdentifier";
import { ConstructionCombineRequest } from "./constructionCombineRequest";
import { ConstructionCombineResponse } from "./constructionCombineResponse";
import { ConstructionDeriveRequest } from "./constructionDeriveRequest";
import { ConstructionDeriveResponse } from "./constructionDeriveResponse";
import { ConstructionHashRequest } from "./constructionHashRequest";
import { ConstructionMetadataRequest } from "./constructionMetadataRequest";
import { ConstructionMetadataResponse } from "./constructionMetadataResponse";
import { ConstructionParseRequest } from "./constructionParseRequest";
import { ConstructionParseResponse } from "./constructionParseResponse";
import { ConstructionPayloadsRequest } from "./constructionPayloadsRequest";
import { ConstructionPayloadsResponse } from "./constructionPayloadsResponse";
import { ConstructionPreprocessRequest } from "./constructionPreprocessRequest";
import { ConstructionPreprocessResponse } from "./constructionPreprocessResponse";
import { ConstructionSubmitRequest } from "./constructionSubmitRequest";
import { Currency } from "./currency";
import { CurveType } from "./curveType";
import { Direction } from "./direction";
import { EventsBlocksRequest } from "./eventsBlocksRequest";
import { EventsBlocksResponse } from "./eventsBlocksResponse";
import { ExemptionType } from "./exemptionType";
import { MempoolResponse } from "./mempoolResponse";
import { MempoolTransactionRequest } from "./mempoolTransactionRequest";
import { MempoolTransactionResponse } from "./mempoolTransactionResponse";
import { MetadataRequest } from "./metadataRequest";
import { ModelError } from "./modelError";
import { NetworkIdentifier } from "./networkIdentifier";
import { NetworkListResponse } from "./networkListResponse";
import { NetworkOptionsResponse } from "./networkOptionsResponse";
import { NetworkRequest } from "./networkRequest";
import { NetworkStatusResponse } from "./networkStatusResponse";
import { Operation } from "./operation";
import { OperationIdentifier } from "./operationIdentifier";
import { OperationStatus } from "./operationStatus";
import { Operator } from "./operator";
import { PartialBlockIdentifier } from "./partialBlockIdentifier";
import { Peer } from "./peer";
import { PublicKey } from "./publicKey";
import { RelatedTransaction } from "./relatedTransaction";
import { SearchTransactionsRequest } from "./searchTransactionsRequest";
import { SearchTransactionsResponse } from "./searchTransactionsResponse";
import { Signature } from "./signature";
import { SignatureType } from "./signatureType";
import { SigningPayload } from "./signingPayload";
import { SubAccountIdentifier } from "./subAccountIdentifier";
import { SubNetworkIdentifier } from "./subNetworkIdentifier";
import { SyncStatus } from "./syncStatus";
import { Transaction } from "./transaction";
import { TransactionIdentifier } from "./transactionIdentifier";
import { TransactionIdentifierResponse } from "./transactionIdentifierResponse";
import { Version } from "./version";

/* tslint:disable:no-unused-variable */
let primitives = [
  "string",
  "boolean",
  "double",
  "integer",
  "long",
  "float",
  "number",
  "any",
];

let enumsMap: { [index: string]: any } = {
  BlockEventType: BlockEventType,
  Case: Case,
  CoinAction: CoinAction,
  CurveType: CurveType,
  Direction: Direction,
  ExemptionType: ExemptionType,
  Operator: Operator,
  SignatureType: SignatureType,
};

let typeMap: { [index: string]: any } = {
  AccountBalanceRequest: AccountBalanceRequest,
  AccountBalanceResponse: AccountBalanceResponse,
  AccountCoinsRequest: AccountCoinsRequest,
  AccountCoinsResponse: AccountCoinsResponse,
  AccountIdentifier: AccountIdentifier,
  Allow: Allow,
  Amount: Amount,
  BalanceExemption: BalanceExemption,
  Block: Block,
  BlockEvent: BlockEvent,
  BlockIdentifier: BlockIdentifier,
  BlockRequest: BlockRequest,
  BlockResponse: BlockResponse,
  BlockTransaction: BlockTransaction,
  BlockTransactionRequest: BlockTransactionRequest,
  BlockTransactionResponse: BlockTransactionResponse,
  CallRequest: CallRequest,
  CallResponse: CallResponse,
  Coin: Coin,
  CoinChange: CoinChange,
  CoinIdentifier: CoinIdentifier,
  ConstructionCombineRequest: ConstructionCombineRequest,
  ConstructionCombineResponse: ConstructionCombineResponse,
  ConstructionDeriveRequest: ConstructionDeriveRequest,
  ConstructionDeriveResponse: ConstructionDeriveResponse,
  ConstructionHashRequest: ConstructionHashRequest,
  ConstructionMetadataRequest: ConstructionMetadataRequest,
  ConstructionMetadataResponse: ConstructionMetadataResponse,
  ConstructionParseRequest: ConstructionParseRequest,
  ConstructionParseResponse: ConstructionParseResponse,
  ConstructionPayloadsRequest: ConstructionPayloadsRequest,
  ConstructionPayloadsResponse: ConstructionPayloadsResponse,
  ConstructionPreprocessRequest: ConstructionPreprocessRequest,
  ConstructionPreprocessResponse: ConstructionPreprocessResponse,
  ConstructionSubmitRequest: ConstructionSubmitRequest,
  Currency: Currency,
  EventsBlocksRequest: EventsBlocksRequest,
  EventsBlocksResponse: EventsBlocksResponse,
  MempoolResponse: MempoolResponse,
  MempoolTransactionRequest: MempoolTransactionRequest,
  MempoolTransactionResponse: MempoolTransactionResponse,
  MetadataRequest: MetadataRequest,
  ModelError: ModelError,
  NetworkIdentifier: NetworkIdentifier,
  NetworkListResponse: NetworkListResponse,
  NetworkOptionsResponse: NetworkOptionsResponse,
  NetworkRequest: NetworkRequest,
  NetworkStatusResponse: NetworkStatusResponse,
  Operation: Operation,
  OperationIdentifier: OperationIdentifier,
  OperationStatus: OperationStatus,
  PartialBlockIdentifier: PartialBlockIdentifier,
  Peer: Peer,
  PublicKey: PublicKey,
  RelatedTransaction: RelatedTransaction,
  SearchTransactionsRequest: SearchTransactionsRequest,
  SearchTransactionsResponse: SearchTransactionsResponse,
  Signature: Signature,
  SigningPayload: SigningPayload,
  SubAccountIdentifier: SubAccountIdentifier,
  SubNetworkIdentifier: SubNetworkIdentifier,
  SyncStatus: SyncStatus,
  Transaction: Transaction,
  TransactionIdentifier: TransactionIdentifier,
  TransactionIdentifierResponse: TransactionIdentifierResponse,
  Version: Version,
};

// Check if a string starts with another string without using es6 features
function startsWith(str: string, match: string): boolean {
  return str.substring(0, match.length) === match;
}

// Check if a string ends with another string without using es6 features
function endsWith(str: string, match: string): boolean {
  return (
    str.length >= match.length &&
    str.substring(str.length - match.length) === match
  );
}

const nullableSuffix = " | null";
const optionalSuffix = " | undefined";
const arrayPrefix = "Array<";
const arraySuffix = ">";
const mapPrefix = "{ [key: string]: ";
const mapSuffix = "; }";

export class ObjectSerializer {
  public static findCorrectType(data: any, expectedType: string) {
    if (data == undefined) {
      return expectedType;
    } else if (primitives.indexOf(expectedType.toLowerCase()) !== -1) {
      return expectedType;
    } else if (expectedType === "Date") {
      return expectedType;
    } else {
      if (enumsMap[expectedType]) {
        return expectedType;
      }

      if (!typeMap[expectedType]) {
        return expectedType; // w/e we don't know the type
      }

      // Check the discriminator
      let discriminatorProperty = typeMap[expectedType].discriminator;
      if (discriminatorProperty == null) {
        return expectedType; // the type does not have a discriminator. use it.
      } else {
        if (data[discriminatorProperty]) {
          var discriminatorType = data[discriminatorProperty];
          if (typeMap[discriminatorType]) {
            return discriminatorType; // use the type given in the discriminator
          } else {
            return expectedType; // discriminator did not map to a type
          }
        } else {
          return expectedType; // discriminator was not present (or an empty string)
        }
      }
    }
  }

  public static serialize(data: any, type: string): any {
    if (data == undefined) {
      return data;
    } else if (primitives.indexOf(type.toLowerCase()) !== -1) {
      return data;
    } else if (endsWith(type, nullableSuffix)) {
      let subType: string = type.slice(0, -nullableSuffix.length); // Type | null => Type
      return ObjectSerializer.serialize(data, subType);
    } else if (endsWith(type, optionalSuffix)) {
      let subType: string = type.slice(0, -optionalSuffix.length); // Type | undefined => Type
      return ObjectSerializer.serialize(data, subType);
    } else if (startsWith(type, arrayPrefix)) {
      let subType: string = type.slice(arrayPrefix.length, -arraySuffix.length); // Array<Type> => Type
      let transformedData: any[] = [];
      for (let index = 0; index < data.length; index++) {
        let datum = data[index];
        transformedData.push(ObjectSerializer.serialize(datum, subType));
      }
      return transformedData;
    } else if (startsWith(type, mapPrefix)) {
      let subType: string = type.slice(mapPrefix.length, -mapSuffix.length); // { [key: string]: Type; } => Type
      let transformedData: { [key: string]: any } = {};
      for (let key in data) {
        transformedData[key] = ObjectSerializer.serialize(data[key], subType);
      }
      return transformedData;
    } else if (type === "Date") {
      return data.toISOString();
    } else {
      if (enumsMap[type]) {
        return data;
      }
      if (!typeMap[type]) {
        // in case we dont know the type
        return data;
      }

      // Get the actual type of this object
      type = this.findCorrectType(data, type);

      // get the map for the correct type.
      let attributeTypes = typeMap[type].getAttributeTypeMap();
      let instance: { [index: string]: any } = {};
      for (let index = 0; index < attributeTypes.length; index++) {
        let attributeType = attributeTypes[index];
        instance[attributeType.baseName] = ObjectSerializer.serialize(
          data[attributeType.name],
          attributeType.type,
        );
      }
      return instance;
    }
  }

  public static deserialize(data: any, type: string): any {
    // polymorphism may change the actual type.
    type = ObjectSerializer.findCorrectType(data, type);
    if (data == undefined) {
      return data;
    } else if (primitives.indexOf(type.toLowerCase()) !== -1) {
      return data;
    } else if (endsWith(type, nullableSuffix)) {
      let subType: string = type.slice(0, -nullableSuffix.length); // Type | null => Type
      return ObjectSerializer.deserialize(data, subType);
    } else if (endsWith(type, optionalSuffix)) {
      let subType: string = type.slice(0, -optionalSuffix.length); // Type | undefined => Type
      return ObjectSerializer.deserialize(data, subType);
    } else if (startsWith(type, arrayPrefix)) {
      let subType: string = type.slice(arrayPrefix.length, -arraySuffix.length); // Array<Type> => Type
      let transformedData: any[] = [];
      for (let index = 0; index < data.length; index++) {
        let datum = data[index];
        transformedData.push(ObjectSerializer.deserialize(datum, subType));
      }
      return transformedData;
    } else if (startsWith(type, mapPrefix)) {
      let subType: string = type.slice(mapPrefix.length, -mapSuffix.length); // { [key: string]: Type; } => Type
      let transformedData: { [key: string]: any } = {};
      for (let key in data) {
        transformedData[key] = ObjectSerializer.deserialize(data[key], subType);
      }
      return transformedData;
    } else if (type === "Date") {
      return new Date(data);
    } else {
      if (enumsMap[type]) {
        // is Enum
        return data;
      }

      if (!typeMap[type]) {
        // dont know the type
        return data;
      }
      let instance = new typeMap[type]();
      let attributeTypes = typeMap[type].getAttributeTypeMap();
      for (let index = 0; index < attributeTypes.length; index++) {
        let attributeType = attributeTypes[index];
        instance[attributeType.name] = ObjectSerializer.deserialize(
          data[attributeType.baseName],
          attributeType.type,
        );
      }
      return instance;
    }
  }
}

export interface Authentication {
  /**
   * Apply authentication settings to header and query params.
   */
  applyToRequest(requestOptions: localVarRequest.Options): Promise<void> | void;
}

export class HttpBasicAuth implements Authentication {
  public username: string = "";
  public password: string = "";

  applyToRequest(requestOptions: localVarRequest.Options): void {
    requestOptions.auth = {
      username: this.username,
      password: this.password,
    };
  }
}

export class HttpBearerAuth implements Authentication {
  public accessToken: string | (() => string) = "";

  applyToRequest(requestOptions: localVarRequest.Options): void {
    if (requestOptions && requestOptions.headers) {
      const accessToken =
        typeof this.accessToken === "function"
          ? this.accessToken()
          : this.accessToken;
      requestOptions.headers["Authorization"] = "Bearer " + accessToken;
    }
  }
}

export class ApiKeyAuth implements Authentication {
  public apiKey: string = "";

  constructor(
    private location: string,
    private paramName: string,
  ) {}

  applyToRequest(requestOptions: localVarRequest.Options): void {
    if (this.location == "query") {
      (<any>requestOptions.qs)[this.paramName] = this.apiKey;
    } else if (
      this.location == "header" &&
      requestOptions &&
      requestOptions.headers
    ) {
      requestOptions.headers[this.paramName] = this.apiKey;
    } else if (
      this.location == "cookie" &&
      requestOptions &&
      requestOptions.headers
    ) {
      if (requestOptions.headers["Cookie"]) {
        requestOptions.headers["Cookie"] +=
          "; " + this.paramName + "=" + encodeURIComponent(this.apiKey);
      } else {
        requestOptions.headers["Cookie"] =
          this.paramName + "=" + encodeURIComponent(this.apiKey);
      }
    }
  }
}

export class OAuth implements Authentication {
  public accessToken: string = "";

  applyToRequest(requestOptions: localVarRequest.Options): void {
    if (requestOptions && requestOptions.headers) {
      requestOptions.headers["Authorization"] = "Bearer " + this.accessToken;
    }
  }
}

export class VoidAuth implements Authentication {
  public username: string = "";
  public password: string = "";

  applyToRequest(_: localVarRequest.Options): void {
    // Do nothing
  }
}

export type Interceptor = (
  requestOptions: localVarRequest.Options,
) => Promise<void> | void;
