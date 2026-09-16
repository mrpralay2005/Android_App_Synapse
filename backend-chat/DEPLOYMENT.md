# Chat production deployment

The browser talks directly to the `synapse-chat` Cloudflare Worker. This is
separate from the main API Worker, but it is not a separate authentication
system: both Workers must use the exact same production `JWT_SECRET`.

## One-time Cloudflare configuration

In **Workers & Pages → synapse-chat → Settings → Variables and Secrets**, add
these **Production** secrets (and the same pair for Preview/Staging if that
Worker is deployed):

| Name | Value |
| --- | --- |
| `DATABASE_URL` | The pooled connection URL for the dedicated chat Neon branch. |
| `JWT_SECRET` | The existing production secret from `synapse-backend`; do not create a separate chat value. |

In **Workers & Pages → <the frontend Pages project> → Settings → Environment
variables**, set this non-secret build variable for both Production and Preview:

```text
VITE_CHAT_API_URL=https://synapse-chat.mrpralay2005.workers.dev
```

Redeploy the Pages project after changing a `VITE_*` variable because Vite
embeds it during the build.

## Deploy and verify

From `backend-chat`, deploy the Worker with `npm run deploy`. Then use a real
logged-in browser session to open Direct Messages. The Worker accepts the same
Bearer token used by the main API; a 401/403 after deployment means the two
Workers have different `JWT_SECRET` values.

The checked-in migration is idempotent so it can initialize a fresh chat
branch and record the already-created chat tables in this project's current
branch. Run `npx prisma migrate deploy` with `DATABASE_URL` set to the chat
branch before the Worker deploy.
