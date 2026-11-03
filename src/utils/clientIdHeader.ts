import axios, { AxiosInstance } from "axios";
import { AsyncLocalStorage } from "node:async_hooks";
import { validateHeaderName, validateHeaderValue } from "node:http";
import type { Context, Next } from "koa";

/**
 * Sends one client ID header on every call Rosetta makes to the thor node.
 *
 * - CLIENT_ID_HEADER names the header, for example x-client-id. Unset turns the feature off.
 * - On node calls made while serving a request, the request's value of that
 *   header is forwarded. A request without the header sends none.
 * - On node calls Rosetta makes on its own (startup check, connex head
 *   tracking over HTTP and websocket), CLIENT_ID_DEFAULT is sent.
 *
 * The request's value is kept per request in AsyncLocalStorage and added to
 * each node call at send time. It is never set on a shared client, so one
 * caller's value cannot reach another caller's node calls.
 */

export type ClientIdConfig = {
    /** lowercase header name */
    header: string,
    /** value for node calls made outside a request */
    defaultValue?: string
};

/** Names that would break the node call if Rosetta set them. */
const REFUSED_HEADERS = new Set(["host", "connection", "content-length", "content-type", "transfer-encoding", "upgrade", "accept"]);

/**
 * Reads CLIENT_ID_HEADER and CLIENT_ID_DEFAULT. Returns undefined, which turns
 * the feature off, when the header is unset or not usable. Values are never logged.
 */
export function parseClientIdConfig(header: string | undefined, defaultValue: string | undefined): ClientIdConfig | undefined {
    const name = (header ?? "").trim().toLowerCase();
    if (name === "") {
        return undefined;
    }
    try {
        validateHeaderName(name);
    } catch {
        console.warn("CLIENT_ID_HEADER: not a valid header name, client ID header is off");
        return undefined;
    }
    if (REFUSED_HEADERS.has(name) || name.startsWith("sec-websocket-")) {
        console.warn(`CLIENT_ID_HEADER: "${name}" cannot be used, client ID header is off`);
        return undefined;
    }
    const value = (defaultValue ?? "").trim();
    if (value === "") {
        return { header: name };
    }
    try {
        validateHeaderValue(name, value);
    } catch {
        console.warn("CLIENT_ID_DEFAULT: the value has invalid characters, no default is sent");
        return { header: name };
    }
    return { header: name, defaultValue: value };
}

let config: ClientIdConfig | undefined;

/** Sets the client ID configuration. Called once at startup; undefined turns the feature off. */
export function setClientIdConfig(value: ClientIdConfig | undefined): void {
    config = value ? Object.freeze({ ...value }) : undefined;
}

/** The incoming request's client ID, or undefined when the request has none. */
type RequestClientId = { value?: string };

const storage = new AsyncLocalStorage<RequestClientId>();

/** Runs fn as part of a request whose client ID is value (undefined: the request has none). */
export function runWithClientId<T>(value: string | undefined, fn: () => T): T {
    return storage.run(Object.freeze({ value }), fn);
}

/** The client ID header to send on a node call made now, as a headers object (empty when there is none). */
export function currentClientIdHeaders(): Record<string, string> {
    if (!config) {
        return {};
    }
    const request = storage.getStore();
    const value = request ? request.value : config.defaultValue;
    return value ? { [config.header]: value } : {};
}

/** Koa middleware that keeps each request's client ID for the rest of its handling. */
export function clientIdMiddleware() {
    return async (ctx: Context, next: Next): Promise<void> => {
        if (!config) {
            await next();
            return;
        }
        const incoming = ctx.request.headers[config.header];
        const value = Array.isArray(incoming) ? incoming.join(", ") : incoming;
        await runWithClientId(value || undefined, next);
    };
}

/** Adds the client ID header under the given headers. Headers set explicitly by the caller win. */
export function withClientIdHeaders(headers?: Record<string, string>): Record<string, string> | undefined {
    const clientId = currentClientIdHeaders();
    if (Object.keys(clientId).length === 0) {
        return headers;
    }
    return { ...clientId, ...headers };
}

/**
 * Axios instance for direct calls to the thor node. An interceptor adds the
 * client ID header to each call; nothing is stored on the instance itself.
 */
export function createNodeAxios(): AxiosInstance {
    const instance = axios.create();
    instance.interceptors.request.use((request) => {
        for (const [name, value] of Object.entries(currentClientIdHeaders())) {
            if (!request.headers.has(name)) {
                request.headers.set(name, value);
            }
        }
        return request;
    });
    return instance;
}

export const nodeAxios = createNodeAxios();
