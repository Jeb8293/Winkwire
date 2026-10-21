import { shopifyRequest, POLICY_FIELDS, configFromEnv, escapeHtml, policyParagraphs, commonHead, headerHtml, footerHtml, htmlResponse } from "./_shared/shopify.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  const cfg = configFromEnv(env, request);
  try {
    const data = await shopifyRequest(env, request, `query Contact { shop { contactInformation { ${POLICY_FIELDS} } } }`);
    const policyBody = policyParagraphs(data.shop?.contactInformation?.body);
    const fallback = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cfg.supportEmail)
      ? `<p>Email customer support at <a href="mailto:${escapeHtml(cfg.supportEmail)}">${escapeHtml(cfg.supportEmail)}</a>. Please include your order number when asking about an existing order.</p>` : "";
    const body = policyBody || fallback;
    const missing = !body;
    const canonical = `${cfg.origin}/contact`;
    const html = `<!doctype html><html lang="en"><head>${commonHead({title:"Contact | Winkwire",description:"Contact Winkwire customer support.",canonical})}${missing?'<meta name="robots" content="noindex,nofollow">':''}</head><body>${missing?'<div class="preview-banner" role="status">Customer-support information has not been published. Purchasing should remain disabled until it is complete.</div>':''}${headerHtml()}<main class="legal-main"><div class="shell legal-shell"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><span>Contact</span></nav><p class="eyebrow">Customer support</p><h1>Contact Winkwire</h1><p class="shop-status">${missing?"Contact information unavailable.":"Published customer-support information."}</p><article class="legal-content">${body || `<h2>Customer-support information is not yet published.</h2><p>Purchasing is disabled until Winkwire publishes a usable customer contact method.</p>`}</article><div class="policy-shortcuts"><a href="/policies/shipping">Shipping Policy</a><a href="/policies/refund">Returns &amp; Refunds</a><a href="/policies/privacy">Privacy Policy</a></div></div></main>${footerHtml()}</body></html>`;
    return htmlResponse(html);
  } catch (error) {
    console.error(error);
    return htmlResponse("Contact information temporarily unavailable", 503, {"Retry-After":"60"});
  }
}
