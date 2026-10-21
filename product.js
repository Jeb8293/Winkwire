(function(){
  "use strict";
  const site=window.WinkwireSite, client=site.client, config=site.config;
  const page=document.getElementById("productPage"), status=document.getElementById("productStatus"), crumb=document.getElementById("breadcrumbProduct");
  let product=null, selectedVariant=null, activeImage=null;

  function handle(){
    const q=new URLSearchParams(location.search).get("handle")?.trim();
    if(q) return q;
    const m=location.pathname.match(/\/products\/([^/?#]+)/);
    return m?decodeURIComponent(m[1]):"";
  }
  function unavailable(message){ page.setAttribute("aria-busy","false"); page.replaceChildren(site.el("div",{class:"error-state",text:message})); status.textContent="Product unavailable."; }
  function chooseVariant(id){ selectedVariant=product.variants.nodes.find(v=>v.id===id)||product.variants.nodes[0]||null; render(); }
  function currentImage(){ return activeImage||selectedVariant?.image||product.featuredImage||product.images?.nodes?.[0]||null; }

  function render(){
    page.setAttribute("aria-busy","false"); page.replaceChildren();
    if(!product) return;
    const gallery=site.el("div",{class:"product-gallery"});
    const main=site.el("div",{class:"product-main-image"}); const img=site.safeImage(currentImage(),product.title,true);
    if(img) main.append(img); else main.append(site.el("div",{class:"product-placeholder product-placeholder-large"},[site.el("span",{text:"W"}),site.el("small",{text:"Image unavailable"})]));
    gallery.append(main);
    const images=product.images?.nodes||[];
    if(images.length>1){ const thumbs=site.el("div",{class:"product-thumbs",attrs:{"aria-label":"Product images"}}); images.forEach((image,index)=>{ const b=site.el("button",{type:"button",class:"thumb-button",attrs:{"aria-label":`Show image ${index+1}`}}); const ti=site.safeImage(image,`${product.title} image ${index+1}`); if(ti)b.append(ti); b.addEventListener("click",()=>{activeImage=image;render();}); thumbs.append(b); }); gallery.append(thumbs); }

    const info=site.el("div",{class:"product-detail-info"});
    info.append(site.el("p",{class:"eyebrow",text:product.productType||"Winkwire gear"}),site.el("h1",{text:product.title}),site.el("p",{class:"product-detail-price",text:site.formatMoney(selectedVariant?.price||product.priceRange?.minVariantPrice)}));
    const avail=site.el("p",{class:`availability ${selectedVariant?.availableForSale?"in-stock":"out-of-stock"}`,text:selectedVariant?.availableForSale?"Available to order":"Currently unavailable"}); info.append(avail);
    if(product.description) info.append(site.el("p",{class:"product-description",text:product.description}));

    if(product.variants.nodes.length>1){ const group=site.el("div",{class:"variant-group"},[site.el("label",{for:"variantSelect",text:"Choose an option"})]); const select=site.el("select",{id:"variantSelect",class:"variant-select"}); product.variants.nodes.forEach(v=>{ const label=(v.selectedOptions||[]).filter(o=>o.value!=="Default Title").map(o=>o.value).join(" / ")||v.title||"Standard"; select.append(site.el("option",{value:v.id,text:`${label} — ${site.formatMoney(v.price)}${v.availableForSale?"":" — unavailable"}`,disabled:!v.availableForSale,selected:v.id===selectedVariant?.id})); }); select.addEventListener("change",()=>chooseVariant(select.value)); group.append(select); info.append(group); }

    const qtyWrap=site.el("div",{class:"quantity-field"}); qtyWrap.append(site.el("label",{for:"quantity",text:"Quantity"})); const qty=site.el("input",{id:"quantity",type:"number",min:"1",max:"99",value:"1",inputMode:"numeric"}); qtyWrap.append(qty); info.append(qtyWrap);
    const add=site.el("button",{class:"button button-primary product-add",type:"button",text:selectedVariant?.availableForSale?"Add to cart":"Unavailable"});
    const ready=site.state.compliance?.commerceReady; add.disabled=!selectedVariant?.availableForSale||!ready;
    if(!ready) add.textContent="Purchasing temporarily unavailable";
    add.addEventListener("click",async()=>{ const q=Math.max(1,Math.min(99,Number.parseInt(qty.value,10)||1)); add.disabled=true; add.textContent="Adding…"; const ok=await site.addToCart(selectedVariant.id,q); if(!ok){add.disabled=!selectedVariant?.availableForSale||!site.state.compliance?.commerceReady; add.textContent=site.state.compliance?.commerceReady?"Add to cart":"Purchasing temporarily unavailable";} });
    info.append(add,site.el("p",{class:"secure-note",text:"Payment is completed through Shopify checkout. Shipping, taxes, discounts, and final totals are shown before you place the order."}));
    page.append(gallery,info);
  }

  function schema(){
    const origin=String(config.site?.publicOrigin||location.origin).replace(/\/$/,"");
    const local=["localhost","127.0.0.1","::1"].includes(location.hostname);
    const baseUrl=local
      ? `${origin}/product.html?handle=${encodeURIComponent(product.handle)}`
      : `${origin}/products/${encodeURIComponent(product.handle)}`;
    const selectedUrl=selectedVariant
      ? `${baseUrl}${baseUrl.includes("?")?"&":"?"}variant=${encodeURIComponent(selectedVariant.id)}`
      : baseUrl;
    const offers=product.variants.nodes.map(v=>({"@type":"Offer","url":`${baseUrl}${baseUrl.includes("?")?"&":"?"}variant=${encodeURIComponent(v.id)}`,"priceCurrency":v.price.currencyCode,"price":v.price.amount,"availability":v.availableForSale?"https://schema.org/InStock":"https://schema.org/OutOfStock","itemCondition":"https://schema.org/NewCondition",...(v.sku?{sku:v.sku}:{})}));
    const data={"@context":"https://schema.org","@type":"Product","name":product.title,"description":product.description||undefined,"image":product.images?.nodes?.map(i=>i.url).filter(Boolean)||undefined,"brand":{"@type":"Brand","name":product.vendor||"Winkwire"},"offers":offers};
    site.setJsonLd("productStructuredData",data); site.setCanonical(selectedVariant?selectedUrl:baseUrl); site.setMetaDescription(product.seo?.description||product.description||`${product.title} from Winkwire.`);
    document.title=`${product.seo?.title||product.title} | Winkwire`;
  }

  async function init(){
    const ctx=await site.initGlobal(); const h=handle();
    if(!h){ unavailable("No product was specified. Return to the shop to choose a product."); return; }
    if(!client.status.configured){ unavailable("This product page is unavailable in preview mode because no live Shopify inventory is connected."); return; }
    try{ product=window.__WINKWIRE_PRODUCT__||await client.getProductByHandle(h); if(!product){unavailable("This product could not be found or is no longer published.");return;} const requestedVariant=new URLSearchParams(location.search).get("variant"); selectedVariant=product.variants.nodes.find(v=>v.id===requestedVariant)||product.variants.nodes.find(v=>v.availableForSale)||product.variants.nodes[0]||null; crumb.textContent=product.title; status.textContent=ctx.compliance.commerceReady?"Live product information from Shopify.":"Live product information from Shopify. Purchasing is temporarily disabled until required store information is complete."; schema(); render(); }
    catch(err){console.error(err);unavailable("We couldn’t load this product from Shopify. Please return to the shop and try again.");}
  }
  init();
})();
