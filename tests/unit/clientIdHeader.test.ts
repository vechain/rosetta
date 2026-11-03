import http, { IncomingHttpHeaders } from 'node:http';
import { AddressInfo } from 'node:net';
import Koa from 'koa';
import request from 'supertest';
import WebSocket from 'ws';
import { Driver } from '@vechain/connex-driver';
import { ForwardingNet } from '../../src/utils/connexPro';
import {
    clientIdMiddleware,
    currentClientIdHeaders,
    nodeAxios,
    parseClientIdConfig,
    runWithClientId,
    setClientIdConfig
} from '../../src/utils/clientIdHeader';

const HEADER = 'x-client-id';
const DEFAULT = 'internal/rosetta';

afterEach(() => {
    setClientIdConfig(undefined);
});

describe('parseClientIdConfig', () => {
    it('is off when the header is unset or empty', () => {
        expect(parseClientIdConfig(undefined, DEFAULT)).toBeUndefined();
        expect(parseClientIdConfig('  ', DEFAULT)).toBeUndefined();
    });

    it('lowercases the header and trims both values', () => {
        expect(parseClientIdConfig(' X-Client-ID ', ` ${DEFAULT} `)).toEqual({ header: HEADER, defaultValue: DEFAULT });
        expect(parseClientIdConfig(HEADER, undefined)).toEqual({ header: HEADER });
    });

    it('is off for invalid or refused header names', () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        expect(parseClientIdConfig('bad name', DEFAULT)).toBeUndefined();
        expect(parseClientIdConfig('Host', DEFAULT)).toBeUndefined();
        expect(parseClientIdConfig('sec-websocket-key', DEFAULT)).toBeUndefined();
        expect(warn).toHaveBeenCalledTimes(3);
        warn.mockRestore();
    });

    it('drops a default with characters HTTP does not allow, without logging it', () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        expect(parseClientIdConfig(HEADER, 'secret\u0001value')).toEqual({ header: HEADER });
        expect(parseClientIdConfig(HEADER, 'secret\u{1F600}')).toEqual({ header: HEADER });
        expect(warn).toHaveBeenCalledTimes(2);
        for (const [message] of warn.mock.calls) {
            expect(String(message)).not.toContain('secret');
        }
        warn.mockRestore();
    });
});

describe('currentClientIdHeaders', () => {
    it('is empty when the feature is off', () => {
        expect(currentClientIdHeaders()).toEqual({});
        runWithClientId('wallet', () => expect(currentClientIdHeaders()).toEqual({}));
    });

    it('uses the default outside a request', () => {
        setClientIdConfig({ header: HEADER, defaultValue: DEFAULT });
        expect(currentClientIdHeaders()).toEqual({ [HEADER]: DEFAULT });
    });

    it("uses the request's value inside a request", () => {
        setClientIdConfig({ header: HEADER, defaultValue: DEFAULT });
        runWithClientId('wallet', () => expect(currentClientIdHeaders()).toEqual({ [HEADER]: 'wallet' }));
    });

    it('sends nothing for a request without the header, even with a default', () => {
        setClientIdConfig({ header: HEADER, defaultValue: DEFAULT });
        runWithClientId(undefined, () => expect(currentClientIdHeaders()).toEqual({}));
    });
});

const GENESIS_ID = '0x' + '00'.repeat(31) + '4a';
const block = (number: number) => ({
    id: number === 0 ? GENESIS_ID : '0x' + number.toString(16).padStart(64, '0'),
    number,
    // Old timestamps keep the connex head tracker on HTTP polling.
    timestamp: 1530316800 + number * 10,
    parentID: '0x' + '00'.repeat(32),
    txsFeatures: 1,
    gasLimit: 10000000
});

/**
 * Fake thor node that records the headers of every HTTP request and websocket handshake it receives.
 * Websocket paths: /ws-reject fails the handshake, /ws-close closes without a message, /ws-silent never sends.
 */
function startFakeNode(): Promise<{
    url: string;
    calls: Array<{ path: string; headers: IncomingHttpHeaders }>;
    close: () => Promise<void>;
}> {
    const calls: Array<{ path: string; headers: IncomingHttpHeaders }> = [];
    const server = http.createServer((req, res) => {
        const path = req.url ?? '';
        // Answer slowly so concurrent Rosetta requests interleave.
        setTimeout(() => {
            calls.push({ path, headers: req.headers });
            res.setHeader('content-type', 'application/json');
            const match = /^\/blocks\/(\d+|best)/.exec(path);
            res.end(JSON.stringify(match ? block(match[1] === 'best' ? 100 : Number(match[1])) : {}));
        }, 20);
    });
    const wss = new WebSocket.Server({
        server,
        verifyClient: (info, done) => done(!info.req.url?.startsWith('/ws-reject'), 403)
    });
    wss.on('connection', (socket, req) => {
        const path = req.url ?? '';
        calls.push({ path: `ws:${path}`, headers: req.headers });
        if (path.startsWith('/ws-close')) {
            socket.close();
        } else if (!path.startsWith('/ws-silent')) {
            socket.send('beat');
        }
    });
    return new Promise((resolve) => {
        server.listen(0, '127.0.0.1', () => {
            const { port } = server.address() as AddressInfo;
            resolve({
                url: `http://127.0.0.1:${port}`,
                calls,
                close: () => new Promise((done) => {
                    wss.clients.forEach((client) => client.terminate());
                    wss.close(() => server.close(() => done()));
                })
            });
        });
    });
}

describe('client ID on node calls', () => {
    let node: Awaited<ReturnType<typeof startFakeNode>>;

    beforeAll(async () => {
        node = await startFakeNode();
    });

    afterAll(async () => {
        await node.close();
    });

    beforeEach(() => {
        node.calls.length = 0;
    });

    /** Client IDs the fake node received on path, in order. */
    const clientIdsOf = (path: string) => node.calls.filter((c) => c.path === path).map((c) => c.headers[HEADER]);

    /** Rosetta-like app: each request makes one axios call and one connex call to the node, tagged with ?id=. */
    function app() {
        const net = new ForwardingNet(node.url);
        const koa = new Koa();
        koa.use(clientIdMiddleware());
        koa.use(async (ctx) => {
            const id = String(ctx.query.id);
            await nodeAxios.get(`${node.url}/axios/${id}`);
            await net.http('GET', `connex/${id}`);
            ctx.body = 'ok';
        });
        return koa.callback();
    }

    it("forwards the request's client ID on axios and connex calls, and no other header", async () => {
        setClientIdConfig({ header: HEADER, defaultValue: DEFAULT });
        await request(app()).get('/?id=1').set('X-Client-ID', 'wallet').set('X-Other', 'secret').expect(200);

        for (const path of ['/axios/1', '/connex/1']) {
            expect(clientIdsOf(path)).toEqual(['wallet']);
            expect(node.calls.find((c) => c.path === path)?.headers['x-other']).toBeUndefined();
        }
    });

    it('sends nothing for a request without the header', async () => {
        setClientIdConfig({ header: HEADER, defaultValue: DEFAULT });
        await request(app()).get('/?id=1').expect(200);

        expect(clientIdsOf('/axios/1')).toEqual([undefined]);
        expect(clientIdsOf('/connex/1')).toEqual([undefined]);
    });

    it('changes nothing when the feature is off', async () => {
        await request(app()).get('/?id=1').set('X-Client-ID', 'wallet').expect(200);
        await nodeAxios.get(`${node.url}/axios/background`);

        expect(clientIdsOf('/axios/1')).toEqual([undefined]);
        expect(clientIdsOf('/connex/1')).toEqual([undefined]);
        expect(clientIdsOf('/axios/background')).toEqual([undefined]);
    });

    it('keeps client IDs of concurrent requests apart', async () => {
        setClientIdConfig({ header: HEADER, defaultValue: DEFAULT });
        const handler = app();
        const ids = Array.from({ length: 20 }, (_, i) => String(i));
        await Promise.all(ids.map((id) => {
            const req = request(handler).get(`/?id=${id}`);
            // Every third request sends no header and must not pick up another request's value.
            return (Number(id) % 3 === 0 ? req : req.set(HEADER, `client-${id}`)).expect(200);
        }));

        for (const id of ids) {
            const expected = Number(id) % 3 === 0 ? undefined : `client-${id}`;
            expect(clientIdsOf(`/axios/${id}`)).toEqual([expected]);
            expect(clientIdsOf(`/connex/${id}`)).toEqual([expected]);
        }
    });

    it('does not override a client ID set explicitly on a call', async () => {
        setClientIdConfig({ header: HEADER, defaultValue: DEFAULT });
        await runWithClientId('wallet', async () => {
            await nodeAxios.get(`${node.url}/axios/explicit`, { headers: { [HEADER]: 'explicit' } });
            await new ForwardingNet(node.url).http('GET', 'connex/explicit', { headers: { [HEADER]: 'explicit' } });
        });

        expect(clientIdsOf('/axios/explicit')).toEqual(['explicit']);
        expect(clientIdsOf('/connex/explicit')).toEqual(['explicit']);
    });

    it('sends the default on calls made outside a request', async () => {
        setClientIdConfig({ header: HEADER, defaultValue: DEFAULT });
        await nodeAxios.get(`${node.url}/axios/background`);
        await new ForwardingNet(node.url).http('GET', 'connex/background');

        expect(clientIdsOf('/axios/background')).toEqual([DEFAULT]);
        expect(clientIdsOf('/connex/background')).toEqual([DEFAULT]);
    });

    describe('websocket', () => {
        it('sends the default on the handshake', async () => {
            setClientIdConfig({ header: HEADER, defaultValue: DEFAULT });
            const reader = new ForwardingNet(node.url).openWebSocketReader('subscriptions/beat2?pos=0x00');
            try {
                await expect(reader.read()).resolves.toBe('beat');
            } finally {
                reader.close();
            }

            expect(clientIdsOf('ws:/subscriptions/beat2?pos=0x00')).toEqual([DEFAULT]);
        });

        it('opens without the header when the feature is off', async () => {
            const reader = new ForwardingNet(node.url).openWebSocketReader('subscriptions/beat2?pos=0x01');
            try {
                await expect(reader.read()).resolves.toBe('beat');
            } finally {
                reader.close();
            }

            expect(clientIdsOf('ws:/subscriptions/beat2?pos=0x01')).toEqual([undefined]);
        });

        it('rejects reads when the handshake fails', async () => {
            setClientIdConfig({ header: HEADER, defaultValue: DEFAULT });
            const reader = new ForwardingNet(node.url).openWebSocketReader('ws-reject');
            await expect(reader.read()).rejects.toThrow();
            reader.close();
        });

        it('rejects reads once the node closes the socket', async () => {
            setClientIdConfig({ header: HEADER, defaultValue: DEFAULT });
            const reader = new ForwardingNet(node.url).openWebSocketReader('ws-close');
            await expect(reader.read()).rejects.toThrow('closed');
            await expect(reader.read()).rejects.toThrow('closed');
            reader.close();
        });

        it('times out reads when the node sends nothing', async () => {
            setClientIdConfig({ header: HEADER, defaultValue: DEFAULT });
            const reader = new ForwardingNet(node.url, undefined, 50).openWebSocketReader('ws-silent');
            try {
                await expect(reader.read()).rejects.toThrow('ws read timeout');
            } finally {
                reader.close();
            }
        });
    });

    describe('through the connex driver', () => {
        /** Waits until the fake node has answered at least `count` calls on `path`. */
        async function waitForCalls(path: string, count: number) {
            for (let i = 0; i < 100 && clientIdsOf(path).length < count; i++) {
                await new Promise((resolve) => setTimeout(resolve, 10));
            }
        }

        it('sends the default on startup and head polling while requests send their own', async () => {
            setClientIdConfig({ header: HEADER, defaultValue: DEFAULT });
            // Connected outside any request, as at startup; this also starts the head tracker loop.
            const driver = await Driver.connect(new ForwardingNet(node.url));
            try {
                const koa = new Koa();
                koa.use(clientIdMiddleware());
                koa.use(async (ctx) => {
                    await driver.getBlock(Number(ctx.query.n));
                    ctx.body = 'ok';
                });
                const handler = koa.callback();
                await Promise.all([
                    request(handler).get('/?n=1').set(HEADER, 'c1').expect(200),
                    request(handler).get('/?n=2').set(HEADER, 'c2').expect(200),
                    request(handler).get('/?n=3').expect(200)
                ]);
                // connect() polls blocks/best once, the head tracker polls it again right away.
                await waitForCalls('/blocks/best', 2);
            } finally {
                driver.close();
            }

            expect(clientIdsOf('/blocks/0')).toEqual([DEFAULT]);
            expect(clientIdsOf('/blocks/best')).toEqual([DEFAULT, DEFAULT]);
            expect(clientIdsOf('/blocks/1')).toEqual(['c1']);
            expect(clientIdsOf('/blocks/2')).toEqual(['c2']);
            expect(clientIdsOf('/blocks/3')).toEqual([undefined]);
        });

        it('sends one node call for identical concurrent requests, with the first one\'s client ID', async () => {
            setClientIdConfig({ header: HEADER, defaultValue: DEFAULT });
            const driver = await Driver.connect(new ForwardingNet(node.url));
            try {
                await Promise.all([
                    runWithClientId('c1', () => driver.getBlock(5)),
                    runWithClientId('c2', () => driver.getBlock(5))
                ]);
            } finally {
                driver.close();
            }

            // Documented: merged calls carry the client ID of the request that started them.
            expect(clientIdsOf('/blocks/5')).toEqual(['c1']);
        });
    });
});
