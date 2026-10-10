(() => {
  const $ = s => document.querySelector(s);
  const api = window.WinkwireShopify;
  const cfg = window.WINKWIRE_CONFIG || {};
  let product = null;
  let selectedVariant = null;

  const esc = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = m => !m ? '' : new Intl.NumberFormat('en-US',{style:'currency',currency:m.currencyCode || 'USD'}).format(Number(m.amount || 0));

  function toast(message) {
    const t = $('#toast'); if (!t) return;
    t.textContent = message; t.classList.add('show');
    clearTimeout(toast.timer); toast.timer = setTimeout(() => t.classList.remove('show'), 2800);
  }

  function handleFromUrl() {
    const qs = new URLSearchParams(location.search);
    return qs.get('handle') || '';
  }

  function chooseVariant(selections={}) {
    const nodes = product?.variants?.nodes || [];
    return nodes.find(v => v.selectedOptions?.every(o => !selections[o.name] || selections[o.name] === o.value))
      || nodes.find(v => v.availableForSale)
      || nodes[0]
      || null;
  }

  function updateStructuredData() {
    if (!product) return;
    const image = product.featuredImage?.url;
    const variant = selectedVariant || chooseVariant();
    const canonical = `https://${cfg.siteDomain || 'winkwireelectronics.com'}/product.html?handle=${encodeURIComponent(product.handle)}`;

    let link = document.querySelector('link[rel="canonical"]');
    if (link) link.href = canonical;
    document.title = `${product.title} | Wink Wire Electronics`;

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.content = (product.description || `Shop ${product.title} at Wink Wire Electronics.`).slice(0, 155);

    let script = document.getElementById('productStructuredData');
    if (!script) {
      script = document.createElement('script');
      script.id = 'productStructuredData';
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify({
      "@context":"https://schema.org",
      "@type":"Product",
      "name":product.title,
      "description":product.description || undefined,
      "image":image ? [image] : undefined,
      "brand":{"@type":"Brand","name":product.vendor || "Wink Wire Electronics"},
      "sku":variant?.sku || undefined,
      "offers":{
        "@type":"Offer",
        "url":canonical,
        "priceCurrency":variant?.price?.currencyCode || product.priceRange?.minVariantPrice?.currencyCode || "USD",
        "price":variant?.price?.amount || product.priceRange?.minVariantPrice?.amount,
        "availability":variant?.availableForSale ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        "seller":{"@type":"Organization","name":"Wink Wire Electronics"}
      }
    });
  }

  function render() {
    const box = $('#productPage');
    if (!box || !product) return;
    selectedVariant = chooseVariant();
    const img = product.featuredImage?.url
      ? `<img src="${esc(product.featuredImage.url)}" alt="${esc(product.featuredImage.altText || product.title)}">`
      : `<div class="product-placeholder"><span>${esc(product.productType || 'WINK WIRE')}</span></div>`;
    const options = (product.options || []).filter(o => o.name !== 'Title').map(o =>
      `<div class="option-group"><label>${esc(o.name)}</label><select class="option-select" data-option="${esc(o.name)}">${o.values.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('')}</select></div>`
    ).join('');

    box.innerHTML = `<div class="product-page-image">${img}</div>
      <div class="product-page-info">
        <span class="kicker">${esc(product.productType || product.vendor || 'WINK WIRE ELECTRONICS')}</span>
        <h1>${esc(product.title)}</h1>
        <div class="availability-line"><span class="${product.availableForSale ? 'in-stock' : 'out-stock'}">${product.availableForSale ? 'In stock' : 'Currently unavailable'}</span></div>
        <div class="detail-price" id="detailPrice">${money(selectedVariant?.price || product.priceRange?.minVariantPrice)}</div>
        <div class="detail-desc">${product.descriptionHtml || `<p>${esc(product.description || '')}</p>`}</div>
        ${options}
        <button class="btn primary product-buy" id="productBuy" ${selectedVariant?.availableForSale ? '' : 'disabled'}>${selectedVariant?.availableForSale ? 'Add to cart & checkout' : 'Sold out'}</button>
        <p class="purchase-note">Checkout, taxes, discounts, and available shipping methods are handled securely through Shopify. Review our <a href="shipping.html">shipping</a> and <a href="returns.html">return</a> policies before purchase.</p>
      </div>`;
    updateStructuredData();
  }

  async function load() {
    const handle = handleFromUrl();
    const notice = $('#productPageNotice');
    if (!handle) {
      notice.hidden = false;
      notice.innerHTML = '<strong>Product not specified.</strong> <a href="shop.html">Return to the shop</a>.';
      $('#productPage').innerHTML = '';
      return;
    }
    try {
      if (!api) throw new Error('Store connection is unavailable.');
      product = await api.getProductByHandle(handle);
      if (!product) throw new Error('This product could not be found.');
      render();
    } catch (err) {
      console.warn(err);
      notice.hidden = false;
      notice.innerHTML = `<strong>We could not load this product.</strong> Please <a href="shop.html">return to the shop</a> or <a href="contact.html">contact Wink Wire Electronics</a>.`;
      $('#productPage').innerHTML = '';
    }
  }

  document.addEventListener('change', e => {
    if (e.target.matches('.option-select') && product) {
      const selections = {};
      document.querySelectorAll('.option-select').forEach(s => selections[s.dataset.option] = s.value);
      selectedVariant = chooseVariant(selections);
      $('#detailPrice').textContent = money(selectedVariant?.price || product.priceRange?.minVariantPrice);
      const btn = $('#productBuy');
      if (btn) {
        btn.disabled = !selectedVariant?.availableForSale;
        btn.textContent = selectedVariant?.availableForSale ? 'Add to cart & checkout' : 'Sold out';
      }
      updateStructuredData();
    }
  });

  document.addEventListener('click', async e => {
    if (e.target.id !== 'productBuy' || !selectedVariant?.availableForSale) return;
    try {
      toast('Preparing secure checkout…');
      const existing = localStorage.getItem('winkwire_cart_id');
      let cart;
      if (existing) {
        try { cart = await api.addCartLine(existing, selectedVariant.id, 1); }
        catch { localStorage.removeItem('winkwire_cart_id'); }
      }
      if (!cart) cart = await api.createCart(selectedVariant.id, 1);
      if (cart?.id) localStorage.setItem('winkwire_cart_id', cart.id);
      const url = api.safeCheckoutUrl(cart);
      if (!url) throw new Error('Checkout URL was not returned.');
      location.assign(url);
    } catch (err) {
      toast(`Checkout could not be started. ${err.message}`);
    }
  });

  load();
})();
