# FleetOps AI Cloudflare proxy

This Worker provides the branded `fleetops.rexindynamics.com` endpoint and
streams requests and responses to the public Cloud Run deployment. The
application and its remediation safety controls remain on Cloud Run.

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
