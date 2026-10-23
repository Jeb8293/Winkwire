# Winkwire Electronics & More — Production Website

This is the complete custom storefront for **Winkwire Electronics & More** at **https://winkwireelectronics.com**.

## Source of truth used in this build

- Business name: **Winkwire Electronics & More**
- Customer-service email: **Winkwire@winkwire.com**
- Customer-service phone: **(714) 788-9744**
- Business/mailing address: **11 8th St, Saint Augustine, FL 32080**
- Public domain: **https://winkwireelectronics.com**
- Permanent Shopify domain: **pv0v77-4v.myshopify.com**
- Shopify Storefront API: **2026-10**

The website explicitly states that WinkWire is an **online retailer** and that the listed address is not a walk-in storefront.

## Architecture

The storefront is plain HTML/CSS/JavaScript deployed with **Cloudflare Pages** from GitHub. Cloudflare Pages Functions server-render product pages and Shopify policy pages and proxy Storefront API requests through the same public website origin.

The default implementation uses Shopify's **tokenless Storefront API access** for products, collections, search, and cart. No Admin token, app secret, password, or private credential is included in this package.

Shopify remains the system of record for products, prices, availability, cart, checkout, and published store policies.

## Production routes

- `/` — Home
- `/shop` — Full live catalog, collections, search/filter/sort
- `/products/:handle` — server-rendered live product page with Product/Offer structured data
- `/about` — About
- `/contact` — Contact information and customer-service email helper
- `/faq` — FAQ
- `/policies/shipping` — live Shopify shipping policy
- `/policies/refund` — live Shopify returns/refund policy
- `/policies/privacy` — live Shopify privacy policy
- `/policies/terms` — live Shopify terms
- `/merchant-feed.xml` — Google-compatible live catalog feed (only returns when policy compliance gate passes)
- `/sitemap.xml` — dynamic sitemap including active Shopify products
- `/compliance-status.json` — simple diagnostic showing whether all four required Shopify policy pages meet the site's completeness gate

## Deploy to Cloudflare Pages

1. Put the **contents of this folder** at the root of the WinkWire GitHub repository.
2. In Cloudflare Pages, connect that GitHub repository.
3. Framework preset: **None**.
4. Build command: leave blank (or `exit 0` if Cloudflare requires one).
5. Build output directory: `.`
6. Add **winkwireelectronics.com** as the custom domain.
7. Confirm HTTPS works on the custom domain.
8. Confirm the Shopify store recognizes the custom storefront/domain configuration required for headless checkout.

### Optional Cloudflare environment variables

Nothing secret is required for the default tokenless setup. These variables only override the built-in production values:

- `SHOPIFY_STORE_DOMAIN` — defaults to `pv0v77-4v.myshopify.com`
- `SHOPIFY_API_VERSION` — defaults to `2026-10`
- `PUBLIC_ORIGIN` — defaults to `https://winkwireelectronics.com`
- `SHOPIFY_STOREFRONT_TOKEN` — optional browser-safe/public token if the store later requires authenticated Storefront requests. **Do not use an Admin token or private token here.**

## Required Shopify work before Google Merchant Center review

The website intentionally does **not invent shipping or return terms**. The live policy routes display the policies maintained in Shopify. Before requesting a Merchant Center review, Shopify must contain complete and accurate Shipping, Refund/Return, Privacy, and Terms policies.

The site's compliance gate requires each of those policy bodies to contain substantive content. If a policy is missing/incomplete, the policy page returns a temporary-unavailable status, product purchase controls are disabled on server-rendered product pages, and `/merchant-feed.xml` returns 503. This is deliberate: it is safer than advertising products while the terms of purchase are incomplete.

## Merchant Center data source

Use **one authoritative product data source**. If the Shopify Google & YouTube app is already submitting the catalog to Merchant Center, do not also add `/merchant-feed.xml` as a duplicate source. The feed is provided as an alternative for this headless storefront.

Whatever source is used, product landing-page URLs must use `https://winkwireelectronics.com/products/...`, not the permanent `.myshopify.com` storefront URL.

## Checkout

Cart and checkout use Shopify's Cart API and Shopify-provided `checkoutUrl`. Do not replace this with a custom payment form.

For best domain continuity, configure Shopify checkout so the buyer sees WinkWire branding and, where supported by the store's plan/configuration, a branded checkout domain tied to `winkwireelectronics.com`.

## Important

No website can guarantee Google Merchant Center approval. Google also evaluates the Merchant Center account, identity verification, product data, domain ownership, business details, policy accuracy, checkout, and other signals outside this ZIP. This package is designed to remove the website-level inconsistencies and missing-information problems that previously put WinkWire at risk.
