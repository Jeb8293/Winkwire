(function(){
  "use strict";
  const site=window.WinkwireSite;
  const config=site.config;
  const client=site.client;
  const state={products:[],collections:{deskReset:null,grabAndGo:null},visibleCollection:null};
  const grid=document.getElementById("productGrid"), status=document.getElementById("shopStatus"), title=document.getElementById("shopTitle"), eyebrow=document.getElementById("shopEyebrow"), reset=document.getElementById("filterReset");

  const demo=[
    ["Demo Tech Organizer Pouch","24.00"],["Demo Cable Tie Set","12.00"],["Demo Foldable Phone Stand","18.00"],["Demo Cable Clips","10.00"],["Demo Laptop Stand","32.00"],["Demo Travel Cable Pouch","22.00"]
  ].map((x,i)=>({id:`demo-${i}`,title:x[0],handle:`demo-${i}`,availableForSale:false,featuredImage:null,priceRange:{minVariantPrice:{amount:x[1],currencyCode:"USD"}}}));

  function skeletons(){ grid.replaceChildren(...Array.from({length:8},()=>site.el("div",{class:"skeleton",attrs:{"aria-hidden":"true"}}))); }
  function render(products,preview=false){
    grid.setAttribute("aria-busy","false"); grid.replaceChildren();
    if(!products.length){ grid.append(site.el("div",{class:"empty-state",text:"No products are currently available."})); return; }
    products.forEach(product=>{
      const media=site.el("div",{class:"product-media"}); const img=site.safeImage(product.featuredImage,product.title);
      if(img) media.append(img); else media.append(site.el("div",{class:"product-placeholder"},[site.el("div",{},[site.el("span",{text:"W"}),site.el("small",{text:preview?"Preview image placeholder":"Image unavailable"})]) ]));
      if(preview) media.append(site.el("span",{class:"product-badge",text:"Demo only"})); else if(!product.availableForSale) media.append(site.el("span",{class:"product-badge",text:"Unavailable"}));
      const info=site.el("div",{class:"product-info"},[site.el("p",{class:"product-title",text:product.title}),site.el("p",{class:"product-price"},[site.el("span",{text:"From "}),site.el("strong",{text:site.formatMoney(product.priceRange?.minVariantPrice)})])]);
      const inner=preview?site.el("div",{class:"product-card-button",attrs:{"aria-label":`${product.title}, preview only`}},[media,info]):site.el("a",{class:"product-card-button",href:site.productUrl(product.handle),attrs:{"aria-label":`View ${product.title}`}},[media,info]);
      grid.append(site.el("article",{class:"product-card"},[inner]));
    });
  }
  async function load(){
    skeletons();
    const ctx=await site.initGlobal();
    if(!client.status.configured){ state.products=demo; status.textContent="Preview catalog — fictional demo items only."; render(demo,true); return; }
    try{
      const limit=Math.max(1,Math.min(Number(config.shopify.productLimit)||24,100)); const handles=config.shopify.collections||{};
      const [products,desk,travel]=await Promise.all([client.getProducts(limit),handles.deskReset?client.getCollection(handles.deskReset,limit):null,handles.grabAndGo?client.getCollection(handles.grabAndGo,limit):null]);
      state.products=products; state.collections.deskReset=desk; state.collections.grabAndGo=travel; status.textContent=`${products.length} product${products.length===1?"":"s"} loaded from Shopify.`; render(products,false);
      if(!ctx.compliance.commerceReady) status.textContent+=" Purchasing is temporarily disabled until required store policies and contact information are complete.";
    }catch(err){ console.error(err); grid.setAttribute("aria-busy","false"); grid.replaceChildren(site.el("div",{class:"error-state",text:"We couldn’t load the live Shopify catalog. Check the Storefront API configuration and product publication settings."})); status.textContent="Live catalog unavailable."; }
  }
  function filter(key){
    const c=state.collections[key], label=key==="deskReset"?"Desk Reset":"Grab & Go"; state.visibleCollection=key; eyebrow.textContent="Collection"; title.textContent=label; reset.hidden=false;
    if(!client.status.configured){ const list=key==="deskReset"?demo.filter((_,i)=>i%2===0):demo.filter((_,i)=>i%2===1); status.textContent="Preview collection — fictional demo items only."; render(list,true); }
    else if(!c){status.textContent=`The ${label} collection is not available.`;render([],false);} else {status.textContent=`${c.products.length} product${c.products.length===1?"":"s"} in ${c.title||label}.`;render(c.products,false);} document.getElementById("shop").scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
  }
  document.querySelectorAll(".collection-filter").forEach(b=>b.addEventListener("click",()=>filter(b.dataset.collection)));
  reset.addEventListener("click",()=>{state.visibleCollection=null;eyebrow.textContent="The collection";title.textContent="Gear that gets its act together.";reset.hidden=true;status.textContent=client.status.configured?`${state.products.length} product${state.products.length===1?"":"s"} loaded from Shopify.`:"Preview catalog — fictional demo items only.";render(state.products,!client.status.configured);});
  load();
})();
