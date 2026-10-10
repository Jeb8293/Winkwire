(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const menu = $('#mobileMenu');
  const toggle = $('#menuToggle');

  if (menu && toggle) {
    toggle.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      menu.setAttribute('aria-hidden', String(!open));
      toggle.setAttribute('aria-expanded', String(open));
    });
    $$('#mobileMenu a').forEach(a => a.addEventListener('click', () => {
      menu.classList.remove('open');
      menu.setAttribute('aria-hidden', 'true');
      toggle.setAttribute('aria-expanded', 'false');
    }));
  }

  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  const form = $('#contactForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const subject = encodeURIComponent(`Wink Wire website inquiry: ${fd.get('topic') || 'General question'}`);
      const body = encodeURIComponent(`Name: ${fd.get('name') || ''}\nEmail: ${fd.get('email') || ''}\nOrder number: ${fd.get('order') || ''}\n\n${fd.get('message') || ''}`);
      window.location.href = `mailto:WinkWire@winkwire.com?subject=${subject}&body=${body}`;
    });
  }

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
    }, { threshold: .1 });
    $$('.reveal').forEach(el => io.observe(el));
  } else {
    $$('.reveal').forEach(el => el.classList.add('visible'));
  }
})();
