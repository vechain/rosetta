export * from "./accountApi";
import { AccountApi } from "./accountApi";
export * from "./blockApi";
import { BlockApi } from "./blockApi";
export * from "./callApi";
import { CallApi } from "./callApi";
export * from "./constructionApi";
import { ConstructionApi } from "./constructionApi";
export * from "./eventsApi";
import { EventsApi } from "./eventsApi";
export * from "./mempoolApi";
import { MempoolApi } from "./mempoolApi";
export * from "./networkApi";
import { NetworkApi } from "./networkApi";
export * from "./searchApi";
import { SearchApi } from "./searchApi";
import * as http from "http";

export class HttpError extends Error {
  constructor(
    public response: http.IncomingMessage,
    public body: any,
    public statusCode?: number,
  ) {
    super("HTTP request failed");
    this.name = "HttpError";
  }
}

export { RequestFile } from "../model/models";

export const APIS = [
  AccountApi,
  BlockApi,
  CallApi,
  ConstructionApi,
  EventsApi,
  MempoolApi,
  NetworkApi,
  SearchApi,
];
