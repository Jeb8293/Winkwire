(() => {
  const cfg = window.WINKWIRE_CONFIG || {};
  const domain = String(cfg.shopifyDomain || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
  const version = cfg.apiVersion || '2026-07';
  const endpoint = domain ? `https://${domain}/api/${version}/graphql.json` : '';

  async function request(query, variables = {}) {
    if (!endpoint) throw new Error('Shopify store domain is not configured.');
    const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    if (cfg.storefrontAccessToken) headers['X-Shopify-Storefront-Access-Token'] = cfg.storefrontAccessToken;
    const res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify({ query, variables }) });
    let json;
    try { json = await res.json(); } catch { throw new Error(`Shopify returned HTTP ${res.status}.`); }
    if (!res.ok) throw new Error(json?.errors?.[0]?.message || `Shopify returned HTTP ${res.status}.`);
    if (json.errors?.length) throw new Error(json.errors.map(e => e.message).join(' • '));
    return json.data;
  }

  const PRODUCT_FIELDS = `
    id handle title description descriptionHtml productType vendor availableForSale
    featuredImage { url altText width height }
    images(first: 6) { nodes { url altText width height } }
    options { name values }
    priceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
    variants(first: 100) { nodes { id title availableForSale selectedOptions { name value } price { amount currencyCode } compareAtPrice { amount currencyCode } image { url altText } } }
  `;

  async function getProducts(first = 100) {
    const q = `query Products($first:Int!){ products(first:$first, sortKey:BEST_SELLING){ nodes{ ${PRODUCT_FIELDS} } } }`;
    const data = await request(q, { first });
    return data.products.nodes;
  }

  const CART_FIELDS = `
    id checkoutUrl totalQuantity
    cost { subtotalAmount { amount currencyCode } totalAmount { amount currencyCode } }
    lines(first: 100) { nodes { id quantity merchandise { ... on ProductVariant { id title price { amount currencyCode } image { url altText } product { title handle } } } } }
  `;

  function cartErrors(payload) {
    const errors = payload?.userErrors || [];
    if (errors.length) throw new Error(errors.map(e => e.message).join(' • '));
    return payload.cart;
  }

  async function getCart(id) {
    if (!id) return null;
    const q = `query Cart($id:ID!){ cart(id:$id){ ${CART_FIELDS} } }`;
    const data = await request(q, { id });
    return data.cart;
  }

  async function createCart(variantId, quantity = 1) {
    const q = `mutation CreateCart($input:CartInput!){ cartCreate(input:$input){ cart{ ${CART_FIELDS} } userErrors{ field message } } }`;
    const data = await request(q, { input: { lines: variantId ? [{ merchandiseId: variantId, quantity }] : [] } });
    return cartErrors(data.cartCreate);
  }

  async function addCartLine(cartId, variantId, quantity = 1) {
    if (!cartId) return createCart(variantId, quantity);
    const q = `mutation Add($cartId:ID!,$lines:[CartLineInput!]!){ cartLinesAdd(cartId:$cartId,lines:$lines){ cart{ ${CART_FIELDS} } userErrors{ field message } warnings{ message } } }`;
    const data = await request(q, { cartId, lines: [{ merchandiseId: variantId, quantity }] });
    return cartErrors(data.cartLinesAdd);
  }

  async function updateCartLine(cartId, lineId, quantity) {
    const q = `mutation Update($cartId:ID!,$lines:[CartLineUpdateInput!]!){ cartLinesUpdate(cartId:$cartId,lines:$lines){ cart{ ${CART_FIELDS} } userErrors{ field message } } }`;
    const data = await request(q, { cartId, lines: [{ id: lineId, quantity }] });
    return cartErrors(data.cartLinesUpdate);
  }

  async function removeCartLine(cartId, lineId) {
    const q = `mutation Remove($cartId:ID!,$lineIds:[ID!]!){ cartLinesRemove(cartId:$cartId,lineIds:$lineIds){ cart{ ${CART_FIELDS} } userErrors{ field message } } }`;
    const data = await request(q, { cartId, lineIds: [lineId] });
    return cartErrors(data.cartLinesRemove);
  }

  window.WinkwireShopify = { request, getProducts, getCart, createCart, addCartLine, updateCartLine, removeCartLine, domain };
})();
