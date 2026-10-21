import { shopifyRequest, configFromEnv, escapeXml, variantLabel, POLICY_FIELDS, compliance } from "./_shared/shopify.js";

const FEED_PRODUCT_FIELDS = `
  id handle title description vendor availableForSale
  featuredImage { url altText }
  variants(first: 100) {
    nodes { id title availableForSale sku barcode selectedOptions { name value } price { amount currencyCode } image { url altText } }
  }
`;

export async function onRequestGet(context) {
  const { request, env } = context;
  const cfg = configFromEnv(env, request);
  try {
    const shopData = await shopifyRequest(env, request, `query MerchantReadiness { shop { contactInformation { ${POLICY_FIELDS} } privacyPolicy { ${POLICY_FIELDS} } refundPolicy { ${POLICY_FIELDS} } shippingPolicy { ${POLICY_FIELDS} } termsOfService { ${POLICY_FIELDS} } } }`);
    if (!compliance(shopData.shop, cfg.supportEmail).commerceReady) {
      return new Response("Merchant feed is unavailable until required store policies and customer-support information are published.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=UTF-8", "Cache-Control": "no-store", "Retry-After": "3600", "X-Content-Type-Options": "nosniff" }
      });
    }

    let after = null;
    let products = [];
    do {
      const query = `query MerchantFeed($first:Int!,$after:String){ products(first:$first,after:$after,sortKey:ID){ nodes{${FEED_PRODUCT_FIELDS}} pageInfo{hasNextPage endCursor} } }`;
      const data = await shopifyRequest(env, request, query, { first: 100, after });
      products.push(...data.products.nodes);
      after = data.products.pageInfo.hasNextPage ? data.products.pageInfo.endCursor : null;
    } while (after && products.length < 5000);

    const items = [];
    for (const product of products) {
      for (const variant of product.variants.nodes || []) {
        const image = variant.image || product.featuredImage;
        if (!image?.url) continue;
        const option = variantLabel(variant);
        const title = option === "Standard" ? product.title : `${product.title} - ${option}`;
        const link = `${cfg.origin}/products/${encodeURIComponent(product.handle)}?variant=${encodeURIComponent(variant.id)}`;
        const identifiers = [];
        if (variant.barcode) identifiers.push(`<g:gtin>${escapeXml(variant.barcode)}</g:gtin>`);
        if (variant.sku) identifiers.push(`<g:mpn>${escapeXml(variant.sku)}</g:mpn>`);
        if (product.vendor) identifiers.push(`<g:brand>${escapeXml(product.vendor)}</g:brand>`);
        if (!variant.barcode && !variant.sku && !product.vendor) identifiers.push(`<g:identifier_exists>false</g:identifier_exists>`);
        items.push(`
          <item>
            <g:id>${escapeXml(variant.id)}</g:id>
            <title>${escapeXml(title)}</title>
            <description>${escapeXml(product.description || title)}</description>
            <link>${escapeXml(link)}</link>
            <g:image_link>${escapeXml(image.url)}</g:image_link>
            <g:availability>${variant.availableForSale ? "in_stock" : "out_of_stock"}</g:availability>
            <g:price>${escapeXml(`${variant.price.amount} ${variant.price.currencyCode}`)}</g:price>
            <g:condition>new</g:condition>
            ${identifiers.join("\n            ")}
          </item>`);
      }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Winkwire Products</title>
    <link>${escapeXml(cfg.origin)}</link>
    <description>Live Winkwire product data synchronized from Shopify.</description>
    ${items.join("\n")}
  </channel>
</rss>`;
    return new Response(xml, { status: 200, headers: { "Content-Type": "application/xml; charset=UTF-8", "Cache-Control": "public, max-age=300, s-maxage=900", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    console.error(error);
    return new Response("Merchant feed temporarily unavailable", { status: 503, headers: { "Content-Type": "text/plain; charset=UTF-8", "Cache-Control": "no-store", "Retry-After": "60" } });
  }
}
