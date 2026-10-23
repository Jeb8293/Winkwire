# WINKWIRE — GOOGLE MERCHANT CENTER PRE-REVIEW CHECKLIST

Do **not** request another Merchant Center review until every item below is verified on the live production domain.

## 1. Business identity — exact match

Merchant Center and the website must show the same customer-facing business information:

- Business name: **Winkwire Electronics & More**
- Address: **11 8th St, Saint Augustine, FL 32080**
- Email: **Winkwire@winkwire.com**
- Phone: **(714) 788-9744**
- Website: **https://winkwireelectronics.com**

The site states the address is a business/mailing address for an online retailer and not a walk-in storefront.

## 2. Domain and URLs

- `https://winkwireelectronics.com` loads without warnings.
- Merchant Center's claimed/verified website is exactly `winkwireelectronics.com`.
- Product feed landing-page URLs use `winkwireelectronics.com/products/...`.
- Old feed URLs pointing to `pv0v77-4v.myshopify.com` are removed or replaced.
- No duplicate product source is submitting the same inventory with conflicting URLs.

## 3. Policies

Open these four live URLs and read them as a customer would:

- `/policies/shipping`
- `/policies/refund`
- `/policies/privacy`
- `/policies/terms`

The shipping policy must accurately explain destinations/restrictions, processing or handling, delivery expectations, shipping costs/how calculated, and relevant fulfillment information.

The returns/refund policy must accurately explain the return window, eligibility/condition requirements, return method, return-shipping responsibility, fees if any, exchanges if offered, and refund processing timing.

Do not use promises that are true for only one supplier or one product as a store-wide policy.

## 4. Checkout

- Add an in-stock product to cart.
- Verify the exact selected variant and price.
- Continue to Shopify checkout.
- Verify the customer can complete checkout without account/login barriers.
- Verify the checkout shows the final costs before payment.
- Verify WinkWire branding/domain continuity is as strong as Shopify configuration permits.
- Verify a conventional payment method is available.

## 5. Product data

For at least 10 products, compare Merchant Center to the live landing page:

- Title
- Price
- Currency
- Availability
- Variant
- Product image
- Brand / GTIN / MPN when applicable

Fix absurd placeholder prices, invalid identifiers, missing images, supplier boilerplate, broken HTML, and products that cannot actually be purchased.

### Known prior catalog errors

Correct the three sentinel-priced variants listed in `KNOWN-CATALOG-RISKS.md` before review.

## 6. Technical quality

- Test Home, Shop, About, Contact, FAQ, all four policy pages, several product pages, cart, and checkout on mobile and desktop.
- No broken links.
- No placeholder text.
- No dead product buttons.
- `robots.txt` returns 200.
- `sitemap.xml` returns 200 and includes product URLs.
- `compliance-status.json` returns `"commerceReady": true`.
- `merchant-feed.xml` returns 200 only if you intend to use it as the Merchant Center data source.

## 7. Merchant Center itself

- Finish any identity/business verification requests in Merchant Center.
- Verify business info matches the site exactly.
- Verify shipping/return settings in Merchant Center do not contradict the site.
- Resolve diagnostics before requesting review.
- Request review only after the live site has been stable and crawlable.
