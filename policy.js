(function(){
  "use strict";
  const site=window.WinkwireSite;
  const map={shipping:{key:"shippingPolicy",label:"Shipping Policy"},refund:{key:"refundPolicy",label:"Returns & Refunds Policy"},privacy:{key:"privacyPolicy",label:"Privacy Policy"},terms:{key:"termsOfService",label:"Terms of Service"}};
  async function init(){
    const type=new URLSearchParams(location.search).get("type")||"refund"; const item=map[type]||map.refund;
    const title=document.getElementById("policyTitle"), crumb=document.getElementById("policyCrumb"), body=document.getElementById("policyBody"), status=document.getElementById("policyStatus");
    title.textContent=item.label; crumb.textContent=item.label; document.title=`${item.label} | Winkwire`;
    const origin=String(site.config.site?.publicOrigin||location.origin).replace(/\/$/,""); site.setCanonical(`${origin}/policy.html?type=${encodeURIComponent(type)}`); site.setMetaDescription(`${item.label} for Winkwire.`);
    const ctx=await site.initGlobal(); body.setAttribute("aria-busy","false"); body.replaceChildren();
    const policy=ctx.shop?.[item.key];
    if(policy&&site.textFromHtml(policy.body).length>=20){ body.append(site.sanitizePolicyHtml(policy.body)); status.textContent="This policy is synchronized from the policy currently published in Shopify."; }
    else { body.append(site.el("div",{class:"error-state"},[site.el("h2",{text:"This policy has not been published yet."}),site.el("p",{text:"Winkwire is not accepting purchases while required store policies are incomplete. Please return later or contact customer support."})])); status.textContent="Policy unavailable."; }
  }
  init();
})();
