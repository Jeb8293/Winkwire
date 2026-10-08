# Wink Wire Electronics — multipage storefront

This package contains the redesigned public storefront for `winkwireelectronics.com`.

## Pages
- `index.html` — Home
- `shop.html` — Shopify-connected product catalog, cart, and checkout
- `about.html` — About Us / founder letter
- `contact.html` — Contact Us

## Store connection
`config.js` is configured for:
- Shopify domain: `pv0v77-4v.myshopify.com`
- Public site domain: `winkwireelectronics.com`
- Email: `WinkWire@winkwire.com`
- Phone: `(714) 788-9744`

Do not put Shopify Admin passwords or private API keys in this repository. If Shopify requires a Storefront token, use only a public Storefront access token in `config.js`.

## Checkout handling
The shop uses Shopify Cart `checkoutUrl`. As an additional safeguard for this headless setup, if Shopify returns a checkout URL on `winkwireelectronics.com`, the code swaps only the hostname to `pv0v77-4v.myshopify.com` before redirecting so checkout does not get sent back to GitHub Pages.

## GitHub Pages
Keep the existing `CNAME` file and publish the root of the `main` branch through GitHub Pages.
