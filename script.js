/* Lindsey Mardona — portfolio interactions:
   scroll-reveal, lightbox carousel, light image-drag deterrents */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- home hero gate: index.html's <head> adds .hero-wait, which hides the hero and pauses
     its CSS animations. Lift it once the hero's fonts and photo are ready (or after 1.4s at most),
     so the entrance plays in one go instead of jumping when a font swaps in or the photo pops in.
     The header-entrance jobs for hero elements wait on this too ---- */
  var heroGate = new Promise(function (resolve) {
    var root = document.documentElement;
    if (!root.classList.contains('hero-wait')) { resolve(); return; }
    var done = false;
    var finish = function () { if (done) return; done = true; root.classList.remove('hero-wait'); resolve(); };
    var waits = [];
    if (document.fonts && document.fonts.load) {
      ['1em Borel', '400 1em "DM Serif Display"', '400 1em Karla', '500 1em Karla'].forEach(function (f) {
        waits.push(document.fonts.load(f).catch(function () {}));
      });
    }
    var heroImg = document.querySelector('.hero .portrait img');
    if (heroImg && heroImg.decode) waits.push(heroImg.decode().catch(function () {}));
    Promise.all(waits).then(function () { requestAnimationFrame(finish); });
    setTimeout(finish, 1400);
  });

  /* ---- music-note glyphs (Kaya's floating note, the case-study staff rail). One 16×26 box;
     the note head is centred at (5.5, 20), so a staff line drawn through y=20 runs through it.
     Colour comes from currentColor; a half note is always hollow ---- */
  function noteSVG(kind) {
    var head = kind === 'half'
      ? '<ellipse cx="5.5" cy="20" rx="3.9" ry="2.7" transform="rotate(-22 5.5 20)" fill="none" stroke="currentColor" stroke-width="1.7"/>'
      : '<ellipse cx="5.5" cy="20" rx="4.7" ry="3.4" transform="rotate(-22 5.5 20)"/>';
    var stem = '<rect x="8.7" y="3" width="1.5" height="16.6"/>';
    var flag1 = '<path d="M10.2 3 C10.6 7.2 15.4 8.4 13.6 14 C13.4 10.6 12 9.6 10.2 9 Z"/>';
    var flag2 = '<path d="M10.2 7.6 C10.6 11.6 15.2 12.8 13.6 18 C13.4 14.8 12 13.9 10.2 13.4 Z"/>';
    var body = head + stem + (kind === 'eighth' ? flag1 : '') + (kind === 'sixteenth' ? flag1 + flag2 : '');
    return '<svg viewBox="0 0 16 26" fill="currentColor" aria-hidden="true" focusable="false">' + body + '</svg>';
  }

  /* ---- scroll reveal (cards/tiles fade+rise as they enter) ---- */
  var reveals = [].slice.call(document.querySelectorAll('.reveal'));
  if (reduce || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('in'); });
  } else {
    reveals.forEach(function (el) {
      var parent = el.parentNode;
      var sibs = [].slice.call(parent.children).filter(function (c) { return c.classList.contains('reveal'); });
      var idx = sibs.indexOf(el);
      // stagger only ACROSS a row (by grid column), so each row reveals fresh as it
      // scrolls into view — a lower row never inherits a big accumulated delay
      var cols = 1;
      try {
        var gtc = getComputedStyle(parent).gridTemplateColumns;
        if (gtc && gtc !== 'none') cols = gtc.split(' ').filter(Boolean).length;
      } catch (e) {}
      // home cards cascade sequentially and gently (more spaced out); the projects grid
      // and other grids keep the original per-row stagger. the mini-grid (second row on
      // home) also waits for the featured card above it to transition in first
      var mini = parent.classList.contains('mini-grid');
      var seq = cols <= 1 || mini || parent.classList.contains('masonry');
      var step = seq ? Math.min(idx, 6) : (idx % cols);
      var per = mini ? 0.15 : (seq ? 0.11 : 0.07);
      var base = mini ? 0.3 : 0;
      el.style.animationDelay = (base + step * per) + 's';
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
    // anything already on-screen at load reveals right away (the -8% margin can otherwise
    // leave above-the-fold cards waiting for a scroll nudge)
    requestAnimationFrame(function () {
      reveals.forEach(function (el) {
        if (el.classList.contains('in')) return;
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.96 && r.bottom > 0) {
          var group = el.closest('[data-reveal-group]');
          if (group) { [].slice.call(group.querySelectorAll('.reveal')).forEach(function (c) { c.classList.add('in'); io.unobserve(c); }); }
          else { el.classList.add('in'); io.unobserve(el); }
        }
      });
    });
  }

  /* ---- version strip: Page 1 / Page 2 switch. Swaps every thumbnail (src + alt,
     from data-src2 / data-alt2) and rewrites each button's data-lightbox and
     data-captions, so the lightbox opens on that page's versions. Runs before the
     lightbox setup, which reads those attributes at click time ---- */
  [].slice.call(document.querySelectorAll('.cs-strip')).forEach(function (strip) {
    var tog = strip.querySelector('.cs-pagetoggle');
    if (!tog) return;
    var items = [].slice.call(strip.querySelectorAll('.cs-strip-item')).map(function (li) {
      var img = li.querySelector('img'), lbl = li.querySelector('.cs-label');
      return { btn: li.querySelector('[data-lightbox]'), img: img, label: lbl ? lbl.textContent.trim() : '',
               src: [img.getAttribute('src'), img.getAttribute('data-src2')],
               alt: [img.getAttribute('alt'), img.getAttribute('data-alt2')] };
    });
    var num = strip.querySelector('.cs-pagenum');
    function setPage(p) {   // p: 0 = page 1, 1 = page 2
      var srcs = items.map(function (it) { return it.src[p]; });
      var caps = items.map(function (it) { return it.label + ' · page ' + (p + 1); });
      items.forEach(function (it) {
        it.img.src = it.src[p]; it.img.alt = it.alt[p];
        it.btn.setAttribute('data-lightbox', JSON.stringify(srcs));
        it.btn.setAttribute('data-captions', JSON.stringify(caps));
      });
      [].slice.call(tog.querySelectorAll('button')).forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-page') === String(p + 1)));
      });
      if (num) num.textContent = p + 1;
    }
    tog.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-page]');
      if (b) setPage(parseInt(b.getAttribute('data-page'), 10) - 1);
    });
    // warm the page-2 images (~750 KB) only once someone reaches for the switch
    var warm = function () {
      tog.removeEventListener('pointerenter', warm); tog.removeEventListener('focusin', warm);
      items.forEach(function (it) { if (it.src[1]) { var pre = new Image(); pre.src = it.src[1]; } });
    };
    tog.addEventListener('pointerenter', warm); tog.addEventListener('focusin', warm);
  });

  /* ---- lightbox carousel (anything with data-lightbox: gallery tiles, case-study
     figure buttons). Optional: data-captions (JSON), data-alts (JSON), data-start.
     Focus moves into the dialog, Tab stays inside it, and focus returns to the
     trigger on close. Alt text comes from data-alts, else the matching <img> on the
     page; a single image's caption falls back to its figure's figcaption ---- */
  var lbTiles = [].slice.call(document.querySelectorAll('[data-lightbox]'));
  if (lbTiles.length) {
    var m = document.createElement('div');
    m.className = 'lightbox';
    m.setAttribute('role', 'dialog');
    m.setAttribute('aria-modal', 'true');
    m.setAttribute('aria-label', 'Image viewer');
    m.innerHTML =
      '<button class="lb-close" type="button" aria-label="Close">&times;</button>' +
      '<button class="lb-prev" type="button" aria-label="Previous image">&#8249;</button>' +
      '<figure class="lb-fig"><img alt="" /><figcaption></figcaption></figure>' +
      '<button class="lb-next" type="button" aria-label="Next image">&#8250;</button>' +
      '<span class="lb-count"></span>';
    document.body.appendChild(m);
    var imgs = [], caps = [], alts = [], idx = 0, lbReturn = null;
    var lbImg = m.querySelector('img'), lbCap = m.querySelector('figcaption'), lbCount = m.querySelector('.lb-count');
    var lbClose = m.querySelector('.lb-close');
    var pageAlt = function (src) {
      var all = document.querySelectorAll('img');
      for (var k = 0; k < all.length; k++) if (all[k].getAttribute('src') === src && all[k].alt) return all[k].alt;
      return '';
    };
    function show(i) {
      idx = (i + imgs.length) % imgs.length;
      lbImg.src = imgs[idx];
      lbImg.alt = alts[idx] || pageAlt(imgs[idx]) || caps[idx] || '';
      lbCap.textContent = caps[idx] || '';
      lbCount.textContent = imgs.length > 1 ? (idx + 1) + ' / ' + imgs.length : '';
    }
    function open(t) {
      try { imgs = JSON.parse(t.getAttribute('data-lightbox')); }
      catch (e) { imgs = [t.getAttribute('data-lightbox')]; }
      try { caps = JSON.parse(t.getAttribute('data-captions') || '[]'); } catch (e) { caps = []; }
      try { alts = JSON.parse(t.getAttribute('data-alts') || '[]'); } catch (e) { alts = []; }
      if (!caps.length && imgs.length === 1) {
        var fc = t.closest('figure') && t.closest('figure').querySelector('figcaption');
        if (fc) caps = [fc.textContent.trim()];
      }
      var multi = imgs.length > 1;
      m.querySelector('.lb-prev').style.display = multi ? '' : 'none';
      m.querySelector('.lb-next').style.display = multi ? '' : 'none';
      show(parseInt(t.getAttribute('data-start'), 10) || 0);
      lbReturn = t;
      m.classList.add('open');
      // lock scroll on <html>, not <body>: html has overflow-x:clip, so a body lock makes
      // body its own scroll box and the sticky nav / back pill scroll away behind the overlay
      document.documentElement.style.overflow = 'hidden';
      lbClose.focus();
    }
    function close() {
      m.classList.remove('open');
      document.documentElement.style.overflow = '';
      if (lbReturn) { try { lbReturn.focus({ preventScroll: true }); } catch (e) { lbReturn.focus(); } }
      lbReturn = null;
    }
    lbTiles.forEach(function (t) {
      t.addEventListener('click', function (e) { e.preventDefault(); open(t); });
    });
    lbClose.addEventListener('click', close);
    m.querySelector('.lb-prev').addEventListener('click', function () { show(idx - 1); });
    m.querySelector('.lb-next').addEventListener('click', function () { show(idx + 1); });
    m.addEventListener('click', function (e) { if (e.target === m) close(); });
    document.addEventListener('keydown', function (e) {
      if (!m.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(idx - 1);
      else if (e.key === 'ArrowRight') show(idx + 1);
      else if (e.key === 'Tab') {
        // keep focus on the dialog's visible buttons
        var btns = [].slice.call(m.querySelectorAll('button')).filter(function (b) { return b.style.display !== 'none'; });
        var at = btns.indexOf(document.activeElement);
        e.preventDefault();
        if (at < 0) btns[e.shiftKey ? btns.length - 1 : 0].focus();
        else btns[(at + (e.shiftKey ? -1 : 1) + btns.length) % btns.length].focus();
      }
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
      // `paused` is hover — it stops the strip
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

  /* ---- nav pseudo-logo (top-left wordmark that takes you home) ---- */
  var navInner = document.querySelector('.nav .nav-inner');
  if (navInner && !navInner.querySelector('.nav-logo')) {
    var logo = document.createElement('a');
    logo.className = 'nav-logo';
    logo.href = 'index.html';
    logo.setAttribute('aria-label', 'Lindsey Mardona — home');
    logo.textContent = 'lvm';
    navInner.insertBefore(logo, navInner.firstChild);
  }

  /* project-card meta now lives in a fixed markup row (type + year pill) — nothing to split */

  /* ---- gallery filter chips (all / client work / motion & for fun) ---- */
  var galFilters = document.querySelector('.gal-filterbar');
  if (galFilters) {
    var galChips = [].slice.call(galFilters.querySelectorAll('.gal-chip'));
    var galTiles = [].slice.call(document.querySelectorAll('.masonry .tile'));
    var applyFilter = function (f) {
      galChips.forEach(function (c) { c.setAttribute('aria-pressed', String(c.getAttribute('data-filter') === f)); });
      // clear the reveal, hide non-matches, and stagger the matches by their VISIBLE order
      // (so every filter click re-plays the same cascade — matching the first page load)
      var vis = 0;
      galTiles.forEach(function (t) {
        var cat = t.getAttribute('data-cat');
        var show = (f === 'all' || cat === f);
        t.classList.remove('in');
        t.hidden = !show;
        if (show) { t.style.animationDelay = (Math.min(vis, 6) * 0.11) + 's'; vis++; }
      });
      void galFilters.offsetWidth;                    // one reflow so the animation restarts
      galTiles.forEach(function (t) { if (!t.hidden) t.classList.add('in'); });
    };
    galChips.forEach(function (c) {
      c.addEventListener('click', function () { applyFilter(c.getAttribute('data-filter')); });
    });
  }

  /* ---- about galleries (life gallery + miss kaya): the scroll freezes ONLY while the
     cursor is on a photo, that photo grows in place, and clicking it opens a
     camera-lens lightbox (arrow keys + esc, click-outside/✕ to close) ---- */
  var galRows = [].slice.call(document.querySelectorAll('.gal-wrap .marquee-track'));
  if (galRows.length) {
    // build the lightbox shell once
    var lb = document.createElement('div');
    lb.className = 'cam'; lb.hidden = true;
    lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'photo viewer');
    lb.innerHTML =
      '<div class="cam-stage">' +
        '<button class="cam-nav cam-prev" type="button" aria-label="previous photo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button>' +
        '<figure class="cam-lens">' +
          '<div class="cam-top"><span class="cam-rec"><span class="cam-dot"></span>REC</span><span class="cam-exif">f/1.8 &middot; 1/250 &middot; ISO 400</span></div>' +
          '<div class="cam-photo"><img class="cam-img" alt="">' +
            '<div class="cam-reticle" aria-hidden="true"><span class="cam-c cam-tl"></span><span class="cam-c cam-tr"></span><span class="cam-c cam-bl"></span><span class="cam-c cam-br"></span><span class="cam-focus"></span><span class="cam-cross-v"></span><span class="cam-cross-h"></span></div>' +
          '</div>' +
          '<figcaption class="cam-bottom"><span class="cam-cap"></span><span class="cam-count"></span></figcaption>' +
          '<button class="cam-close" type="button" aria-label="close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
        '</figure>' +
        '<button class="cam-nav cam-next" type="button" aria-label="next photo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg></button>' +
      '</div>';
    document.body.appendChild(lb);
    var lbImg = lb.querySelector('.cam-img'), lbCap = lb.querySelector('.cam-cap'),
        lbCount = lb.querySelector('.cam-count'), lbPhoto = lb.querySelector('.cam-photo');
    var photos = [], idx = 0, lastFocus = null;
    var pad2 = function (n) { return (n < 10 ? '0' : '') + n; };
    var render = function () {
      var ph = photos[idx];
      lbImg.src = ph.src; lbImg.alt = ph.alt;
      lbCap.textContent = ph.alt;
      lbCount.textContent = pad2(idx + 1) + ' / ' + pad2(photos.length);
      lbPhoto.classList.remove('cam-dev'); void lbPhoto.offsetWidth; lbPhoto.classList.add('cam-dev');   // re-fire the "develop" flash
    };
    var openLb = function (list, i) {
      photos = list; idx = i; lastFocus = document.activeElement;
      render(); lb.hidden = false; document.documentElement.style.overflow = 'hidden';   // html, not body: see the lightbox note
      requestAnimationFrame(function () { lb.classList.add('cam-in'); });
      lb.querySelector('.cam-close').focus();
    };
    var closeLb = function () {
      lb.classList.remove('cam-in'); document.documentElement.style.overflow = '';
      setTimeout(function () { lb.hidden = true; }, 220);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    };
    var step = function (d) { if (photos.length) { idx = (idx + d + photos.length) % photos.length; render(); } };
    lb.addEventListener('click', closeLb);                                                              // backdrop / outside
    lb.querySelector('.cam-lens').addEventListener('click', function (e) { e.stopPropagation(); });
    lb.querySelector('.cam-prev').addEventListener('click', function (e) { e.stopPropagation(); step(-1); });
    lb.querySelector('.cam-next').addEventListener('click', function (e) { e.stopPropagation(); step(1); });
    lb.querySelector('.cam-close').addEventListener('click', function (e) { e.stopPropagation(); closeLb(); });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') closeLb();
      else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    });

    // wire each gallery: pause-on-photo, and click to open
    galRows.forEach(function (row) {
      var imgs = [].slice.call(row.querySelectorAll('img'));
      var list = [], seen = {};
      imgs.forEach(function (im) {
        if (im.getAttribute('aria-hidden') === 'true') return;
        var s = im.currentSrc || im.src;
        if (seen[s]) return; seen[s] = true;
        list.push({ src: s, alt: im.alt || 'photo' });
      });
      var indexOfSrc = function (src) { for (var i = 0; i < list.length; i++) if (list[i].src === src) return i; return 0; };
      imgs.forEach(function (img) {
        if (!reduce) {
          img.addEventListener('mouseenter', function () { row.style.animationPlayState = 'paused'; });
          img.addEventListener('mouseleave', function () { row.style.animationPlayState = ''; });
        }
        img.style.cursor = 'zoom-in';
        img.addEventListener('click', function () { openLb(list, indexOfSrc(img.currentSrc || img.src)); });
      });
    });
  }

  /* ---- singer "session" widget: waveforms, mute/solo, play/pause ---- */
  var daw = document.querySelector('.daw');
  if (daw) {
    // build a stable pseudo-waveform that fills each clip end to end (bar count
    // scales to the measured width so the wave runs the whole length of the track)
    var buildWave = function (w, wi) {
      var width = w.getBoundingClientRect().width;
      var n = width > 0 ? Math.max(24, Math.floor(width / 6)) : 90; // ~6px pitch
      var seed = (wi + 3) * 9173, html = '';
      for (var i = 0; i < n; i++) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        var h = 20 + (seed % 100) * 0.74; // ~20%–94%
        html += '<i style="height:' + h.toFixed(0) + '%"></i>';
      }
      w.innerHTML = html;
    };
    var waves = [].slice.call(daw.querySelectorAll('.wave[data-wave]'));
    waves.forEach(buildWave);
    // rebuild once on resize so the wave keeps filling the clip
    var rzT;
    window.addEventListener('resize', function () {
      clearTimeout(rzT);
      rzT = setTimeout(function () { waves.forEach(buildWave); collabRefreshers.forEach(function (f) { f(); }); }, 200);
    });

    // mute (M) grays that track; solo (S) grays the others
    var timeline = daw.querySelector('.daw-timeline');
    var dawMobileAddTrack = null, dawMobileSetPlaying = null;  // set by the mobile module below
    var allTracks = function () { return [].slice.call(timeline.querySelectorAll('.daw-track[data-track]')); };
    var syncSolo = function () {
      timeline.classList.toggle('has-solo', allTracks().some(function (t) { return t.classList.contains('soloed'); }));
    };
    var wireMS = function (t) {
      var mBtn = t.querySelector('.ms.m'), sBtn = t.querySelector('.ms.s');
      if (mBtn) mBtn.addEventListener('click', function () {
        mBtn.setAttribute('aria-pressed', String(t.classList.toggle('muted')));
      });
      if (sBtn) sBtn.addEventListener('click', function () {
        sBtn.setAttribute('aria-pressed', String(t.classList.toggle('soloed')));
        syncSolo();
      });
    };

    // drag a track by its name column to reorder — it lifts out and follows the
    // pointer, and a highlight zone marks where it will land (no rotation)
    var dragT = null, grabOff = 0, ph = null, cbX = 0, cbY = 0;
    var otherTracks = function () {
      return [].slice.call(timeline.querySelectorAll('.daw-track[data-track]')).filter(function (x) { return x !== dragT; });
    };
    var onDragMove = function (e) {
      if (!dragT) return;
      dragT.style.top = (e.clientY - grabOff - cbY) + 'px';
      var rows = otherTracks(), placed = false;
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i].getBoundingClientRect();
        if (e.clientY < r.top + r.height / 2) { timeline.insertBefore(ph, rows[i]); placed = true; break; }
      }
      if (!placed) timeline.insertBefore(ph, timeline.querySelector('.daw-track.newtrack'));
    };
    var onDragEnd = function () {
      if (!dragT) return;
      var t = dragT; dragT = null;
      timeline.insertBefore(t, ph);
      if (ph && ph.parentNode) ph.parentNode.removeChild(ph);
      ph = null;
      t.classList.remove('dragging');
      t.style.position = t.style.top = t.style.left = t.style.width = t.style.zIndex = '';
      document.removeEventListener('pointermove', onDragMove);
      document.removeEventListener('pointerup', onDragEnd);
      document.removeEventListener('pointercancel', onDragEnd);
    };
    var wireDrag = function (t) {
      var head = t.querySelector('.daw-thead');
      if (!head) return;
      head.addEventListener('pointerdown', function (e) {
        if (e.target.closest('.ms') || e.target.closest('.collab-trackx')) return; // let the buttons do their thing
        if (e.button != null && e.button !== 0) return; // primary button only
        e.preventDefault();
        var r = t.getBoundingClientRect();
        grabOff = e.clientY - r.top;
        ph = document.createElement('div');
        ph.className = 'daw-dropzone';
        ph.style.height = r.height + 'px';
        t.parentNode.insertBefore(ph, t);           // holds the slot + shows the landing zone
        dragT = t;
        t.classList.add('dragging');
        t.style.width = r.width + 'px';
        t.style.left = r.left + 'px';
        t.style.top = r.top + 'px';
        t.style.position = 'fixed';
        t.style.zIndex = '30';
        // a transformed ancestor turns "fixed" into relative-to-that-ancestor, so
        // measure where it actually landed and cancel the offset
        var land = t.getBoundingClientRect(), sw = land.width - r.width, sh = land.height - r.height;
        cbX = land.left + sw / 2 - r.left;
        cbY = land.top + sh / 2 - r.top;
        t.style.left = (r.left - cbX) + 'px';
        t.style.top = (r.top - cbY) + 'px';
        document.addEventListener('pointermove', onDragMove);
        document.addEventListener('pointerup', onDragEnd);
        document.addEventListener('pointercancel', onDragEnd);
      });
    };
    allTracks().forEach(function (t) { wireMS(t); wireDrag(t); });

    // ---- the "new collab" gimmick: "+ new track" spawns an empty track you can
    // draw clips onto (click + drag to lay one down, drag the edges to resize) ----
    var COLLAB_LINK = 'mailto:lindseymardona@gmail.com';
    var NAMES = ['heyyy ;)', 'could be us', "but you playin'", 'so...'];
    var newRow = timeline.querySelector('.daw-track.newtrack');
    var collabSeed = 200;
    var collabRefreshers = [];

    var wireCollabLane = function (lane) {
      var blobs = [];                       // { el, start, span }  (blocks 0..7)
      var blockAt = function (clientX) {
        var r = lane.getBoundingClientRect();
        return Math.max(0, Math.min(7, Math.floor((clientX - r.left) / (r.width / 8))));
      };
      var occupied = function (excl) {      // map of occupied block indices
        var occ = {};
        blobs.forEach(function (bl) {
          if (bl === excl) return;
          for (var i = bl.start; i < bl.start + bl.span; i++) occ[i] = true;
        });
        return occ;
      };
      var relabel = function () {           // labels follow left-to-right order; ↗ marks the link
        blobs.slice().sort(function (a, b) { return a.start - b.start; }).forEach(function (bl, i) {
          bl.el.querySelector('.clip-name').textContent = NAMES[Math.min(i, NAMES.length - 1)] + ' ↗';
        });
      };
      var place = function (bl) {
        bl.el.style.left = (bl.start / 8 * 100) + '%';
        bl.el.style.width = (bl.span / 8 * 100) + '%';
        bl.el.classList.toggle('has-text', bl.span >= 2);   // too short → waveform only
      };
      var refreshBlob = function (bl) { place(bl); buildWave(bl.el.querySelector('.wave'), collabSeed++); };
      collabRefreshers.push(function () { if (document.contains(lane)) blobs.forEach(refreshBlob); });

      var removeBlob = function (bl) {
        if (bl.el.parentNode) bl.el.parentNode.removeChild(bl.el);
        var idx = blobs.indexOf(bl); if (idx >= 0) blobs.splice(idx, 1);
        if (!blobs.length) lane.classList.remove('has-blob');
        relabel();
      };

      var makeBlob = function (start, span) {
        var el = document.createElement('a');
        el.className = 'collab-blob';
        el.href = COLLAB_LINK; el.rel = 'noopener'; el.draggable = false;
        el.innerHTML =
          '<span class="collab-resize l" aria-hidden="true"></span>' +
          '<span class="clip-info"><span class="clip-name">collaboration ↗</span><span class="clip-sub">collaboration</span></span>' +
          '<span class="wave" data-wave aria-hidden="true"></span>' +
          '<span class="clip-dest" aria-hidden="true"><i class="fa-solid fa-envelope"></i></span><span class="sr-only"> (email)</span>' +
          '<span class="collab-resize r" aria-hidden="true"></span>' +
          '<span class="collab-x" role="button" tabindex="0" aria-label="Remove this clip">×</span>';
        lane.appendChild(el);
        var bl = { el: el, start: start, span: span };
        blobs.push(bl);
        lane.classList.add('has-blob');

        var suppressClick = false;
        el.addEventListener('click', function (e) { if (suppressClick) { e.preventDefault(); e.stopPropagation(); } });

        // remove-clip ×
        var xb = el.querySelector('.collab-x');
        xb.addEventListener('pointerdown', function (e) { e.stopPropagation(); e.preventDefault(); });
        xb.addEventListener('click', function (e) { e.stopPropagation(); e.preventDefault(); removeBlob(bl); });
        xb.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); removeBlob(bl); } });

        // drag the edges to resize
        [].slice.call(el.querySelectorAll('.collab-resize')).forEach(function (h) {
          var isLeft = h.classList.contains('l');
          h.addEventListener('pointerdown', function (e) {
            if (e.button != null && e.button !== 0) return;
            e.preventDefault(); e.stopPropagation();
            var occ = occupied(bl), origStart = bl.start, origEnd = bl.start + bl.span, moved = false;
            var move = function (ev) {
              moved = true; suppressClick = true;
              var edge = blockAt(ev.clientX);
              if (isLeft) {
                var lb = 0, i; for (i = origStart - 1; i >= 0; i--) { if (occ[i]) { lb = i + 1; break; } }
                var a = Math.max(lb, Math.min(edge, origEnd - 1));
                bl.start = a; bl.span = origEnd - a;
              } else {
                var rb = 8, j; for (j = origEnd; j < 8; j++) { if (occ[j]) { rb = j; break; } }
                var b = Math.min(rb, Math.max(edge + 1, origStart + 1));
                bl.span = b - origStart;
              }
              place(bl);
            };
            var up = function () {
              document.removeEventListener('pointermove', move);
              document.removeEventListener('pointerup', up);
              if (moved) { refreshBlob(bl); relabel(); }
              setTimeout(function () { suppressClick = false; }, 0);
            };
            document.addEventListener('pointermove', move);
            document.addEventListener('pointerup', up);
          });
        });

        // drag the body to slide the clip along the lane (if nothing's in the way)
        el.addEventListener('pointerdown', function (e) {
          if (e.target.closest('.collab-resize') || e.target.closest('.collab-x')) return;
          if (e.button != null && e.button !== 0) return;
          var occ = occupied(bl), grabOff = blockAt(e.clientX) - bl.start;
          var minStart = 0, maxStart = 8 - bl.span, i;
          for (i = bl.start - 1; i >= 0; i--) { if (occ[i]) { minStart = i + 1; break; } }
          for (i = bl.start + bl.span; i < 8; i++) { if (occ[i]) { maxStart = i - bl.span; break; } }
          var moved = false;
          var move = function (ev) {
            var ns = Math.max(minStart, Math.min(maxStart, blockAt(ev.clientX) - grabOff));
            if (ns !== bl.start) { moved = true; suppressClick = true; bl.start = ns; place(bl); }
          };
          var up = function () {
            document.removeEventListener('pointermove', move);
            document.removeEventListener('pointerup', up);
            if (moved) relabel();
            setTimeout(function () { suppressClick = false; }, 0);
          };
          document.addEventListener('pointermove', move);
          document.addEventListener('pointerup', up);
        });

        refreshBlob(bl); relabel();
        return bl;
      };

      // click + drag on empty lane to lay down a new clip
      lane.addEventListener('pointerdown', function (e) {
        if (e.target.closest('.collab-blob')) return;     // blobs handle themselves
        if (e.button != null && e.button !== 0) return;
        if (blobs.length >= 8) return;                    // 8 clips max
        var occ = occupied(null), start = blockAt(e.clientX);
        if (occ[start]) return;                           // started on a filled block
        e.preventDefault();
        var freeLeft = 0, freeRight = 8, i;
        for (i = start - 1; i >= 0; i--) { if (occ[i]) { freeLeft = i + 1; break; } }
        for (i = start + 1; i < 8; i++) { if (occ[i]) { freeRight = i; break; } }
        var preview = document.createElement('span');
        preview.className = 'collab-preview';
        lane.appendChild(preview);
        var a = start, b = start + 1;
        var draw = function (span) {
          a = Math.max(freeLeft, Math.min(start, span));
          b = Math.min(freeRight, Math.max(start + 1, span + 1));
          preview.style.left = (a / 8 * 100) + '%';
          preview.style.width = ((b - a) / 8 * 100) + '%';
        };
        draw(start);
        var move = function (ev) { draw(blockAt(ev.clientX)); };
        var up = function () {
          document.removeEventListener('pointermove', move);
          document.removeEventListener('pointerup', up);
          if (preview.parentNode) preview.parentNode.removeChild(preview);
          makeBlob(a, b - a);
        };
        document.addEventListener('pointermove', move);
        document.addEventListener('pointerup', up);
      });
    };

    var buildCollabTrack = function () {
      var track = document.createElement('div');
      track.className = 'daw-track collab-track';
      track.setAttribute('data-track', 'new collab');
      track.innerHTML =
        '<div class="daw-thead">' +
          '<span class="sw" style="background:#E9A9A6"></span>' +
          '<span class="tname">new collab</span>' +
          '<span class="ms-group"><button class="ms m" type="button" aria-pressed="false" title="Mute this track">M</button><button class="ms s" type="button" aria-pressed="false" title="Solo this track">S</button></span>' +
          '<button class="collab-trackx" type="button" aria-label="Remove this track">×</button>' +
        '</div>' +
        '<div class="daw-lane collab-lane"><span class="collab-hint">click + drag to lay down a clip</span></div>';
      timeline.insertBefore(track, newRow);
      wireMS(track); wireDrag(track);
      wireCollabLane(track.querySelector('.collab-lane'));
      var tx = track.querySelector('.collab-trackx');
      if (tx) {
        tx.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
        tx.addEventListener('click', function (e) { e.stopPropagation(); if (track.parentNode) track.parentNode.removeChild(track); });
      }
      if (dawMobileAddTrack) dawMobileAddTrack(track);   // wrap the new lane for the mobile scroller
      return track;
    };

    if (newRow) {
      var addHead = newRow.querySelector('.daw-thead');
      var addCollab = function () { buildCollabTrack(); };
      addHead.addEventListener('click', addCollab);
      addHead.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); addCollab(); }
      });
    }

    // play / pause — sweeps the playhead (CSS) and ticks the timecode, just for fun
    var playBtn = daw.querySelector('.daw-play');
    var timeEl = daw.querySelector('.daw-time');
    var playing = false, rafId = null, last = 0, elapsed = 0;
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var fmt = function (ms) {
      var cs = Math.floor(ms / 10);
      return pad(Math.floor(cs / 6000)) + ':' + pad(Math.floor((cs % 6000) / 100)) + ':' + pad(cs % 100);
    };
    var tick = function (ts) {
      if (!playing) return;
      if (!last) last = ts;
      elapsed += ts - last; last = ts;
      timeEl.textContent = fmt(elapsed);
      rafId = requestAnimationFrame(tick);
    };
    var setPlaying = function (on) {
      playing = on;
      daw.classList.toggle('playing', on);
      if (playBtn) { playBtn.setAttribute('aria-pressed', String(on)); playBtn.classList.toggle('playing', on); }
      if (on) { last = 0; rafId = requestAnimationFrame(tick); }
      else if (rafId) { cancelAnimationFrame(rafId); }
      if (dawMobileSetPlaying) dawMobileSetPlaying(on);
    };
    if (playBtn) playBtn.addEventListener('click', function () { setPlaying(!playing); });

    // ---------- mobile: stack the track heads and put ruler + all lanes in ONE
    // shared horizontal scroller, driven by a minimap. Keeps clips full size. ----------
    var isMobile = function () { return window.matchMedia('(max-width: 640px)').matches; };
    (function dawMobile () {
      var DAW_W = 700;                                  // must match CSS --daw-w
      var syncing = false;

      var scrollers = function () { return [].slice.call(daw.querySelectorAll('.daw-lane-scroll, .daw-rl-scroll')); };
      var firstScroller = function () { return daw.querySelector('.daw-rl-scroll') || daw.querySelector('.daw-lane-scroll'); };
      var viewW = function () { var s = firstScroller(); return s ? s.clientWidth : DAW_W; };

      // minimap (built below) refs
      var mm, mmTrack, mmView;
      var updateMinimap = function (x) {
        if (!mmView) return;
        var vw = viewW(), frac = Math.min(1, vw / DAW_W), maxX = Math.max(0, DAW_W - vw);
        mmView.style.width = (frac * 100) + '%';
        mmView.style.left = ((maxX > 0 ? x / maxX : 0) * (1 - frac) * 100) + '%';
      };

      var positionHeads = function (pos) {
        [].slice.call(daw.querySelectorAll('.daw-mhead')).forEach(function (h) { h.style.transform = 'translateX(' + pos + 'px)'; });
      };

      var setScroll = function (x, exclude) {
        var vw = viewW(); x = Math.max(0, Math.min(DAW_W - vw, x));
        syncing = true;
        scrollers().forEach(function (s) { if (s !== exclude) s.scrollLeft = x; });
        syncing = false;
        updateMinimap(x);
      };

      var attachScroll = function (s) {
        s.addEventListener('scroll', function () { if (!syncing) { updateMinimap(s.scrollLeft); syncOthers(s); } }, { passive: true });
      };
      var syncOthers = function (src) {
        syncing = true;
        scrollers().forEach(function (s) { if (s !== src) s.scrollLeft = src.scrollLeft; });
        syncing = false;
      };

      // wrap one lane in a scroller + give it a playhead
      var wrapLane = function (lane) {
        if (!lane || (lane.parentNode && lane.parentNode.classList.contains('daw-lane-scroll'))) return;
        var w = document.createElement('div');
        w.className = 'daw-lane-scroll';
        lane.parentNode.insertBefore(w, lane);
        w.appendChild(lane);
        var ph = document.createElement('span');
        ph.className = 'daw-mhead';
        ph.setAttribute('aria-hidden', 'true');
        lane.appendChild(ph);
        attachScroll(w);
      };

      // wrap every current lane
      [].slice.call(daw.querySelectorAll('.daw-lane')).forEach(wrapLane);

      // wrap the ruler bars + build the sticky top strip with the minimap
      var ruler = daw.querySelector('.daw-ruler');
      var rlbars = daw.querySelector('.rl-bars');
      if (rlbars && ruler) {
        var rw = document.createElement('div');
        rw.className = 'daw-rl-scroll';
        rlbars.parentNode.insertBefore(rw, rlbars);
        rw.appendChild(rlbars);
        attachScroll(rw);

        var mtop = document.createElement('div');
        mtop.className = 'daw-mtop';
        ruler.parentNode.insertBefore(mtop, ruler);
        mm = document.createElement('div');
        mm.className = 'daw-minimap';
        mm.setAttribute('aria-hidden', 'true');
        mm.innerHTML = '<div class="daw-mm-track"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><span class="daw-mm-view"></span></div>';
        mtop.appendChild(mm);
        mtop.appendChild(ruler);
        mmTrack = mm.querySelector('.daw-mm-track');
        mmView = mm.querySelector('.daw-mm-view');

        // drag / tap the minimap to scroll
        var mmGrab = function (e) {
          e.preventDefault();
          var r = mmTrack.getBoundingClientRect(), vw = viewW(), vfrac = Math.min(1, vw / DAW_W);
          var to = function (cx) {
            var f = (cx - r.left) / r.width - vfrac / 2;          // centre the view on the pointer
            f = Math.max(0, Math.min(1 - vfrac, f));
            setScroll((1 - vfrac > 0 ? f / (1 - vfrac) : 0) * (DAW_W - vw), null);
          };
          to(e.touches ? e.touches[0].clientX : e.clientX);
          var mv = function (ev) { to(ev.touches ? ev.touches[0].clientX : ev.clientX); };
          var up = function () {
            document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up);
          };
          document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
        };
        mmTrack.addEventListener('pointerdown', mmGrab);
      }

      // dynamically-added collab tracks get wrapped too
      dawMobileAddTrack = function (track) {
        wrapLane(track.querySelector('.daw-lane'));
      };

      // playhead sweep + snap-scroll (mobile only, and only while playing)
      var mpos = 0, mraf = null, mlast = 0;
      var mLoop = function (ts) {
        if (!daw.classList.contains('playing') || !isMobile()) { mraf = null; return; }
        if (!mlast) mlast = ts;
        mpos += (DAW_W / 8000) * (ts - mlast); mlast = ts;
        if (mpos >= DAW_W) { mpos = 0; setScroll(0, null); }
        positionHeads(mpos);
        var s = firstScroller(), vw = viewW();
        if (s && mpos > s.scrollLeft + vw - 3) setScroll(Math.min(DAW_W - vw, s.scrollLeft + vw), null);  // snap to the next screen
        mraf = requestAnimationFrame(mLoop);
      };
      dawMobileSetPlaying = function (on) {
        if (on && isMobile()) { daw.classList.add('mhead-armed'); mlast = 0; if (!mraf) mraf = requestAnimationFrame(mLoop); }
        else if (mraf) { cancelAnimationFrame(mraf); mraf = null; }
      };

      window.addEventListener('resize', function () { updateMinimap(firstScroller() ? firstScroller().scrollLeft : 0); });
      updateMinimap(0);
    })();

    // the transport starts fully paused everywhere — the visitor presses play to run it
    setPlaying(false);
  }

  /* ---- resume buttons: after the intro rise finishes, free the transform so they lift on hover ---- */
  [].slice.call(document.querySelectorAll('.resume-actions .pill')).forEach(function (p) {
    p.addEventListener('animationend', function () { p.classList.add('anim-done'); });
  });

  /* ---- flowers + squares: slow rotation at random speeds (mostly clockwise); the ones
     around the profile photo also drift/float. translate + rotate are independent props
     so the two motions compose without fighting ---- */
  if (!reduce) {
    var heroDeco = 0;
    [].slice.call(document.querySelectorAll('.portrait .accent, .gal-accent, .about-photo .accent')).forEach(function (el) {
      var fdur = (4 + Math.random() * 3);          // 4–7s float
      var sdur = (20 + Math.random() * 22);        // 20–42s rotation (slow)
      var ccw = Math.random() < 0.32;              // mostly clockwise, a few counter
      el.style.animation = 'accFloat ' + fdur.toFixed(1) + 's ease-in-out infinite, accSpin ' + sdur.toFixed(1) + 's linear infinite' + (ccw ? ' reverse' : '');
      el.style.animationDelay = '-' + (Math.random() * fdur).toFixed(1) + 's, -' + (Math.random() * sdur).toFixed(1) + 's';
      // home hero: the flowers + dot also push up into place, a beat after the photo (decoUp
      // animates `transform`, which the drift doesn't use, and lets go once it's done)
      if (el.closest('.hero')) {
        var drifts = el.style.animationDelay;   // re-setting the shorthand resets every delay, so keep these
        el.style.animation += ', decoUp .85s cubic-bezier(.22,1,.36,1) backwards';
        el.style.animationDelay = drifts + ', ' + (0.5 + heroDeco++ * 0.09).toFixed(2) + 's';
      }
    });
  }

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
    fl.href = 'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Familjen+Grotesk:wght@400;500;600;700&family=Karla:ital,wght@0,400;0,500;0,600;0,700;1,500&family=Public+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap';
    document.head.appendChild(fl);
  }

  /* ---- simplified footer (drop the email + the "|", cleaner up-arrow) ---- */
  var footInner = document.querySelector('footer .foot');
  if (footInner) {
    footInner.innerHTML =
      '<a class="to-top" href="#top"><span class="up" aria-hidden="true">↑</span> return to top</a>' +
      '<p class="foot-signoff">thanks for stopping by!</p>' +
      '<div class="quick"><span class="label">quick nav</span>' +
      '<a href="index.html">home</a><a href="resume.html">resume</a>' +
      '<a href="projects.html">projects</a><a href="gallery.html">gallery</a>' +
      '<a href="about.html">about</a></div>' +
      '<div class="foot-email"><a href="mailto:lindseymardona@gmail.com">lindseymardona@gmail.com</a></div>';
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
    var lastY = window.scrollY || 0;
    var mobileNav = window.matchMedia('(max-width: 820px)');
    var onNavScroll = function () {
      var y = window.scrollY || window.pageYOffset || 0;
      var navH = nav.offsetHeight || 80;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var heroBased = hero ? (hero.offsetTop + hero.offsetHeight - navH - 40) : 200;
      // clamp the trigger so short pages (little scroll room) can still reach it
      var trigger = Math.max(40, Math.min(heroBased, max * 0.35));
      nav.classList.toggle('scrolled', max > 60 && y > trigger);
      progBar.style.width = (max > 0 ? Math.min(100, (y / max) * 100) : 0) + '%';
      // mobile auto-hide: slide the bar away while scrolling down, bring it back on
      // any upward scroll (and always show it near the very top)
      if (mobileNav.matches) {
        if (y <= 72) {
          nav.classList.remove('nav-hidden');
        } else if (y > lastY + 6) {
          nav.classList.add('nav-hidden');
        } else if (y < lastY - 6) {
          nav.classList.remove('nav-hidden');
        }
      } else {
        nav.classList.remove('nav-hidden');
      }
      lastY = y;
    };
    mobileNav.addEventListener('change', function () { nav.classList.remove('nav-hidden'); });
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
    var csNav = document.querySelector('.nav');
    var csMq = window.matchMedia('(max-width: 920px)');   // matches the section-bar CSS (where the layout stacks)

    /* ---- point "back" at wherever you actually came from (?from=home) ---- */
    var fromHome = new URLSearchParams(location.search).get('from') === 'home';
    var backHref = fromHome ? 'index.html' : 'projects.html';
    var backLabel = fromHome ? 'back to home' : 'back to projects';
    var csBack = document.querySelector('.cs-back');
    if (csBack) { csBack.setAttribute('href', backHref); csBack.innerHTML = '<span aria-hidden="true">←</span> ' + backLabel; }
    var csOutro = document.querySelector('.cs-outro-back');
    if (csOutro) { csOutro.setAttribute('href', backHref); csOutro.innerHTML = '<span class="bk" aria-hidden="true">←</span> ' + backLabel; }

    /* ---- mobile section bar (design 5a): a persistent bar under the auto-hiding
       site nav, merging the "back to projects" pill with a section picker ---- */
    var mbar, mName, mCount, mSheet, mOverlay, mItems = [], mLastTop = null;
    (function buildMobileBar() {
      mbar = document.createElement('div');
      mbar.className = 'cs-mobilebar';
      mbar.innerHTML =
        '<a class="csm-back" href="' + backHref + '"><span class="arw" aria-hidden="true">←</span><span class="lbl">' + backLabel + '</span></a>' +
        '<button class="csm-trigger" type="button" aria-expanded="false" aria-label="Jump to a section">' +
          '<span class="csm-cur"><span class="dot" aria-hidden="true"></span><span class="csm-name"></span></span>' +
          '<span class="csm-meta"><span class="csm-count"></span><span class="caret" aria-hidden="true">⌄</span></span>' +
        '</button>';
      mOverlay = document.createElement('div'); mOverlay.className = 'csm-overlay';
      mSheet = document.createElement('div'); mSheet.className = 'csm-sheet'; mSheet.setAttribute('role', 'menu');
      railLinks.forEach(function (a) {
        var it = document.createElement('a');
        it.className = 'csm-item'; it.setAttribute('role', 'menuitem');
        it.href = a.getAttribute('href');
        it.innerHTML = '<span class="csm-il">' + a.textContent + '</span><span class="tick" aria-hidden="true">✓</span>';
        mSheet.appendChild(it); mItems.push(it);
      });
      if (csNav && csNav.parentNode) csNav.insertAdjacentElement('afterend', mbar);
      else document.body.insertBefore(mbar, document.body.firstChild);
      document.body.appendChild(mOverlay);
      document.body.appendChild(mSheet);
      mName = mbar.querySelector('.csm-name');
      mCount = mbar.querySelector('.csm-count');
      var trig = mbar.querySelector('.csm-trigger');
      var closeSheet = function () { trig.setAttribute('aria-expanded', 'false'); mSheet.classList.remove('open'); mOverlay.classList.remove('open'); document.documentElement.style.overflow = ''; };
      var openSheet = function () { positionSheet(); trig.setAttribute('aria-expanded', 'true'); mSheet.classList.add('open'); mOverlay.classList.add('open'); document.documentElement.style.overflow = 'hidden'; };   // html, not body: see the lightbox note
      trig.addEventListener('click', function () { (mSheet.classList.contains('open') ? closeSheet : openSheet)(); });
      mOverlay.addEventListener('click', closeSheet);
      mItems.forEach(function (it) { it.addEventListener('click', closeSheet); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheet(); });
    })();

    function barTopValue() {
      if (!csNav) return 0;
      return csNav.classList.contains('nav-hidden') ? 0 : csNav.offsetHeight;
    }
    function positionSheet() {
      mSheet.style.top = (barTopValue() + (mbar.offsetHeight || 54) + 6) + 'px';
    }
    function syncMobileBar() {
      if (!csMq.matches) { mLastTop = null; return; }
      var t = barTopValue();
      if (t !== mLastTop) {
        mbar.style.top = t + 'px';
        mLastTop = t;
        if (mSheet.classList.contains('open')) positionSheet();
      }
      mbar.classList.toggle('collapsed', (window.scrollY || 0) > 40);
    }
    csMq.addEventListener('change', function () { mLastTop = null; syncMobileBar(); });

    /* ---- the staff rail (design "the harmony line"): one plum line with a note per section,
       sticky at the top of the reading column; on phones a compact copy (no labels — the
       section picker already names the current one) is the section bar's second row.
       Colour carries the state: read = plum, current = hot pink (a bit larger), ahead = soft plum.
       Note values: the five standard sections use context ♪ · role ♬ · process 𝅗𝅥 · outcome ♩ ·
       reflection ♪; any other set is mapped by section length (longest → half note) ---- */
    var staffNotes = [];   // every note link, both staffs: { a, i }
    var STD = ['context', 'role', 'process', 'outcome', 'reflection'];
    var STD_KIND = ['eighth', 'sixteenth', 'half', 'quarter', 'eighth'];
    var sectionIds = railLinks.map(function (a) { return a.getAttribute('href').slice(1); });
    var isStd = sectionIds.length === 5 && sectionIds.every(function (id, i) { return id === STD[i]; });
    var noteKinds = function () {
      if (isStd) return STD_KIND.slice();
      var read = document.querySelector('.cs-read');
      var end = read ? read.getBoundingClientRect().bottom : 0;
      var lens = railHeads.map(function (h, i) {
        if (!h) return 0;
        var next = railHeads[i + 1];
        return (next ? next.getBoundingClientRect().top : end) - h.getBoundingClientRect().top;
      });
      var order = lens.map(function (l, i) { return i; }).sort(function (a, b) { return lens[b] - lens[a]; });
      var n = order.length, q = Math.max(1, Math.round(n * 0.25));
      var kinds = [];
      order.forEach(function (idx, rank) {
        kinds[idx] = rank === 0 ? 'half' : rank <= q ? 'quarter' : rank >= n - q ? 'sixteenth' : 'eighth';
      });
      return kinds;
    };
    var buildStaff = function (compact) {
      var nav = document.createElement('nav');
      nav.className = 'cs-staff' + (compact ? ' cs-staff-compact' : '');
      nav.setAttribute('aria-label', 'Case study progress');   // only one of the two is ever displayed
      var ol = document.createElement('ol'); ol.className = 'cs-staff-notes';
      railLinks.forEach(function (link, i) {
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.className = 'cs-note'; a.href = link.getAttribute('href');
        a.innerHTML = '<span class="cs-note-g" aria-hidden="true"></span>' +
          (compact ? '' : '<span class="cs-note-l" aria-hidden="true"></span>');
        if (!compact) a.querySelector('.cs-note-l').textContent = link.textContent;
        a.addEventListener('click', function () { onRailClick(i); });
        li.appendChild(a); ol.appendChild(li);
        staffNotes.push({ a: a, i: i });
      });
      nav.appendChild(ol);
      return nav;
    };
    var drawNotes = function () {
      var kinds = noteKinds();
      staffNotes.forEach(function (s) { s.a.querySelector('.cs-note-g').innerHTML = noteSVG(kinds[s.i] || 'eighth'); });
    };
    var csRead = document.querySelector('.cs-body .cs-read');
    var staff = null;
    if (csRead) {
      staff = buildStaff(false);
      csRead.insertBefore(staff, csRead.firstChild);
      document.body.classList.add('cs-staff-on');
      if (railLinks.length > 9) staff.classList.add('dense');
    }
    if (mbar) { mbar.appendChild(buildStaff(true)); mbar.classList.add('has-staff'); }
    drawNotes();
    window.addEventListener('load', drawNotes);   // section lengths settle once images have loaded
    // stick just under the site nav (its height changes as it shrinks); labels hide when the
    // column is too narrow for them all (the current one always shows)
    var fitStaff = function () {
      if (!staff) return;
      staff.style.top = (csNav ? csNav.offsetHeight : 0) + 'px';
      var slot = staff.clientWidth / Math.max(1, railLinks.length);
      staff.classList.toggle('tight', slot < 64);
    };
    window.addEventListener('resize', fitStaff);
    fitStaff();
    var paintStaff = function (idx) {
      staffNotes.forEach(function (s) {
        var st = s.i < idx ? 'read' : s.i === idx ? 'current' : 'ahead';
        s.a.className = 'cs-note is-' + st;
        var name = railLinks[s.i].textContent;
        s.a.setAttribute('aria-label', 'Jump to ' + name + (st === 'current' ? ' (current section)' : st === 'read' ? ' (read)' : ''));
      });
    };

    var setActive = function (idx) {
      paintStaff(idx);
      railLinks.forEach(function (a, i) { a.classList.toggle('active', i === idx); });
      if (mName && railLinks[idx]) {
        mName.textContent = railLinks[idx].textContent;
        mCount.textContent = (idx + 1) + '/' + railLinks.length;
        mItems.forEach(function (it, i) { it.classList.toggle('active', i === idx); it.classList.toggle('visited', i < idx); });
      }
    };
    var clickLock = false, clickTimer = null;
    var onRailScroll = function () {
      syncMobileBar();
      if (staff && csNav) { var nh = csNav.offsetHeight + 'px'; if (staff.style.top !== nh) staff.style.top = nh; }
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
    var onRailClick = function (i) {
      setActive(i);              // highlight the clicked section right away
      clickLock = true;          // hold it while the smooth-scroll settles
      if (clickTimer) clearTimeout(clickTimer);
      clickTimer = setTimeout(function () { clickLock = false; }, 700);
    };
    railLinks.forEach(function (a, i) { a.addEventListener('click', function () { onRailClick(i); }); });
    mItems.forEach(function (a, i) { a.addEventListener('click', function () { onRailClick(i); }); });
    window.addEventListener('scroll', onRailScroll, { passive: true });
    window.addEventListener('resize', syncMobileBar);
    onRailScroll();
  }

  /* ---- header entrances: cursive words bounce in softly; the serif pushes in from
     the left; the lead blurb pushes up from below; the name types itself out ---- */
  if (!reduce) (function headers () {
    var jobs = [];   // { el, go }

    // typed name with a blinking caret
    var typeName = function (el) {
      var seq = [];
      (function flat (node, bold) {
        [].slice.call(node.childNodes).forEach(function (c) {
          if (c.nodeType === 3) { for (var i = 0; i < c.nodeValue.length; i++) seq.push({ c: c.nodeValue[i], b: bold }); }
          else if (c.nodeType === 1) flat(c, bold || c.tagName === 'B' || c.tagName === 'STRONG');
        });
      })(el, false);
      el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
      el.style.animation = 'none';
      el.style.opacity = '1';
      el.textContent = '';
      var norm = document.createElement('span'), bold = document.createElement('b');
      var caret = document.createElement('span'); caret.className = 'type-caret'; caret.setAttribute('aria-hidden', 'true');
      el.appendChild(norm); el.appendChild(bold); el.appendChild(caret);
      var i = 0;
      var tick = function () {
        if (i >= seq.length) return;
        var it = seq[i++];
        (it.b ? bold : norm).appendChild(document.createTextNode(it.c));
        setTimeout(tick, it.c === ' ' ? 42 : 50 + Math.random() * 34);
      };
      tick();
    };

    // a header with a cursive accent: the .script-accent floats/bounces, the serif pushes from the left
    var segHeader = function (h) {
      var i = 0;
      [].slice.call(h.childNodes).forEach(function (node) {
        if (node.nodeType === 3) {
          if (!node.nodeValue.trim()) return;   // keep plain whitespace between spans
          var s = document.createElement('span'); s.className = 'seg seg-smooth'; s.textContent = node.nodeValue;
          s.style.animationDelay = (i++ * 0.1).toFixed(2) + 's';
          h.replaceChild(s, node);
        } else if (node.nodeType === 1) {
          node.classList.add('seg', node.classList.contains('script-accent') ? 'seg-float' : 'seg-smooth');
          node.style.animationDelay = (i++ * 0.1).toFixed(2) + 's';
        }
      });
      h.classList.add('seg-h');
      jobs.push({ el: h, go: function () { h.classList.add('seg-go'); } });
    };

    // the two home headings bounce letter-by-letter (gentle)
    var letterHead = function (el) {
      var i = 0;
      var walk = function (node) {
        [].slice.call(node.childNodes).forEach(function (c) {
          if (c.nodeType === 3) {
            var t = c.nodeValue, frag = document.createDocumentFragment();
            for (var k = 0; k < t.length; k++) {
              if (t[k] === ' ') { frag.appendChild(document.createTextNode(' ')); continue; }
              var s = document.createElement('span'); s.className = 'ltr'; s.textContent = t[k];
              s.style.animationDelay = (i++ * 30) + 'ms'; frag.appendChild(s);
            }
            node.replaceChild(frag, c);
          } else if (c.nodeType === 1 && !c.classList.contains('eq') && !c.classList.contains('sq-note')) { walk(c); }
        });
      };
      el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
      walk(el); el.classList.add('lb-h');
      jobs.push({ el: el, go: function () { el.classList.add('lb-go'); } });
    };

    // register: hero greeting floats; page/section headers segment; home headings letter-bounce
    var hello = document.querySelector('.hello');
    if (hello) { hello.classList.add('float-el'); jobs.push({ el: hello, go: function () { hello.classList.add('float-go'); } }); }
    [].slice.call(document.querySelectorAll('.page-hero h1')).forEach(function (h) { if (h.textContent.trim()) segHeader(h); });
    [].slice.call(document.querySelectorAll('.section h2')).forEach(function (h) { if (h.querySelector('.script-accent')) segHeader(h); });
    ['.wh-title', '.section-quote'].forEach(function (sel) { var el = document.querySelector(sel); if (el) letterHead(el); });

    // the lead blurb under a page hero pushes up from below, just after the heading
    [].slice.call(document.querySelectorAll('.page-hero .lead')).forEach(function (el) {
      el.classList.add('lead-anim'); jobs.push({ el: el, go: function () { el.classList.add('lead-go'); } });
    });

    // roles: word by word — a beat, then ~1s between each; smooth (no bounce), glow on hover
    var roles = document.querySelector('.roles');
    if (roles) {
      var words = roles.textContent.trim().split(/\s+/);
      roles.setAttribute('aria-label', roles.textContent.replace(/\s+/g, ' ').trim());
      roles.textContent = '';
      words.forEach(function (w, k) {
        if (k) roles.appendChild(document.createTextNode(' '));
        var s = document.createElement('span'); s.className = 'rw'; s.textContent = w;
        s.style.animationDelay = (0.55 + k * 1.0).toFixed(2) + 's';
        s.addEventListener('animationend', function () { s.classList.add('rw-done'); });
        roles.appendChild(s);
      });
      jobs.push({ el: roles, go: function () { roles.classList.add('rw-go'); } });
    }

    // name: typed with a caret
    var nameEl = document.querySelector('.name');
    if (nameEl) { nameEl.classList.add('name-anim'); jobs.push({ el: nameEl, go: function () { if (!nameEl.dataset.typed) { nameEl.dataset.typed = '1'; typeName(nameEl); } } }); }

    // trigger on view (immediately for anything already in view at load)
    var run = function (j) {
      if (!j || j.done) return;
      j.done = true;
      if (j.el.closest && j.el.closest('.hero')) heroGate.then(j.go); else j.go();   // the hero waits for its fonts + photo
    };
    if ('IntersectionObserver' in window) {
      var hio = new IntersectionObserver(function (ents) {
        ents.forEach(function (e) { if (e.isIntersecting) { run(e.target.__hjob); hio.unobserve(e.target); } });
      }, { threshold: 0.2 });
      jobs.forEach(function (j) { j.el.__hjob = j; hio.observe(j.el); });
      requestAnimationFrame(function () {
        jobs.forEach(function (j) {
          var r = j.el.getBoundingClientRect();
          if (r.top < (window.innerHeight || 800) * 0.9 && r.bottom > 0) { run(j); hio.unobserve(j.el); }
        });
      });
    } else { jobs.forEach(run); }
  })();

  /* ---- DAW clips: a small icon at the right end says where each link goes (Spotify,
     YouTube, X); the new-collab clips get an envelope (they open an email) ---- */
  var DEST = [[/spotify\.com/, 'fa-brands fa-spotify', 'Spotify'], [/youtube\.com|youtu\.be/, 'fa-brands fa-youtube', 'YouTube'],
    [/(^|\/\/)(www\.)?(x|twitter)\.com/, 'fa-brands fa-x-twitter', 'X'], [/^mailto:/, 'fa-solid fa-envelope', 'email']];
  [].slice.call(document.querySelectorAll('.daw a.daw-clip, .daw a.daw-file')).forEach(function (a) {
    var href = a.getAttribute('href') || '';
    for (var i = 0; i < DEST.length; i++) {
      if (DEST[i][0].test(href)) {
        a.insertAdjacentHTML('beforeend', '<span class="clip-dest" aria-hidden="true"><i class="' + DEST[i][1] + '"></i></span><span class="sr-only"> (' + DEST[i][2] + ')</span>');
        break;
      }
    }
  });

  /* ---- project cards: the "read case study →" row becomes a square arrow button (same
     ring + wave as the social icons, a rounded square instead of a circle). The whole card
     is the link, so the arrow stays decorative (the card's text names it) ---- */
  [].slice.call(document.querySelectorAll('a.proj .proj-view, a.feat-card .proj-view, a.mini-card .proj-view')).forEach(function (v) {
    // keep the row's own words ("read case study", "read the write-up") to the left of the square
    var label = v.textContent.replace(/[→↗]/g, '').replace(/\s+/g, ' ').trim();
    v.classList.add('has-arrow');
    v.setAttribute('aria-hidden', 'true');
    v.innerHTML = '<span class="pv-label"></span><span class="card-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12 H19 M13 6 L19 12 L13 18"/></svg></span>';
    v.querySelector('.pv-label').textContent = label;
  });

  /* ---- wave hover (social icons, card arrows, outlined pills, the résumé downloads): a plum wave rises
     from the bottom and fills the shape. The content is drawn twice — the plum original
     under the wave, and a white copy on top clipped to exactly where the wave has reached —
     so the icon/label never turns white against the light background before the wave gets
     there. Both added layers are aria-hidden; the link keeps its own accessible name ---- */
  var WAVE_SVG = '<svg viewBox="0 0 200 130" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
    '<path d="M0 9 Q12.5 0 25 9 T50 9 T75 9 T100 9 T125 9 T150 9 T175 9 T200 9 V130 H0 Z" fill="currentColor"/></svg>';
  [].slice.call(document.querySelectorAll('.socials a, .proj-view .card-arrow, a.pill.ghost, a.pill[download]')).forEach(function (a) {
    if (a.querySelector('.wv')) return;
    var copy = a.innerHTML;
    a.classList.add('wave-btn');
    if (a.closest('.socials')) a.classList.add('wave-circle');
    var wv = document.createElement('span'); wv.className = 'wv'; wv.setAttribute('aria-hidden', 'true'); wv.innerHTML = WAVE_SVG;
    var top = document.createElement('span'); top.className = 'wv-top'; top.setAttribute('aria-hidden', 'true'); top.innerHTML = copy;
    a.appendChild(wv); a.appendChild(top);
  });

  /* ---- external text links: 2px plum underline; on hover/focus a blush highlight rises
     behind the text and the ↗ nudges up-right. Links without a ↗ get one (decorative) ---- */
  [].slice.call(document.querySelectorAll('main a[target="_blank"]')).forEach(function (a) {
    if (a.matches('.pill, .wave-btn, .daw-clip, .daw-file, .tile, .cs-proto-pill') || a.closest('.socials, .daw, .tile')) return;
    if (!a.closest('p, li, figcaption, td, dd, .l')) return;
    a.classList.add('ext-link');
    var ext = a.querySelector('.ext');
    if (!ext) {
      // find the link's last text node (it may sit inside a <strong>); if it already ends in a
      // typed ↗, swap that for the animatable span in the same place, otherwise add one
      var walker = document.createTreeWalker(a, NodeFilter.SHOW_TEXT), t, last = null;
      while ((t = walker.nextNode())) if (t.nodeValue.trim()) last = t;
      var host = a;
      if (last && /↗\s*$/.test(last.nodeValue)) { last.nodeValue = last.nodeValue.replace(/\s*↗\s*$/, ''); host = last.parentNode; }
      host.appendChild(document.createTextNode(' '));
      ext = document.createElement('span'); ext.className = 'ext'; ext.setAttribute('aria-hidden', 'true'); ext.textContent = '↗';
      host.appendChild(ext);
    }
    // on a blush background the blush highlight would vanish: use the deeper blush there
    for (var el = a.parentElement; el && el !== document.body; el = el.parentElement) {
      var bg = getComputedStyle(el).backgroundColor;
      if (bg && bg !== 'transparent' && !/rgba\(\s*0,\s*0,\s*0,\s*0\s*\)/.test(bg)) {
        if (/rgb\(\s*239,\s*206,\s*204/.test(bg)) a.classList.add('on-blush');
        break;
      }
    }
  });

  /* ---- home hero proofs: hovering or focusing "designer." / "developer." / "musician."
     shows a speech bubble of proof above the word (role="tooltip", wired with
     aria-describedby). Touch: tap a word to toggle its bubble, tap anywhere else to close.
     Escape closes. Sits on top of the entrance + hover above — it never touches either ---- */
  var heroRoles = document.querySelector('.hero .roles');
  if (heroRoles) (function proofs () {
    var PROOFS = {
      designer: 'research-led, from interfaces to motion graphics to print',
      developer: 'CS-trained, building in code with AI',
      musician: 'originals, covers, choirs, and vocal arrangements'
    };
    var words = [].slice.call(heroRoles.querySelectorAll('.rw'));
    if (!words.length) {
      // reduced motion: the entrance didn't split the line into words, so split it here (no animation)
      var ws = heroRoles.textContent.trim().split(/\s+/);
      heroRoles.textContent = '';
      ws.forEach(function (w, k) {
        if (k) heroRoles.appendChild(document.createTextNode(' '));
        var s = document.createElement('span'); s.className = 'rw rw-done'; s.textContent = w;
        heroRoles.appendChild(s); words.push(s);
      });
    }
    heroRoles.removeAttribute('aria-label');   // the words are real focusable text now
    var tips = [], open = -1, hideT = null, lastPointer = '', lastPointerAt = 0;
    words = words.filter(function (w) { return PROOFS[w.textContent.replace(/[^a-z]/gi, '').toLowerCase()]; });
    words.forEach(function (w, i) {
      var key = w.textContent.replace(/[^a-z]/gi, '').toLowerCase();
      var tip = document.createElement('span');
      tip.className = 'proof'; tip.id = 'proof-' + key; tip.setAttribute('role', 'tooltip');
      tip.innerHTML = '<span class="proof-tail" aria-hidden="true"></span>';
      tip.appendChild(document.createTextNode(PROOFS[key]));
      heroRoles.appendChild(tip); tips.push(tip);
      w.setAttribute('tabindex', '0');
      w.setAttribute('aria-describedby', tip.id);
    });
    var place = function (i) {
      var w = words[i], tip = tips[i];
      var box = heroRoles.getBoundingClientRect(), wr = w.getBoundingClientRect();
      var vw = document.documentElement.clientWidth, tw = tip.offsetWidth;
      var centre = wr.left + wr.width / 2;
      // centred under the word, but not left of the text column, and always 16px inside the screen
      var minLeft = Math.max(16, box.left + tw <= vw - 16 ? box.left : 16);
      var left = Math.max(minLeft, Math.min(centre - tw / 2, vw - 16 - tw));
      tip.style.left = Math.round(left - box.left) + 'px';
      tip.style.top = Math.round(wr.top - box.top - 12 - tip.offsetHeight) + 'px';   // above the word
      tip.style.setProperty('--tail', Math.round(centre - left) + 'px');   // the tail still points at the word
    };
    var show = function (i) {
      clearTimeout(hideT);
      if (open > -1 && open !== i) tips[open].classList.remove('on');
      place(i); tips[i].classList.add('on'); open = i;
    };
    var hide = function () { clearTimeout(hideT); if (open > -1) tips[open].classList.remove('on'); open = -1; };
    var hideSoon = function () { clearTimeout(hideT); hideT = setTimeout(hide, 140); };
    var fromTouch = function () { return lastPointer && lastPointer !== 'mouse' && Date.now() - lastPointerAt < 800; };
    words.forEach(function (w, i) {
      w.addEventListener('pointerdown', function (e) { lastPointer = e.pointerType; lastPointerAt = Date.now(); });
      w.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') show(i); });
      w.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') hideSoon(); });
      w.addEventListener('focus', function () { if (!fromTouch()) show(i); });
      w.addEventListener('blur', function () { if (!fromTouch()) hideSoon(); });
      w.addEventListener('click', function () { if (fromTouch()) { if (open === i) hide(); else show(i); } });
      // moving from the word onto its bubble keeps it open
      tips[i].addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') clearTimeout(hideT); });
      tips[i].addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') hideSoon(); });
    });
    document.addEventListener('pointerdown', function (e) {
      if (open > -1 && !(e.target.closest && e.target.closest('.roles .rw, .roles .proof'))) hide();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && open > -1) hide(); });
    window.addEventListener('resize', function () { if (open > -1) place(open); });
  })();

  /* ---- the footer corgi: an animated sprite that wanders on its own, walking on the
     bottom line of the footer staff. She's a real <button> ("play with Kaya"): on desktop,
     click it (or Enter/Space) to take the controls and drive her with the arrow keys;
     Escape or another click hands them back. On touch, a tap makes her hop. Each thing
     a visitor does to her (a click, a tap, a jump) floats up one small eighth note;
     she stays silent while she wanders on her own ---- */
  var footEl = document.querySelector('footer');
  if (footEl && !footEl.querySelector('.corgi')) {
    var touch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
    var stage = document.createElement('div'); stage.className = 'corgi-stage';
    // under reduced motion she's a still picture with nothing to do, so she stays decorative
    var dog = document.createElement(reduce ? 'div' : 'button'); dog.className = 'corgi';
    if (reduce) stage.setAttribute('aria-hidden', 'true');
    else { dog.type = 'button'; dog.setAttribute('aria-label', 'play with Kaya'); }
    // the fermata she wears while sitting: pixel art on her own 3px art grid (30×18 sheet px — a round arch over the dot),
    // drawn at the sprite's scale and flipped with her (it's symmetric). CSS shows it only in .a-sit
    var ferm = document.createElement('span'); ferm.className = 'corgi-fermata'; ferm.setAttribute('aria-hidden', 'true');
    ferm.innerHTML = '<svg viewBox="0 0 30 18" shape-rendering="crispEdges" aria-hidden="true" focusable="false"><g fill="currentColor">' +
      '<rect x="9" y="0" width="12" height="3"/><rect x="3" y="3" width="6" height="3"/><rect x="21" y="3" width="6" height="3"/>' +
      '<rect x="0" y="6" width="6" height="3"/><rect x="24" y="6" width="6" height="3"/>' +
      '<rect x="0" y="9" width="3" height="9"/><rect x="27" y="9" width="3" height="9"/>' +
      '<rect x="12" y="12" width="6" height="6"/></g></svg>';
    dog.appendChild(ferm);
    stage.appendChild(dog); footEl.appendChild(stage);

    // a few notes resting on the staff, so it reads as music. They sit behind Kaya (she walks
    // in front of them). Heads land on lines/spaces: lines at 24/31/38/45px from the footer's
    // top, spaces halfway between; the glyph's head centre is 16px down its 20.8px box
    var staffDeco = document.createElement('div'); staffDeco.className = 'staff-notes'; staffDeco.setAttribute('aria-hidden', 'true');
    [[7, 'quarter', 42], [19, 'eighth', 35], [33, 'half', 45.5], [52, 'sixteenth', 31.5], [68, 'quarter', 38.5], [83, 'eighth', 42], [95, 'half', 35]]
      .forEach(function (n, k) {
        var s = document.createElement('span'); s.className = 'staff-note' + (k % 2 ? ' sn-wide' : '');
        s.style.left = n[0] + '%'; s.style.top = (n[2] - 16) + 'px';
        s.innerHTML = noteSVG(n[1]);
        staffDeco.appendChild(s);
      });
    footEl.insertBefore(staffDeco, stage);

    // every pose lives in ONE image (assets/corgi-sprites.png, one row per pose), so changing
    // pose only moves the background — it never swaps images. Swapping between separate sheets
    // could blank her for a frame (e.g. on a jump) while the browser re-decoded the new sheet.
    // Kept in `sheets` so the decoded image stays in memory.
    var sheets = [new Image()];
    sheets[0].src = 'assets/corgi-sprites.png';
    if (sheets[0].decode) sheets[0].decode().catch(function () {});

    var CW = 64;
    var MID = 28.44;   // her body's centre in the 64px box (64/144 sprite px); she flips around this (see .corgi)
    var HEAD = 37.8;   // her head's centre when facing right (85/144 sprite px), for the floating note
    var x = 24, dir = 1, state = '', mode = 'auto';   // 'auto' | 'control'
    var jumpVX = 0;                                    // horizontal speed while mid-jump
    var hopping = false;                               // a tap-hop (touch) is in progress
    var SPEED = { walk: 26, sniffwalk: 15, run: 80 };
    var maxX = function () { return Math.max(20, footEl.clientWidth - CW - 10); };
    var padEl = null, hintEl = null, psstEl = null;

    // the cues beside her (the "psst" pill, or the D-pad + "use arrow keys" pill) sit level
    // with the staff, to her right — or to her left when there's no room — never above her
    var positionCues = function () {
      var items = psstEl ? [psstEl] : [padEl, hintEl].filter(Boolean);
      if (!items.length) return;
      var GAP = 10;
      var widths = items.map(function (el) { return el.offsetWidth || 120; });
      var total = widths.reduce(function (a, b) { return a + b; }, 0) + GAP * (items.length - 1);
      var right = x + CW + 4;
      var fitsRight = right + total <= footEl.clientWidth - 6;
      var left = fitsRight ? right : Math.max(6, x - 4 - total);
      // keep the D-pad next to her on either side: reverse the order on the left
      var order = fitsRight ? items : items.slice().reverse();
      var ow = fitsRight ? widths : widths.slice().reverse();
      order.forEach(function (el, i) { el.style.left = Math.round(left) + 'px'; left += ow[i] + GAP; });
    };
    // x moves in fractional pixels every frame. At walking pace, drawing the downscaled pixel-art
    // sheet at slowly creeping sub-pixel offsets makes her shimmer, so slow gaits snap to whole
    // device pixels. Running and leaping stay sub-pixel: at that speed snapping turns into uneven
    // 1px/2px steps (choppy), and the shimmer it prevents isn't visible anyway.
    var snap = function (v) { var r = window.devicePixelRatio || 1; return Math.round(v * r) / r; };
    var place = function () {
      var fast = state === 'run' || state === 'jump';
      dog.style.transform = 'translateX(' + (fast ? x : snap(x)) + 'px) scaleX(' + dir + ')';
      positionCues();
    };
    var setState = function (s) { if (s !== state) { state = s; dog.className = 'corgi a-' + s; } };
    var rnd = function (a, b) { return a + Math.random() * (b - a); };
    place(); setState('idle2');

    // one small plum eighth note floats up from above her head and fades (only for things a
    // visitor does — never while she wanders)
    var floatNote = function () {
      if (reduce) return;
      var n = document.createElement('span'); n.className = 'corgi-note'; n.setAttribute('aria-hidden', 'true');
      n.innerHTML = noteSVG('eighth');
      var headX = x + (dir === 1 ? HEAD : 2 * MID - HEAD);
      n.style.left = Math.round(headX - 6) + 'px';
      stage.appendChild(n);
      var done = function () { if (n.parentNode) n.parentNode.removeChild(n); };
      n.addEventListener('animationend', done);
      setTimeout(done, 1200);   // in case animationend never fires (hidden tab)
    };

    // movement loop
    if (!reduce) {
      var cLast = 0;
      (function loop (ts) {
        if (!cLast) cLast = ts;
        var dt = Math.min(0.1, (ts - cLast) / 1000); cLast = ts;
        var vx = SPEED[state] ? SPEED[state] * dir : (state === 'jump' ? jumpVX : 0);
        if (vx) {
          x += vx * dt;
          if (x >= maxX()) { x = maxX(); if (mode === 'auto') dir = -1; }
          else if (x <= 10) { x = 10; if (mode === 'auto') dir = 1; }
          place();
        }
        requestAnimationFrame(loop);
      })(0);
    }

    // ---- auto wander ----
    var cyc = null;
    var CYCLE = ['idle2', 'walk', 'run', 'sniff', 'sniffwalk', 'sit', 'walk', 'idle2'];
    var wander = function () {
      if (mode !== 'auto' || hopping) return;
      var s = CYCLE[Math.floor(Math.random() * CYCLE.length)];
      if (s === 'walk' || s === 'run' || s === 'sniffwalk') {
        // if she's already at a wall, always head away from it; otherwise pick a way at random
        if (x >= maxX() - 6) dir = -1;
        else if (x <= 16) dir = 1;
        else if (Math.random() < 0.5) dir = -dir;
      }
      if (s === 'run') {
        // she leaps into a run rather than snapping straight to top speed
        jumpVX = dir * SPEED.run * 0.85; setState('jump');
        setTimeout(function () { if (mode === 'auto' && !hopping) { jumpVX = 0; setState('run'); } }, 560);
      } else { setState(s); }
      cyc = setTimeout(wander, rnd(2200, 4800));
    };
    if (!reduce) wander();

    // ---- touch: a tap makes her hop in place (no keyboard control on touch) ----
    var hop = function () {
      if (hopping) return;
      hopping = true; clearTimeout(cyc); jumpVX = 0;
      setState('idle2'); void dog.offsetWidth; setState('jump');   // restart the leap even if she was mid-leap
      setTimeout(function () {
        hopping = false; setState('idle2');
        cyc = setTimeout(wander, 900);
      }, 680);
    };

    // ---- keyboard control (desktop only) ----
    var arrows = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    var keys = {}, jumping = false, satLatched = false, running = false, sniffT = null, entryY = 0, entryTime = 0;
    var held = function (k) { return !!keys['Arrow' + k]; };
    var dirHeld = function () { return held('Right') ? 1 : (held('Left') ? -1 : 0); };
    var anyKey = function () { return held('Left') || held('Right') || held('Up') || held('Down'); };
    var scheduleSniff = function () {
      clearTimeout(sniffT);
      sniffT = setTimeout(function () {
        if (mode === 'control' && state === 'idle2' && !anyKey() && !satLatched) {
          setState('sniff');
          setTimeout(function () { if (mode === 'control' && !anyKey() && !satLatched) setState('idle2'); scheduleSniff(); }, 1300);
        } else scheduleSniff();
      }, rnd(3500, 7000));
    };
    // choose the grounded pose from whatever keys are currently held
    var resolve = function () {
      if (mode !== 'control' || jumping) return;
      if (satLatched) { setState('sit'); return; }
      var d = dirHeld(), down = held('Down');
      if (down && d) { dir = d; running = false; setState('sniffwalk'); }
      else if (down) { running = false; setState('sniff'); }
      else if (d) { dir = d; setState(running ? 'run' : 'walk'); }
      else { running = false; setState('idle2'); }
    };
    var doJump = function () {
      if (jumping || satLatched) return;
      jumping = true;
      var d = dirHeld(); if (d) dir = d;
      jumpVX = d ? d * SPEED.run * 0.85 : 0;       // leap toward the held direction
      setState('jump');
      floatNote();
      setTimeout(function () {
        jumping = false; jumpVX = 0;
        if (mode !== 'control') return;
        running = !!dirHeld();                      // still holding a way at touchdown → run out of it
        resolve();
      }, 640);
    };
    var removeEl = function (el) { if (el && el.parentNode) el.parentNode.removeChild(el); };
    // the intro cue: a D-pad diagram + "use arrow keys to move", both gone on first press
    var dismissIntro = function () {
      removeEl(padEl); padEl = null;
      removeEl(hintEl); hintEl = null;
    };
    var dismissPsst = function () { removeEl(psstEl); psstEl = null; };
    var enterControl = function () {
      if (touch || reduce || mode === 'control') return;
      mode = 'control'; clearTimeout(cyc); keys = {}; jumping = false; satLatched = false; running = false; jumpVX = 0;
      setState('idle2'); entryY = window.pageYOffset; entryTime = Date.now();
      dismissPsst();
      padEl = document.createElement('div'); padEl.className = 'corgi-dpad'; padEl.setAttribute('aria-hidden', 'true');
      // SVG arrows (perfectly centered in a 24x24 box) instead of font glyphs, which
      // sit at inconsistent heights depending on the typeface
      var arrowPath = {
        up: 'M12 18 V6 M7 11 L12 6 L17 11',
        down: 'M12 6 V18 M7 13 L12 18 L17 13',
        left: 'M18 12 H6 M11 7 L6 12 L11 17',
        right: 'M6 12 H18 M13 7 L18 12 L13 17'
      };
      ['up', 'left', 'down', 'right'].forEach(function (k) {
        var el = document.createElement('span'); el.className = 'cdp cdp-' + k;
        var g = document.createElement('span'); g.className = 'cdp-g';
        g.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + arrowPath[k] + '"/></svg>';
        el.appendChild(g); padEl.appendChild(el);
      });
      hintEl = document.createElement('div'); hintEl.className = 'corgi-hint'; hintEl.textContent = 'use arrow keys to move';
      hintEl.setAttribute('aria-hidden', 'true');
      stage.appendChild(padEl); stage.appendChild(hintEl); place();
      dog.setAttribute('aria-pressed', 'true');
      requestAnimationFrame(function () { if (padEl) padEl.classList.add('in'); if (hintEl) hintEl.classList.add('in'); });
      scheduleSniff();
    };
    var exitControl = function () {
      if (mode !== 'control') return;
      mode = 'auto'; keys = {}; jumping = false; satLatched = false; running = false; jumpVX = 0; clearTimeout(sniffT);
      dismissIntro();
      dog.setAttribute('aria-pressed', 'false');
      wander();
    };

    if (!reduce) {
      // first hover (once per visit): a quiet "psst, click me" pill beside her, gone after the first click
      var psstSeen = false;
      try { psstSeen = sessionStorage.getItem('kaya-psst') === '1'; } catch (e) {}
      if (!touch) {
        dog.setAttribute('aria-pressed', 'false');
        dog.addEventListener('mouseenter', function () {
          if (psstSeen || mode === 'control') return;
          psstSeen = true;
          try { sessionStorage.setItem('kaya-psst', '1'); } catch (e) {}
          psstEl = document.createElement('div'); psstEl.className = 'corgi-psst'; psstEl.textContent = 'psst, click me';
          psstEl.setAttribute('aria-hidden', 'true');
          stage.appendChild(psstEl); positionCues();
          requestAnimationFrame(function () { if (psstEl) psstEl.classList.add('in'); });
        });
      }

      dog.addEventListener('click', function (e) {
        e.stopPropagation();
        dismissPsst();
        floatNote();
        if (touch) { hop(); return; }
        if (mode === 'control') exitControl(); else enterControl();
      });
    }

    if (!touch && !reduce) {
      document.addEventListener('click', function (e) { if (mode === 'control' && !(e.target && e.target.closest && e.target.closest('.corgi'))) exitControl(); });
      window.addEventListener('scroll', function () { if (mode === 'control' && Date.now() - entryTime > 450 && Math.abs(window.pageYOffset - entryY) > 40) exitControl(); }, { passive: true });
      document.addEventListener('keydown', function (e) {
        if (mode !== 'control') return;
        if (e.key === 'Escape') { exitControl(); return; }
        if (arrows.indexOf(e.key) < 0) return;
        e.preventDefault();                          // arrows drive her, they don't scroll the page
        if (e.repeat) return;
        keys[e.key] = true; dismissIntro();
        if (held('Up') && held('Down')) {           // up + down together → sit, and stay sat
          satLatched = true; jumping = false; jumpVX = 0; running = false; setState('sit'); return;
        }
        satLatched = false;
        if (e.key === 'ArrowUp') doJump(); else resolve();
      });
      document.addEventListener('keyup', function (e) {
        if (arrows.indexOf(e.key) < 0) return;
        keys[e.key] = false;
        if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !dirHeld()) running = false;
        resolve();
      });
    }
  }
})();
