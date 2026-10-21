(function () {
  "use strict";

  const CART_STORAGE_KEY = "winkwire_shopify_cart_id";

  class ShopifyStorefrontError extends Error {
    constructor(message, details = null) {
      super(message);
      this.name = "ShopifyStorefrontError";
      this.details = details;
    }
  }

  function normalizedDomain(value) {
    return String(value || "")
      .trim()
      .replace(/^https?:\/\//i, "")
      .replace(/\/+$/, "");
  }

  function isPlaceholder(value) {
    return !value || /YOUR-|REPLACE|EXAMPLE/i.test(String(value));
  }

  function configurationStatus(config) {
    const domain = normalizedDomain(config?.shopify?.storeDomain);
    const token = String(config?.shopify?.storefrontAccessToken || "").trim();
    const version = String(config?.shopify?.apiVersion || "").trim();

    const missing = [];
    if (!domain || isPlaceholder(domain)) missing.push("Shopify store domain");
    if (!token || isPlaceholder(token)) missing.push("public Storefront API access token");
    if (!version) missing.push("Storefront API version");

    return {
      configured: missing.length === 0,
      missing,
      domain,
      token,
      version
    };
  }

  class ShopifyStorefrontClient {
    constructor(config) {
      this.config = config || {};
      this.status = configurationStatus(config);
      this.endpoint = this.status.configured
        ? `https://${this.status.domain}/api/${this.status.version}/graphql.json`
        : "";
    }

    async request(query, variables = {}) {
      if (!this.status.configured) {
        throw new ShopifyStorefrontError("Shopify is not configured.");
      }

      let response;
      try {
        response = await fetch(this.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Storefront-Access-Token": this.status.token
          },
          body: JSON.stringify({ query, variables })
        });
      } catch (error) {
        throw new ShopifyStorefrontError(
          "Unable to reach Shopify. Check your connection and storefront configuration.",
          error
        );
      }

      let payload;
      try {
        payload = await response.json();
      } catch (error) {
        throw new ShopifyStorefrontError(
          `Shopify returned an unreadable response (${response.status}).`,
          error
        );
      }

      if (!response.ok) {
        throw new ShopifyStorefrontError(`Shopify request failed (${response.status}).`, payload);
      }

      if (payload.errors?.length) {
        const message = payload.errors.map((item) => item.message).filter(Boolean).join("; ");
        throw new ShopifyStorefrontError(message || "Shopify returned a GraphQL error.", payload.errors);
      }

      return payload.data;
    }

    productFields() {
      return `
        id
        handle
        title
        description
        availableForSale
        vendor
        productType
        onlineStoreUrl
        seo { title description }
        featuredImage { url altText width height }
        images(first: 12) { nodes { url altText width height } }
        priceRange { minVariantPrice { amount currencyCode } maxVariantPrice { amount currencyCode } }
        options { name optionValues { name } }
        variants(first: 100) {
          nodes {
            id
            title
            availableForSale
            sku
            barcode
            selectedOptions { name value }
            price { amount currencyCode }
            image { url altText width height }
          }
        }
      `;
    }

    policyFields() {
      return `id title handle body url`;
    }

    async getShop() {
      const query = `
        query WinkwireShop {
          shop {
            name
            description
            primaryDomain { url host }
            shipsToCountries
            contactInformation { ${this.policyFields()} }
            privacyPolicy { ${this.policyFields()} }
            refundPolicy { ${this.policyFields()} }
            shippingPolicy { ${this.policyFields()} }
            termsOfService { ${this.policyFields()} }
          }
        }
      `;
      const data = await this.request(query);
      return data.shop;
    }

    async getProducts(first = 24) {
      const query = `
        query WinkwireProducts($first: Int!) {
          products(first: $first, sortKey: TITLE) {
            nodes { ${this.productFields()} }
          }
        }
      `;
      const data = await this.request(query, { first });
      return data.products.nodes;
    }

    async getProductByHandle(handle) {
      if (!handle) return null;
      const query = `
        query WinkwireProduct($handle: String!) {
          product(handle: $handle) {
            ${this.productFields()}
          }
        }
      `;
      const data = await this.request(query, { handle });
      return data.product || null;
    }

    async getCollection(handle, first = 24) {
      if (!handle) return { title: "", handle: "", products: [] };
      const query = `
        query WinkwireCollection($handle: String!, $first: Int!) {
          collection(handle: $handle) {
            id
            title
            handle
            products(first: $first, sortKey: COLLECTION_DEFAULT) {
              nodes { ${this.productFields()} }
            }
          }
        }
      `;
      const data = await this.request(query, { handle, first });
      if (!data.collection) return null;
      return {
        id: data.collection.id,
        title: data.collection.title,
        handle: data.collection.handle,
        products: data.collection.products.nodes
      };
    }

    cartFields() {
      return `
        id
        checkoutUrl
        totalQuantity
        cost {
          subtotalAmount { amount currencyCode }
          totalAmount { amount currencyCode }
        }
        lines(first: 100) {
          nodes {
            id
            quantity
            cost { totalAmount { amount currencyCode } }
            merchandise {
              ... on ProductVariant {
                id
                title
                availableForSale
                selectedOptions { name value }
                price { amount currencyCode }
                image { url altText }
                product {
                  id
                  handle
                  title
                  featuredImage { url altText }
                }
              }
            }
          }
        }
      `;
    }

    assertMutation(payload, name) {
      if (!payload) throw new ShopifyStorefrontError(`Shopify did not return ${name} data.`);
      const errors = payload.userErrors || [];
      if (errors.length) {
        throw new ShopifyStorefrontError(errors.map((item) => item.message).join("; "), errors);
      }
      if (!payload.cart) {
        throw new ShopifyStorefrontError("Shopify did not return a cart. The saved cart may have expired.");
      }
      return payload.cart;
    }

    async createCart(lines = []) {
      const query = `
        mutation WinkwireCartCreate($input: CartInput!) {
          cartCreate(input: $input) {
            cart { ${this.cartFields()} }
            userErrors { field message code }
            warnings { code message }
          }
        }
      `;
      const data = await this.request(query, { input: { lines } });
      const cart = this.assertMutation(data.cartCreate, "cartCreate");
      this.saveCartId(cart.id);
      return cart;
    }

    async getCart(cartId) {
      if (!cartId) return null;
      const query = `
        query WinkwireCart($id: ID!) {
          cart(id: $id) { ${this.cartFields()} }
        }
      `;
      const data = await this.request(query, { id: cartId });
      return data.cart || null;
    }

    async addLines(cartId, lines) {
      const query = `
        mutation WinkwireCartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
          cartLinesAdd(cartId: $cartId, lines: $lines) {
            cart { ${this.cartFields()} }
            userErrors { field message code }
            warnings { code message }
          }
        }
      `;
      const data = await this.request(query, { cartId, lines });
      return this.assertMutation(data.cartLinesAdd, "cartLinesAdd");
    }

    async updateLines(cartId, lines) {
      const query = `
        mutation WinkwireCartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
          cartLinesUpdate(cartId: $cartId, lines: $lines) {
            cart { ${this.cartFields()} }
            userErrors { field message code }
            warnings { code message }
          }
        }
      `;
      const data = await this.request(query, { cartId, lines });
      return this.assertMutation(data.cartLinesUpdate, "cartLinesUpdate");
    }

    async removeLines(cartId, lineIds) {
      const query = `
        mutation WinkwireCartLinesRemove($cartId: ID!, $lineIds: [ID!]) {
          cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
            cart { ${this.cartFields()} }
            userErrors { field message code }
            warnings { code message }
          }
        }
      `;
      const data = await this.request(query, { cartId, lineIds });
      return this.assertMutation(data.cartLinesRemove, "cartLinesRemove");
    }

    getSavedCartId() {
      try { return localStorage.getItem(CART_STORAGE_KEY); }
      catch (_) { return null; }
    }

    saveCartId(cartId) {
      try {
        if (cartId) localStorage.setItem(CART_STORAGE_KEY, cartId);
      } catch (_) {}
    }

    clearSavedCart() {
      try { localStorage.removeItem(CART_STORAGE_KEY); }
      catch (_) {}
    }
  }

  window.WinkwireShopify = Object.freeze({
    ShopifyStorefrontClient,
    ShopifyStorefrontError,
    configurationStatus
  });
})();
