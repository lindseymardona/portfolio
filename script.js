/* Lindsey Mardona — portfolio interactions:
   scroll-reveal, lightbox carousel, light image-drag deterrents */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- scroll reveal (cards/tiles fade+rise as they enter) ---- */
  var reveals = [].slice.call(document.querySelectorAll('.reveal'));
  if (reduce || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('in'); });
  } else {
    reveals.forEach(function (el) {
      var sibs = [].slice.call(el.parentNode.children).filter(function (c) { return c.classList.contains('reveal'); });
      el.style.animationDelay = (Math.min(sibs.indexOf(el), 6) * 0.08) + 's';
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ---- lightbox carousel (tiles with data-lightbox) ---- */
  var lbTiles = [].slice.call(document.querySelectorAll('[data-lightbox]'));
  if (lbTiles.length) {
    var m = document.createElement('div');
    m.className = 'lightbox';
    m.setAttribute('role', 'dialog');
    m.setAttribute('aria-modal', 'true');
    m.innerHTML =
      '<button class="lb-close" aria-label="Close">&times;</button>' +
      '<button class="lb-prev" aria-label="Previous image">&#8249;</button>' +
      '<figure class="lb-fig"><img alt="" /><figcaption></figcaption></figure>' +
      '<button class="lb-next" aria-label="Next image">&#8250;</button>' +
      '<span class="lb-count"></span>';
    document.body.appendChild(m);
    var imgs = [], caps = [], idx = 0;
    var lbImg = m.querySelector('img'), lbCap = m.querySelector('figcaption'), lbCount = m.querySelector('.lb-count');
    function show(i) {
      idx = (i + imgs.length) % imgs.length;
      lbImg.src = imgs[idx];
      lbCap.textContent = caps[idx] || '';
      lbCount.textContent = imgs.length > 1 ? (idx + 1) + ' / ' + imgs.length : '';
    }
    function open(t) {
      try { imgs = JSON.parse(t.getAttribute('data-lightbox')); }
      catch (e) { imgs = [t.getAttribute('data-lightbox')]; }
      try { caps = JSON.parse(t.getAttribute('data-captions') || '[]'); } catch (e) { caps = []; }
      var multi = imgs.length > 1;
      m.querySelector('.lb-prev').style.display = multi ? '' : 'none';
      m.querySelector('.lb-next').style.display = multi ? '' : 'none';
      show(0);
      m.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    function close() { m.classList.remove('open'); document.body.style.overflow = ''; }
    lbTiles.forEach(function (t) {
      t.addEventListener('click', function (e) { e.preventDefault(); open(t); });
    });
    m.querySelector('.lb-close').addEventListener('click', close);
    m.querySelector('.lb-prev').addEventListener('click', function () { show(idx - 1); });
    m.querySelector('.lb-next').addEventListener('click', function () { show(idx + 1); });
    m.addEventListener('click', function (e) { if (e.target === m) close(); });
    document.addEventListener('keydown', function (e) {
      if (!m.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(idx - 1);
      else if (e.key === 'ArrowRight') show(idx + 1);
    });
  }

  /* ---- light deterrents against casual image saving (not foolproof) ---- */
  [].slice.call(document.querySelectorAll('.tile img, .tile video, .tile-img, .marquee img')).forEach(function (el) {
    el.setAttribute('draggable', 'false');
    el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  });

  /* ---- whimsy: a little corgi peeking over the footer ---- */
  var foot = document.querySelector('footer');
  if (foot && !foot.querySelector('.footer-corgi')) {
    var corgi = document.createElement('div');
    corgi.className = 'footer-corgi';
    corgi.setAttribute('aria-hidden', 'true');
    corgi.setAttribute('title', 'hi!');
    corgi.innerHTML =
      '<svg viewBox="0 0 100 98" xmlns="http://www.w3.org/2000/svg">' +
      '<ellipse cx="34" cy="86" rx="9" ry="11" fill="#F7EBD3"/>' +
      '<ellipse cx="66" cy="86" rx="9" ry="11" fill="#F7EBD3"/>' +
      '<path d="M30 92 l0 6 M34 93 l0 6 M38 92 l0 6" stroke="#d9c6a4" stroke-width="1.4" stroke-linecap="round"/>' +
      '<path d="M62 92 l0 6 M66 93 l0 6 M70 92 l0 6" stroke="#d9c6a4" stroke-width="1.4" stroke-linecap="round"/>' +
      '<path d="M18 46 L27 8 L42 48 Z" fill="#E3A46A"/>' +
      '<path d="M82 46 L73 8 L58 48 Z" fill="#E3A46A"/>' +
      '<path d="M24 40 L28 18 L36 43 Z" fill="#E79FA0"/>' +
      '<path d="M76 40 L72 18 L64 43 Z" fill="#E79FA0"/>' +
      '<ellipse cx="50" cy="56" rx="31" ry="27" fill="#E3A46A"/>' +
      '<path d="M50 34 Q42 54 46 78 Q50 83 54 78 Q58 54 50 34 Z" fill="#F7EBD3"/>' +
      '<ellipse cx="50" cy="70" rx="16" ry="12" fill="#F7EBD3"/>' +
      '<circle cx="37" cy="55" r="4.4" fill="#2b2320"/>' +
      '<circle cx="63" cy="55" r="4.4" fill="#2b2320"/>' +
      '<circle cx="38.4" cy="53.6" r="1.3" fill="#fff"/>' +
      '<circle cx="64.4" cy="53.6" r="1.3" fill="#fff"/>' +
      '<ellipse cx="50" cy="67" rx="4.6" ry="3.2" fill="#2b2320"/>' +
      '<path d="M50 70 Q45 75 41 72 M50 70 Q55 75 59 72" stroke="#2b2320" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
      '<circle cx="28" cy="63" r="4" fill="#F4B8B8" opacity=".7"/>' +
      '<circle cx="72" cy="63" r="4" fill="#F4B8B8" opacity=".7"/>' +
      '</svg>';
    foot.appendChild(corgi);
  }
})();
