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
        if (!e.isIntersecting) return;
        // a [data-reveal-group] cascades all its items together the moment the group
        // enters view, so the bottom one staggers in regardless of scroll position
        var group = e.target.closest('[data-reveal-group]');
        if (group) {
          [].slice.call(group.querySelectorAll('.reveal')).forEach(function (c) { c.classList.add('in'); io.unobserve(c); });
        } else {
          e.target.classList.add('in'); io.unobserve(e.target);
        }
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

  /* ---- bulletproof seamless marquees (rAF-driven; resets at an exact pixel) ---- */
  /* recycling marquee: moves the off-screen tile to the other end — never needs a
     total-width measurement, so it can't blank out regardless of image load timing */
  var marquees = [].slice.call(document.querySelectorAll('.marquee'));
  if (!reduce) {
    marquees.forEach(function (m) {
      var track = m.querySelector('.marquee-track');
      if (!track) return;
      track.style.animation = 'none';
      track.style.willChange = 'transform';
      var reverse = m.classList.contains('rev');
      var x = 0, speed = 0.45, paused = false;
      m.addEventListener('mouseenter', function () { paused = true; });
      m.addEventListener('mouseleave', function () { paused = false; });
      function outerW(el) { var s = getComputedStyle(el); return el.offsetWidth + (parseFloat(s.marginRight) || 0) + (parseFloat(s.marginLeft) || 0); }
      function step() {
        if (!paused) {
          if (!reverse) {
            x -= speed;
            var first = track.firstElementChild;
            if (first) { var fw = outerW(first); if (fw > 0 && -x >= fw) { track.appendChild(first); x += fw; } }
          } else {
            x += speed;
            if (x >= 0) { var last = track.lastElementChild; if (last) { var lw = outerW(last); track.insertBefore(last, track.firstElementChild); x -= lw; } }
          }
          track.style.transform = 'translateX(' + x.toFixed(2) + 'px)';
        }
        requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  /* petals fall the full height of the white section (not a fixed distance) */
  var petalField = document.querySelector('.petal-field');
  if (petalField && !reduce) {
    var setPetalDrop = function () {
      var h = petalField.offsetHeight;
      [].forEach.call(petalField.querySelectorAll('.petal'), function (pt) { pt.style.setProperty('--pf', h + 'px'); });
    };
    setPetalDrop();
    window.addEventListener('resize', setPetalDrop);
    window.addEventListener('load', setPetalDrop);
  }

  /* move each project card's tech chips into its thumbnail (slide up on hover) */
  [].slice.call(document.querySelectorAll('.proj')).forEach(function (card) {
    var thumb = card.querySelector('.proj-thumb');
    var chips = card.querySelector('.proj-body .chip-row');
    if (thumb && chips) { chips.classList.add('thumb-chips'); thumb.appendChild(chips); }
  });

  /* ---- light deterrents against casual image saving (not foolproof) ---- */
  [].slice.call(document.querySelectorAll('.tile img, .tile video, .tile-img, .marquee img')).forEach(function (el) {
    el.setAttribute('draggable', 'false');
    el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  });

  /* ---- load the type system (DM Serif Display / Familjen Grotesk / Karla / Public Sans) ---- */
  if (!document.getElementById('lm-fonts')) {
    var fl = document.createElement('link');
    fl.id = 'lm-fonts';
    fl.rel = 'stylesheet';
    fl.href = 'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Familjen+Grotesk:wght@400;500;600;700&family=Karla:wght@400;500;600;700&family=Public+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap';
    document.head.appendChild(fl);
  }

  /* ---- simplified footer (drop the email + the "|", cleaner up-arrow) ---- */
  var footInner = document.querySelector('footer .foot');
  if (footInner) {
    footInner.innerHTML =
      '<a class="to-top" href="#top"><span class="up" aria-hidden="true">↑</span> return to top</a>' +
      '<div class="quick"><span class="label">quick nav</span>' +
      '<a href="index.html">home</a><a href="resume.html">resume</a>' +
      '<a href="projects.html">projects</a><a href="gallery.html">gallery</a>' +
      '<a href="about.html">about</a></div>' +
      '<div class="foot-email"><a href="mailto:lindseymardona@gmail.com">lindseymardona(at)gmail(dot)com</a></div>';
  }

  /* ---- sticky nav: shrink + blur after the hero, with a read-progress bar ---- */
  var nav = document.querySelector('.nav');
  if (nav && !nav.querySelector('.nav-progress')) {
    var prog = document.createElement('div');
    prog.className = 'nav-progress';
    prog.innerHTML = '<span class="bar"></span>';
    nav.appendChild(prog);
    var progBar = prog.querySelector('.bar');
    var hero = document.querySelector('.hero, .page-hero, .cs-hero');
    var onNavScroll = function () {
      var y = window.scrollY || window.pageYOffset || 0;
      var navH = nav.offsetHeight || 80;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var heroBased = hero ? (hero.offsetTop + hero.offsetHeight - navH - 40) : 200;
      // clamp the trigger so short pages (little scroll room) can still reach it
      var trigger = Math.max(40, Math.min(heroBased, max * 0.35));
      nav.classList.toggle('scrolled', max > 60 && y > trigger);
      progBar.style.width = (max > 0 ? Math.min(100, (y / max) * 100) : 0) + '%';
    };
    window.addEventListener('scroll', onNavScroll, { passive: true });
    window.addEventListener('resize', onNavScroll);
    onNavScroll();
  }

  /* ---- résumé hero: type the now/based-in/seeking values in, in sequence ---- */
  var rzPanel = document.querySelector('.rz-panel');
  if (rzPanel && !reduce) {
    var rzVals = [].slice.call(rzPanel.querySelectorAll('.rz-v'));
    var rzTexts = rzVals.map(function (v) { return v.textContent; });
    rzVals.forEach(function (v) { v.textContent = ''; });
    var typeLine = function (i) {
      if (i >= rzVals.length) return;
      var v = rzVals[i], full = rzTexts[i], n = 0;
      v.classList.add('typing');
      (function tick() {
        v.textContent = full.slice(0, n);
        n++;
        if (n <= full.length) { setTimeout(tick, 24); }
        else { v.classList.remove('typing'); setTimeout(function () { typeLine(i + 1); }, 130); }
      })();
    };
    setTimeout(function () { typeLine(0); }, 780);
  }

  /* ---- case-study progress rail: highlight the section you're reading ---- */
  var rail = document.querySelector('.cs-rail');
  if (rail) {
    var railLinks = [].slice.call(rail.querySelectorAll('a'));
    var railHeads = railLinks.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
    var setActive = function (idx) {
      railLinks.forEach(function (a, i) { a.classList.toggle('active', i === idx); });
    };
    var clickLock = false, clickTimer = null;
    var onRailScroll = function () {
      if (clickLock) return; // don't let scroll override a just-clicked link mid-animation
      var current = 0;
      var line = Math.max(150, window.innerHeight * 0.33);
      for (var i = 0; i < railHeads.length; i++) {
        if (railHeads[i] && railHeads[i].getBoundingClientRect().top <= line) current = i;
      }
      // near the bottom, the last section can't reach the line — force it active
      if ((window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - 4)) {
        current = railHeads.length - 1;
      }
      setActive(current);
    };
    railLinks.forEach(function (a, i) {
      a.addEventListener('click', function () {
        setActive(i);              // highlight the clicked section right away
        clickLock = true;          // hold it while the smooth-scroll settles
        if (clickTimer) clearTimeout(clickTimer);
        clickTimer = setTimeout(function () { clickLock = false; }, 700);
      });
    });
    window.addEventListener('scroll', onRailScroll, { passive: true });
    onRailScroll();
  }

  /* ---- whimsy: a pixel corgi walking along the footer ---- */
  var footEl = document.querySelector('footer');
  if (footEl && !footEl.querySelector('.corgi-walk')) {
    var walk = document.createElement('div');
    walk.className = 'corgi-walk';
    walk.setAttribute('aria-hidden', 'true');
    walk.innerHTML =
      '<div class="corgi-bob"><svg viewBox="0 0 68 46" xmlns="http://www.w3.org/2000/svg" width="56">' +
      '<g class="legs-a">' +
        '<rect x="16" y="32" width="4" height="10" fill="#FFFFFF"/><rect x="27" y="32" width="4" height="10" fill="#FFFFFF"/>' +
        '<rect x="35" y="32" width="4" height="10" fill="#FFFFFF"/><rect x="45" y="32" width="4" height="10" fill="#FFFFFF"/>' +
        '<rect x="16" y="40" width="4" height="2" fill="#3a2f28"/><rect x="27" y="40" width="4" height="2" fill="#3a2f28"/>' +
        '<rect x="35" y="40" width="4" height="2" fill="#3a2f28"/><rect x="45" y="40" width="4" height="2" fill="#3a2f28"/>' +
      '</g>' +
      '<g class="legs-b">' +
        '<rect x="20" y="32" width="4" height="10" fill="#FFFFFF"/><rect x="24" y="32" width="4" height="10" fill="#FFFFFF"/>' +
        '<rect x="39" y="32" width="4" height="10" fill="#FFFFFF"/><rect x="43" y="32" width="4" height="10" fill="#FFFFFF"/>' +
        '<rect x="20" y="40" width="4" height="2" fill="#3a2f28"/><rect x="24" y="40" width="4" height="2" fill="#3a2f28"/>' +
        '<rect x="39" y="40" width="4" height="2" fill="#3a2f28"/><rect x="43" y="40" width="4" height="2" fill="#3a2f28"/>' +
      '</g>' +
      '<rect x="8" y="21" width="9" height="7" rx="3.5" fill="#E0A46A"/>' +       /* little nub tail out the back (horizontal) */
      '<rect x="14" y="19" width="34" height="16" rx="8" fill="#E0A46A"/>' +      /* rounded body */
      '<rect x="40" y="12" width="21" height="20" rx="8" fill="#E0A46A"/>' +      /* head */
      '<rect x="44" y="3" width="7" height="11" rx="2" fill="#E0A46A"/>' +        /* ear */
      '<rect x="45.6" y="5" width="4" height="6" rx="1" fill="#E79FA0"/>' +       /* ear inner */
      '<rect x="49.5" y="12" width="3.6" height="7" rx="1.5" fill="#F7EBD3"/>' +  /* small head stripe */
      '<rect x="46" y="23" width="4.5" height="12" rx="1.5" fill="#FFFFFF"/>' +   /* white chest blaze (lowered) */
      '<rect x="46.4" y="30.5" width="3.6" height="3.4" rx="1" fill="#E79FA0"/>' + /* pink tag */
      '<rect x="57" y="20" width="8" height="7" rx="2" fill="#F7EBD3"/>' +        /* snout */
      '<rect x="61.6" y="21" width="3" height="3" rx="1" fill="#3a2f28"/>' +      /* nose */
      '<rect x="51" y="17" width="3" height="3" rx="1" fill="#3a2f28"/>' +        /* eye */
      '</svg></div>';
    footEl.appendChild(walk);

    /* hop while the cursor is over the corgi. Keyed off the browser's own :hover
       state (the exact thing that shows the hand cursor), checked every frame, with
       a time-based cooldown — so it can't get stuck and there's no rect/hover
       mismatch. Each hop finishes, then it can hop again once it's back down. */
    var bobEl = walk.querySelector('.corgi-bob');
    if (bobEl && !reduce) {
      var lastJump = 0;
      (function hop() {
        var now = Date.now();
        if (now - lastJump > 720 && walk.matches(':hover')) {
          lastJump = now;
          bobEl.classList.add('jump');
          setTimeout(function () { bobEl.classList.remove('jump'); }, 640);
        }
        requestAnimationFrame(hop);
      })();
    }
  }
})();
