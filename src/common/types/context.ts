import type { RouterContext } from "@koa/router";

/**
 * Koa router context whose request body is typed as `TBody`.
 *
 * koa-bodyparser types `ctx.request.body` as `unknown`; handlers should declare
 * the shape they expect (after the route's Joi validation has run) instead.
 */
export type RequestContext<TBody> = RouterContext & {
    request: { body: TBody }
};

/** The subset of a Koa context needed to write a JSON response. */
export type ResponseContext = {
    status: number,
    body: unknown
};
