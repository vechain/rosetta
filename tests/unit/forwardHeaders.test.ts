import http, { IncomingHttpHeaders } from 'http';
import { AddressInfo } from 'net';
import Koa from 'koa';
import request from 'supertest';
import WebSocket from 'ws';
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
        expect(parseForwardHeaders('Host,x-client-id,Content-Length,transfer-encoding,bad name')).toEqual(['x-client-id']);
        expect(warn).toHaveBeenCalledTimes(4);
        warn.mockRestore();
    });
});

describe('parseNodeHeaders', () => {
    it('returns nothing when unset or empty', () => {
        expect(parseNodeHeaders(undefined)).toEqual({});
        expect(parseNodeHeaders('')).toEqual({});
    });

    it('parses name=value pairs and lowercases names', () => {
        expect(parseNodeHeaders('X-Client-ID = c3/rosetta-vechain , x-team=a=b')).toEqual({
            'x-client-id': 'c3/rosetta-vechain',
            'x-team': 'a=b'
        });
    });

    it('ignores pairs without a value and blocked or invalid names', () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        expect(parseNodeHeaders('x-a,x-b=,host=example.com,bad name=1,x-ok=1')).toEqual({ 'x-ok': '1' });
        expect(warn).toHaveBeenCalledTimes(4);
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

/** Fake thor node that records the headers of every HTTP request and websocket handshake it receives. */
function startFakeNode(): Promise<{ url: string; received: Map<string, IncomingHttpHeaders>; close: () => Promise<void> }> {
    const received = new Map<string, IncomingHttpHeaders>();
    const server = http.createServer((req, res) => {
        // Answer slowly so concurrent Rosetta requests interleave.
        setTimeout(() => {
            received.set(req.url ?? '', req.headers);
            res.setHeader('content-type', 'application/json');
            res.end('{}');
        }, 20);
    });
    const wss = new WebSocket.Server({ server });
    wss.on('connection', (socket, req) => {
        received.set(`ws:${req.url ?? ''}`, req.headers);
        socket.send('beat');
    });
    return new Promise((resolve) => {
        server.listen(0, '127.0.0.1', () => {
            const { port } = server.address() as AddressInfo;
            resolve({
                url: `http://127.0.0.1:${port}`,
                received,
                close: () => new Promise((done) => wss.close(() => server.close(() => done())))
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
});
