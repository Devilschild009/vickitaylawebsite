# Victayla standalone store

Victayla is a custom fashion storefront designed for **Netlify (frontend), Vercel (API), and Supabase (authentication, PostgreSQL, and image storage)**. It is not connected to Shopify. The code and deploy configuration are prepared, but no external accounts have been configured and no production site has been deployed.

Start with the [Netlify/Vercel/Supabase deployment guide](./DEPLOY-NETLIFY-VERCEL.md). It covers the required environment variables, database migrations, existing catalog/image import, deployment sequence, and how to keep Manus as an optional development/Preview workspace. The [admin guide](./ADMIN-GUIDE.md) explains administrator access, collections, product pricing/discounts, sizes, stock, and product galleries.

## Local development

Use Node.js 22 and pnpm 10.18, then install dependencies:

```sh
pnpm install --frozen-lockfile
```

Set the Supabase values from `.env.example` in your local environment before starting the full-stack app. `SUPABASE_DB_URL` must be the Supabase transaction-pooler URL recommended for Vercel. The public storefront can be built separately for Netlify with `pnpm build:frontend`; Netlify publishes `dist/public`. `app.ts` exports the Express/tRPC API for Vercel.

```sh
pnpm dev                 # local/Manus Preview development
pnpm check               # TypeScript
pnpm test                # application tests
pnpm build:frontend      # Netlify static output: dist/public
pnpm build               # frontend and development-server bundle
pnpm db:migrate          # apply Supabase PostgreSQL schema migrations
```

Do not run `pnpm db:migrate` against a database until `SUPABASE_DB_URL` points at the intended Supabase project. To import the existing Manus catalog and media, use `pnpm migrate:manus-to-supabase` from the Manus project environment after configuring the target Supabase credentials; see the deployment guide first. A plain rerun is a no-op. `--refresh` deliberately overwrites matching imported records and is intended only before the Supabase catalog becomes authoritative.

Customer carts are browser-local. This version does not take payments or submit orders; choose a payment provider before adding live checkout.
# vickywebsite
