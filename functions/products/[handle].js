import { shopifyRequest, PRODUCT_FIELDS, POLICY_FIELDS, configFromEnv, escapeHtml, jsonForScript, formatMoney, variantLabel, compliance, commonHead, headerHtml, productHeaderHtml, footerHtml, htmlResponse } from "../_shared/shopify.js";

export async function onRequestGet(context) {
  const { request, env, params } = context;
  const handle = String(params.handle || "").trim();
  if (!handle) return htmlResponse("Not found", 404);

  const cfg = configFromEnv(env, request);
  try {
    const query = `
      query MerchantProduct($handle: String!) {
        product(handle: $handle) { ${PRODUCT_FIELDS} }
        shop {
          contactInformation { ${POLICY_FIELDS} }
          privacyPolicy { ${POLICY_FIELDS} }
          refundPolicy { ${POLICY_FIELDS} }
          shippingPolicy { ${POLICY_FIELDS} }
          termsOfService { ${POLICY_FIELDS} }
        }
      }
    `;
    const data = await shopifyRequest(env, request, query, { handle });
    const product = data.product;
    if (!product) return htmlResponse(notFoundHtml(cfg.origin), 404);

    const url = new URL(request.url);
    const requestedVariant = url.searchParams.get("variant");
    const selected = product.variants.nodes.find((v) => v.id === requestedVariant)
      || product.variants.nodes.find((v) => v.availableForSale)
      || product.variants.nodes[0]
      || null;
    const ready = compliance(data.shop, cfg.supportEmail).commerceReady;
    const baseCanonical = `${cfg.origin}/products/${encodeURIComponent(product.handle)}`;
    const requestedVariantIsValid = Boolean(requestedVariant && product.variants.nodes.some((v) => v.id === requestedVariant));
    const canonical = requestedVariantIsValid ? `${baseCanonical}?variant=${encodeURIComponent(requestedVariant)}` : baseCanonical;
    const image = selected?.image || product.featuredImage || product.images?.nodes?.[0] || null;
    const description = product.seo?.description || product.description || `${product.title} from Winkwire.`;
    const offers = product.variants.nodes.map((v) => ({
      "@type": "Offer",
      url: `${baseCanonical}?variant=${encodeURIComponent(v.id)}`,
      priceCurrency: v.price.currencyCode,
      price: v.price.amount,
      availability: v.availableForSale ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      ...(v.sku ? { sku: v.sku } : {})
    }));
    const structured = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.title,
      description: product.description || undefined,
      image: (product.images?.nodes || []).map((i) => i.url).filter(Boolean),
      ...(product.vendor ? { brand: { "@type": "Brand", name: product.vendor } } : {}),
      offers
    };

    const variants = product.variants.nodes.map((v) => {
      const selectedAttr = v.id === selected?.id ? " selected" : "";
      const disabledAttr = v.availableForSale ? "" : " disabled";
      return `<option value="${escapeHtml(v.id)}"${selectedAttr}${disabledAttr}>${escapeHtml(variantLabel(v))} — ${escapeHtml(formatMoney(v.price))}${v.availableForSale ? "" : " — unavailable"}</option>`;
    }).join("");

    const thumbs = (product.images?.nodes || []).slice(0, 8).map((img, i) => `<img src="${escapeHtml(img.url)}" alt="${escapeHtml(img.altText || `${product.title} image ${i + 1}`)}" loading="lazy" decoding="async">`).join("");
    const buyDisabled = !ready || !selected?.availableForSale;
    const buyLabel = !ready ? "Purchasing temporarily unavailable" : selected?.availableForSale ? "Add to cart" : "Unavailable";
    const banner = ready ? "" : `<div class="preview-banner" role="status">Store setup is incomplete. Purchasing is temporarily disabled until required policies and customer-support information are published.</div>`;

    const html = `<!doctype html><html lang="en"><head>${commonHead({ title: `${product.seo?.title || product.title} | Winkwire`, description, canonical, structuredData: structured })}</head><body>
      <a class="skip-link" href="#main-content">Skip to main content</a>${banner}${productHeaderHtml()}
      <main id="main-content" class="product-page-main"><div class="shell">
        <nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/#shop">Shop</a><span>/</span><span id="breadcrumbProduct">${escapeHtml(product.title)}</span></nav>
        <p class="shop-status" id="productStatus">Live product information from Shopify.</p>
        <article id="productPage" class="product-page" aria-busy="false">
          <div class="product-gallery"><div class="product-main-image">${image ? `<img src="${escapeHtml(image.url)}" alt="${escapeHtml(image.altText || product.title)}" decoding="async">` : `<div class="product-placeholder product-placeholder-large"><span>W</span><small>Image unavailable</small></div>`}</div>${thumbs ? `<div class="product-thumbs static-thumbs">${thumbs}</div>` : ""}</div>
          <div class="product-detail-info"><p class="eyebrow">${escapeHtml(product.productType || "Winkwire gear")}</p><h1>${escapeHtml(product.title)}</h1><p class="product-detail-price">${escapeHtml(formatMoney(selected?.price || product.priceRange?.minVariantPrice))}</p><p class="availability ${selected?.availableForSale ? "in-stock" : "out-of-stock"}">${selected?.availableForSale ? "Available to order" : "Currently unavailable"}</p>${product.description ? `<p class="product-description">${escapeHtml(product.description)}</p>` : ""}
            ${product.variants.nodes.length > 1 ? `<div class="variant-group"><label for="variantSelect">Choose an option</label><select id="variantSelect" class="variant-select">${variants}</select></div>` : ""}
            <div class="quantity-field"><label for="quantity">Quantity</label><input id="quantity" type="number" min="1" max="99" value="1" inputmode="numeric"></div>
            <button id="ssrAddButton" class="button button-primary product-add" type="button"${buyDisabled ? " disabled" : ""}>${escapeHtml(buyLabel)}</button>
            <p class="secure-note">Payment is completed through Shopify checkout. Shipping, taxes, discounts, and final totals are shown before you place the order.</p>
          </div>
        </article>
        <section class="product-trust-card"><div><p class="eyebrow">Before you buy</p><h2>Clear policies. Shopify checkout.</h2></div><div class="product-trust-links"><a href="/policies/shipping">Shipping Policy</a><a href="/policies/refund">Returns &amp; Refunds</a><a href="/contact">Customer Support</a></div></section>
      </div></main>${footerHtml()}
      <div class="drawer-backdrop" id="drawerBackdrop" hidden></div><aside class="cart-drawer" id="cartDrawer" aria-labelledby="cartTitle" aria-hidden="true"><div class="drawer-header"><div><p class="eyebrow">Your setup</p><h2 id="cartTitle">Cart</h2></div><button class="icon-button close-button" id="cartClose" type="button" aria-label="Close cart">×</button></div><div class="cart-body" id="cartBody"></div><div class="cart-footer" id="cartFooter"></div></aside><div class="toast" id="toast" role="status" aria-live="polite"></div>
      <script>window.WINKWIRE_CONFIG=${jsonForScript({site:{brandName:"Winkwire",publicOrigin:cfg.origin},shopify:{storeDomain:cfg.domain,storefrontAccessToken:cfg.token,apiVersion:cfg.version,collections:{deskReset:cfg.deskResetHandle,grabAndGo:cfg.grabAndGoHandle},productLimit:cfg.productLimit},business:{supportEmail:cfg.supportEmail}})};window.__WINKWIRE_PRODUCT__=${jsonForScript(product)};</script>
      <script src="/shopify.js"></script><script src="/site.js"></script><script src="/product.js"></script>
    </body></html>`;
    return htmlResponse(html, 200);
  } catch (error) {
    console.error(error);
    return htmlResponse(errorHtml(cfg.origin), 503, { "Retry-After": "60" });
  }
}

function notFoundHtml(origin) {
  return `<!doctype html><html lang="en"><head>${commonHead({title:"Product not found | Winkwire",description:"The requested Winkwire product could not be found.",canonical:origin})}</head><body>${headerHtml()}<main class="legal-main"><div class="shell legal-shell"><h1>Product not found.</h1><p>The item may no longer be published. <a href="/#shop">Return to the shop.</a></p></div></main>${footerHtml()}</body></html>`;
}
function errorHtml(origin) {
  return `<!doctype html><html lang="en"><head>${commonHead({title:"Store temporarily unavailable | Winkwire",description:"Winkwire product information is temporarily unavailable.",canonical:origin})}<meta name="robots" content="noindex,nofollow"></head><body>${headerHtml()}<main class="legal-main"><div class="shell legal-shell"><h1>Product information is temporarily unavailable.</h1><p>Please return to the shop and try again.</p></div></main>${footerHtml()}</body></html>`;
}
