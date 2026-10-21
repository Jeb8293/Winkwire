# Winkwire Google Merchant Center Pre-Review Checklist

Do not request another Merchant Center review until every applicable item below is true on the live production domain.

## Store and domain

- `https://winkwireelectronics.com` loads over HTTPS without certificate or redirect problems.
- The domain is verified/claimed in the correct Google Merchant Center account.
- Merchant Center business identity matches the Winkwire name and the information customers see on the website and during checkout.
- Cloudflare Pages is serving the production site from the GitHub repository.
- `PUBLIC_ORIGIN` is exactly `https://winkwireelectronics.com`.
- `robots.txt` is reachable and does not block Google.
- `sitemap.xml` is reachable.

## Shopify connection and purchasing

- `SHOPIFY_STORE_DOMAIN` points to the correct `.myshopify.com` store.
- `SHOPIFY_STOREFRONT_TOKEN` is a browser-safe public Storefront API token, not an Admin/private credential.
- The homepage displays actual Shopify products rather than preview/demo products.
- Every advertised product opens its own `/products/:handle` landing page.
- Variant-specific Merchant links open with the corresponding `?variant=` value selected.
- The product title, image, selected-variant price, currency, availability, and product identity match Shopify.
- An in-stock product can be added to cart, quantity can be changed or removed, and the checkout button reaches the Shopify `checkoutUrl`.
- An unavailable variant cannot be purchased and is visibly identified as unavailable.
- At least one complete Shopify test-mode checkout has been run from product page → cart → Shopify checkout.
- If supported for the store, a branded checkout subdomain such as `checkout.winkwireelectronics.com` is configured in Shopify and works correctly.

## Policies and customer transparency

- `/contact` shows a real customer-support method that is monitored by the business.
- `/policies/shipping` shows the actual published Shopify shipping policy.
- `/policies/refund` shows the actual published Shopify returns/refund policy.
- `/policies/privacy` shows the actual published Shopify privacy policy.
- `/policies/terms` shows the actual published Shopify terms of service.
- The return/refund policy states the actual return window, eligibility/condition rules, return method, return-shipping responsibility, applicable fees, and refund timing.
- The shipping policy states actual handling/transit expectations, destinations/restrictions, costs or how costs are calculated, and relevant fulfillment information.
- Policy language agrees with Shopify checkout and Merchant Center settings.
- No placeholder contact information, placeholder policy copy, fictitious address, invented phone number, or policy promise appears anywhere.

## Product data and Google feed

- `https://winkwireelectronics.com/merchant-feed.xml` loads successfully. If the compliance gate is incomplete, the feed intentionally returns unavailable and the store is **not ready for review**.
- Only one authoritative product source is supplying a given item to Merchant Center; duplicate Shopify-app/feed submissions have been resolved.
- Each feed price matches the server-rendered landing-page price and Shopify checkout for the same variant.
- Each feed availability value matches the landing page and Shopify.
- Product images in Merchant Center are the actual Shopify product images.
- GTIN, MPN, brand, and identifier data are accurate where supplied; identifiers are not fabricated.
- Shipping settings in Merchant Center match the website and Shopify.
- Return policy settings in Merchant Center match the website and Shopify.

## Website quality and trust

- No fake reviews, fake sales counts, fake discounts, fake scarcity, countdowns, fabricated guarantees, or unsupported claims appear on the site.
- No button pretends an action succeeded when it did not.
- There are no dead navigation links on the production domain.
- Contact, Shipping, Returns & Refunds, Privacy, and Terms are accessible from the footer.
- Product pages contain server-rendered title, price, availability, image, and purchase state before client-side JavaScript runs.
- Product/Offer structured data has been checked on the live URL with Google's Rich Results Test or Schema Markup Validator.
- The Google Merchant Center diagnostics page has been checked for price, availability, domain, crawl, policy, or misrepresentation issues before requesting review.

## Final review rule

Request another Google review only after the live store, Shopify checkout, Merchant Center product data, shipping/return settings, contact information, and policies all tell the same story. The code intentionally blocks purchasing and the generated feed when the minimum policy/contact requirements are not present; do not disable that protection merely to make the site appear live.
