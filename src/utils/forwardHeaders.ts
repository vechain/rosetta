import axios, { AxiosInstance } from "axios";
import { AsyncLocalStorage } from "async_hooks";
import type { Context, Next } from "koa";

/**
 * Forwards an allowlist of incoming request headers onto the calls Rosetta
 * makes to the thor node while serving that request (for example a client ID
 * used for metrics and attribution).
 *
 * The headers are kept per request in AsyncLocalStorage and merged into each
 * outbound call at send time. They are never set as defaults on a shared
 * client, so one caller's headers cannot reach another caller's node calls.
 */

/** Headers that describe the connection or body, not the caller. Forwarding them would break the outbound request. */
const BLOCKED_HEADERS = new Set([
    "host",
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
]);

/**
 * Parses a comma-separated list of header names (FORWARD_HEADERS) into
 * lowercase names. Empty or unset means nothing is forwarded.
 */
export function parseForwardHeaders(value: string | undefined): string[] {
    if (!value) {
        return [];
    }
    const names = new Set<string>();
    for (const raw of value.split(",")) {
        const name = raw.trim().toLowerCase();
        if (name === "") {
            continue;
        }
        if (BLOCKED_HEADERS.has(name)) {
            console.warn(`FORWARD_HEADERS: ignoring "${name}", it cannot be forwarded`);
            continue;
        }
        names.add(name);
    }
    return Array.from(names);
}

const storage = new AsyncLocalStorage<Readonly<Record<string, string>>>();

/** Headers to forward for the request currently being served, or an empty object outside a request. */
export function currentForwardHeaders(): Record<string, string> {
    const headers = storage.getStore();
    return headers ? { ...headers } : {};
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
 * Merges the current request's forwarded headers under the given headers.
 * Headers set explicitly by the caller win.
 */
export function withForwardHeaders(headers?: Record<string, string>): Record<string, string> | undefined {
    const forwarded = currentForwardHeaders();
    if (Object.keys(forwarded).length === 0) {
        return headers;
    }
    return { ...forwarded, ...headers };
}

/**
 * Axios instance for direct calls to the thor node. An interceptor adds the
 * current request's forwarded headers to each call; nothing is stored on the
 * instance itself.
 */
export function createNodeAxios(): AxiosInstance {
    const instance = axios.create();
    instance.interceptors.request.use((config) => {
        for (const [name, value] of Object.entries(currentForwardHeaders())) {
            if (!config.headers.has(name)) {
                config.headers.set(name, value);
            }
        }
        return config;
    });
    return instance;
}

export const nodeAxios = createNodeAxios();
