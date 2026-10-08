(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const cfg = window.WINKWIRE_CONFIG || {};
  const api = window.WinkwireShopify;
  let products = [];
  let activeFilter = 'all';
  let cart = null;
  let selectedProduct = null;
  let selectedVariant = null;

  const demoProducts = [
    {id:'demo-1',title:'Portable Power & Charging',description:'Preview card shown until the Shopify catalog responds.',productType:'Power & Charging',vendor:'Wink Wire',availableForSale:true,featuredImage:null,priceRange:{minVariantPrice:{amount:'29.99',currencyCode:'USD'}},options:[],variants:{nodes:[]},demo:true},
    {id:'demo-2',title:'Everyday Tech Accessories',description:'Live Shopify products replace this preview automatically.',productType:'Accessories',vendor:'Wink Wire',availableForSale:true,featuredImage:null,priceRange:{minVariantPrice:{amount:'19.99',currencyCode:'USD'}},options:[],variants:{nodes:[]},demo:true},
    {id:'demo-3',title:'Smart Home Essentials',description:'Connected products, simple shopping, secure checkout.',productType:'Smart Home',vendor:'Wink Wire',availableForSale:true,featuredImage:null,priceRange:{minVariantPrice:{amount:'39.99',currencyCode:'USD'}},options:[],variants:{nodes:[]},demo:true}
  ];

  const esc = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = m => !m ? '' : new Intl.NumberFormat('en-US',{style:'currency',currency:m.currencyCode || 'USD'}).format(Number(m.amount || 0));
  function toast(message) {
    const t = $('#toast'); if (!t) return;
    t.textContent = message; t.classList.add('show');
    clearTimeout(toast.timer); toast.timer = setTimeout(() => t.classList.remove('show'), 2500);
  }
  function placeholder(type='TECH') { return `<div class="product-placeholder"><span>${esc(type)}</span></div>`; }

  function chooseVariant(p, selections={}) {
    const nodes = p?.variants?.nodes || [];
    return nodes.find(v => v.selectedOptions?.every(o => !selections[o.name] || selections[o.name] === o.value)) || nodes.find(v => v.availableForSale) || nodes[0] || null;
  }

  function productCard(p) {
    const img = p.featuredImage?.url ? `<img loading="lazy" src="${esc(p.featuredImage.url)}" alt="${esc(p.featuredImage.altText || p.title)}">` : placeholder(p.productType || 'WINK WIRE');
    return `<article class="product-card" data-product="${esc(p.id)}">
      <div class="product-media">${img}<span class="product-badge">${p.demo ? 'Preview' : (p.availableForSale ? 'Available' : 'Sold out')}</span></div>
      <div class="product-info"><span class="product-type">${esc(p.productType || p.vendor || 'Electronics')}</span><h3>${esc(p.title)}</h3><div class="price-row"><strong>${money(p.priceRange?.minVariantPrice)}</strong><button class="quick-add" data-quick="${esc(p.id)}" aria-label="Add ${esc(p.title)}">+</button></div></div>
    </article>`;
  }

  function filteredProducts() {
    const sort = $('#sortSelect')?.value || 'featured';
    let list = products.filter(p => activeFilter === 'all' || (p.productType || 'Other') === activeFilter);
    list = [...list];
    if (sort === 'price-low') list.sort((a,b)=>Number(a.priceRange.minVariantPrice.amount)-Number(b.priceRange.minVariantPrice.amount));
    if (sort === 'price-high') list.sort((a,b)=>Number(b.priceRange.minVariantPrice.amount)-Number(a.priceRange.minVariantPrice.amount));
    if (sort === 'az') list.sort((a,b)=>a.title.localeCompare(b.title));
    return list;
  }

  function renderProducts() {
    const grid = $('#productGrid'); if (!grid) return;
    const list = filteredProducts();
    grid.innerHTML = list.length ? list.map(productCard).join('') : '<div class="empty-state"><h3>No products found.</h3><p>Try another category or search term.</p></div>';
  }

  function renderFilters() {
    const holder = $('#categoryFilters'); if (!holder) return;
    const types = [...new Set(products.map(p => p.productType || 'Other').filter(Boolean))].slice(0,10);
    holder.innerHTML = `<button class="filter-pill active" data-filter="all">All products</button>` + types.map(t => `<button class="filter-pill" data-filter="${esc(t)}">${esc(t)}</button>`).join('');
  }

  async function loadProducts() {
    const notice = $('#connectionNotice');
    try {
      if (!api) throw new Error('Store connection is unavailable.');
      const live = await api.getProducts(100);
      if (!live?.length) throw new Error('No Shopify products were returned.');
      products = live;
      if (notice) notice.hidden = true;
    } catch (error) {
      console.warn(error);
      products = demoProducts;
      if (notice) {
        notice.hidden = false;
        notice.innerHTML = `<strong>Catalog connection notice:</strong> ${esc(error.message)} These preview cards will be replaced automatically when Shopify responds.`;
      }
    }
    renderFilters(); renderProducts();
  }

  function openProduct(p) {
    selectedProduct = p;
    selectedVariant = chooseVariant(p);
    const modal = $('#productModal'); if (!modal) return;
    const img = p.featuredImage?.url ? `<img src="${esc(p.featuredImage.url)}" alt="${esc(p.featuredImage.altText || p.title)}">` : placeholder(p.productType || 'WINK WIRE');
    const options = (p.options || []).filter(o => o.name !== 'Title').map(o => `<div class="option-group"><label>${esc(o.name)}</label><select class="option-select" data-option="${esc(o.name)}">${o.values.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('')}</select></div>`).join('');
    $('#productModalContent').innerHTML = `<div class="product-detail"><div class="detail-image">${img}</div><div class="detail-info"><span class="kicker">${esc(p.productType || 'WINK WIRE ELECTRONICS')}</span><h2>${esc(p.title)}</h2><div class="detail-price" id="detailPrice">${money(selectedVariant?.price || p.priceRange?.minVariantPrice)}</div><div class="detail-desc">${p.descriptionHtml || `<p>${esc(p.description || '')}</p>`}</div>${options}<button class="btn primary detail-add" id="detailAdd" ${p.demo || !p.availableForSale ? 'disabled' : ''}>${p.demo ? 'Preview only' : (p.availableForSale ? 'Add to cart' : 'Sold out')}</button></div></div>`;
    modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); document.body.classList.add('no-scroll');
  }
  function closeProduct() { $('#productModal')?.classList.remove('open'); $('#productModal')?.setAttribute('aria-hidden','true'); document.body.classList.remove('no-scroll'); }

  function renderCart() {
    const box = $('#cartItems'), foot = $('#cartFoot'); if (!box || !foot) return;
    const lines = cart?.lines?.nodes || [];
    $('#cartCount').textContent = cart?.totalQuantity || 0;
    if (!lines.length) { box.innerHTML = '<div class="empty-cart"><h3>Your cart is empty.</h3><p>Pick something useful and we’ll keep it simple from there.</p></div>'; foot.hidden = true; return; }
    box.innerHTML = lines.map(l => {
      const m = l.merchandise;
      const img = m.image?.url ? `<img src="${esc(m.image.url)}" alt="">` : `<div class="cart-img-placeholder"></div>`;
      return `<div class="cart-line">${img}<div class="cart-line-main"><h4>${esc(m.product.title)}</h4><small>${m.title !== 'Default Title' ? esc(m.title) : ''}</small><div class="qty-controls"><button data-qty="${esc(l.id)}" data-value="${l.quantity-1}">−</button><span>${l.quantity}</span><button data-qty="${esc(l.id)}" data-value="${l.quantity+1}">+</button></div></div><div class="cart-line-price"><strong>${money({amount:Number(m.price.amount)*l.quantity,currencyCode:m.price.currencyCode})}</strong><button class="line-remove" data-remove="${esc(l.id)}" aria-label="Remove item">×</button></div></div>`;
    }).join('');
    $('#cartSubtotal').textContent = money(cart.cost?.subtotalAmount); foot.hidden = false;
  }

  function setCart(c) {
    cart = c;
    if (c?.id) localStorage.setItem('winkwire_cart_id', c.id);
    renderCart();
  }

  async function restoreCart() {
    const id = localStorage.getItem('winkwire_cart_id'); if (!id || !api) return renderCart();
    try { const c = await api.getCart(id); if (c) setCart(c); else localStorage.removeItem('winkwire_cart_id'); }
    catch { localStorage.removeItem('winkwire_cart_id'); cart = null; renderCart(); }
  }

  async function addToCart(variantId) {
    if (!variantId) return toast('Choose a product option first.');
    try {
      toast('Adding to cart…');
      const c = await api.addCartLine(cart?.id, variantId, 1);
      setCart(c); openCart(); toast('Added to cart.');
    } catch (error) {
      localStorage.removeItem('winkwire_cart_id'); cart = null;
      try { const c = await api.createCart(variantId,1); setCart(c); openCart(); toast('Added to cart.'); }
      catch (e) { toast(`Could not add to cart. ${e.message}`); }
    }
  }

  function openCart() { $('#cartDrawer')?.classList.add('open'); $('#cartDrawer')?.setAttribute('aria-hidden','false'); document.body.classList.add('no-scroll'); }
  function closeCart() { $('#cartDrawer')?.classList.remove('open'); $('#cartDrawer')?.setAttribute('aria-hidden','true'); document.body.classList.remove('no-scroll'); }

  function checkoutUrl() {
    if (!cart?.checkoutUrl) return null;
    try {
      const u = new URL(cart.checkoutUrl);
      const siteHost = String(cfg.siteDomain || '').replace(/^www\./,'').toLowerCase();
      const checkoutHost = u.hostname.replace(/^www\./,'').toLowerCase();
      const shopifyHost = String(cfg.shopifyDomain || '').replace(/^https?:\/\//,'').replace(/\/$/,'');
      if (shopifyHost && checkoutHost === siteHost) u.hostname = shopifyHost;
      return u.toString();
    } catch { return cart.checkoutUrl; }
  }

  document.addEventListener('click', async (e) => {
    const filter = e.target.closest('[data-filter]');
    if (filter) { activeFilter = filter.dataset.filter; $$('.filter-pill').forEach(b=>b.classList.toggle('active', b===filter)); renderProducts(); return; }
    const quick = e.target.closest('[data-quick]');
    if (quick) { e.stopPropagation(); const p = products.find(x=>x.id===quick.dataset.quick); if (!p) return; if (p.demo || (p.options||[]).filter(o=>o.name!=='Title').length) return openProduct(p); return addToCart(chooseVariant(p)?.id); }
    const card = e.target.closest('.product-card');
    if (card) { const p = products.find(x=>x.id===card.dataset.product); if (p) openProduct(p); return; }
    if (e.target.matches('[data-close-product]') || e.target.closest('[data-close-product]')) closeProduct();
    if (e.target.id === 'detailAdd' && selectedVariant) await addToCart(selectedVariant.id);
    const qty = e.target.closest('[data-qty]');
    if (qty && cart) { const v = Number(qty.dataset.value); try { setCart(v <= 0 ? await api.removeCartLine(cart.id,qty.dataset.qty) : await api.updateCartLine(cart.id,qty.dataset.qty,v)); } catch(err){ toast(err.message); } return; }
    const rem = e.target.closest('[data-remove]');
    if (rem && cart) { try { setCart(await api.removeCartLine(cart.id, rem.dataset.remove)); } catch(err){ toast(err.message); } }
  });

  document.addEventListener('change', e => {
    if (e.target.id === 'sortSelect') renderProducts();
    if (e.target.matches('.option-select') && selectedProduct) {
      const selections = {}; $$('.option-select').forEach(s => selections[s.dataset.option] = s.value);
      selectedVariant = chooseVariant(selectedProduct, selections);
      $('#detailPrice').textContent = money(selectedVariant?.price || selectedProduct.priceRange?.minVariantPrice);
      const btn = $('#detailAdd'); btn.disabled = !selectedVariant?.availableForSale; btn.textContent = selectedVariant?.availableForSale ? 'Add to cart' : 'Sold out';
    }
  });

  $('#cartOpen')?.addEventListener('click', openCart);
  $('#cartClose')?.addEventListener('click', closeCart);
  $('#cartBackdrop')?.addEventListener('click', closeCart);
  $('#checkoutBtn')?.addEventListener('click', () => { const url = checkoutUrl(); if (url) window.location.assign(url); else toast('Checkout is not available yet.'); });
  $('#searchToggle')?.addEventListener('click', () => { $('#searchPanel').classList.add('open'); $('#searchPanel').setAttribute('aria-hidden','false'); setTimeout(()=>$('#searchInput').focus(),100); });
  $('#searchClose')?.addEventListener('click', () => { $('#searchPanel').classList.remove('open'); $('#searchPanel').setAttribute('aria-hidden','true'); });
  $('#searchInput')?.addEventListener('input', e => {
    const q = e.target.value.trim().toLowerCase();
    if (!q) { $('#searchResults').innerHTML = ''; return; }
    const results = products.filter(p => [p.title,p.productType,p.vendor,p.description].join(' ').toLowerCase().includes(q)).slice(0,10);
    $('#searchResults').innerHTML = results.length ? results.map(p => `<button class="search-result" data-search-product="${esc(p.id)}"><strong>${esc(p.title)}</strong><span>${money(p.priceRange.minVariantPrice)}</span></button>`).join('') : '<p class="search-empty">No matches yet.</p>';
  });
  $('#searchResults')?.addEventListener('click', e => { const b = e.target.closest('[data-search-product]'); if (!b) return; const p = products.find(x=>x.id===b.dataset.searchProduct); if (p) openProduct(p); $('#searchPanel').classList.remove('open'); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeProduct(); closeCart(); $('#searchPanel')?.classList.remove('open'); } });

  loadProducts(); restoreCart();
})();
