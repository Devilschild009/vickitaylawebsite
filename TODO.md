# Victayla external-host migration — To Do

## Storefront behavior — implemented
- Keep the Victayla homepage and its existing editorial brand, supplied imagery, five collection boxes, and named edits: The Denim Diaries, The Gown Gallery, The Top Lane, The Dress Edit, and the fifth “New Edit” slot.
- Keep the supplied “Victayla The Jeans” denim image in The Denim Diaries; its price remains unset/editable until the owner enters the real price.
- Keep admin management for collections, products, multiple images without fixed gallery slots, prices, discounts, sizes, stock, product visibility, and collection assignments.
- Keep customer product browsing, clickable enlarged images, required size selection before adding to the bag, and the size-aware local shopping bag with quantities, discounts, subtotals, and totals.

## Portable runtime and hosting — code/configuration implemented; live deployment pending
- Publish the storefront as static Vite output on Netlify and run the Express/tRPC API as a Vercel Function; configure the Netlify frontend to call the Vercel API using an environment-provided API origin.
- Keep Manus as a development and Preview environment that can run the same portable application; remove Manus-only OAuth, MySQL, and object-storage dependencies from the production code path.
- Configure explicit allowed frontend origins for the Vercel API; do not rely on cross-site session cookies between Netlify and Vercel.
- Do not trigger a public production deployment or change a customer domain as part of this code refactor.

## Supabase Auth and administrator authorization — code implemented; live Auth setup pending
- Replace Manus OAuth with Supabase Auth email/password sign-in; do not expose public sign-up.
- Restrict admin mutations server-side to a verified Supabase user whose confirmed email matches the protected `VICTAYLA_ADMIN_EMAIL` allowlist; never trust a browser-supplied role or unverified token.
- Keep Supabase service-role and database credentials on the server; expose only the public Supabase project URL and publishable/anon key to the frontend.
- Explain how the owner creates/invites the administrator and configures the storefront origin for password reset.

## Supabase PostgreSQL and catalog migration — schema/import code implemented; live database import pending
- Move the Drizzle catalog schema from MySQL to PostgreSQL and connect the Vercel Function through Supabase’s transaction-mode pooler with serverless-compatible options.
- Add additive PostgreSQL schema migrations for collections, products, images, sizes, discounts, stock, and visibility; leave the existing Manus MySQL database intact.
- Provide a one-time, rerunnable migration utility that imports current collections, products, sizes, stock, and images without duplicating rows on a rerun; include all hero, collection-cover, and denim-product assets.
- Do not migrate Manus OAuth accounts or passwords; the administrator creates a new Supabase Auth account using the allowlisted email.
- Preserve source Manus database rows and files until the owner confirms the new deployment works; report migration counts/errors without printing credentials.

## Supabase Storage and image uploads — code/SQL implemented; live upload verification pending
- Replace `/manus-storage/...` runtime paths and Manus storage calls with Supabase Storage URLs for the storefront.
- Keep public storefront image reads available while requiring verified admin authorization before issuing signed upload URLs for product and collection images.
- Upload images directly from the admin browser to Supabase Storage using the signed URL; never send the server-only service-role key to the browser or depend on ephemeral Vercel disk for permanent files.

## Deployment handoff and source ownership — files implemented; external account setup pending
- Add working Netlify static-site configuration and a Vercel Express API entry point; update the deployment guide with the exact build/publish behavior, environment variables, origins, Supabase setup, admin setup, data/image migration, and deployment sequence.
- Keep the application runnable in Manus Preview during development using the same portable API and Supabase services when configured.
- Provide a source ZIP or prepare the code for a Git repository controlled by the owner; explain that Netlify/Vercel builds require a repository they can access.
- Keep the quiet-luxury Victayla palette, editorial typography, whitespace, five-card collection layout, and responsive product/admin layouts.

## Payment scope — intentionally deferred
- Do not add payment processing or live checkout until the owner selects a payment provider; the existing shopping bag is not a payment-ready checkout.
