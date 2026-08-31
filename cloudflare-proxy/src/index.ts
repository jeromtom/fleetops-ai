const UPSTREAM_ORIGIN = "https://fleetops-ai-ywb5cstj7a-uc.a.run.app";

export default {
  async fetch(request: Request): Promise<Response> {
    const incomingUrl = new URL(request.url);
    const upstreamUrl = new URL(
      `${incomingUrl.pathname}${incomingUrl.search}`,
      UPSTREAM_ORIGIN,
    );

    try {
      const upstreamRequest = new Request(upstreamUrl, request);
      upstreamRequest.headers.set("X-Forwarded-Host", incomingUrl.host);
      upstreamRequest.headers.set("X-Forwarded-Proto", "https");

      const upstreamResponse = await fetch(upstreamRequest);

      console.log(
        JSON.stringify({
          message: "proxied request",
          method: request.method,
          path: incomingUrl.pathname,
          status: upstreamResponse.status,
        }),
      );

      return new Response(upstreamResponse.body, upstreamResponse);
    } catch (error) {
      console.error(
        JSON.stringify({
          message: "upstream request failed",
          error: error instanceof Error ? error.message : "Unknown error",
          path: incomingUrl.pathname,
        }),
      );

      return Response.json(
        { error: "FleetOps upstream is temporarily unavailable" },
        { status: 502 },
      );
    }
  },
} satisfies ExportedHandler;
