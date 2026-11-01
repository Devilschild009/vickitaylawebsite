# Victayla store admin guide

## Admin sign-in

Open `/admin` on the Netlify storefront (or in Manus Preview once its Supabase environment is configured). Sign in with the Supabase Auth email/password account whose **confirmed email exactly matches the server-side `VICTAYLA_ADMIN_EMAIL` allowlist**. Create or invite that account in the Supabase dashboard and complete its email verification; public sign-up is disabled. Customers do not need an account to browse or use the bag.

Use **Forgot password** on the sign-in form to request a reset link. Supabase must have the storefront origin and `/admin` recovery redirect in its allowed redirect URLs.

## Add or edit a product

1. In the **Products** tab, choose **Add product** or edit an existing product.
2. Enter the product name and choose a collection.
3. Enter the regular price in Nigerian naira (NGN). A blank price is an editable placeholder for an unpublished draft; customers cannot add an unpriced item to the bag.
4. Enter a discount from 0 to 100 percent. The storefront calculates and displays the reduced price.
5. Add the product details and available sizes. Enter one size and stock quantity per line as `Size, quantity`, for example `S, 4` or `M, 3`. A size with quantity 0 is unavailable.
6. Choose JPEG, PNG, WebP, or AVIF images up to 8 MB each. Images upload one at a time to the `victayla-media` Supabase Storage bucket; the gallery has no preset image slots, so you can add more images whenever needed.
7. Turn **Visible in the storefront** on when the product is ready, then save.

Product details are stored in Supabase PostgreSQL. Images use durable Supabase Storage URLs; the browser receives only a short-lived signed upload URL after the backend verifies the administrator. Never expose the Supabase service-role key in the browser or a `VITE_` variable.

## Add or change a collection

Open the **Collections** tab to edit any existing collection, including the fifth **New Edit** card. Change its name, short line, description, and cover image. Choose **Add collection** to create another collection. Product assignments determine which products appear on each collection page; the homepage uses the active collection list.

## Customer product viewing and shopping bag

Customers can click a product photo to view it larger, select an available size, and add the item to their bag. The bag saves its contents in the visitor's browser and recalculates quantities, discounts, subtotals, and total from the catalog.

This version does not collect orders or take payments. Choose a payment provider before adding a live checkout.

## Hosting configuration

Follow [DEPLOY-NETLIFY-VERCEL.md](./DEPLOY-NETLIFY-VERCEL.md) for Netlify, Vercel, Supabase, admin allowlist, data migration, and image-storage configuration. The deployed store does not require Manus; Manus can remain the development/Preview workspace if you want it.
