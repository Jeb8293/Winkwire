export function configFromEnv(env, request) {
  const origin = (env.PUBLIC_ORIGIN || new URL(request.url).origin).replace(/\/$/, "");
  const domain = String(env.SHOPIFY_STORE_DOMAIN || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const token = String(env.SHOPIFY_STOREFRONT_TOKEN || "");
  const version = String(env.SHOPIFY_API_VERSION || "2026-10");
  return { origin, domain, token, version, supportEmail: String(env.SUPPORT_EMAIL || ""), deskResetHandle: String(env.DESK_RESET_HANDLE || "desk-reset"), grabAndGoHandle: String(env.GRAB_GO_HANDLE || "grab-and-go"), productLimit: Math.max(1, Math.min(Number(env.PRODUCT_LIMIT || 24), 100)) };
}

export async function shopifyRequest(env, request, query, variables = {}) {
  const cfg = configFromEnv(env, request);
  if (!cfg.domain || !cfg.token) throw new Error("Shopify environment variables are not configured.");
  const response = await fetch(`https://${cfg.domain}/api/${cfg.version}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": cfg.token
    },
    body: JSON.stringify({ query, variables })
  });
  const payload = await response.json();
  if (!response.ok || payload.errors?.length) {
    throw new Error(payload.errors?.map((e) => e.message).join("; ") || `Shopify request failed (${response.status}).`);
  }
  return payload.data;
}

export const PRODUCT_FIELDS = `
  id handle title description availableForSale vendor productType onlineStoreUrl
  seo { title description }
  featuredImage { url altText width height }
  images(first: 12) { nodes { url altText width height } }
  priceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
  options { name optionValues { name } }
  variants(first: 100) {
    nodes {
      id title availableForSale sku barcode
      selectedOptions { name value }
      price { amount currencyCode }
      image { url altText width height }
    }
  }
`;

export const POLICY_FIELDS = `id title handle body url`;

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function escapeXml(value) {
  return escapeHtml(value);
}

export function jsonForScript(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

export function policyText(html) {
  return String(html || "")
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])\s*>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

export function policyParagraphs(html) {
  const text = policyText(html);
  if (!text) return "";
  return text.split(/\n{2,}|\n(?=• )/).map((part) => {
    const clean = part.trim();
    if (!clean) return "";
    if (clean.startsWith("• ")) {
      const items = clean.split(/\n/).map((x) => x.replace(/^•\s*/, "").trim()).filter(Boolean);
      return `<ul>${items.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>`;
    }
    return `<p>${escapeHtml(clean).replace(/\n/g, "<br>")}</p>`;
  }).join("\n");
}

export function formatMoney(money) {
  const amount = Number.parseFloat(money?.amount);
  const currency = money?.currencyCode || "USD";
  if (!Number.isFinite(amount)) return "";
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount); }
  catch { return `${currency} ${amount.toFixed(2)}`; }
}

export function variantLabel(variant) {
  const parts = (variant?.selectedOptions || []).filter((o) => o.value && o.value !== "Default Title").map((o) => o.value);
  return parts.length ? parts.join(" / ") : (variant?.title && variant.title !== "Default Title" ? variant.title : "Standard");
}

export function compliance(shop, supportEmail = "") {
  const has = (policy, min = 20) => policyText(policy?.body).length >= min;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail);
  const checks = {
    contactInformation: has(shop?.contactInformation, 10) || emailOk,
    privacyPolicy: has(shop?.privacyPolicy),
    refundPolicy: has(shop?.refundPolicy),
    shippingPolicy: has(shop?.shippingPolicy),
    termsOfService: has(shop?.termsOfService)
  };
  return { checks, commerceReady: Object.values(checks).every(Boolean) };
}

export function commonHead({ title, description, canonical, structuredData = null }) {
  return `
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#20242A">
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="canonical" href="${escapeHtml(canonical)}">
    <title>${escapeHtml(title)}</title>
    <link rel="stylesheet" href="/styles.css">
    ${structuredData ? `<script type="application/ld+json">${jsonForScript(structuredData)}</script>` : ""}
  `;
}

export function headerHtml() {
  return `<header class="site-header"><div class="shell header-inner"><a class="logo" href="/" aria-label="Winkwire home">Winkwire<span aria-hidden="true">.</span></a><nav class="site-nav server-nav" aria-label="Main navigation"><a href="/#shop">Shop</a><a href="/#collections">Collections</a><a href="/#about">About</a><a href="/#faq">FAQ</a><a href="/contact">Contact</a></nav><a class="cart-button" href="/#shop">Shop</a></div></header>`;
}

export function productHeaderHtml() {
  return `<header class="site-header" id="top"><div class="shell header-inner"><a class="logo" href="/" aria-label="Winkwire home">Winkwire<span aria-hidden="true">.</span></a><button class="icon-button nav-toggle" id="navToggle" type="button" aria-expanded="false" aria-controls="siteNav" aria-label="Open navigation"><span></span><span></span><span></span></button><nav class="site-nav" id="siteNav" aria-label="Main navigation"><a href="/#shop">Shop</a><a href="/#collections">Collections</a><a href="/#about">About</a><a href="/#faq">FAQ</a><a href="/contact">Contact</a></nav><button class="cart-button" id="cartButton" type="button" aria-controls="cartDrawer" aria-expanded="false"><span>Cart</span><span class="cart-count" id="cartCount" aria-label="0 items in cart">0</span></button></div></header>`;
}

export function footerHtml() {
  return `<footer class="site-footer"><div class="shell footer-grid"><div><a class="logo footer-logo" href="/">Winkwire<span aria-hidden="true">.</span></a><p>Less clutter. Better setup.</p></div><nav class="footer-links" aria-label="Customer information"><a href="/contact">Contact</a><a href="/policies/shipping">Shipping</a><a href="/policies/refund">Returns &amp; Refunds</a><a href="/policies/privacy">Privacy</a><a href="/policies/terms">Terms</a></nav><p class="copyright">© ${new Date().getFullYear()} Winkwire.</p></div></footer>`;
}

export function htmlResponse(html, status = 200, extraHeaders = {}) {
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=UTF-8",
      "Cache-Control": status === 200 ? "public, max-age=60, s-maxage=300" : "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      ...extraHeaders
    }
  });
}
