# Known Catalog Risks From the Prior Shopify Export

This is an operator note, not customer-facing policy copy. The previous Shopify export used while rebuilding this site contained **142 active product handles**. Three active variants contained obvious sentinel pricing and must be corrected in Shopify before a Merchant Center review:

| Product | Variant | SKU | Prior price | Prior cost |
|---|---|---:|---:|---:|
| Anker 641 USB-C to Lightning Cable | 3ft / Coral Pink | A8662051 | $9,999,999.99 | $7,499,999.99 |
| Anker 641 USB-C to Lightning Cable | 6ft / Lavender Grey | A86630Q1 | $9,999,999.99 | $7,499,999.99 |
| Anker Nano Power Bank 22.5W | Ice Lake Blue | A1653031 | $9,999,999.99 | $7,499,999.99 |

The current website includes a defensive rule that treats a variant price of **$1,000,000 or more** as invalid: the optional Merchant feed omits it and the product page will not allow that variant to be added to cart. This is a safety net only. **Correct the variants in Shopify itself**, because any other Shopify sales channel or the Google & YouTube app can still see the source catalog directly.

The prior export also contained supplier-generated HTML and mixed-category merchandise. That is not automatically a Merchant Center violation, particularly because the current business identity is “Winkwire Electronics & More,” but each active listing should still be reviewed for accurate titles, descriptions, images, identifiers, price, availability, and a product category that matches the actual item.

Because this note is based on a prior export rather than a live Admin API audit, re-check the current Shopify catalog before requesting review.
