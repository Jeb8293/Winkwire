(function () {
  "use strict";

  const config = window.WINKWIRE_CONFIG || {};
  const Shopify = window.WinkwireShopify;
  const client = new Shopify.ShopifyStorefrontClient(config);

  const state = {
    shop: null,
    compliance: null,
    cart: null,
    cartBound: false,
    toastTimer: null
  };

  function el(tag, options = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(options).forEach(([key, value]) => {
      if (value == null) return;
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else if (key === "attrs") Object.entries(value).forEach(([k, v]) => node.setAttribute(k, v));
      else if (key === "dataset") Object.entries(value).forEach(([k, v]) => { node.dataset[k] = v; });
      else node[key] = value;
    });
    children.forEach((child) => node.append(child));
    return node;
  }

  function formatMoney(money) {
    if (!money) return "—";
    const amount = Number.parseFloat(money.amount);
    if (!Number.isFinite(amount)) return "—";
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: money.currencyCode || "USD"
      }).format(amount);
    } catch (_) {
      return `${money.currencyCode || "USD"} ${amount.toFixed(2)}`;
    }
  }

  function isLocalStaticPreview() {
    return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
  }

  function productUrl(handle) {
    return isLocalStaticPreview()
      ? `./product.html?handle=${encodeURIComponent(handle)}`
      : `/products/${encodeURIComponent(handle)}`;
  }

  function policyUrl(type) {
    return isLocalStaticPreview()
      ? `./policy.html?type=${encodeURIComponent(type)}`
      : `/policies/${encodeURIComponent(type)}`;
  }

  function validEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
  }

  function safeUrl(url) {
    try {
      const parsed = new URL(url, window.location.href);
      return ["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol) ? parsed.href : "";
    } catch (_) {
      return "";
    }
  }

  function textFromHtml(html) {
    if (!html) return "";
    const parser = new DOMParser();
    const doc = parser.parseFromString(String(html), "text/html");
    return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
  }

  function sanitizePolicyHtml(html) {
    const parser = new DOMParser();
    const source = parser.parseFromString(String(html || ""), "text/html");
    const output = document.createDocumentFragment();
    const allowed = new Set(["P", "BR", "STRONG", "B", "EM", "I", "UL", "OL", "LI", "H1", "H2", "H3", "H4", "A"]);

    function clean(node) {
      if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent || "");
      if (node.nodeType !== Node.ELEMENT_NODE) return document.createDocumentFragment();

      if (!allowed.has(node.tagName)) {
        const fragment = document.createDocumentFragment();
        Array.from(node.childNodes).forEach((child) => fragment.append(clean(child)));
        return fragment;
      }

      const tag = node.tagName.toLowerCase();
      const result = document.createElement(tag);
      if (tag === "a") {
        const rawHref = node.getAttribute("href");
        const href = rawHref ? safeUrl(rawHref) : "";
        if (href) {
          result.setAttribute("href", href);
          result.setAttribute("rel", "noopener noreferrer");
        }
      }
      Array.from(node.childNodes).forEach((child) => result.append(clean(child)));
      return result;
    }

    Array.from(source.body.childNodes).forEach((node) => output.append(clean(node)));
    return output;
  }

  function addNoIndex() {
    let meta = document.querySelector('meta[name="robots"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "robots";
      document.head.append(meta);
    }
    meta.content = "noindex,nofollow";
  }

  function policyHasContent(policy) {
    return Boolean(policy && textFromHtml(policy.body).length >= 20);
  }

  function evaluateCompliance(shop) {
    const supportEmail = String(config?.business?.supportEmail || "").trim();
    const contactText = textFromHtml(shop?.contactInformation?.body);
    const hasContact = contactText.length >= 10 || validEmail(supportEmail);

    const checks = {
      shopifyConfigured: client.status.configured,
      contactInformation: hasContact,
      privacyPolicy: policyHasContent(shop?.privacyPolicy),
      refundPolicy: policyHasContent(shop?.refundPolicy),
      shippingPolicy: policyHasContent(shop?.shippingPolicy),
      termsOfService: policyHasContent(shop?.termsOfService)
    };

    const missing = Object.entries(checks)
      .filter(([, passed]) => !passed)
      .map(([key]) => key);

    return {
      checks,
      missing,
      commerceReady: missing.length === 0
    };
  }

  async function loadShopContext() {
    if (state.shop && state.compliance) return { shop: state.shop, compliance: state.compliance };

    if (!client.status.configured) {
      state.shop = null;
      state.compliance = evaluateCompliance(null);
      addNoIndex();
      exposeLaunchBanner();
      return { shop: null, compliance: state.compliance };
    }

    try {
      state.shop = await client.getShop();
      state.compliance = evaluateCompliance(state.shop);
      if (!state.compliance.commerceReady) {
        addNoIndex();
        exposeLaunchBanner();
      }
      return { shop: state.shop, compliance: state.compliance };
    } catch (error) {
      console.error(error);
      state.shop = null;
      state.compliance = { checks: {}, missing: ["shopDataUnavailable"], commerceReady: false };
      addNoIndex();
      exposeLaunchBanner();
      return { shop: null, compliance: state.compliance };
    }
  }

  function exposeLaunchBanner() {
    const banner = document.getElementById("launchBanner");
    if (!banner) return;
    banner.hidden = false;
    banner.textContent = client.status.configured
      ? "Store setup is incomplete. Purchasing is temporarily disabled until required customer policies and contact information are published."
      : "Preview mode: Shopify is not configured. Demo content is not live inventory and purchasing is disabled.";
  }

  function renderGlobalBusinessLinks(shop) {
    document.querySelectorAll("[data-policy-link]").forEach((link) => {
      const type = link.dataset.policyLink;
      link.setAttribute("href", policyUrl(type));
    });

    document.querySelectorAll("[data-contact-link]").forEach((link) => {
      link.setAttribute("href", "./contact.html");
    });

    const supportEmail = String(config?.business?.supportEmail || "").trim();
    const contactText = textFromHtml(shop?.contactInformation?.body);
    document.querySelectorAll("[data-support-summary]").forEach((node) => {
      if (contactText) node.textContent = contactText;
      else if (validEmail(supportEmail)) node.textContent = `Customer support: ${supportEmail}`;
    });
  }

  function safeImage(image, fallbackAlt, eager = false) {
    if (!image?.url) return null;
    return el("img", {
      src: image.url,
      alt: image.altText || fallbackAlt,
      loading: eager ? "eager" : "lazy",
      decoding: "async"
    });
  }

  function variantLabel(variant) {
    const selected = variant?.selectedOptions || [];
    const useful = selected.filter((option) => option.value && option.value !== "Default Title");
    return useful.length ? useful.map((option) => option.value).join(" / ") : "Standard";
  }

  function showToast(message, isError = false) {
    let toast = document.getElementById("toast");
    if (!toast) {
      toast = el("div", { id: "toast", class: "toast", attrs: { role: "status", "aria-live": "polite" } });
      document.body.append(toast);
    }
    clearTimeout(state.toastTimer);
    toast.textContent = message;
    toast.classList.toggle("error", isError);
    toast.classList.add("show");
    state.toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
  }

  async function ensureCart() {
    const saved = client.getSavedCartId();
    if (!saved) return null;
    try {
      const cart = await client.getCart(saved);
      if (!cart) client.clearSavedCart();
      return cart;
    } catch (error) {
      console.warn("Saved cart could not be restored.", error);
      client.clearSavedCart();
      return null;
    }
  }

  function renderCart() {
    const body = document.getElementById("cartBody");
    const footer = document.getElementById("cartFooter");
    const count = document.getElementById("cartCount");
    if (!body || !footer || !count) return;

    const lines = state.cart?.lines?.nodes || [];
    const total = state.cart?.totalQuantity || lines.reduce((sum, line) => sum + (line.quantity || 0), 0);
    count.textContent = String(total);
    count.setAttribute("aria-label", `${total} item${total === 1 ? "" : "s"} in cart`);
    body.replaceChildren();
    footer.replaceChildren();

    if (!state.compliance?.commerceReady) {
      body.append(el("div", { class: "cart-empty" }, [
        el("h3", { text: "Purchasing is temporarily unavailable." }),
        el("p", { text: "The storefront is not taking orders until Shopify configuration, policies, and customer-support information are complete." })
      ]));
      return;
    }

    if (!lines.length) {
      body.append(el("div", { class: "cart-empty" }, [
        el("h3", { text: "Nothing tangled up in here." }),
        el("p", { text: "Your cart is empty." })
      ]));
      return;
    }

    lines.forEach((line) => {
      const merchandise = line.merchandise || {};
      const image = merchandise.image || merchandise.product?.featuredImage;
      const media = el("div", { class: "cart-line-media" });
      const img = safeImage(image, merchandise.product?.title || "Cart item");
      if (img) media.append(img);
      else media.append(el("div", { class: "product-placeholder" }, [el("span", { text: "W" })]));

      const minus = el("button", { type: "button", text: "−", attrs: { "aria-label": `Decrease quantity of ${merchandise.product?.title || "item"}` } });
      const plus = el("button", { type: "button", text: "+", attrs: { "aria-label": `Increase quantity of ${merchandise.product?.title || "item"}` } });
      minus.addEventListener("click", () => updateCartLine(line.id, line.quantity - 1, minus));
      plus.addEventListener("click", () => updateCartLine(line.id, line.quantity + 1, plus));

      const quantity = el("div", { class: "quantity-control" }, [
        minus,
        el("span", { text: String(line.quantity), attrs: { "aria-live": "polite" } }),
        plus
      ]);
      const remove = el("button", { class: "remove-line", type: "button", text: "Remove" });
      remove.addEventListener("click", () => updateCartLine(line.id, 0, remove));

      const info = el("div", {}, [
        el("a", { class: "cart-line-title", text: merchandise.product?.title || "Product", href: productUrl(merchandise.product?.handle || "") }),
        el("p", { class: "cart-line-variant", text: variantLabel(merchandise) }),
        el("div", { class: "cart-line-row" }, [quantity, el("strong", { text: formatMoney(line.cost?.totalAmount) })]),
        remove
      ]);

      body.append(el("article", { class: "cart-line" }, [media, info]));
    });

    const checkout = el("button", { class: "button button-primary", type: "button", text: "Checkout with Shopify" });
    checkout.addEventListener("click", () => {
      const url = safeUrl(state.cart?.checkoutUrl);
      if (!url || !url.startsWith("https://")) {
        showToast("Shopify did not provide a valid checkout URL.", true);
        return;
      }
      window.location.assign(url);
    });

    footer.append(
      el("div", { class: "cart-subtotal" }, [
        el("span", { text: "Subtotal" }),
        el("strong", { text: formatMoney(state.cart?.cost?.subtotalAmount) })
      ]),
      checkout,
      el("p", { class: "cart-note", text: "Taxes, shipping, discounts, and final totals are calculated by Shopify at checkout." })
    );
  }

  async function updateCartLine(lineId, quantity, trigger) {
    if (!state.cart?.id) return;
    trigger?.setAttribute("disabled", "");
    try {
      state.cart = quantity <= 0
        ? await client.removeLines(state.cart.id, [lineId])
        : await client.updateLines(state.cart.id, [{ id: lineId, quantity }]);
      renderCart();
    } catch (error) {
      console.error(error);
      showToast("Cart update failed. Please try again.", true);
      trigger?.removeAttribute("disabled");
    }
  }

  async function addToCart(variantId, quantity = 1) {
    if (!state.compliance?.commerceReady) {
      showToast("Purchasing is disabled until the storefront setup is complete.", true);
      return false;
    }
    try {
      if (!state.cart?.id) {
        state.cart = await client.createCart([{ merchandiseId: variantId, quantity }]);
      } else {
        try {
          state.cart = await client.addLines(state.cart.id, [{ merchandiseId: variantId, quantity }]);
        } catch (error) {
          console.warn("Existing cart rejected; creating a new cart.", error);
          client.clearSavedCart();
          state.cart = await client.createCart([{ merchandiseId: variantId, quantity }]);
        }
      }
      renderCart();
      openCart();
      showToast("Added to cart.");
      return true;
    } catch (error) {
      console.error(error);
      showToast("Could not add this item to the Shopify cart. Please try again.", true);
      return false;
    }
  }

  function openCart() {
    const drawer = document.getElementById("cartDrawer");
    const backdrop = document.getElementById("drawerBackdrop");
    const button = document.getElementById("cartButton");
    if (!drawer || !backdrop || !button) return;
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    button.setAttribute("aria-expanded", "true");
    backdrop.hidden = false;
    document.body.classList.add("locked");
    document.getElementById("cartClose")?.focus();
  }

  function closeCart() {
    const drawer = document.getElementById("cartDrawer");
    const backdrop = document.getElementById("drawerBackdrop");
    const button = document.getElementById("cartButton");
    if (!drawer || !backdrop || !button) return;
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
    button.setAttribute("aria-expanded", "false");
    backdrop.hidden = true;
    document.body.classList.remove("locked");
  }

  async function initCart() {
    if (state.cartBound) return;
    state.cartBound = true;

    document.getElementById("cartButton")?.addEventListener("click", openCart);
    document.getElementById("cartClose")?.addEventListener("click", closeCart);
    document.getElementById("drawerBackdrop")?.addEventListener("click", closeCart);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeCart();
    });

    state.cart = state.compliance?.commerceReady ? await ensureCart() : null;
    renderCart();
  }

  function setCanonical(url) {
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.append(canonical);
    }
    canonical.href = url;
  }

  function setMetaDescription(description) {
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.append(meta);
    }
    meta.content = String(description || "").slice(0, 300);
  }

  function setJsonLd(id, data) {
    let script = document.getElementById(id);
    if (!script) {
      script = document.createElement("script");
      script.id = id;
      script.type = "application/ld+json";
      document.head.append(script);
    }
    script.textContent = JSON.stringify(data);
  }

  async function initGlobal() {
    if (isLocalStaticPreview()) {
      document.querySelectorAll('a[href^="/policies/"]').forEach((a) => {
        const type = a.getAttribute("href").split("/").filter(Boolean).pop();
        a.setAttribute("href", `./policy.html?type=${encodeURIComponent(type)}`);
      });
      document.querySelectorAll('a[href="/contact"]').forEach((a) => a.setAttribute("href", "./contact.html"));
    }
    const year = document.getElementById("year");
    if (year) year.textContent = String(new Date().getFullYear());

    const navToggle = document.getElementById("navToggle");
    const nav = document.getElementById("siteNav");
    navToggle?.addEventListener("click", () => {
      const open = !nav?.classList.contains("open");
      nav?.classList.toggle("open", open);
      navToggle.setAttribute("aria-expanded", String(open));
      navToggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    });

    const context = await loadShopContext();
    renderGlobalBusinessLinks(context.shop);
    await initCart();
    return context;
  }

  window.WinkwireSite = Object.freeze({
    config,
    client,
    state,
    el,
    formatMoney,
    productUrl,
    policyUrl,
    safeImage,
    safeUrl,
    sanitizePolicyHtml,
    textFromHtml,
    evaluateCompliance,
    loadShopContext,
    renderGlobalBusinessLinks,
    addToCart,
    showToast,
    setCanonical,
    setMetaDescription,
    setJsonLd,
    initGlobal
  });
})();
