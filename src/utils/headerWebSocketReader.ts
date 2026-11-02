import type { Net } from "@vechain/connex-driver";
import WebSocket from "ws";

/**
 * Net.WebSocketReader that sends headers on the websocket handshake.
 * Same behavior as connex-driver's SimpleWebSocketReader, which cannot send headers.
 */
export class HeaderWebSocketReader implements Net.WebSocketReader {
    private readonly ws: WebSocket;
    private callbacks: Array<(data: unknown, err?: Error) => void> = [];
    private error?: Error;

    constructor(url: string, headers: Record<string, string>, private readonly timeout = 30 * 1000) {
        this.ws = new WebSocket(url, { headers });
        this.ws.onmessage = (ev) => {
            const cbs = this.callbacks;
            this.callbacks = [];
            cbs.forEach((cb) => cb(ev.data));
        };
        this.ws.onerror = (ev) => {
            this.setError(ev.error instanceof Error ? ev.error : new Error(ev.message));
            this.ws.close();
        };
        this.ws.onclose = () => {
            this.setError(new Error("closed"));
        };
    }

    public read(): Promise<unknown> {
        return new Promise((resolve, reject) => {
            if (this.error) {
                return reject(this.error);
            }
            const timer = setTimeout(() => {
                reject(new Error("ws read timeout"));
            }, this.timeout);
            this.callbacks.push((data, err) => {
                clearTimeout(timer);
                if (err) {
                    return reject(err);
                }
                resolve(data);
            });
        });
    }

    public close(): void {
        this.ws.close();
    }

    private setError(err: Error): void {
        if (!this.error) {
            this.error = err;
            const cbs = this.callbacks;
            this.callbacks = [];
            cbs.forEach((cb) => cb(null, err));
        }
    }
}
