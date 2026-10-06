# Winkwire Electronics — Concept A

A custom, mobile-first GitHub Pages storefront that reads the Winkwire product catalog from Shopify and sends customers to Shopify's secure checkout.

## What is already built

- Concept A blue/cyan/black branding and Winkwire logo assets
- Responsive homepage and navigation
- Live Shopify product catalog loader
- Product search, category filters, sorting, product details, variants, cart drawer, quantity updates, removal, and checkout
- Local cart persistence
- Mobile layout
- About and Support sections
- GitHub Pages support (`.nojekyll`, `404.html`, `CNAME`)
- Safe browser-side integration: no Shopify Admin credentials are used
- Graceful Concept Preview mode if Shopify is not yet reachable/published

## 1. Verify the Shopify domain

Open Shopify Admin → **Settings → Domains** and confirm the exact permanent `*.myshopify.com` domain.

`config.js` is currently set to:

    pv0v77-4v.myshopify.com

If Shopify shows anything different, replace that one value in `config.js`.

## 2. Shopify Storefront access

This build uses Shopify Storefront API version `2026-07` and supports tokenless public catalog/cart access. If the shop configuration requires a public token or you later use features that require one, create a **PUBLIC Storefront API token** through Shopify's Headless sales channel and paste only that public token into `config.js`.

Never put any of these in GitHub:

- Shopify Admin password
- Admin API access token
- private Storefront token
- payment credentials

A public Storefront API token is specifically intended for browser storefronts.

## 3. Publish products

In Shopify, make sure products are Active and available to the storefront/Headless sales channel. If Shopify returns no products, the site automatically displays Concept Preview cards rather than breaking.

## 4. Add contact details

Open `config.js` and fill in the optional `contactEmail` and `phone` values. The support cards stay disabled until you add them.

## 5. Upload to GitHub

1. Create a new GitHub repository (for example `winkwire-electronics`).
2. Upload **the contents of this folder**, not the zip itself.
3. Commit the files to the `main` branch.
4. Open Repository **Settings → Pages**.
5. Under Build and deployment choose **Deploy from a branch**.
6. Choose `main` and `/ (root)`, then Save.
7. GitHub will publish a temporary `github.io` URL.

## 6. Custom domain

This project includes a `CNAME` file for:

    winkwireelectronics.com

Do not change the live DNS until the GitHub preview is approved. When ready, configure GitHub Pages Custom Domain and update DNS with the domain provider. Since the domain may currently point to Shopify, do this only at launch.

## 7. Test before launch

Test all of the following on desktop and mobile:

- products load from Shopify
- product options/variants switch correctly
- Add to Cart works
- cart quantity controls work
- cart persists after refresh
- Checkout opens Shopify checkout
- order can be completed with Shopify's test payment method (when test mode is enabled)
- links, email, and phone details are correct
- policies and owner-provided About copy are added before final launch

## Important

GitHub Pages is a static host. This architecture intentionally leaves commerce with Shopify. The customer shops on the custom GitHub storefront, while Shopify remains the system of record for products, inventory, cart, payments, taxes, orders, and checkout.
