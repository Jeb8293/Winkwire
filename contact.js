(function(){
  "use strict";
  const site=window.WinkwireSite;
  async function init(){
    const body=document.getElementById("contactBody"), status=document.getElementById("contactStatus"); const ctx=await site.initGlobal(); body.setAttribute("aria-busy","false"); body.replaceChildren();
    const info=ctx.shop?.contactInformation; const fallback=String(site.config.business?.supportEmail||"").trim();
    if(info&&site.textFromHtml(info.body).length>=10){ body.append(site.sanitizePolicyHtml(info.body)); status.textContent="Customer-support information published by Winkwire in Shopify."; }
    else if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fallback)){ body.append(site.el("p",{},[document.createTextNode("Email customer support at "),site.el("a",{href:`mailto:${fallback}`,text:fallback}),document.createTextNode(". Please include your order number when asking about an existing order.")])); status.textContent="Customer-support contact information."; }
    else { body.append(site.el("div",{class:"error-state"},[site.el("h2",{text:"Customer-support information is not yet published."}),site.el("p",{text:"Purchasing is disabled until Winkwire publishes usable contact information."})])); status.textContent="Contact information unavailable."; }
  }
  init();
})();
