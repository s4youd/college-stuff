/* ============================================================
   MOBILE COMPUTING — interaction layer
   Anime.js v4 · custom camera, cursor, reveals, live labs
   ============================================================ */
(function () {
  'use strict';

  var doc = document.documentElement;
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var A = window.anime;
  var hasAnime = !!(A && typeof A.animate === 'function');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) doc.classList.add('reduced');
  var finePointer = window.matchMedia('(pointer: fine)').matches;

  function animate(targets, params) {
    if (!hasAnime || reduced || !targets) return null;
    try { return A.animate(targets, params); } catch (err) { return null; }
  }
  function stagger(v, opts) {
    if (!hasAnime) return 0;
    return A.stagger(v, opts);
  }
  function revealInstantly(el) {
    if (!el) return;
    el.style.opacity = '1';
    el.style.transform = 'none';
  }

  /* ---------------------------------------------------------
     Loader
  --------------------------------------------------------- */
  var loader = $('#loader');
  var heroStarted = false;
  var loaderStart = performance.now();

  function startHero() {
    if (heroStarted) return;
    heroStarted = true;
    if (loader) loader.style.display = 'none';
    document.body.classList.remove('is-loading');
    document.body.classList.add('is-live');

    if (!hasAnime || reduced) {
      $$('.hero [data-hero]').forEach(revealInstantly);
      $$('.hero__title .line-inner').forEach(function (l) {
        l.style.transform = 'none';
        l.style.opacity = '1';
      });
      return;
    }

    animate('.hero__title .line-inner', {
      translateY: ['112%', '0%'],
      opacity: [0, 1],
      duration: 1250,
      delay: stagger(120, { start: 120 }),
      easing: 'outExpo'
    });
    animate('.hero [data-hero]', {
      opacity: [0, 1],
      translateY: [20, 0],
      duration: 950,
      delay: stagger(70, { start: 320 }),
      easing: 'outExpo'
    });
    animate('.hero__visual', {
      opacity: [0, 1],
      scale: [0.9, 1],
      rotate: [-2.5, 0],
      duration: 1500,
      delay: 260,
      easing: 'outExpo'
    });
    animate('.hero__float', {
      opacity: [0, 1],
      scale: [0.86, 1],
      duration: 800,
      delay: stagger(110, { start: 900 }),
      easing: 'outBack'
    });
  }

  function hideLoader() {
    if (!loader || loader.getAttribute('data-done') === '1') return;
    loader.setAttribute('data-done', '1');

    if (!hasAnime || reduced) {
      startHero();
      return;
    }

    animate('.loader__inner', { opacity: [1, 0], translateY: [0, -22], duration: 420, easing: 'inQuad' });
    animate('.loader__curtain--1', { translateY: ['0%', '-100%'], duration: 900, delay: 220, easing: 'inOutExpo' });
    animate('.loader__curtain--2', { translateY: ['0%', '-100%'], duration: 900, delay: 330, easing: 'inOutExpo' });
    animate(loader, {
      opacity: [1, 0],
      duration: 300,
      delay: 1050,
      easing: 'linear',
      onComplete: startHero
    });
    // safety net if the animation is interrupted
    setTimeout(startHero, 1900);
  }

  if (loader) {
    // progress readout
    var pctEl = $('.loader__pct');
    var fillEl = $('.loader__fill');
    var pStart = performance.now();
    (function tickLoader(now) {
      var p = Math.min(100, ((now - pStart) / 1350) * 100);
      if (pctEl) pctEl.textContent = String(Math.round(p)).padStart(3, '0') + '%';
      if (fillEl) fillEl.style.transform = 'scaleX(' + (p / 100) + ')';
      if (p < 100) requestAnimationFrame(tickLoader);
    })(pStart);

    animate('.loader__mark', { rotate: [0, 360], scale: [0.82, 1], duration: 1500, easing: 'outExpo' });

    window.addEventListener('load', function () {
      setTimeout(hideLoader, Math.max(0, 900 - (performance.now() - loaderStart)));
    });
    setTimeout(hideLoader, 2800);
  } else {
    startHero();
  }

  /* ---------------------------------------------------------
     Custom cursor
  --------------------------------------------------------- */
  var cursor = $('#cursor');
  if (cursor && finePointer && !reduced) {
    doc.classList.add('has-cursor');
    var dot = $('.cursor__dot', cursor);
    var ring = $('.cursor__ring', cursor);
    var cursorLabel = $('.cursor__label', cursor);
    var mx = window.innerWidth / 2;
    var my = window.innerHeight / 2;
    var rx = mx;
    var ry = my;
    var cursorVisible = false;

    document.addEventListener('pointermove', function (e) {
      mx = e.clientX;
      my = e.clientY;
      if (!cursorVisible) {
        cursorVisible = true;
        cursor.classList.add('is-visible');
      }
      if (dot) dot.style.transform = 'translate(' + mx + 'px,' + my + 'px) translate(-50%,-50%)';
    }, { passive: true });

    (function cursorLoop() {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      if (ring) ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px) translate(-50%,-50%)';
      if (cursorLabel) cursorLabel.style.transform = 'translate(' + rx + 'px,' + ry + 'px) translate(-50%,34px)';
      requestAnimationFrame(cursorLoop);
    })();

    document.addEventListener('pointerover', function (e) {
      var t = e.target.closest('a, button, [data-cursor], input, textarea, .card, .figure');
      if (!t) return;
      cursor.classList.add('is-hover');
      var label = t.getAttribute('data-cursor');
      if (!label) {
        if (t.classList.contains('figure')) label = 'VIEW';
        else if (t.classList.contains('card')) label = 'TILT';
        else if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') label = 'TYPE';
        else if (t.tagName === 'A') label = 'OPEN';
        else label = 'PRESS';
      }
      if (cursorLabel) cursorLabel.textContent = label;
    });

    document.addEventListener('pointerout', function (e) {
      if (e.relatedTarget && e.relatedTarget.closest('a, button, [data-cursor], input, textarea, .card, .figure')) return;
      cursor.classList.remove('is-hover');
    });

    document.addEventListener('pointerdown', function () { cursor.classList.add('is-down'); });
    document.addEventListener('pointerup', function () { cursor.classList.remove('is-down'); });
    document.addEventListener('mouseleave', function () { cursor.classList.add('is-hidden'); });
    document.addEventListener('mouseenter', function () { cursor.classList.remove('is-hidden'); });
  } else if (cursor) {
    cursor.style.display = 'none';
  }

  /* ---------------------------------------------------------
     Nav: dropdown, mobile menu, scroll state
  --------------------------------------------------------- */
  var nav = $('#nav');
  var burger = $('#burger');
  var dropdown = $('#lecturesDropdown');
  var ddTrigger = $('#lecturesTrigger');
  var ddPanel = $('#lecturesPanel');
  var ddOpen = false;

  function openDropdown() {
    if (!dropdown || ddOpen) return;
    ddOpen = true;
    dropdown.classList.add('is-open');
    if (ddTrigger) ddTrigger.setAttribute('aria-expanded', 'true');
    if (!ddPanel) return;
    if (!hasAnime || reduced) {
      ddPanel.style.opacity = '1';
      return;
    }
    animate(ddPanel, { opacity: [0, 1], duration: 320, easing: 'outQuad' });
    animate($$('.mega__item', ddPanel), {
      opacity: [0, 1],
      translateY: [14, 0],
      duration: 650,
      delay: stagger(45, { start: 90 }),
      easing: 'outExpo'
    });
    animate($$('.dropdown__foot', ddPanel), { opacity: [0, 1], duration: 400, delay: 300, easing: 'outQuad' });
  }

  function closeDropdown(immediate) {
    if (!dropdown || !ddOpen) return;
    ddOpen = false;
    dropdown.classList.remove('is-open');
    if (ddTrigger) ddTrigger.setAttribute('aria-expanded', 'false');
    if (!ddPanel) return;
    if (!hasAnime || reduced || immediate) {
      ddPanel.style.opacity = '0';
      return;
    }
    animate(ddPanel, { opacity: [1, 0], duration: 200, easing: 'inQuad' });
  }

  if (ddTrigger) {
    ddTrigger.addEventListener('click', function (e) {
      e.preventDefault();
      if (ddOpen) closeDropdown(); else openDropdown();
    });
    ddTrigger.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        openDropdown();
        var first = $('.mega__item', ddPanel);
        if (first) first.focus();
      }
    });
  }

  if (dropdown && finePointer) {
    dropdown.addEventListener('mouseenter', function () {
      if (window.innerWidth > 980) openDropdown();
    });
    dropdown.addEventListener('mouseleave', function () {
      if (window.innerWidth > 980) closeDropdown();
    });
  }

  document.addEventListener('click', function (e) {
    if (dropdown && ddOpen && !dropdown.contains(e.target)) closeDropdown();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeDropdown(true);
      if (nav) nav.classList.remove('is-open');
      if (burger) burger.setAttribute('aria-expanded', 'false');
    }
  });

  if (burger) {
    burger.addEventListener('click', function () {
      if (!nav) return;
      var open = nav.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (!open) closeDropdown(true);
    });
  }

  $$('.mega__item').forEach(function (item) {
    item.addEventListener('click', function () {
      closeDropdown(true);
      if (nav) nav.classList.remove('is-open');
      if (burger) burger.setAttribute('aria-expanded', 'false');
    });
  });

  $$('.nav__link').forEach(function (link) {
    link.addEventListener('click', function () {
      if (nav) nav.classList.remove('is-open');
      if (burger) burger.setAttribute('aria-expanded', 'false');
    });
  });

  /* ---------------------------------------------------------
     Arabic notes toggle
  --------------------------------------------------------- */
  var arBtn = $('#arToggle');
  var arOn = true;
  var arNotes = $$('.arabic');
  var toastEl = $('#toast');
  var toastTimer = null;

  function toast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 1900);
  }

  function applyArabic(show, animateIt) {
    arOn = show;
    if (arBtn) {
      arBtn.classList.toggle('is-off', !show);
      arBtn.setAttribute('aria-pressed', show ? 'true' : 'false');
      var label = $('.ar-label', arBtn);
      if (label) label.textContent = show ? 'AR ON' : 'AR OFF';
    }
    if (!arNotes.length) return;
    if (!show) {
      if (hasAnime && !reduced && animateIt) {
        animate(arNotes, {
          opacity: [1, 0],
          translateY: [0, 8],
          duration: 260,
          easing: 'inQuad',
          onComplete: function () {
            arNotes.forEach(function (n) { n.style.display = 'none'; });
          }
        });
      } else {
        arNotes.forEach(function (n) { n.style.display = 'none'; });
      }
    } else {
      arNotes.forEach(function (n) { n.style.display = 'block'; });
      if (hasAnime && !reduced && animateIt) {
        animate(arNotes, {
          opacity: [0, 1],
          translateY: [10, 0],
          duration: 520,
          delay: stagger(24),
          easing: 'outExpo'
        });
      } else {
        arNotes.forEach(function (n) { n.style.opacity = '1'; n.style.transform = 'none'; });
      }
    }
    try { localStorage.setItem('mobile-ar-notes', show ? 'on' : 'off'); } catch (err) { /* private mode */ }
  }

  if (arBtn) {
    var saved = null;
    try { saved = localStorage.getItem('mobile-ar-notes'); } catch (err) { /* private mode */ }
    if (saved === 'off') applyArabic(false, false);
    arBtn.addEventListener('click', function () {
      applyArabic(!arOn, true);
      toast(arOn ? 'ARABIC NOTES · ON' : 'ARABIC NOTES · OFF');
    });
  }

  /* ---------------------------------------------------------
     Scroll camera + progress + spy
  --------------------------------------------------------- */
  var progressBar = $('#progressBar');
  var hudBar = $('#hudBar');
  var hudFocus = $('#hudFocus');
  var sceneInners = $$('.scene__inner');
  var heroCopy = $('.hero__copy');
  var heroVisual = $('.hero__visual');
  var heroSection = $('.hero');
  var railItems = $$('.rail__item');
  var spySections = railItems.map(function (a) {
    return document.querySelector(a.getAttribute('href'));
  }).filter(Boolean);
  var ticking = false;

  function updateScrollUI() {
    var y = window.scrollY || window.pageYOffset;
    var vh = window.innerHeight;
    var docH = doc.scrollHeight - vh;
    var pct = docH > 0 ? Math.max(0, Math.min(1, y / docH)) : 0;

    if (progressBar) progressBar.style.width = (pct * 100) + '%';
    if (hudBar) hudBar.style.width = (pct * 100) + '%';
    if (hudFocus) hudFocus.textContent = String(Math.round(pct * 100)).padStart(3, '0') + '%';
    if (nav) nav.classList.toggle('is-scrolled', y > 40);

    if (window.innerWidth > 760 && !reduced) {
      if (heroCopy && heroSection) {
        var heroRect = heroSection.getBoundingClientRect();
        if (heroRect.bottom > 0) {
          heroCopy.style.transform = 'translate3d(0,' + (y * 0.16) + 'px,0)';
          heroCopy.style.opacity = String(Math.max(0, 1 - y / (vh * 0.95)));
        }
      }
      if (heroVisual && heroSection) {
        var hRect = heroSection.getBoundingClientRect();
        if (hRect.bottom > 0) {
          heroVisual.style.transform = 'translate3d(0,' + (y * 0.09) + 'px,0) scale(' + (1 + y * 0.00016) + ')';
        }
      }
      sceneInners.forEach(function (inner) {
        var rect = inner.parentElement.getBoundingClientRect();
        if (rect.bottom < -120 || rect.top > vh + 120) {
          inner.style.transform = 'translate3d(0,0,0)';
          return;
        }
        var p = (vh / 2 - (rect.top + rect.height / 2)) / (vh + rect.height);
        p = Math.max(-0.62, Math.min(0.62, p));
        inner.style.transform = 'perspective(1500px) translate3d(0,' + (p * -30).toFixed(2) + 'px,0) rotateX(' + (p * 2.4).toFixed(3) + 'deg) scale(' + (1 - Math.abs(p) * 0.012).toFixed(4) + ')';
      });
    } else {
      sceneInners.forEach(function (inner) { inner.style.transform = ''; });
      if (heroCopy) { heroCopy.style.transform = ''; heroCopy.style.opacity = ''; }
      if (heroVisual) { heroVisual.style.transform = ''; }
    }

    if (spySections.length) {
      var probe = y + vh * 0.38;
      var active = spySections[0];
      spySections.forEach(function (s) {
        if (s.offsetTop <= probe) active = s;
      });
      railItems.forEach(function (a) {
        a.classList.toggle('is-active', a.getAttribute('href') === '#' + active.id);
      });
    }
    ticking = false;
  }

  function requestScrollUI() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateScrollUI);
  }

  window.addEventListener('scroll', requestScrollUI, { passive: true });
  window.addEventListener('resize', requestScrollUI);
  updateScrollUI();

  /* ---------------------------------------------------------
     Hero pointer parallax
  --------------------------------------------------------- */
  if (heroSection && finePointer && !reduced) {
    var orbit = $('.hero__orbit');
    var floats = $$('.hero__float');
    heroSection.addEventListener('pointermove', function (e) {
      var rect = heroSection.getBoundingClientRect();
      var nx = (e.clientX - rect.left) / rect.width - 0.5;
      var ny = (e.clientY - rect.top) / rect.height - 0.5;
      if (orbit) orbit.style.transform = 'rotateY(' + (nx * 9).toFixed(2) + 'deg) rotateX(' + (-ny * 7).toFixed(2) + 'deg)';
      floats.forEach(function (el, i) {
        el.style.setProperty('--px', (nx * (10 + i * 4)).toFixed(1) + 'px');
        el.style.setProperty('--py', (ny * (8 + i * 3)).toFixed(1) + 'px');
      });
    });
    heroSection.addEventListener('pointerleave', function () {
      if (orbit) orbit.style.transform = '';
      floats.forEach(function (el) { el.style.setProperty('--px', '0px'); el.style.setProperty('--py', '0px'); });
    });
  }

  /* ---------------------------------------------------------
     Reveals
  --------------------------------------------------------- */
  var revealEls = $$('[data-reveal]');
  var revealObserver = null;

  function showReveal(el) {
    if (!el || el.getAttribute('data-shown') === '1') return;
    el.setAttribute('data-shown', '1');
    if (!hasAnime || reduced) { revealInstantly(el); return; }
    var siblings = el.parentElement ? Array.prototype.filter.call(el.parentElement.children, function (c) {
      return c.hasAttribute('data-reveal');
    }) : [];
    var index = Math.max(0, siblings.indexOf(el));
    animate(el, {
      opacity: [0, 1],
      translateY: [32, 0],
      duration: 900,
      delay: Math.min(index, 6) * 75,
      easing: 'outExpo',
      onComplete: function () {
        el.style.opacity = '1';
        el.style.transform = '';
      }
    });
  }

  if ('IntersectionObserver' in window) {
    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        showReveal(entry.target);
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealEls.forEach(revealInstantly);
  }

  // section title lines
  var lineHeads = $$('[data-line-reveal]');
  if ('IntersectionObserver' in window) {
    var lineObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var head = entry.target;
        lineObserver.unobserve(head);
        var lines = $$('.line-inner', head);
        var rule = $('.section-rule', head);
        if (!hasAnime || reduced) {
          lines.forEach(function (l) { l.style.transform = 'none'; l.style.opacity = '1'; });
          if (rule) rule.style.transform = 'none';
          return;
        }
        animate(lines, {
          translateY: ['112%', '0%'],
          opacity: [0, 1],
          duration: 1150,
          delay: stagger(95, { start: 60 }),
          easing: 'outExpo'
        });
        if (rule) {
          animate(rule, { scaleX: [0, 1], duration: 1300, delay: 260, easing: 'inOutExpo' });
        }
      });
    }, { threshold: 0.2 });
    lineHeads.forEach(function (h) { lineObserver.observe(h); });
  } else {
    lineHeads.forEach(function (head) {
      $$('.line-inner', head).forEach(function (l) { l.style.transform = 'none'; });
      var rule = $('.section-rule', head);
      if (rule) rule.style.transform = 'none';
    });
  }

  // code lines
  $$('.code pre').forEach(function (pre) {
    var raw = pre.textContent.replace(/\r/g, '').replace(/^\n+|\n+$/g, '');
    var lines = raw.split('\n');
    var minIndent = Infinity;
    lines.forEach(function (line) {
      if (!line.trim()) return;
      var indent = line.match(/^[ \t]*/)[0].length;
      if (indent < minIndent) minIndent = indent;
    });
    if (!isFinite(minIndent)) minIndent = 0;
    lines = lines.map(function (line) {
      return line.slice(Math.min(minIndent, line.match(/^[ \t]*/)[0].length));
    });
    while (lines.length && !lines[0].trim()) lines.shift();
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    pre.innerHTML = lines.map(function (line, i) {
      var safe = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      if (!safe.trim()) safe = '&nbsp;';
      return '<span class="cl" data-n="' + (i + 1) + '">' + safe + '</span>';
    }).join('');
  });

  if ('IntersectionObserver' in window) {
    var codeObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        codeObserver.unobserve(entry.target);
        var lines = $$('.cl', entry.target);
        if (!hasAnime || reduced) {
          lines.forEach(function (l) { l.style.opacity = '1'; });
          return;
        }
        animate(lines, {
          opacity: [0, 1],
          translateX: [-8, 0],
          duration: 520,
          delay: stagger(38),
          easing: 'outQuad'
        });
      });
    }, { threshold: 0.25 });
    $$('.code').forEach(function (code) { codeObserver.observe(code); });
  }

  /* ---------------------------------------------------------
     Tilt + spotlight
  --------------------------------------------------------- */
  if (finePointer && !reduced) {
    $$('[data-tilt]').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var rect = card.getBoundingClientRect();
        var px = (e.clientX - rect.left) / rect.width;
        var py = (e.clientY - rect.top) / rect.height;
        card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
        card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
        if (window.innerWidth > 760) {
          card.style.transform = 'perspective(900px) rotateX(' + ((0.5 - py) * 5).toFixed(2) + 'deg) rotateY(' + ((px - 0.5) * 6).toFixed(2) + 'deg) translateY(-3px)';
        }
      });
      card.addEventListener('pointerleave', function () {
        card.style.transform = '';
      });
    });

    $$('[data-magnetic]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var rect = el.getBoundingClientRect();
        var dx = e.clientX - (rect.left + rect.width / 2);
        var dy = e.clientY - (rect.top + rect.height / 2);
        el.style.transform = 'translate(' + (dx * 0.16).toFixed(1) + 'px,' + (dy * 0.2).toFixed(1) + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }

  /* ---------------------------------------------------------
     Counters
  --------------------------------------------------------- */
  var counters = $$('[data-count]');
  if (counters.length) {
    if ('IntersectionObserver' in window && hasAnime && !reduced) {
      var countObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          countObserver.unobserve(entry.target);
          var el = entry.target;
          var target = parseFloat(el.getAttribute('data-count')) || 0;
          var obj = { v: 0 };
          A.animate(obj, {
            v: target,
            duration: 1700,
            easing: 'outExpo',
            onUpdate: function () { el.textContent = String(Math.round(obj.v)); }
          });
        });
      }, { threshold: 0.6 });
      counters.forEach(function (el) { countObserver.observe(el); });
    } else {
      counters.forEach(function (el) { el.textContent = el.getAttribute('data-count'); });
    }
  }

  /* ---------------------------------------------------------
     Live lab 01 — GPS fix console
     Toggle 3 / 4 satellites and the receiver clock bias.
  --------------------------------------------------------- */
  var gpsOut = $('[data-gps-out]');
  if (gpsOut) {
    var gpsSats = 3;
    var gpsClock = false;
    var gpsFixEl = $('[data-gps-fix]', gpsOut);
    var gpsErrorEl = $('[data-gps-error]', gpsOut);
    var gpsVerdictEl = $('[data-gps-verdict]', gpsOut);
    var gpsNoteEl = $('[data-gps-note]', gpsOut);

    function gpsState() {
      if (gpsSats === 3 && gpsClock) {
        return {
          fix: '2 candidate points — and both are wrong',
          error: '1 ms clock error → ≈ 300 km range error',
          verdict: 'UNUSABLE · the receiver clock is the 4th unknown',
          note: 'Three ranges intersect at two possible points only if the clock is perfect. Switch the bias on and the spheres no longer agree.'
        };
      }
      if (gpsSats === 3) {
        return {
          fix: '2 candidate points · altitude assumed known',
          error: 'ideal clock · no bias modelled',
          verdict: '2-D FIX · one point is discarded by geometry',
          note: 'This is the textbook “three satellites” case — it works only when altitude is already supplied and the clock is perfect.'
        };
      }
      if (gpsClock) {
        return {
          fix: 'x · y · z + receiver clock bias solved',
          error: 'bias estimated from the 4th range',
          verdict: 'FULL 3-D FIX · clock corrected, not ignored',
          note: 'The fourth satellite is not redundancy. It adds the fourth equation needed for the unknown clock bias. A 1 ms error is still ≈ 300 km before correction.'
        };
      }
      return {
        fix: 'x · y · z solved · clock assumed ideal',
        error: 'geometry-limited precision (HDOP)',
        verdict: 'FULL 3-D FIX · four ranges, four unknowns',
        note: 'Four satellites give four equations for x, y, z and the clock bias. In practice the receiver always uses the fourth to correct its cheap clock.'
      };
    }

    function renderGps(motion) {
      var st = gpsState();
      if (gpsFixEl) gpsFixEl.textContent = st.fix;
      if (gpsErrorEl) gpsErrorEl.textContent = st.error;
      if (gpsVerdictEl) gpsVerdictEl.textContent = st.verdict;
      if (gpsNoteEl) gpsNoteEl.textContent = st.note;
      if (motion && hasAnime && !reduced) {
        animate($$('.wild-row dd, .wild-note', gpsOut), {
          opacity: [0, 1],
          translateX: [8, 0],
          duration: 420,
          delay: stagger(55),
          easing: 'outExpo'
        });
      }
    }

    $$('[data-gps-sats]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        $$('[data-gps-sats]').forEach(function (b) {
          b.classList.remove('is-on');
          b.setAttribute('aria-pressed', 'false');
        });
        gpsSats = parseInt(btn.getAttribute('data-gps-sats'), 10) === 4 ? 4 : 3;
        btn.classList.add('is-on');
        btn.setAttribute('aria-pressed', 'true');
        renderGps(true);
      });
    });

    $$('[data-gps-clock]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        $$('[data-gps-clock]').forEach(function (b) {
          b.classList.remove('is-on');
          b.setAttribute('aria-pressed', 'false');
        });
        gpsClock = btn.getAttribute('data-gps-clock') === 'on';
        btn.classList.add('is-on');
        btn.setAttribute('aria-pressed', 'true');
        renderGps(true);
      });
    });

    renderGps(false);
  }

  /* ---------------------------------------------------------
     Live lab 02 — Positioning technology picker
  --------------------------------------------------------- */
  var envOut = $('[data-env-out]');
  if (envOut) {
    var ENV = {
      outdoor: {
        name: 'OUTDOOR · open sky',
        tech: 'GPS / A-GPS',
        why: 'Satellite timing gives metre-level global coordinates with no local infrastructure.',
        tradeoff: 'Weak indoors, slow cold start, battery-hungry. A-GPS cuts time-to-first-fix from about a minute to seconds.',
        badge: '5–10 m'
      },
      urban: {
        name: 'URBAN · streets + indoors',
        tech: 'Wi-Fi fingerprinting + GPS + cellular (fusion)',
        why: 'No single signal wins everywhere; a hybrid engine picks the best available source.',
        tradeoff: 'Fingerprinting needs a radio survey (often 10+ hours per building) and must be refreshed when APs move.',
        badge: '2–5 m indoors'
      },
      indoor: {
        name: 'INDOOR · mall / airport',
        tech: 'Wi-Fi fingerprinting or iBeacon (BLE)',
        why: 'Existing access points or cheap beacons provide room-level context where GPS cannot reach.',
        tradeoff: 'Survey labour or beacon deployment; privacy and maintenance are the real costs.',
        badge: '1–5 m'
      },
      industrial: {
        name: 'INDUSTRIAL · precision',
        tech: 'UWB (ultra-wideband)',
        why: 'Short pulses survive multipath and give centimetre-level ranging.',
        tradeoff: 'High hardware cost and short range; overkill for a shopping-centre map.',
        badge: 'cm-level'
      },
      emergency: {
        name: 'EMERGENCY · E-911',
        tech: 'Cellular positioning (Cell ID + timing / E-OTD) + A-GPS',
        why: 'The network can locate a caller even when the phone cannot see the sky.',
        tradeoff: 'Coarse and inconsistent: cell sizes run from 100 m to 30 km and barriers attenuate signals.',
        badge: '100 m – 30 km'
      }
    };
    var envTechEl = $('[data-env-tech]', envOut);
    var envWhyEl = $('[data-env-why]', envOut);
    var envTradeEl = $('[data-env-trade]', envOut);
    var envBadgeEl = $('[data-env-badge]', envOut);
    var envNoteEl = $('[data-env-note]', envOut);

    function renderEnv(key, motion) {
      var e = ENV[key] || ENV.outdoor;
      if (envTechEl) envTechEl.textContent = e.tech;
      if (envWhyEl) envWhyEl.textContent = e.why;
      if (envTradeEl) envTradeEl.textContent = e.tradeoff;
      if (envBadgeEl) envBadgeEl.textContent = e.badge;
      if (envNoteEl) envNoteEl.textContent = e.name + ' — the exam answer is not one technology; it is the one that fits the environment, budget and accuracy target.';
      if (motion && hasAnime && !reduced) {
        animate($$('.wild-row dd, .wild-note', envOut), {
          opacity: [0, 1],
          translateY: [6, 0],
          duration: 380,
          delay: stagger(45),
          easing: 'outExpo'
        });
      }
    }

    $$('[data-env]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        $$('[data-env]').forEach(function (b) {
          b.classList.remove('is-on');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('is-on');
        btn.setAttribute('aria-pressed', 'true');
        renderEnv(btn.getAttribute('data-env'), true);
      });
    });

    renderEnv('outdoor', false);
  }

  /* ---------------------------------------------------------
     Q&A banks — essay + MCQ accordions
  --------------------------------------------------------- */
  var qaBlocks = $$('[data-qa]');
  if (qaBlocks.length) {
    qaBlocks.forEach(function (block) {
      var btn = $('.qa__q', block);
      var panel = $('.qa__a', block);
      if (!btn || !panel) return;
      btn.addEventListener('click', function () {
        var open = block.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) {
          panel.hidden = false;
          if (hasAnime && !reduced) {
            animate($$('.qa__model, .qa__keys, .arabic', panel), {
              opacity: [0, 1],
              translateY: [6, 0],
              duration: 420,
              delay: stagger(40),
              easing: 'outExpo'
            });
          }
        } else {
          if (hasAnime && !reduced) {
            animate(panel, {
              opacity: [1, 0],
              duration: 160,
              easing: 'inQuad',
              onComplete: function () {
                if (!block.classList.contains('is-open')) {
                  panel.hidden = true;
                  panel.style.opacity = '';
                }
              }
            });
          } else {
            panel.hidden = true;
          }
        }
      });
    });
  }

  /* ---------------------------------------------------------
     Smooth anchors, scroll cue, to-top
  --------------------------------------------------------- */
  $$('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var id = link.getAttribute('href');
      if (!id || id === '#') return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      closeDropdown(true);
      if (nav) nav.classList.remove('is-open');
      if (burger) burger.setAttribute('aria-expanded', 'false');
      target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    });
  });

  var cue = $('.scroll-cue');
  if (cue) {
    cue.addEventListener('click', function () {
      var overview = $('#overview');
      if (overview) overview.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    });
  }

  var toTop = $('#toTop');
  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    });
  }

  /* ---------------------------------------------------------
     Failsafe: never leave content invisible
  --------------------------------------------------------- */
  setTimeout(function () {
    if (!hasAnime) {
      revealEls.forEach(revealInstantly);
      $$('[data-line-reveal] .line-inner').forEach(function (l) { l.style.transform = 'none'; });
      $$('.section-rule').forEach(function (r) { r.style.transform = 'none'; });
    }
  }, 2500);

})();
