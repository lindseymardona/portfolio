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
      var step = cols > 1 ? (idx % cols) : Math.min(idx, 6);
      el.style.animationDelay = (step * 0.07) + 's';
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
      galTiles.forEach(function (t) {
        var cat = t.getAttribute('data-cat');
        t.hidden = !(f === 'all' || cat === f);
      });
    };
    galChips.forEach(function (c) {
      c.addEventListener('click', function () { applyFilter(c.getAttribute('data-filter')); });
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
    var dragT = null, grabOff = 0, ph = null;
    var otherTracks = function () {
      return [].slice.call(timeline.querySelectorAll('.daw-track[data-track]')).filter(function (x) { return x !== dragT; });
    };
    var onDragMove = function (e) {
      if (!dragT) return;
      dragT.style.top = (e.clientY - grabOff) + 'px';
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
        document.addEventListener('pointermove', onDragMove);
        document.addEventListener('pointerup', onDragEnd);
        document.addEventListener('pointercancel', onDragEnd);
      });
    };
    allTracks().forEach(function (t) { wireMS(t); wireDrag(t); });

    // ---- the "new collab" gimmick: "+ new track" spawns an empty track you can
    // draw clips onto (click + drag to lay one down, drag the edges to resize) ----
    var LINKEDIN = 'https://www.linkedin.com/in/lindseymardona/';
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
        // one continuous pink→white gradient across the whole lane: scale the gradient
        // to the full 8 blocks and offset it so each clip shows its slice of the sweep
        bl.el.style.backgroundSize = (8 / bl.span * 100) + '% 100%';
        bl.el.style.backgroundPosition = (bl.span >= 8 ? 0 : bl.start / (8 - bl.span) * 100) + '% 0';
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
        el.href = LINKEDIN; el.target = '_blank'; el.rel = 'noopener'; el.draggable = false;
        el.innerHTML =
          '<span class="collab-resize l" aria-hidden="true"></span>' +
          '<span class="clip-info"><span class="clip-name">collaboration ↗</span><span class="clip-sub">collaboration</span></span>' +
          '<span class="wave" data-wave aria-hidden="true"></span>' +
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
          '<span class="sw" style="background:#7C8A4E"></span>' +
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
    };
    if (playBtn) playBtn.addEventListener('click', function () { setPlaying(!playing); });
    // the transport runs by default so the playhead sweeps the tracks; paused for reduced-motion
    setPlaying(!reduce);
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
    var csMq = window.matchMedia('(max-width: 820px)');

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
      var closeSheet = function () { trig.setAttribute('aria-expanded', 'false'); mSheet.classList.remove('open'); mOverlay.classList.remove('open'); document.body.style.overflow = ''; };
      var openSheet = function () { positionSheet(); trig.setAttribute('aria-expanded', 'true'); mSheet.classList.add('open'); mOverlay.classList.add('open'); document.body.style.overflow = 'hidden'; };
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

    var setActive = function (idx) {
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
