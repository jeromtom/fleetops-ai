# FleetOps AI Cloudflare proxy

This Worker provides the branded `fleetops.rexindynamics.com` endpoint and
streams requests and responses to the public Cloud Run deployment. The
application and its remediation safety controls remain on Cloud Run.

Current upstream: `fleetops-live-demo-2026` Cloud Run service
`https://fleetops-ai-ywb5cstj7a-uc.a.run.app`.

## Verify

```bash
npm ci
npm run types
npm run check
npx wrangler deploy --dry-run
```

The production custom domain and its exact route are declared in
`wrangler.jsonc`. Cloudflare manages the hostname's DNS record and TLS
certificate. The exact route ensures FleetOps takes precedence over the
existing Rexin Dynamics wildcard portal route.
