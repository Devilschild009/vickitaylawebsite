# Deploy Victayla: Netlify frontend + Vercel API + Supabase

The code is prepared for this split-host setup, but it has **not** been connected to external accounts or deployed. You will need your own Netlify, Vercel, Supabase, and Git-provider accounts. The included source ZIP can be imported into a Git repository that both hosts can read. No customer domain or production deployment is changed by this guide.

## What is in the project

- `netlify.toml` builds the Vite storefront with `pnpm build:frontend` and publishes `dist/public`; the SPA fallback supports collection and product URLs.
- Root `app.ts` default-exports the shared Express/tRPC API in a filename Vercel recognizes; Vercel runs it as a Function. Vercel hosts the API only; it does not publish the Netlify storefront.
- `server/app.ts` is shared by Vercel and the Manus/local development launcher. The browser uses a Supabase bearer token, not a cross-domain cookie.
- `supabase/migrations/` creates the PostgreSQL catalog, enables row-level security, and creates the `victayla-media` image bucket.
- `scripts/migrate-manus-to-supabase.ts` imports the current Manus catalog and `/manus-storage/` images into Supabase. It leaves the Manus source data untouched.
- `.env.example` lists the required public and server-only variable names with placeholders. Never commit a real `.env` file.

The project uses the `postgres` driver against Supabase's transaction-pooler URL and a small serverless connection pool. The Netlify bundle does not connect to PostgreSQL. The service-role key is server-only; the Netlify public anon/publishable key is not a secret.

## 1. Create the external projects and source repository

1. Create a Supabase project and note its project URL, public anon/publishable key, server-only service-role key, and PostgreSQL transaction-pooler connection string.
2. Import the source ZIP into a Git repository you control, then connect that repository separately to Vercel and Netlify. Keep the project root as the root directory on both providers; do not commit credentials.
3. Keep Manus available as the development/Preview workspace while you set up the external services. Production on Netlify/Vercel/Supabase is designed not to require Manus runtime services.

## 2. Create the Supabase database and image bucket

From the project root, install the lockfile-pinned dependencies, set `SUPABASE_DB_URL` to Supabase's **transaction pooler** URI (normally port `6543`), append `?workaround=supabase-pooler.vercel`, and URL-encode any special characters in the database password. Then run:

```sh
pnpm install --frozen-lockfile
pnpm db:migrate
```

This applies the PostgreSQL migrations in `supabase/migrations/`, creates the catalog tables and `victayla-media` bucket, and enables row-level security on the catalog tables. The API reads/writes catalog data with server-side credentials; the browser does not access the database directly. The public bucket allows storefront image reads. Product/collection uploads require a signed URL issued by the admin-protected API; signed upload tokens expire after two hours and let the browser upload without receiving another credential.

Use Supabase's Auth settings to disable public sign-up. Invite/create the administrator there using the same address configured as `VICTAYLA_ADMIN_EMAIL`; only that confirmed email receives admin permission from the Vercel API. Set Supabase's Site URL to the Netlify origin and add redirect URLs for the Netlify origin (and, if used, its custom domain), including `/admin` paths for password recovery.

## 3. Import the existing catalog and images

Do the first import before customers or the administrator start editing the Supabase copy. Run the migration from the Manus project environment while the existing Manus project is available: the script needs the existing `DATABASE_URL`, `MANUS_API_URL`, and `MANUS_API_KEY`, plus the new Supabase values (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, and `SUPABASE_STORAGE_BUCKET=victayla-media`). These source credentials are provided by Manus at runtime; do not paste them into the repository or a public chat.

```sh
pnpm migrate:manus-to-supabase
```

It imports the four original collections plus the fifth “New Edit” collection, current products, sizes/stock, discounts, product/collection images, and the desktop/mobile hero images. It records a completion marker in Supabase. A repeat run without options safely exits without overwriting later edits. If you make additional catalog changes in Manus before production cutover, pause edits on the Supabase copy and run a deliberate final refresh:

```sh
pnpm run migrate:manus-to-supabase -- --refresh
```

`--refresh` updates matching collection/product slugs and replaces their image/size rows with the current Manus values; do not run it after the Supabase catalog has become the authoritative live copy. Both migrations write only to Supabase and leave the Manus database and stored files intact.

## 4. Configure and deploy the Vercel API

Create a Vercel project from the connected repository, with the project root as its root directory and Node 22. Set these **server-side** environment variables for Preview and Production:

| Variable | Value |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase public anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key; keep private |
| `SUPABASE_DB_URL` | Supabase PostgreSQL transaction-pooler URI with `?workaround=supabase-pooler.vercel` |
| `SUPABASE_STORAGE_BUCKET` | `victayla-media` |
| `VICTAYLA_ADMIN_EMAIL` | The one administrator email to allow |
| `CORS_ALLOWED_ORIGINS` | Exact Netlify origin(s), comma-separated, no trailing slash |
| `DATABASE_POOL_MAX` | `1` (small per-serverless-instance pool) |

Deploy a Vercel Preview and confirm `https://<your-vercel-host>/api/health` responds with `{"status":"ok"}`. The Vercel project is for the API; do not point the Vercel build at `dist/public`.

## 5. Configure and deploy the Netlify storefront

Create a Netlify site from the same repository. Netlify reads `netlify.toml`; the publish directory is `dist/public`. Add these **build-time public** variables in Netlify:

| Variable | Value |
| --- | --- |
| `VITE_API_BASE_URL` | Vercel API origin, e.g. `https://your-api.vercel.app` |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase public anon/publishable key |
| `VITE_SUPABASE_STORAGE_BUCKET` | `victayla-media` |

Deploy a Netlify Preview, then update `CORS_ALLOWED_ORIGINS` in Vercel to the exact Netlify Preview/production origins you will use, with no trailing slash, and redeploy the Vercel API. Add any custom storefront origin to both the Vercel CORS allowlist and Supabase Auth redirect allowlist. Never put `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_DB_URL` in a `VITE_` variable or Netlify frontend settings.

## 6. Confirm the storefront and administrator

Open the Netlify site. Check the homepage's five collection cards, collection/product routes, supplied Denim Diaries image, product-image enlargement, size selection, and local shopping bag. Then open `/admin` and sign in with the Supabase Auth account whose confirmed email matches `VICTAYLA_ADMIN_EMAIL`; test a product, size/discount edit, and image upload. Customers can browse and use the bag without signing in.

The bag is not a payment checkout. Online payment/order submission remains deferred until you choose a payment provider.

## 7. Keep using Manus (optional)

You can keep using Manus for code changes and Preview. If you want the Manus Preview to use the Supabase backend too, supply the same Supabase settings to the Manus project environment through its protected secret configuration. Manus is not required by the deployed Netlify/Vercel/Supabase production path. Do not delete or close the source Manus project/data until the external deployment and image migration are confirmed.

## Official references

- [Vercel: Express on Vercel](https://vercel.com/docs/frameworks/backend/express)
- [Netlify: File-based configuration](https://docs.netlify.com/build/configure-builds/file-based-configuration/)
- [Supabase: Server-side Auth client](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Supabase: Serverless PostgreSQL connections](https://supabase.com/docs/guides/database/connecting-to-postgres/serverless-drivers)
- [Supabase: Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase JavaScript: create a signed upload URL](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl)
- [Supabase JavaScript: upload with a signed URL](https://supabase.com/docs/reference/javascript/storage-from-uploadtosignedurl)
