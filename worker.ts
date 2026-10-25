import { handler } from "./netlify/functions/api";
import type { HandlerEvent, HandlerContext } from "@netlify/functions";

export interface Env {
  ASSETS?: { fetch: (req: Request) => Promise<Response> };
  [key: string]: any;
}

/**
 * Entry point untuk Cloudflare Workers (*.workers.dev) dengan Static Assets.
 * - Semua request `/api/*` atau `/.netlify/functions/api*` diproses oleh handler backend.
 * - Request lainnya diteruskan ke static assets (`dist/`) dengan fallback SPA.
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (
      url.pathname.startsWith("/api/") ||
      url.pathname === "/api" ||
      url.pathname.startsWith("/.netlify/functions/api")
    ) {
      // Salin environment variables dari Cloudflare Worker ke process.env
      if (env && typeof process !== "undefined" && process.env) {
        for (const [k, v] of Object.entries(env)) {
          if (typeof v === "string") {
            process.env[k] = v;
          }
        }
      }

      const headers: Record<string, string> = {};
      request.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });

      let body: string | null = null;
      let isBase64Encoded = false;

      if (request.method !== "GET" && request.method !== "HEAD") {
        const contentType = headers["content-type"] || "";
        if (contentType.startsWith("image/") || contentType.startsWith("application/octet-stream")) {
          const buf = Buffer.from(await request.arrayBuffer());
          body = buf.toString("base64");
          isBase64Encoded = true;
        } else {
          body = await request.text();
        }
      }

      const event: HandlerEvent = {
        rawUrl: request.url,
        rawQuery: url.search.replace(/^\?/, ""),
        path: url.pathname,
        httpMethod: request.method,
        headers,
        multiValueHeaders: {},
        queryStringParameters: Object.fromEntries(url.searchParams.entries()),
        multiValueQueryStringParameters: {},
        body,
        isBase64Encoded,
      };

      const result = await handler(event, {} as HandlerContext);
      if (!result) {
        return new Response(JSON.stringify({ error: "Empty response" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(result.body || "", {
        status: result.statusCode || 200,
        headers: (result.headers as Record<string, string>) || { "Content-Type": "application/json" },
      });
    }

    // Sajikan file frontend statis dari dist/
    if (env?.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not found", { status: 404 });
  },
};
