import http, { IncomingHttpHeaders } from 'http';
import { AddressInfo } from 'net';
import Koa from 'koa';
import request from 'supertest';
import { ForwardingNet } from '../../src/utils/connexPro';
import {
    currentForwardHeaders,
    forwardHeadersMiddleware,
    nodeAxios,
    parseForwardHeaders,
    pickForwardHeaders,
    runWithForwardHeaders
} from '../../src/utils/forwardHeaders';

describe('parseForwardHeaders', () => {
    it('returns nothing when unset or empty', () => {
        expect(parseForwardHeaders(undefined)).toEqual([]);
        expect(parseForwardHeaders('')).toEqual([]);
        expect(parseForwardHeaders(' , ')).toEqual([]);
    });

    it('lowercases, trims and dedupes names', () => {
        expect(parseForwardHeaders(' X-Client-ID ,x-request-id,x-client-id,')).toEqual(['x-client-id', 'x-request-id']);
    });

    it('ignores connection and body headers', () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        expect(parseForwardHeaders('Host,x-client-id,Content-Length,transfer-encoding')).toEqual(['x-client-id']);
        expect(warn).toHaveBeenCalledTimes(3);
        warn.mockRestore();
    });
});

describe('pickForwardHeaders', () => {
    it('copies only allowlisted headers that are present', () => {
        const incoming = { 'x-client-id': 'a', 'x-other': 'b', 'x-multi': ['1', '2'] };
        expect(pickForwardHeaders(incoming, ['x-client-id', 'x-missing', 'x-multi'])).toEqual({ 'x-client-id': 'a', 'x-multi': '1, 2' });
    });
});

describe('currentForwardHeaders', () => {
    it('is empty outside a request', () => {
        expect(currentForwardHeaders()).toEqual({});
    });

    it('cannot be changed through the returned copy', () => {
        runWithForwardHeaders({ 'x-client-id': 'a' }, () => {
            currentForwardHeaders()['x-client-id'] = 'b';
            expect(currentForwardHeaders()).toEqual({ 'x-client-id': 'a' });
        });
    });
});

/** Fake thor node that records the headers of every request it receives. */
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
    return new Promise((resolve) => {
        server.listen(0, '127.0.0.1', () => {
            const { port } = server.address() as AddressInfo;
            resolve({
                url: `http://127.0.0.1:${port}`,
                received,
                close: () => new Promise((done) => server.close(() => done()))
            });
        });
    });
}

describe('forwarding to the node', () => {
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

    it('forwards allowlisted headers on axios and connex calls', async () => {
        await request(app(['x-client-id'])).get('/?id=1').set('X-Client-ID', 'client-1').set('X-Other', 'secret').expect(200);

        for (const path of ['/axios/1', '/connex/1']) {
            const headers = node.received.get(path);
            expect(headers?.['x-client-id']).toBe('client-1');
            expect(headers?.['x-other']).toBeUndefined();
        }
    });

    it('forwards nothing with an empty allowlist', async () => {
        await request(app([])).get('/?id=1').set('X-Client-ID', 'client-1').expect(200);

        expect(node.received.get('/axios/1')?.['x-client-id']).toBeUndefined();
        expect(node.received.get('/connex/1')?.['x-client-id']).toBeUndefined();
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
            expect(node.received.get(`/axios/${id}`)?.['x-client-id']).toBe(expected);
            expect(node.received.get(`/connex/${id}`)?.['x-client-id']).toBe(expected);
        }
    });

    it('does not override headers set explicitly on a call', async () => {
        await runWithForwardHeaders({ 'x-client-id': 'forwarded' }, async () => {
            await nodeAxios.get(`${node.url}/axios/explicit`, { headers: { 'x-client-id': 'explicit' } });
            await new ForwardingNet(node.url).http('GET', 'connex/explicit', { headers: { 'x-client-id': 'explicit' } });
        });

        expect(node.received.get('/axios/explicit')?.['x-client-id']).toBe('explicit');
        expect(node.received.get('/connex/explicit')?.['x-client-id']).toBe('explicit');
    });

    it('adds nothing to calls made outside a request', async () => {
        await nodeAxios.get(`${node.url}/axios/background`);
        await new ForwardingNet(node.url).http('GET', 'connex/background');

        expect(node.received.get('/axios/background')?.['x-client-id']).toBeUndefined();
        expect(node.received.get('/connex/background')?.['x-client-id']).toBeUndefined();
    });
});
