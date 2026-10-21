# Winkwire Storefront — Google Merchant Center Hardened

Winkwire is a custom HTML/CSS/vanilla-JavaScript storefront backed by Shopify. GitHub remains the code repository. For the production site, deploy the repository through **Cloudflare Pages connected to GitHub** so the product landing pages can be rendered on the server before Google Merchant Center crawls them. There is no framework and no application build step.

## Why production uses Cloudflare Pages instead of GitHub Pages

Google Merchant Center compares the submitted product price and availability with the landing page. Google specifically warns that product pricing inserted only after JavaScript executes can cause price-mismatch problems. A pure GitHub Pages site cannot server-render Shopify product data, so this package uses Cloudflare Pages Functions for production product pages while retaining plain HTML, CSS, and JavaScript source in GitHub.

Production product URLs use this format:

`https://winkwireelectronics.com/products/PRODUCT-HANDLE?variant=SHOPIFY-VARIANT-ID`

Those routes return HTML that already contains the live Shopify product title, image, selected-variant price, availability, purchase control, canonical URL, and Product/Offer structured data. JavaScript then adds the interactive cart experience.

## Shopify implementation

Verified against Shopify's official Storefront API documentation on October 21, 2026. The package targets Storefront API `2026-10`, the latest stable version on that date. It uses the supported Cart API (`cartCreate`, `cartLinesAdd`, `cartLinesUpdate`, and `cartLinesRemove`) and sends the customer to Shopify using the cart's returned `checkoutUrl`.

The Storefront `Shop` object is used to retrieve the policies actually published in Shopify: contact information, privacy policy, refund policy, shipping policy, and terms of service. The site does not invent business policies.

**Never place an Admin API token, client secret, private Storefront token, password, or other private credential in this repository.** `SHOPIFY_STOREFRONT_TOKEN` must be a browser-safe public Storefront token because `/config.js` intentionally exposes the public storefront configuration to the browser.

## Production deployment — Cloudflare Pages + GitHub

1. Push the contents of this folder to the root of the GitHub repository for Winkwire.
2. In Cloudflare, create a **Pages** project and connect the GitHub repository.
3. Use **Framework preset: None**.
4. Use `exit 0` as the build command (or leave the build command blank if the dashboard permits it).
5. Set the build output directory to `.` because the static site lives at the repository root.
6. Add `winkwireelectronics.com` under the Pages project's **Custom domains** and follow Cloudflare's DNS prompts.
7. Enable HTTPS and confirm the final production origin is exactly `https://winkwireelectronics.com`.

The `functions/` directory contains Cloudflare Pages Functions. `_routes.json` limits function execution to the routes that need it.

## Required Cloudflare environment variables

Set these in **Cloudflare Pages → Settings → Environment variables** for Production. Add the same values to Preview only if you want preview deployments connected to the live Shopify catalog.

| Variable | Required | Value |
|---|---|---|
| `SHOPIFY_STORE_DOMAIN` | Yes | Your permanent `.myshopify.com` domain, e.g. `winkwire.myshopify.com` |
| `SHOPIFY_STOREFRONT_TOKEN` | Yes | Browser-safe public Storefront API token |
| `SHOPIFY_API_VERSION` | Yes | `2026-10` |
| `PUBLIC_ORIGIN` | Yes | `https://winkwireelectronics.com` |
| `SUPPORT_EMAIL` | Optional fallback | A real monitored support email if Shopify contact information does not provide a usable contact method |
| `DESK_RESET_HANDLE` | Optional | Defaults to `desk-reset` |
| `GRAB_GO_HANDLE` | Optional | Defaults to `grab-and-go` |
| `PRODUCT_LIMIT` | Optional | Homepage product limit, default `24`, maximum `100` |

The production `/config.js` route is generated from these environment variables. The repository's static `config.js` exists only so the site can be previewed locally without Cloudflare Functions.

## Required Shopify information before Google review

Publish accurate, complete business information in Shopify before requesting another Merchant Center review:

- Customer contact information.
- Shipping policy.
- Return/refund policy.
- Privacy policy.
- Terms of service.

The return/refund policy must reflect the business's actual return window, eligible conditions, return method, return-shipping responsibility, applicable fees, and refund timing. The shipping policy must reflect actual handling/transit expectations, destinations or restrictions, costs or how they are calculated, and applicable fulfillment information. Do not add promises that the business cannot honor.

Winkwire contains a compliance gate. If required policy/contact information is missing, purchasing is disabled and `/merchant-feed.xml` returns an unavailable response instead of sending incomplete products to Google.

## Google Merchant Center product feed

After the site is live and the compliance gate passes, this URL provides a live Google-compatible XML product feed generated from Shopify:

`https://winkwireelectronics.com/merchant-feed.xml`

It contains variant-specific product links to the server-rendered Winkwire landing pages and uses Shopify as the source for title, description, image, availability, price, SKU/GTIN/brand identifiers when available.

Use **one authoritative product data source** in Merchant Center. If the Shopify Google/YouTube app or another integration is already supplying the same products, do not add this feed as a duplicate unless you intentionally replace the existing source.

## Shopify checkout domain

The cart uses Shopify's returned `checkoutUrl`; no custom payment form is created. For a headless storefront, configure a branded Shopify checkout subdomain such as `checkout.winkwireelectronics.com` if that option is available for the store. This improves continuity between the Winkwire storefront and Shopify checkout. The actual checkout domain is controlled in Shopify, not by this repository.

## Local preview

For a local preview, edit the static `config.js` with a browser-safe public Storefront token and serve the directory over HTTP:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

Local product pages use `product.html?handle=...` because Cloudflare Pages Functions do not run under Python's basic HTTP server. Production links automatically use `/products/:handle`.

## Important production routes

- `/` — storefront homepage
- `/products/:handle` — server-rendered product landing page
- `/contact` — server-rendered Shopify contact information
- `/policies/shipping` — live Shopify shipping policy
- `/policies/refund` — live Shopify return/refund policy
- `/policies/privacy` — live Shopify privacy policy
- `/policies/terms` — live Shopify terms
- `/merchant-feed.xml` — live Google Merchant Center feed
- `/sitemap.xml` — dynamic sitemap including live Shopify product pages once the store is compliant
- `/config.js` — browser-safe production storefront configuration

## Before requesting another Google review

Complete every item in `GOOGLE-MERCHANT-CHECKLIST.md`. No codebase can guarantee Merchant Center approval because Google also evaluates the merchant account, business identity, product data, checkout, policy accuracy, domain ownership, and other external signals. This package is designed to eliminate the website-level issues identified in the earlier version rather than to bypass Google's review process.
