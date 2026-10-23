export const DEFAULTS = Object.freeze({
  domain: "pv0v77-4v.myshopify.com",
  apiVersion: "2026-10",
  origin: "https://winkwireelectronics.com",
  business: Object.freeze({
    legalName: "Winkwire Electronics & More",
    email: "Winkwire@winkwire.com",
    phoneDisplay: "(714) 788-9744",
    phoneE164: "+17147889744",
    address1: "11 8th St", city: "Saint Augustine", state: "FL", postal: "32080", country: "US"
  })
});
export function config(env={},request){
  const reqOrigin=request?new URL(request.url).origin:DEFAULTS.origin;
  return {domain:String(env.SHOPIFY_STORE_DOMAIN||DEFAULTS.domain).replace(/^https?:\/\//,'').replace(/\/$/,''),version:String(env.SHOPIFY_API_VERSION||DEFAULTS.apiVersion),origin:String(env.PUBLIC_ORIGIN||DEFAULTS.origin||reqOrigin).replace(/\/$/,''),token:String(env.SHOPIFY_STOREFRONT_TOKEN||'')};
}
export async function shopify(env,request,query,variables={}){
  const c=config(env,request);const headers={'Content-Type':'application/json','Accept':'application/json'};
  if(c.token) headers['X-Shopify-Storefront-Access-Token']=c.token;
  const ip=request?.headers?.get('CF-Connecting-IP'); if(ip&&c.token) headers['Shopify-Storefront-Buyer-IP']=ip;
  const r=await fetch(`https://${c.domain}/api/${c.version}/graphql.json`,{method:'POST',headers,body:JSON.stringify({query,variables})});
  let p;try{p=await r.json()}catch{throw new Error(`Shopify returned an invalid response (${r.status}).`)}
  if(!r.ok||p.errors?.length)throw new Error(p.errors?.map(e=>e.message).join('; ')||`Shopify request failed (${r.status}).`);return p.data;
}
export const PRODUCT_FIELDS=`id handle title description descriptionHtml availableForSale vendor productType featuredImage{url altText width height} images(first:12){nodes{url altText width height}} priceRange{minVariantPrice{amount currencyCode} maxVariantPrice{amount currencyCode}} variants(first:50){nodes{id title availableForSale sku barcode price{amount currencyCode} selectedOptions{name value} image{url altText width height}}}`;
export const POLICY_FIELDS=`id title handle body url`;
export function esc(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;')}
export function jsonScript(v){return JSON.stringify(v).replace(/</g,'\u003c').replace(/>/g,'\u003e').replace(/&/g,'\u0026')}
export function money(m){const n=Number(m?.amount);if(!Number.isFinite(n))return'';try{return new Intl.NumberFormat('en-US',{style:'currency',currency:m?.currencyCode||'USD'}).format(n)}catch{return `$${n.toFixed(2)}`}}
export function stripPolicy(html){return String(html||'').replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<\s*br\s*\/?\s*>/gi,'\n').replace(/<\/((p)|(div)|(li)|(h[1-6]))\s*>/gi,'\n').replace(/<li[^>]*>/gi,'• ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/[ \t]+/g,' ').replace(/\n\s*\n\s*\n+/g,'\n\n').trim()}
export function policyHtml(html){const t=stripPolicy(html);if(!t)return'';return t.split(/\n{2,}/).map(block=>{const s=block.trim();if(!s)return'';const lines=s.split(/\n/).map(x=>x.trim()).filter(Boolean);if(lines.every(x=>x.startsWith('• ')))return `<ul>${lines.map(x=>`<li>${esc(x.slice(2))}</li>`).join('')}</ul>`;return `<p>${esc(s).replace(/\n/g,'<br>')}</p>`}).join('')}
export function policyComplete(policy,min=120){return stripPolicy(policy?.body).length>=min}
export async function getShopPolicies(env,request){return shopify(env,request,`query{shop{name primaryDomain{host url sslEnabled} privacyPolicy{${POLICY_FIELDS}} refundPolicy{${POLICY_FIELDS}} shippingPolicy{${POLICY_FIELDS}} termsOfService{${POLICY_FIELDS}}}}`)}
export function compliance(shop){const checks={shippingPolicy:policyComplete(shop?.shippingPolicy),refundPolicy:policyComplete(shop?.refundPolicy),privacyPolicy:policyComplete(shop?.privacyPolicy),termsOfService:policyComplete(shop?.termsOfService)};return {checks,commerceReady:Object.values(checks).every(Boolean)}}
export function head({title,description,canonical,jsonLd=null}){return `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#060b16"><link rel="icon" type="image/png" href="/assets/favicon.png"><link rel="stylesheet" href="/assets/site.css"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${esc(canonical)}"><meta property="og:type" content="website"><meta property="og:site_name" content="WinkWire"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(canonical)}">${jsonLd?`<script type="application/ld+json">${jsonScript(jsonLd)}</script>`:''}`}
export function serverHeader(commerce=false){const action=commerce?`<button class="cart-trigger" id="cartTrigger" type="button" aria-controls="cartDrawer" aria-expanded="false">Cart <span id="cartCount" class="cart-count">0</span></button>`:`<a class="button primary small" href="/shop">Shop</a>`;return `<a class="skip-link" href="#main">Skip to main content</a><div class="announcement">Secure Shopify checkout <span>•</span> Clear policies <span>•</span> Real customer support</div><header class="site-header"><div class="shell header-row"><a class="brand" href="/"><img src="/assets/winkwire-logo.webp" alt="WinkWire Electronics"></a><button class="nav-toggle" type="button" aria-expanded="false" aria-controls="mainNav" aria-label="Open navigation"><span></span><span></span><span></span></button><nav class="main-nav" id="mainNav" aria-label="Main navigation"><a href="/">Home</a><a href="/shop">Shop</a><a href="/about">About</a><a href="/faq">FAQ</a><a href="/contact">Contact</a></nav>${action}</div></header>`}
export function serverFooter(){const b=DEFAULTS.business;return `<footer class="site-footer"><div class="shell footer-grid"><section class="footer-brand"><img src="/assets/winkwire-logo.webp" alt="WinkWire Electronics"><p>Useful products, straightforward shopping, and secure Shopify checkout.</p></section><nav><h2>Store</h2><a href="/shop">Shop all</a><a href="/about">About us</a><a href="/faq">FAQ</a><a href="/contact">Contact</a></nav><nav><h2>Policies</h2><a href="/policies/shipping">Shipping policy</a><a href="/policies/refund">Returns &amp; refunds</a><a href="/policies/privacy">Privacy policy</a><a href="/policies/terms">Terms of service</a></nav><section class="footer-contact"><h2>Customer service</h2><a href="mailto:${b.email}">${b.email}</a><a href="tel:${b.phoneE164}">${b.phoneDisplay}</a><address>${b.address1}<br>${b.city}, ${b.state} ${b.postal}</address><p class="micro">Business/mailing address. Online retailer — no walk-in storefront.</p></section></div><div class="shell footer-bottom"><span>© ${new Date().getFullYear()} ${b.legalName}. All rights reserved.</span><span>winkwireelectronics.com</span></div></footer>`}
export function html(body,status=200,headers={}){return new Response(body,{status,headers:{'Content-Type':'text/html; charset=UTF-8','Cache-Control':status===200?'public, max-age=60, s-maxage=300':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin',...headers}})}
