/**
 * WINKWIRE STOREFRONT CONFIGURATION
 * ---------------------------------
 * Edit this file before publishing.
 *
 * SECURITY
 * - storefrontAccessToken must be a PUBLIC Storefront API token intended for browser use.
 * - NEVER place an Admin API token, private app secret, or other private credential here.
 */
window.WINKWIRE_CONFIG = Object.freeze({
  site: {
    brandName: "Winkwire",
    publicOrigin: "https://winkwireelectronics.com"
  },

  shopify: {
    // Example: "your-store.myshopify.com" — do not include https://
    storeDomain: "YOUR-STORE.myshopify.com",

    // Browser-safe PUBLIC Storefront API access token.
    storefrontAccessToken: "YOUR-PUBLIC-STOREFRONT-ACCESS-TOKEN",

    // Latest stable version verified against Shopify docs on 2026-10-21.
    apiVersion: "2026-10",

    collections: {
      deskReset: "desk-reset",
      grabAndGo: "grab-and-go"
    },

    productLimit: 24
  },

  business: {
    // Optional fallback. Shopify's Storefront API contactInformation policy is preferred.
    // If Shopify does not expose usable contact information, add a real support email here.
    supportEmail: ""
  }
});
