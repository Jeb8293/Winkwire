import { configFromEnv } from "./_shared/shopify.js";

export function onRequestGet(context) {
  const cfg = configFromEnv(context.env, context.request);
  const publicConfig = {
    site: { brandName: "Winkwire", publicOrigin: cfg.origin },
    shopify: {
      storeDomain: cfg.domain || "YOUR-STORE.myshopify.com",
      storefrontAccessToken: cfg.token || "YOUR-PUBLIC-STOREFRONT-ACCESS-TOKEN",
      apiVersion: cfg.version,
      collections: { deskReset: cfg.deskResetHandle, grabAndGo: cfg.grabAndGoHandle },
      productLimit: cfg.productLimit
    },
    business: { supportEmail: cfg.supportEmail }
  };
  return new Response(`window.WINKWIRE_CONFIG = Object.freeze(${JSON.stringify(publicConfig).replace(/</g,"\\u003c")});\n`, {
    headers: { "Content-Type": "application/javascript; charset=UTF-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
  });
}
