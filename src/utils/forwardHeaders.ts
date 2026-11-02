import axios, { AxiosInstance } from "axios";
import { AsyncLocalStorage } from "node:async_hooks";
import { validateHeaderName, validateHeaderValue } from "node:http";
import type { Context, Next } from "koa";

/**
 * Controls the extra headers Rosetta sends on its calls to the thor node.
 *
 * - NODE_HEADERS: static headers sent on every node call, including the calls
 *   Rosetta makes on its own (startup checks, connex head tracking).
 * - FORWARD_HEADERS: an allowlist of incoming request headers copied onto the
 *   node calls made while serving that request. A forwarded header replaces
 *   the NODE_HEADERS value of the same name for that request.
 *
 * Forwarded headers are kept per request in AsyncLocalStorage and merged into
 * each outbound call at send time. They are never set as defaults on a shared
 * client, so one caller's headers cannot reach another caller's node calls.
 */

/**
 * Headers that describe the connection, body or response format, not the
 * caller. Sending them would break the outbound request or the JSON
 * responses Rosetta expects from the node.
 */
const BLOCKED_HEADERS = new Set([
    "host",
    "accept",
    "connection",
    "content-length",
    "content-type",
    "content-encoding",
    "transfer-encoding",
    "keep-alive",
    "upgrade",
    "te",
    "trailer",
    "expect",
    "proxy-connection",
    "sec-websocket-key",
    "sec-websocket-version",
    "sec-websocket-extensions",
    "sec-websocket-protocol",
]);

/**
 * Checks a lowercase header name. Warnings name the entry by position, not by
 * content, because a malformed entry may hold a secret value.
 */
function checkHeaderName(variable: string, entry: number, name: string): boolean {
    try {
        validateHeaderName(name);
    } catch {
        console.warn(`${variable}: ignoring entry ${entry}, it is not a valid header name`);
        return false;
    }
    if (BLOCKED_HEADERS.has(name)) {
        console.warn(`${variable}: ignoring entry ${entry} ("${name}"), it cannot be sent to the node`);
        return false;
    }
    return true;
}

/**
 * Parses a comma-separated list of header names (FORWARD_HEADERS) into
 * lowercase names. Empty or unset means nothing is forwarded.
 */
export function parseForwardHeaders(value: string | undefined): string[] {
    if (!value) {
        return [];
    }
    const names = new Set<string>();
    value.split(",").forEach((raw, index) => {
        const name = raw.trim().toLowerCase();
        if (name !== "" && checkHeaderName("FORWARD_HEADERS", index + 1, name)) {
            names.add(name);
        }
    });
    return Array.from(names);
}

/**
 * Parses comma-separated name=value pairs (NODE_HEADERS), for example
 * "x-client-id=rosetta". Names are lowercased; values cannot contain commas.
 * Empty or unset means no static headers. Values are never logged.
 */
export function parseNodeHeaders(value: string | undefined): Record<string, string> {
    const headers: Record<string, string> = {};
    if (!value) {
        return headers;
    }
    value.split(",").forEach((pair, index) => {
        const entry = index + 1;
        if (pair.trim() === "") {
            return;
        }
        const separator = pair.indexOf("=");
        if (separator < 0 || pair.slice(separator + 1).trim() === "") {
            console.warn(`NODE_HEADERS: ignoring entry ${entry}, expected name=value`);
            return;
        }
        const name = pair.slice(0, separator).trim().toLowerCase();
        const headerValue = pair.slice(separator + 1).trim();
        if (!checkHeaderName("NODE_HEADERS", entry, name)) {
            return;
        }
        try {
            validateHeaderValue(name, headerValue);
        } catch {
            console.warn(`NODE_HEADERS: ignoring entry ${entry} ("${name}"), the value has invalid characters`);
            return;
        }
        headers[name] = headerValue;
    });
    return headers;
}

let staticHeaders: Readonly<Record<string, string>> = Object.freeze({});

/** Sets the static headers (NODE_HEADERS) sent on every node call. Called once at startup. */
export function setNodeHeaders(headers: Record<string, string>): void {
    staticHeaders = Object.freeze({ ...headers });
}

const storage = new AsyncLocalStorage<Readonly<Record<string, string>>>();

/**
 * Headers to send on a node call made now: the static headers, overridden by
 * the forwarded headers of the request currently being served, if any.
 */
export function currentNodeHeaders(): Record<string, string> {
    return { ...staticHeaders, ...storage.getStore() };
}

/** Runs fn with the given headers as the forwarded headers of the current async context. */
export function runWithForwardHeaders<T>(headers: Record<string, string>, fn: () => T): T {
    return storage.run(Object.freeze({ ...headers }), fn);
}

/** Copies the allowlisted headers present on an incoming request. */
export function pickForwardHeaders(
    incoming: Record<string, string | string[] | undefined>,
    allowlist: readonly string[]
): Record<string, string> {
    const picked: Record<string, string> = {};
    for (const name of allowlist) {
        const value = incoming[name];
        if (value === undefined) {
            continue;
        }
        picked[name] = Array.isArray(value) ? value.join(", ") : value;
    }
    return picked;
}

/**
 * Koa middleware that captures the allowlisted headers of each request for
 * the rest of its handling. With an empty allowlist it does nothing.
 */
export function forwardHeadersMiddleware(allowlist: readonly string[]) {
    return async (ctx: Context, next: Next): Promise<void> => {
        if (allowlist.length === 0) {
            await next();
            return;
        }
        const headers = pickForwardHeaders(ctx.request.headers, allowlist);
        await runWithForwardHeaders(headers, next);
    };
}

/**
 * Merges the current node headers under the given headers. Headers set
 * explicitly by the caller win.
 */
export function withNodeHeaders(headers?: Record<string, string>): Record<string, string> | undefined {
    const current = currentNodeHeaders();
    if (Object.keys(current).length === 0) {
        return headers;
    }
    return { ...current, ...headers };
}

/**
 * Axios instance for direct calls to the thor node. An interceptor adds the
 * current node headers to each call; nothing is stored on the instance itself.
 */
export function createNodeAxios(): AxiosInstance {
    const instance = axios.create();
    instance.interceptors.request.use((config) => {
        for (const [name, value] of Object.entries(currentNodeHeaders())) {
            if (!config.headers.has(name)) {
                config.headers.set(name, value);
            }
        }
        return config;
    });
    return instance;
}

export const nodeAxios = createNodeAxios();
