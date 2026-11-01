# Victayla external-host migration plan

## Goal and hosting decision

Prepare the existing standalone Victayla storefront for **Netlify (static frontend) + Vercel (Express/tRPC API) + Supabase (Auth, PostgreSQL, and Storage)**. Keep Manus available as the code-development workspace and Preview environment, but remove Manus-only OAuth, MySQL, and object-storage dependencies from the application runtime. The application should use the same portable API and Supabase services in Preview and production. This is a code and migration-tooling change; no provider account will be created, no customer domain changed, and no public production deployment will be triggered as part of the code refactor.

The current site already has a Vite/React storefront, an Express/tRPC API, a MySQL/Drizzle data layer, a Manus OAuth integration, Manus-backed product image paths, five collection records, and a size-aware local shopping bag. Its established Victayla editorial design, four named edits plus “New Edit,” supplied Denim Diaries product image, product management, price/discount/size handling, and image enlargement should be preserved.

## Application architecture

- **Frontend:** Continue using the existing Vite/React application and build to `dist/public`. Netlify publishes only these static files and uses an SPA fallback for frontend routes. Add `netlify.toml` with the static build and publish configuration. Its build-time `VITE_API_BASE_URL` points to the Vercel API.
- **Backend:** Refactor route registration into a reusable `server/app.ts` Express application that does not listen on a port or serve Vite/static files. Add a Vercel-compatible root Express entry point (`app.ts`, following Vercel’s Express framework convention). Keep `server/_core/index.ts` as the Manus/local development launcher: it creates the same app, mounts Vite during development or built static output when applicable, and listens on the configured port. This preserves the Manus Preview workflow without tying production data or authentication to Manus.
- **API transport:** Keep tRPC routes under `/api/trpc`. The browser calls the same origin by default in Manus/local Preview and uses `VITE_API_BASE_URL` for the deployed Netlify-to-Vercel call. The client sends the Supabase access token as a Bearer token, not as a cross-site cookie. The Vercel API accepts only configured Netlify/custom-domain origins through an explicit CORS allowlist.
- **Identity and admin access:** Replace Manus OAuth and its custom session cookie with Supabase Auth email/password sign-in. Do not expose public sign-up. The store owner creates/invites the administrator in Supabase; the backend authorizes admin mutations only when the verified Supabase user email matches the server-side `VICTAYLA_ADMIN_EMAIL` allowlist. Validate the bearer token with Supabase Auth on the server (`getUser`/verified claims); never trust a browser-supplied role, `getSession()` on the server, or an unverified JWT. Keep password-reset redirects limited to the configured storefront origin.
- **Database:** Migrate the Drizzle store schema from MySQL to PostgreSQL (`pg-core`) and connect from the Vercel Function using Supabase’s transaction-mode connection pooler. Use the Vercel-compatible pooler URI/driver options, SSL, and a small serverless connection pool. The Netlify bundle never connects directly to PostgreSQL. Apply additive PostgreSQL migrations to a new Supabase project; leave the existing Manus MySQL database untouched.
- **Image storage:** Replace the Manus `storagePut` adapter and `/manus-storage/...` URLs with a Supabase Storage bucket for public storefront reads. Keep product/collection writes administrator-only: the Vercel API verifies the administrator, creates a short-lived signed upload URL, and the browser uploads directly to Supabase Storage, avoiding Vercel Function request-body limits and never exposing the service-role key. The service-role key stays server-side. The public browser receives only the Supabase project URL and publishable/anon key; it does not receive database credentials or the service-role key.
- **Shopping bag:** Keep the current size-aware `localStorage` bag and pricing/discount display. This work does not add payment processing or claim checkout readiness; a payment provider remains a later decision.

## Data and asset migration

Add a one-time, rerunnable import utility rather than modifying or deleting the live Manus database. It reads the existing collections, products, image references, and size/stock rows; downloads each `/manus-storage/...` source image through Manus’s signed-read mechanism; uploads it into the new Supabase Storage bucket; and imports/updates the related PostgreSQL rows with the new public image URL. Include the supplied desktop/mobile hero art, all four collection covers, and the Denim Diaries product/detail image as well as any additional rows created by the administrator. Use stable keys/IDs or a mapping table so a rerun does not duplicate products or collections. Do not migrate Manus OAuth accounts/passwords: create the administrator as a Supabase Auth user using the existing allowlisted email. Preserve the source Manus database and images until the owner confirms the new host is working.

The import utility must require explicit source and target environment variables and print counts/errors, never credentials. It will not be run until the owner supplies and configures a Supabase project. Include instructions for taking a final fresh import immediately before cutover if the owner adds products during the transition.

## Project structure

- `client/src/pages/`, `client/src/components/`, and `client/src/contexts/`: retain the existing public store, admin interface, image lightbox, and local cart; replace only their authentication, API URL, and upload flows where required.
- `client/src/lib/trpc.ts`: attach the Supabase access token and select same-origin versus configured remote API base URL.
- `client/src/lib/supabase.ts` (or equivalent): browser-safe Supabase Auth client using only the public project URL and publishable/anon key.
- `server/app.ts`: portable Express routes, tRPC middleware, and configured CORS; no `listen()`, Manus OAuth routes, Vite middleware, or development-only services.
- `server/auth/supabase.ts`: verify Supabase access tokens and construct the authenticated/admin context using the email allowlist.
- `server/db.ts`, `server/store.ts`, and `drizzle/schema.ts`: Postgres/Drizzle access and catalog operations; no Manus MySQL or storage calls in the production code path.
- `server/storage.ts`: server-side signed-upload URL creation and public-object URL helpers for Supabase Storage.
- `server/_core/index.ts`: existing Manus/local launcher adapted to reuse `server/app.ts`.
- Root `app.ts`: Vercel Express Function entry point. Root `netlify.toml`: Netlify static frontend configuration and SPA fallback; the Vercel API remains a separate host.
- `drizzle/` or `supabase/migrations/`: PostgreSQL schema migration files. `scripts/migrate-manus-to-supabase.ts`: one-time media and catalog import utility.
- `DEPLOY-NETLIFY-VERCEL.md` and `ADMIN-GUIDE.md`: update deployment steps, required environment variables, Supabase setup, the admin invitation, and image-upload workflow.

## Visual design

- **Design movement:** Preserve the existing quiet-luxury, Lagos-rooted fashion editorial rather than introducing a new visual direction.
- **Core principles:** (1) editorial restraint over dashboard-like storefront chrome; (2) warm, tactile imagery and generous breathing room; (3) collections and product details stay easy to browse on small screens; (4) admin controls remain clear and functional without changing the brand voice.
- **Color philosophy:** Retain the existing cream/ivory ground, oxblood/merlot emphasis, charcoal text, and muted champagne accents; these frame product imagery as the focal point.
- **Layout paradigm:** Keep the full-bleed editorial hero, generous section spacing, and five-card collection row; use fluid multi-column product grids that collapse cleanly on mobile. Keep collection/product pages distinct, not a single overloaded catalog screen.
- **Signature elements:** Oversized high-contrast serif headlines; fine hairlines and small uppercase section labels; numbered image/collection markers and the Victayla “V” monogram.
- **Interaction philosophy:** Clear image zoom, size selection, stock cues, sale-price hierarchy, and bag feedback; admin actions confirm uploads/saves and expose useful validation errors.
- **Animation:** Restrained fades/reveals and small button/arrow transitions only; no motion that delays browsing or obscures reduced-motion settings.
- **Typography system:** Keep the current editorial serif display paired with a restrained sans-serif for navigation, labels, prices, and admin forms. Preserve the existing loaded font pairing and hierarchy.
- **Brand essence:** A considered wardrobe for women who want ease with presence; **elegant, self-assured, warm**.
- **Brand voice:** Assured, human, concise, and never pushy. Examples: “Find the edit that feels like you.” / “Made for the moments that matter.”
- **Wordmark & logo:** Retain the supplied Victayla wordmark treatment and existing monogram; do not introduce an unrelated icon.
- **Signature brand color:** Oxblood/merlot, used as the recognisable brand accent rather than a dominant background.

## Constraints and external setup

The user will need separate Netlify, Vercel, and Supabase accounts/projects. The code can be made ready in this Manus project, but external hosting cannot be completed until those accounts, project values, and a user-controlled Git repository or source upload are available. Needed secret values will be collected through protected configuration, not pasted into source. At deploy time the owner must set Netlify’s public `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_API_BASE_URL`; set Vercel’s protected Supabase URL/service-role key, PostgreSQL transaction-pooler URL, `VICTAYLA_ADMIN_EMAIL`, and exact allowed Netlify/custom origins; and set corresponding Preview values for Manus if the owner wants the Preview to use the same Supabase project. Exact host-assigned origins will be added after those projects exist.

The storefront remains accessible through Manus Preview during development, but its external identity/data/media become Supabase-backed. Production on Netlify/Vercel/Supabase is designed not to require Manus runtime services. A GitHub repository controlled by the owner is needed for hands-off host builds; otherwise deliver a complete source ZIP and follow the manual import instructions. No live payment checkout is part of this migration.

## Official references consulted

- Supabase server-side Auth client and verified-token guidance: https://supabase.com/docs/guides/auth/server-side/creating-a-client
- Supabase serverless PostgreSQL drivers and Vercel transaction-pooler connection URI: https://supabase.com/docs/guides/database/connecting-to-postgres/serverless-drivers
- Supabase Storage RLS, signed uploads, and service-key security: https://supabase.com/docs/guides/storage/security/access-control
- Vercel Express framework guide: https://vercel.com/docs/frameworks/backend/express
- Netlify Express framework guide: https://docs.netlify.com/build/frameworks/framework-setup-guides/express/
- Vercel rewrites reference: https://vercel.com/docs/routing/rewrites
