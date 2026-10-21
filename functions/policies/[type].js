import { shopifyRequest, POLICY_FIELDS, configFromEnv, escapeHtml, policyParagraphs, commonHead, headerHtml, footerHtml, htmlResponse } from "../_shared/shopify.js";

const TYPES = {
  shipping: { field: "shippingPolicy", label: "Shipping Policy" },
  refund: { field: "refundPolicy", label: "Returns & Refunds Policy" },
  privacy: { field: "privacyPolicy", label: "Privacy Policy" },
  terms: { field: "termsOfService", label: "Terms of Service" }
};

export async function onRequestGet(context) {
  const { request, env, params } = context;
  const type = String(params.type || "");
  const meta = TYPES[type];
  if (!meta) return htmlResponse("Not found", 404);
  const cfg = configFromEnv(env, request);
  try {
    const data = await shopifyRequest(env, request, `query Policy { shop { ${meta.field} { ${POLICY_FIELDS} } } }`);
    const policy = data.shop?.[meta.field];
    const body = policyParagraphs(policy?.body);
    const canonical = `${cfg.origin}/policies/${type}`;
    const missing = !body;
    const html = `<!doctype html><html lang="en"><head>${commonHead({title:`${meta.label} | Winkwire`,description:`${meta.label} for Winkwire.`,canonical})}${missing?'<meta name="robots" content="noindex,nofollow">':''}</head><body>${missing?'<div class="preview-banner" role="status">This required policy has not been published in Shopify. Purchasing should remain disabled until it is complete.</div>':''}${headerHtml()}<main class="legal-main"><div class="shell legal-shell"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><span>${escapeHtml(meta.label)}</span></nav><p class="eyebrow">Customer information</p><h1>${escapeHtml(meta.label)}</h1><p class="shop-status">${missing?"Policy unavailable.":"Current policy published by Winkwire in Shopify."}</p><article class="legal-content">${body || `<h2>This policy has not been published yet.</h2><p>Winkwire is not accepting purchases while required store policies are incomplete. Please return later or contact customer support.</p>`}</article></div></main>${footerHtml()}</body></html>`;
    return htmlResponse(html);
  } catch (error) {
    console.error(error);
    return htmlResponse("Policy temporarily unavailable", 503, {"Retry-After":"60"});
  }
}
