(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const cfg = window.WINKWIRE_CONFIG || {};
  const api = window.WinkwireShopify;
  let products = [];
  let shownProducts = [];
  let activeFilter = 'all';
  let cart = null;
  let selectedProduct = null;
  let selectedVariant = null;

  const demoProducts = [
    {id:'demo-1',handle:'preview-power',title:'Winkwire Power Hub',description:'Preview content shown until Shopify responds.',productType:'Power & Charging',vendor:'Winkwire',availableForSale:true,featuredImage:null,images:{nodes:[]},priceRange:{minVariantPrice:{amount:'39.99',currencyCode:'USD'},maxVariantPrice:{amount:'39.99',currencyCode:'USD'}},options:[],variants:{nodes:[]},demo:true},
    {id:'demo-2',handle:'preview-audio',title:'Wireless Audio',description:'Live products will replace this preview automatically.',productType:'Audio',vendor:'Winkwire',availableForSale:true,featuredImage:null,images:{nodes:[]},priceRange:{minVariantPrice:{amount:'59.99',currencyCode:'USD'},maxVariantPrice:{amount:'59.99',currencyCode:'USD'}},options:[],variants:{nodes:[]},demo:true},
    {id:'demo-3',handle:'preview-accessory',title:'Everyday Tech Accessories',description:'Connected to your Shopify catalog.',productType:'Accessories',vendor:'Winkwire',availableForSale:true,featuredImage:null,images:{nodes:[]},priceRange:{minVariantPrice:{amount:'19.99',currencyCode:'USD'},maxVariantPrice:{amount:'19.99',currencyCode:'USD'}},options:[],variants:{nodes:[]},demo:true},
    {id:'demo-4',handle:'preview-connect',title:'Smart Connectivity',description:'Your store data appears here.',productType:'Connectivity',vendor:'Winkwire',availableForSale:true,featuredImage:null,images:{nodes:[]},priceRange:{minVariantPrice:{amount:'29.99',currencyCode:'USD'},maxVariantPrice:{amount:'29.99',currencyCode:'USD'}},options:[],variants:{nodes:[]},demo:true}
  ];

  function money(m) { if (!m) return ''; return new Intl.NumberFormat('en-US',{style:'currency',currency:m.currencyCode || 'USD'}).format(Number(m.amount || 0)); }
  function escapeHTML(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
  function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),2600)}
  function placeholderGraphic(type='TECH'){return `<div style="display:grid;place-items:center;width:72%;aspect-ratio:1;border-radius:50%;border:1px solid rgba(67,220,255,.17);box-shadow:0 0 55px rgba(0,158,255,.12);font:700 12px 'Space Grotesk';letter-spacing:.18em;color:#61e7ff">${escapeHTML(type || 'TECH')}</div>`}

  function productCard(p){
    const img=p.featuredImage?.url?`<img loading="lazy" src="${p.featuredImage.url}" alt="${escapeHTML(p.featuredImage.altText||p.title)}">`:placeholderGraphic(p.productType||'WINKWIRE');
    return `<article class="product-card" data-product="${escapeHTML(p.id)}"><div class="product-media">${img}<span class="product-badge">${p.demo?'Concept preview':(p.availableForSale?'Available':'Sold out')}</span></div><div class="product-info"><span class="product-type">${escapeHTML(p.productType||p.vendor||'Electronics')}</span><h3>${escapeHTML(p.title)}</h3><div class="price-row"><strong>${money(p.priceRange?.minVariantPrice)}</strong><button class="quick-add" data-quick="${escapeHTML(p.id)}" aria-label="Quick add ${escapeHTML(p.title)}">+</button></div></div></article>`;
  }

  function renderProducts(){
    const sort=$('#sortSelect').value; shownProducts=products.filter(p=>activeFilter==='all'||(p.productType||'Other')===activeFilter);
    shownProducts=[...shownProducts].sort((a,b)=> sort==='price-low'?Number(a.priceRange.minVariantPrice.amount)-Number(b.priceRange.minVariantPrice.amount):sort==='price-high'?Number(b.priceRange.minVariantPrice.amount)-Number(a.priceRange.minVariantPrice.amount):sort==='az'?a.title.localeCompare(b.title):0);
    $('#productGrid').innerHTML=shownProducts.map(productCard).join('');
  }
  function renderFilters(){
    const types=[...new Set(products.map(p=>p.productType||'Other'))].filter(Boolean).slice(0,8);
    $('#categoryFilters').innerHTML=`<button class="filter-pill active" data-filter="all">All products</button>`+types.map(t=>`<button class="filter-pill" data-filter="${escapeHTML(t)}">${escapeHTML(t)}</button>`).join('');
  }

  async function loadProducts(){
    const notice=$('#connectionNotice');
    try{
      const live=await api.getProducts(100);
      if(!live.length) throw new Error('Shopify connected, but no products were returned. Confirm products are active and published to the storefront sales channel.');
      products=live; notice.hidden=true;
    }catch(err){
      products=demoProducts;
      notice.hidden=false;
      notice.innerHTML=`<strong>Concept mode:</strong> ${escapeHTML(err.message)} The site is fully designed and will swap these preview cards for the live Shopify catalog once the storefront connection is available.`;
      console.warn('Shopify connection:',err);
    }
    renderFilters();renderProducts();
  }

  function chooseVariant(p, selections={}){
    const nodes=p.variants?.nodes||[];
    if(!nodes.length)return null;
    return nodes.find(v=>v.selectedOptions.every(o=>!selections[o.name]||selections[o.name]===o.value))||nodes.find(v=>v.availableForSale)||nodes[0];
  }
  function openProduct(p){
    selectedProduct=p; selectedVariant=chooseVariant(p);
    const img=p.featuredImage?.url?`<img src="${p.featuredImage.url}" alt="${escapeHTML(p.featuredImage.altText||p.title)}">`:placeholderGraphic(p.productType||'WINKWIRE');
    const optionHTML=(p.options||[]).filter(o=>o.name!=='Title').map(o=>`<div class="option-group"><label>${escapeHTML(o.name)}</label><select class="option-select" data-option="${escapeHTML(o.name)}">${o.values.map(v=>`<option value="${escapeHTML(v)}">${escapeHTML(v)}</option>`).join('')}</select></div>`).join('');
    $('#productModalContent').innerHTML=`<div class="product-detail"><div class="detail-image">${img}</div><div class="detail-info"><span class="kicker">${escapeHTML(p.productType||'WINKWIRE ELECTRONICS')}</span><h2>${escapeHTML(p.title)}</h2><div class="detail-price" id="detailPrice">${money(selectedVariant?.price||p.priceRange?.minVariantPrice)}</div><div class="detail-desc">${p.descriptionHtml||escapeHTML(p.description||'')}</div>${optionHTML}<button class="btn primary detail-add" id="detailAdd" ${p.demo||!p.availableForSale?'disabled':''}>${p.demo?'Preview only':(p.availableForSale?'Add to cart':'Sold out')}</button></div></div>`;
    $('#productModal').classList.add('open');$('#productModal').setAttribute('aria-hidden','false');document.body.style.overflow='hidden';
  }
  function closeProduct(){ $('#productModal').classList.remove('open');$('#productModal').setAttribute('aria-hidden','true');document.body.style.overflow=''; }

  function setCart(c){cart=c;if(c?.id)localStorage.setItem('winkwire_cart_id',c.id);$('#cartCount').textContent=c?.totalQuantity||0;renderCart();}
  async function restoreCart(){
    const id=localStorage.getItem('winkwire_cart_id');if(!id)return;
    try{const c=await api.getCart(id);if(c)setCart(c);else localStorage.removeItem('winkwire_cart_id')}catch{localStorage.removeItem('winkwire_cart_id')}
  }
  function renderCart(){
    const box=$('#cartItems'),foot=$('#cartFoot');
    if(!cart?.lines?.nodes?.length){box.innerHTML='<div class="empty-cart"><span>◌</span><h3>Your cart is empty.</h3><p>Add something good.</p></div>';foot.hidden=true;return}
    box.innerHTML=cart.lines.nodes.map(l=>{const m=l.merchandise;const img=m.image?.url?`<img src="${m.image.url}" alt="">`:`<div style="width:78px;height:78px;border-radius:12px;background:#0a1c2f"></div>`;return `<div class="cart-line" data-line="${escapeHTML(l.id)}">${img}<div><h4>${escapeHTML(m.product.title)}</h4><small>${m.title!=='Default Title'?escapeHTML(m.title):''}</small><div class="qty-controls"><button data-qty="${escapeHTML(l.id)}" data-value="${l.quantity-1}">−</button><span>${l.quantity}</span><button data-qty="${escapeHTML(l.id)}" data-value="${l.quantity+1}">+</button></div></div><div><strong>${money({amount:Number(m.price.amount)*l.quantity,currencyCode:m.price.currencyCode})}</strong><button class="line-remove" data-remove="${escapeHTML(l.id)}" aria-label="Remove">×</button></div></div>`}).join('');
    $('#cartSubtotal').textContent=money(cart.cost.subtotalAmount);foot.hidden=false;
  }
  async function addToCart(variantId){
    if(!variantId){toast('Choose a product option first.');return}
    try{toast('Adding to cart…');const c=await api.addCartLine(cart?.id,variantId,1);setCart(c);openCart();toast('Added to cart.')}catch(err){localStorage.removeItem('winkwire_cart_id');cart=null;try{const c=await api.createCart(variantId,1);setCart(c);openCart();toast('Added to cart.')}catch(e){toast('Could not add to cart. '+e.message)}}
  }
  function openCart(){ $('#cartDrawer').classList.add('open');$('#cartDrawer').setAttribute('aria-hidden','false');document.body.style.overflow='hidden'; }
  function closeCart(){ $('#cartDrawer').classList.remove('open');$('#cartDrawer').setAttribute('aria-hidden','true');document.body.style.overflow=''; }

  document.addEventListener('click',async e=>{
    const filter=e.target.closest('[data-filter]');if(filter){activeFilter=filter.dataset.filter;$$('.filter-pill').forEach(b=>b.classList.toggle('active',b===filter));renderProducts();return}
    const quick=e.target.closest('[data-quick]');if(quick){e.stopPropagation();const p=products.find(x=>x.id===quick.dataset.quick);if(p?.demo){openProduct(p);return}const v=chooseVariant(p);if((p.options||[]).filter(o=>o.name!=='Title').length>0){openProduct(p)}else addToCart(v?.id);return}
    const card=e.target.closest('.product-card');if(card){const p=products.find(x=>x.id===card.dataset.product);if(p)openProduct(p);return}
    if(e.target.matches('[data-close-product]')||e.target.closest('[data-close-product]'))closeProduct();
    if(e.target.id==='detailAdd'){if(selectedVariant)await addToCart(selectedVariant.id);}
    const qty=e.target.closest('[data-qty]');if(qty&&cart){const val=Number(qty.dataset.value);try{if(val<=0)setCart(await api.removeCartLine(cart.id,qty.dataset.qty));else setCart(await api.updateCartLine(cart.id,qty.dataset.qty,val));}catch(err){toast(err.message)}return}
    const rem=e.target.closest('[data-remove]');if(rem&&cart){try{setCart(await api.removeCartLine(cart.id,rem.dataset.remove))}catch(err){toast(err.message)}}
  });

  document.addEventListener('change',e=>{
    if(e.target.matches('.option-select')&&selectedProduct){const selections={};$$('.option-select').forEach(s=>selections[s.dataset.option]=s.value);selectedVariant=chooseVariant(selectedProduct,selections);$('#detailPrice').textContent=money(selectedVariant?.price||selectedProduct.priceRange.minVariantPrice);$('#detailAdd').disabled=!selectedVariant?.availableForSale;$('#detailAdd').textContent=selectedVariant?.availableForSale?'Add to cart':'Sold out';}
    if(e.target.id==='sortSelect')renderProducts();
  });

  $('#cartOpen').addEventListener('click',openCart);$('#cartClose').addEventListener('click',closeCart);$('#cartBackdrop').addEventListener('click',closeCart);
  $('#checkoutBtn').addEventListener('click',()=>{if(cart?.checkoutUrl)location.href=cart.checkoutUrl;else toast('Checkout is not available yet.')});
  $('#menuToggle').addEventListener('click',()=>{const m=$('#mobileMenu');m.classList.toggle('open');m.setAttribute('aria-hidden',String(!m.classList.contains('open')))});$$('#mobileMenu a').forEach(a=>a.addEventListener('click',()=>$('#mobileMenu').classList.remove('open')));
  $('#searchToggle').addEventListener('click',()=>{$('#searchPanel').classList.add('open');$('#searchPanel').setAttribute('aria-hidden','false');setTimeout(()=>$('#searchInput').focus(),150)});
  $('#searchClose').addEventListener('click',()=>{$('#searchPanel').classList.remove('open');$('#searchPanel').setAttribute('aria-hidden','true')});
  $('#searchInput').addEventListener('input',e=>{const q=e.target.value.trim().toLowerCase();if(!q){$('#searchResults').innerHTML='';return}const r=products.filter(p=>[p.title,p.productType,p.vendor,p.description].join(' ').toLowerCase().includes(q)).slice(0,8);$('#searchResults').innerHTML=r.length?r.map(p=>`<a href="#shop" class="search-result" data-search-product="${escapeHTML(p.id)}"><strong>${escapeHTML(p.title)}</strong><br><span>${money(p.priceRange.minVariantPrice)}</span></a>`).join(''):'<span style="color:#71869a;font-size:12px">No matches yet.</span>';$$('[data-search-product]').forEach(a=>a.onclick=(ev)=>{ev.preventDefault();openProduct(products.find(p=>p.id===a.dataset.searchProduct));$('#searchPanel').classList.remove('open')})});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeProduct();closeCart();$('#searchPanel').classList.remove('open')}});

  function hydrateBrand(){
    $('#announcementText').textContent=cfg.announcement||'Powered by Shopify checkout • Secure payments • Live product catalog';$('#year').textContent=new Date().getFullYear();
    const email=$('#emailCard'),phone=$('#phoneCard');if(cfg.contactEmail){email.href=`mailto:${cfg.contactEmail}`;$('#emailText').textContent=cfg.contactEmail}else email.classList.add('disabled');if(cfg.phone){phone.href=`tel:${cfg.phone.replace(/[^+\d]/g,'')}`;$('#phoneText').textContent=cfg.phone}else phone.classList.add('disabled');if(api?.domain)$('#shopifyStoreLink').href=`https://${api.domain}`;
  }
  function reveal(){const io=new IntersectionObserver(entries=>entries.forEach(en=>en.isIntersecting&&en.target.classList.add('visible')),{threshold:.12});$$('.reveal').forEach(el=>io.observe(el));}
  hydrateBrand();reveal();loadProducts();restoreCart();
})();
