import { shopifyRequest, configFromEnv, escapeXml, POLICY_FIELDS, compliance } from "./_shared/shopify.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  const cfg = configFromEnv(env, request);
  const staticUrls = [
    `${cfg.origin}/`,
    `${cfg.origin}/contact`,
    `${cfg.origin}/policies/shipping`,
    `${cfg.origin}/policies/refund`,
    `${cfg.origin}/policies/privacy`,
    `${cfg.origin}/policies/terms`
  ];

  try {
    const readiness = await shopifyRequest(env, request, `query SitemapReadiness { shop { contactInformation { ${POLICY_FIELDS} } privacyPolicy { ${POLICY_FIELDS} } refundPolicy { ${POLICY_FIELDS} } shippingPolicy { ${POLICY_FIELDS} } termsOfService { ${POLICY_FIELDS} } } }`);
    if (!compliance(readiness.shop, cfg.supportEmail).commerceReady) {
      return xmlResponse(staticUrls);
    }

    let after = null;
    const handles = [];
    do {
      const data = await shopifyRequest(env, request, `query SitemapProducts($first:Int!,$after:String){ products(first:$first,after:$after,sortKey:ID){ nodes{ handle } pageInfo{hasNextPage endCursor} } }`, { first: 100, after });
      handles.push(...data.products.nodes.map((p) => p.handle).filter(Boolean));
      after = data.products.pageInfo.hasNextPage ? data.products.pageInfo.endCursor : null;
    } while (after && handles.length < 5000);

    return xmlResponse([...staticUrls, ...handles.map((handle) => `${cfg.origin}/products/${encodeURIComponent(handle)}`)]);
  } catch (error) {
    console.error(error);
    return xmlResponse(staticUrls, 200, "public, max-age=300, s-maxage=900");
  }
}

function xmlResponse(urls, status = 200, cache = "public, max-age=300, s-maxage=3600") {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`).join("\n")}\n</urlset>`;
  return new Response(xml, { status, headers: { "Content-Type": "application/xml; charset=UTF-8", "Cache-Control": cache, "X-Content-Type-Options": "nosniff" } });
}
