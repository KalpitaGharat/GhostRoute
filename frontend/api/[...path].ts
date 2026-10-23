/**
 * Vercel Serverless Function Proxy (BFF)
 * 
 * Proxies public client-side /api requests from the browser to the internal
 * private FastAPI backend service using the bound BACKEND_URL environment variable.
 */

export const config = {
  runtime: 'nodejs',
};

export default async function handler(request: Request): Promise<Response> {
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      },
    });
  }

  const url = new URL(request.url);
  // Strip /api prefix to route to backend endpoint (e.g., /api/analyze -> /analyze)
  const targetPath = url.pathname.replace(/^\/api\/?/, '/');
  
  // BACKEND_URL is injected by Vercel via the service binding defined in vercel.json
  const backendBase = process.env.BACKEND_URL || 'http://localhost:8000';
  const targetUrl = new URL(targetPath + url.search, backendBase);

  const forwardHeaders = new Headers(request.headers);
  forwardHeaders.delete('host');

  try {
    const isBodyAllowed = !['GET', 'HEAD'].includes(request.method);
    const bodyContent = isBodyAllowed ? await request.text() : undefined;

    const backendResponse = await fetch(targetUrl, {
      method: request.method,
      headers: forwardHeaders,
      body: bodyContent,
      redirect: 'follow',
    });

    const responseHeaders = new Headers(backendResponse.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');

    return new Response(backendResponse.body, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Internal proxy error';
    return new Response(
      JSON.stringify({
        error: 'Proxy to internal backend service failed',
        details: errorMessage,
        target: targetUrl.toString(),
      }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}
