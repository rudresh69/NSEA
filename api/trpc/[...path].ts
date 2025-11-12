import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { appRouter } from "../../server/routers";
import { createContext } from "../../server/_core/context";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return res.status(200).end();
  }

  // Convert Vercel request to Fetch API Request
  const url = new URL(req.url || "/", `https://${req.headers.host || "localhost"}`);
  
  // Get request body - Vercel automatically parses JSON, but we need to handle it properly
  let requestBody: string | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    const contentType = req.headers["content-type"] || "";
    if (contentType.includes("application/json")) {
      requestBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body || {});
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      // For URL-encoded bodies, pass as-is
      requestBody = typeof req.body === "string" ? req.body : new URLSearchParams(req.body as any).toString();
    } else if (req.body) {
      requestBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    }
  }
  
  // Create a Fetch API compatible request
  const fetchRequest = new Request(url.toString(), {
    method: req.method,
    headers: new Headers(req.headers as Record<string, string>),
    body: requestBody,
  });

  // Create a Fetch API compatible response handler
  const response = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req: fetchRequest,
    router: appRouter,
    createContext: async (opts) => {
      // Convert Fetch request to Express-like format for context
      const expressReq = {
        headers: Object.fromEntries(opts.req.headers.entries()),
        method: opts.req.method,
        query: Object.fromEntries(url.searchParams.entries()),
        body: req.body,
        url: url.pathname + url.search,
        cookies: req.cookies || {},
        get: (name: string) => opts.req.headers.get(name) || undefined,
      } as any;

      const expressRes = {
        status: (code: number) => {
          res.status(code);
          return {
            json: (data: any) => res.json(data),
            send: (data: any) => res.send(data),
            end: (data?: any) => res.end(data),
            setHeader: (name: string, value: string) => res.setHeader(name, value),
            cookie: (name: string, value: string, options?: any) => {
              const cookieOptions = options || {};
              const cookieParts = [`${name}=${value}`];
              if (cookieOptions.maxAge) cookieParts.push(`Max-Age=${cookieOptions.maxAge}`);
              if (cookieOptions.path) cookieParts.push(`Path=${cookieOptions.path}`);
              if (cookieOptions.domain) cookieParts.push(`Domain=${cookieOptions.domain}`);
              if (cookieOptions.secure) cookieParts.push("Secure");
              if (cookieOptions.httpOnly) cookieParts.push("HttpOnly");
              if (cookieOptions.sameSite) cookieParts.push(`SameSite=${cookieOptions.sameSite}`);
              res.setHeader("Set-Cookie", cookieParts.join("; "));
            },
            clearCookie: (name: string, options?: any) => {
              const cookieOptions = options || {};
              const cookieParts = [`${name}=; Max-Age=0`];
              if (cookieOptions.path) cookieParts.push(`Path=${cookieOptions.path || "/"}`);
              if (cookieOptions.domain) cookieParts.push(`Domain=${cookieOptions.domain}`);
              if (cookieOptions.secure) cookieParts.push("Secure");
              if (cookieOptions.httpOnly) cookieParts.push("HttpOnly");
              if (cookieOptions.sameSite) cookieParts.push(`SameSite=${cookieOptions.sameSite}`);
              res.setHeader("Set-Cookie", cookieParts.join("; "));
            },
          };
        },
        json: (data: any) => res.json(data),
        send: (data: any) => res.send(data),
        setHeader: (name: string, value: string) => res.setHeader(name, value),
      } as any;

      return createContext({ req: expressReq, res: expressRes });
    },
  });

  // Convert Fetch Response to Vercel response
  const responseBody = await response.text();
  
  // Set headers
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  return res.status(response.status).send(responseBody);
}

