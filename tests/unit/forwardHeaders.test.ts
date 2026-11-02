import http, { IncomingHttpHeaders } from 'node:http';
import { AddressInfo } from 'node:net';
import Koa from 'koa';
import request from 'supertest';
import WebSocket from 'ws';
import { Driver } from '@vechain/connex-driver';
import { ForwardingNet } from '../../src/utils/connexPro';
import {
    currentNodeHeaders,
    forwardHeadersMiddleware,
    nodeAxios,
    parseForwardHeaders,
    parseNodeHeaders,
    pickForwardHeaders,
    runWithForwardHeaders,
    setNodeHeaders
} from '../../src/utils/forwardHeaders';

afterEach(() => {
    setNodeHeaders({});
});

describe('parseForwardHeaders', () => {
    it('returns nothing when unset or empty', () => {
        expect(parseForwardHeaders(undefined)).toEqual([]);
        expect(parseForwardHeaders('')).toEqual([]);
        expect(parseForwardHeaders(' , ')).toEqual([]);
    });

    it('lowercases, trims and dedupes names', () => {
        expect(parseForwardHeaders(' X-Client-ID ,x-request-id,x-client-id,')).toEqual(['x-client-id', 'x-request-id']);
    });

    it('ignores connection, body and invalid header names', () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        expect(parseForwardHeaders('Host,x-client-id,Content-Length,transfer-encoding,bad name,Accept')).toEqual(['x-client-id']);
        expect(warn).toHaveBeenCalledTimes(5);
        warn.mockRestore();
    });
});

describe('parseNodeHeaders', () => {
    it('returns nothing when unset or empty', () => {
        expect(parseNodeHeaders(undefined)).toEqual({});
        expect(parseNodeHeaders('')).toEqual({});
    });

    it('parses name=value pairs and lowercases names', () => {
        expect(parseNodeHeaders('X-Client-ID = internal/rosetta , x-team=a=b')).toEqual({
            'x-client-id': 'internal/rosetta',
            'x-team': 'a=b'
        });
    });

    it('ignores pairs without a value and blocked or invalid names', () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        expect(parseNodeHeaders('x-a,x-b=,host=example.com,bad name=1,x-ok=1')).toEqual({ 'x-ok': '1' });
        expect(warn).toHaveBeenCalledTimes(4);
        warn.mockRestore();
    });

    it('rejects values Node cannot send and accepts inner tabs', () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        expect(parseNodeHeaders('x-ctl=a\u0001b,x-del=a\u007fb,x-emoji=a\u{1F600}b,x-tab=a\tb')).toEqual({ 'x-tab': 'a\tb' });
        expect(warn).toHaveBeenCalledTimes(3);
        warn.mockRestore();
    });

    it('never logs header values or malformed entries', () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        parseNodeHeaders('secret-token-without-name,x-ctl=secret\u0001value,bad name=secret,host=secret,x-empty=');
        expect(warn).toHaveBeenCalledTimes(5);
        for (const [message] of warn.mock.calls) {
            expect(String(message)).not.toContain('secret');
        }
        warn.mockRestore();
    });
});

describe('pickForwardHeaders', () => {
    it('copies only allowlisted headers that are present', () => {
        const incoming = { 'x-client-id': 'a', 'x-other': 'b', 'x-multi': ['1', '2'] };
        expect(pickForwardHeaders(incoming, ['x-client-id', 'x-missing', 'x-multi'])).toEqual({ 'x-client-id': 'a', 'x-multi': '1, 2' });
    });
});

describe('currentNodeHeaders', () => {
    it('is empty outside a request without static headers', () => {
        expect(currentNodeHeaders()).toEqual({});
    });

    it('returns the static headers outside a request', () => {
        setNodeHeaders({ 'x-client-id': 'rosetta' });
        expect(currentNodeHeaders()).toEqual({ 'x-client-id': 'rosetta' });
    });

    it('lets forwarded headers replace static headers of the same name', () => {
        setNodeHeaders({ 'x-client-id': 'rosetta', 'x-team': 'node' });
        runWithForwardHeaders({ 'x-client-id': 'wallet' }, () => {
            expect(currentNodeHeaders()).toEqual({ 'x-client-id': 'wallet', 'x-team': 'node' });
        });
    });

    it('cannot be changed through the returned copy', () => {
        runWithForwardHeaders({ 'x-client-id': 'a' }, () => {
            currentNodeHeaders()['x-client-id'] = 'b';
            expect(currentNodeHeaders()).toEqual({ 'x-client-id': 'a' });
        });
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
    received: Map<string, IncomingHttpHeaders>;
    calls: Array<{ path: string; headers: IncomingHttpHeaders }>;
    close: () => Promise<void>;
}> {
    const received = new Map<string, IncomingHttpHeaders>();
    const calls: Array<{ path: string; headers: IncomingHttpHeaders }> = [];
    const server = http.createServer((req, res) => {
        const path = req.url ?? '';
        // Answer slowly so concurrent Rosetta requests interleave.
        setTimeout(() => {
            received.set(path, req.headers);
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
        received.set(`ws:${path}`, req.headers);
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
                received,
                calls,
                close: () => new Promise((done) => {
                    wss.clients.forEach((client) => client.terminate());
                    wss.close(() => server.close(() => done()));
                })
            });
        });
    });
}

describe('headers on node calls', () => {
    let node: Awaited<ReturnType<typeof startFakeNode>>;

    beforeAll(async () => {
        node = await startFakeNode();
    });

    afterAll(async () => {
        await node.close();
    });

    beforeEach(() => {
        node.received.clear();
        node.calls.length = 0;
    });

    /** Rosetta-like app: each request makes one axios call and one connex call to the node, tagged with ?id=. */
    function app(allowlist: string[]) {
        const net = new ForwardingNet(node.url);
        const koa = new Koa();
        koa.use(forwardHeadersMiddleware(allowlist));
        koa.use(async (ctx) => {
            const id = String(ctx.query.id);
            await nodeAxios.get(`${node.url}/axios/${id}`);
            await net.http('GET', `connex/${id}`);
            ctx.body = 'ok';
        });
        return koa.callback();
    }

    const clientIdOf = (path: string) => node.received.get(path)?.['x-client-id'];

    it('forwards allowlisted headers on axios and connex calls', async () => {
        await request(app(['x-client-id'])).get('/?id=1').set('X-Client-ID', 'client-1').set('X-Other', 'secret').expect(200);

        for (const path of ['/axios/1', '/connex/1']) {
            expect(clientIdOf(path)).toBe('client-1');
            expect(node.received.get(path)?.['x-other']).toBeUndefined();
        }
    });

    it('forwards nothing with an empty allowlist and no static headers', async () => {
        await request(app([])).get('/?id=1').set('X-Client-ID', 'client-1').expect(200);

        expect(clientIdOf('/axios/1')).toBeUndefined();
        expect(clientIdOf('/connex/1')).toBeUndefined();
    });

    it('keeps headers of concurrent requests apart', async () => {
        const handler = app(['x-client-id']);
        const ids = Array.from({ length: 20 }, (_, i) => String(i));
        await Promise.all(ids.map((id) => {
            const req = request(handler).get(`/?id=${id}`);
            // Every third request sends no header and must not pick up another request's value.
            return (Number(id) % 3 === 0 ? req : req.set('x-client-id', `client-${id}`)).expect(200);
        }));

        for (const id of ids) {
            const expected = Number(id) % 3 === 0 ? undefined : `client-${id}`;
            expect(clientIdOf(`/axios/${id}`)).toBe(expected);
            expect(clientIdOf(`/connex/${id}`)).toBe(expected);
        }
    });

    it('sends static headers on requests that do not carry the forwarded header', async () => {
        setNodeHeaders({ 'x-client-id': 'rosetta' });
        const handler = app(['x-client-id']);
        await request(handler).get('/?id=with').set('x-client-id', 'wallet').expect(200);
        await request(handler).get('/?id=without').expect(200);

        expect(clientIdOf('/axios/with')).toBe('wallet');
        expect(clientIdOf('/connex/with')).toBe('wallet');
        expect(clientIdOf('/axios/without')).toBe('rosetta');
        expect(clientIdOf('/connex/without')).toBe('rosetta');
    });

    it('does not override headers set explicitly on a call', async () => {
        setNodeHeaders({ 'x-client-id': 'rosetta' });
        await runWithForwardHeaders({ 'x-client-id': 'forwarded' }, async () => {
            await nodeAxios.get(`${node.url}/axios/explicit`, { headers: { 'x-client-id': 'explicit' } });
            await new ForwardingNet(node.url).http('GET', 'connex/explicit', { headers: { 'x-client-id': 'explicit' } });
        });

        expect(clientIdOf('/axios/explicit')).toBe('explicit');
        expect(clientIdOf('/connex/explicit')).toBe('explicit');
    });

    it('adds nothing to calls made outside a request without static headers', async () => {
        await nodeAxios.get(`${node.url}/axios/background`);
        await new ForwardingNet(node.url).http('GET', 'connex/background');

        expect(clientIdOf('/axios/background')).toBeUndefined();
        expect(clientIdOf('/connex/background')).toBeUndefined();
    });

    it('sends static headers on calls made outside a request', async () => {
        setNodeHeaders({ 'x-client-id': 'rosetta' });
        await nodeAxios.get(`${node.url}/axios/background`);
        await new ForwardingNet(node.url).http('GET', 'connex/background');

        expect(clientIdOf('/axios/background')).toBe('rosetta');
        expect(clientIdOf('/connex/background')).toBe('rosetta');
    });

    it('sends static headers on the websocket handshake', async () => {
        setNodeHeaders({ 'x-client-id': 'rosetta' });
        const reader = new ForwardingNet(node.url).openWebSocketReader('subscriptions/beat2?pos=0x00');
        try {
            await expect(reader.read()).resolves.toBe('beat');
        } finally {
            reader.close();
        }

        expect(clientIdOf('ws:/subscriptions/beat2?pos=0x00')).toBe('rosetta');
    });

    it('opens the websocket without extra headers when none are configured', async () => {
        const reader = new ForwardingNet(node.url).openWebSocketReader('subscriptions/beat2?pos=0x01');
        try {
            await expect(reader.read()).resolves.toBe('beat');
        } finally {
            reader.close();
        }

        expect(clientIdOf('ws:/subscriptions/beat2?pos=0x01')).toBeUndefined();
    });

    describe('websocket errors', () => {
        beforeEach(() => {
            setNodeHeaders({ 'x-client-id': 'rosetta' });
        });

        it('rejects reads when the handshake fails', async () => {
            const reader = new ForwardingNet(node.url).openWebSocketReader('ws-reject');
            await expect(reader.read()).rejects.toThrow();
            reader.close();
        });

        it('rejects reads once the node closes the socket', async () => {
            const reader = new ForwardingNet(node.url).openWebSocketReader('ws-close');
            await expect(reader.read()).rejects.toThrow('closed');
            await expect(reader.read()).rejects.toThrow('closed');
            reader.close();
        });

        it('times out reads when the node sends nothing', async () => {
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
            for (let i = 0; i < 100 && node.calls.filter((c) => c.path === path).length < count; i++) {
                await new Promise((resolve) => setTimeout(resolve, 10));
            }
        }

        const clientIdsOf = (path: string) => node.calls.filter((c) => c.path === path).map((c) => c.headers['x-client-id']);

        it('keeps startup and head polling on static headers while requests forward their own', async () => {
            setNodeHeaders({ 'x-client-id': 'rosetta' });
            // Connected outside any request, as at startup; this also starts the head tracker loop.
            const driver = await Driver.connect(new ForwardingNet(node.url));
            try {
                const koa = new Koa();
                koa.use(forwardHeadersMiddleware(['x-client-id']));
                koa.use(async (ctx) => {
                    await driver.getBlock(Number(ctx.query.n));
                    ctx.body = 'ok';
                });
                const handler = koa.callback();
                await Promise.all([
                    request(handler).get('/?n=1').set('x-client-id', 'c1').expect(200),
                    request(handler).get('/?n=2').set('x-client-id', 'c2').expect(200),
                    request(handler).get('/?n=3').expect(200)
                ]);
                // connect() polls blocks/best once, the head tracker polls it again right away.
                await waitForCalls('/blocks/best', 2);
            } finally {
                driver.close();
            }

            expect(clientIdsOf('/blocks/0')).toEqual(['rosetta']);
            expect(clientIdsOf('/blocks/best')).toEqual(['rosetta', 'rosetta']);
            expect(clientIdsOf('/blocks/1')).toEqual(['c1']);
            expect(clientIdsOf('/blocks/2')).toEqual(['c2']);
            expect(clientIdsOf('/blocks/3')).toEqual(['rosetta']);
        });

        it('sends one node call for identical concurrent requests, with one of their headers', async () => {
            const driver = await Driver.connect(new ForwardingNet(node.url));
            try {
                await Promise.all([
                    runWithForwardHeaders({ 'x-client-id': 'c1' }, () => driver.getBlock(5)),
                    runWithForwardHeaders({ 'x-client-id': 'c2' }, () => driver.getBlock(5))
                ]);
            } finally {
                driver.close();
            }

            // Documented: merged calls carry the headers of the request that started them.
            expect(clientIdsOf('/blocks/5')).toEqual(['c1']);
        });
    });
});
