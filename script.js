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
  [].slice.call(document.querySelectorAll('.tile img, .tile video, .tile-img')).forEach(function (el) {
    el.setAttribute('draggable', 'false');
    el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  });
})();
