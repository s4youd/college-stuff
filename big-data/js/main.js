/* ============================================================
   BIG DATA ANALYTICS — interaction layer
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
  var ddHover = false;

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
    ddHover = false;
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
      if (ddOpen) {
        // A desktop hover can open the panel before the click lands.
        // Keep it open on that first click, then let a second click close it.
        if (ddHover) { ddHover = false; return; }
        closeDropdown();
      } else {
        openDropdown();
      }
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
      if (window.innerWidth > 980) {
        ddHover = true;
        openDropdown();
      }
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

  $$('.nav__link:not(.dropdown__trigger)').forEach(function (link) {
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
    try { localStorage.setItem('bigdata-ar-notes', show ? 'on' : 'off'); } catch (err) { /* private mode */ }
  }

  if (arBtn) {
    var saved = null;
    try { saved = localStorage.getItem('bigdata-ar-notes'); } catch (err) { /* private mode */ }
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
     Live lab 01 — the 5 Vs console
     Pick a dimension, read its question, failure mode and exam line.
  --------------------------------------------------------- */
  var vsOut = $('[data-vs-out]');
  if (vsOut) {
    var VS = {
      volume: {
        question: 'How much data is there?',
        example: 'Petabytes of clickstream and transaction history.',
        breaks: 'One server runs out of disk, RAM and time.',
        line: 'Volume is the scale of the data — one of the three original Vs.',
        note: 'VOLUME — the first original V. The answer is distributed storage and parallel processing, not a bigger spreadsheet.'
      },
      velocity: {
        question: 'How fast does it arrive and need processing?',
        example: 'Millions of sensor readings or card swipes per second.',
        breaks: 'A nightly batch schedule is already hours behind.',
        line: 'Velocity is the speed of generation and processing.',
        note: 'VELOCITY — the pipeline must keep up. Batch is not real-time; stream processing acts as data arrives.'
      },
      variety: {
        question: 'How many shapes does it take?',
        example: 'Tables + JSON logs + video + free text in one pipeline.',
        breaks: 'A fixed relational schema rejects the new shapes.',
        line: 'Variety covers structured, semi-structured and unstructured data.',
        note: 'VARIETY — the schema breaks. NoSQL, lakes and Spark accept multiple shapes; one rigid table does not.'
      },
      veracity: {
        question: 'Can we trust it?',
        example: 'Missing values, duplicate records, noisy sensors, bias.',
        breaks: 'The model learns the noise and confidently repeats it.',
        line: 'Veracity is the accuracy and trustworthiness of the data.',
        note: 'VERACITY — trust breaks. Cleaning, validation, metadata and governance are the answer.'
      },
      value: {
        question: 'Does it change a decision?',
        example: 'A fraud alert, a demand forecast, a saved cost.',
        breaks: 'The pipeline is expensive and nobody acts on the output.',
        line: 'Value is the business outcome the analysis produces.',
        note: 'VALUE — the business case breaks. Storage is a cost; insight that changes a decision is the return.'
      }
    };
    var vsQuestionEl = $('[data-vs-question]', vsOut);
    var vsExampleEl = $('[data-vs-example]', vsOut);
    var vsBreaksEl = $('[data-vs-breaks]', vsOut);
    var vsLineEl = $('[data-vs-line]', vsOut);
    var vsNoteEl = $('[data-vs-note]', vsOut);

    function renderVs(key, motion) {
      var v = VS[key] || VS.volume;
      if (vsQuestionEl) vsQuestionEl.textContent = v.question;
      if (vsExampleEl) vsExampleEl.textContent = v.example;
      if (vsBreaksEl) vsBreaksEl.textContent = v.breaks;
      if (vsLineEl) vsLineEl.textContent = v.line;
      if (vsNoteEl) vsNoteEl.textContent = v.note;
      if (motion && hasAnime && !reduced) {
        animate($$('.wild-row dd, .wild-note', vsOut), {
          opacity: [0, 1],
          translateX: [8, 0],
          duration: 420,
          delay: stagger(55),
          easing: 'outExpo'
        });
      }
    }

    $$('[data-vs]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        $$('[data-vs]').forEach(function (b) {
          b.classList.remove('is-on');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('is-on');
        btn.setAttribute('aria-pressed', 'true');
        renderVs(btn.getAttribute('data-vs'), true);
      });
    });

    renderVs('volume', false);
  }

  /* ---------------------------------------------------------
     Live lab 02 — Big Data tool picker
  --------------------------------------------------------- */
  var toolOut = $('[data-tool-out]');
  if (toolOut) {
    var TOOLS = {
      storage: {
        job: 'Store massive files across many machines with fault tolerance.',
        tech: 'HDFS',
        why: 'Distributed blocks plus replication survive node failure and scale horizontally.',
        tradeoff: 'Optimised for large files and streaming reads, not tiny random writes.',
        note: 'STORE — HDFS. The exam often asks for the component, not the brand. Name the responsibility first.'
      },
      sql: {
        job: 'Query data on Hadoop with a familiar SQL-like language.',
        tech: 'Apache Hive',
        why: 'Hive maps SQL-like queries onto distributed jobs and keeps a warehouse-style table catalogue.',
        tradeoff: 'Not a low-latency transactional database and not the tool for live streams.',
        note: 'SQL — Hive. If the question says “SQL-like on HDFS”, Hive is the expected answer; Spark SQL is the faster alternative.'
      },
      stream: {
        job: 'Move events continuously and react while they are still fresh.',
        tech: 'Apache Kafka + Apache Storm',
        why: 'Kafka transports the event stream; Storm processes it in real time with an event-driven topology.',
        tradeoff: 'Two moving parts, operational complexity and exactly-once semantics to design carefully.',
        note: 'STREAM — Kafka for transport, Storm for processing. Kafka alone is a log/platform, not the whole analytics answer.'
      },
      ml: {
        job: 'Run machine-learning algorithms over large distributed data.',
        tech: 'Apache Mahout or Spark MLlib',
        why: 'Mahout provides ML/data-mining algorithms on Hadoop; MLlib provides distributed ML on Spark.',
        tradeoff: 'Model quality still depends on features and data quality; the library does not choose them for you.',
        note: 'ML — Mahout for the Hadoop-era answer, MLlib for Spark. The exam usually wants Mahout when it says “Mahout”.'
      },
      graph: {
        job: 'Analyse relationships in a very large social or network graph.',
        tech: 'Apache Giraph',
        why: 'Giraph is designed for large-scale graph processing across a cluster.',
        tradeoff: 'Graph algorithms are iterative and network-heavy; not every problem is a graph problem.',
        note: 'GRAPH — Giraph. Social-network analysis is the keyword that gives it away.'
      },
      ingest: {
        job: 'Collect logs from many servers and move them into Hadoop.',
        tech: 'Apache Flume',
        why: 'Flume agents collect, aggregate and transport large volumes of log/streaming data into HDFS.',
        tradeoff: 'Configuration and agent management; it is ingestion, not the analytics engine.',
        note: 'INGEST — Flume. “Logs into Hadoop” is almost always Flume, not Hive.'
      },
      coord: {
        job: 'Coordinate distributed services and keep cluster state consistent.',
        tech: 'Apache ZooKeeper',
        why: 'ZooKeeper manages and coordinates distributed systems and services.',
        tradeoff: 'It is not storage, not a query engine and not a machine-learning library.',
        note: 'COORD — ZooKeeper. If the verb is “coordinate”, the answer is not HDFS.'
      }
    };
    var toolJobEl = $('[data-tool-job]', toolOut);
    var toolTechEl = $('[data-tool-tech]', toolOut);
    var toolWhyEl = $('[data-tool-why]', toolOut);
    var toolTradeEl = $('[data-tool-trade]', toolOut);
    var toolNoteEl = $('[data-tool-note]', toolOut);

    function renderTool(key, motion) {
      var t = TOOLS[key] || TOOLS.storage;
      if (toolJobEl) toolJobEl.textContent = t.job;
      if (toolTechEl) toolTechEl.textContent = t.tech;
      if (toolWhyEl) toolWhyEl.textContent = t.why;
      if (toolTradeEl) toolTradeEl.textContent = t.tradeoff;
      if (toolNoteEl) toolNoteEl.textContent = t.note;
      if (motion && hasAnime && !reduced) {
        animate($$('.wild-row dd, .wild-note', toolOut), {
          opacity: [0, 1],
          translateY: [6, 0],
          duration: 380,
          delay: stagger(45),
          easing: 'outExpo'
        });
      }
    }

    $$('[data-tool]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        $$('[data-tool]').forEach(function (b) {
          b.classList.remove('is-on');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('is-on');
        btn.setAttribute('aria-pressed', 'true');
        renderTool(btn.getAttribute('data-tool'), true);
      });
    });

    renderTool('storage', false);
  }

  /* ---------------------------------------------------------
     Live lab 03 — model fit diagnosis
  --------------------------------------------------------- */
  var fitOut = $('[data-fit-out]');
  if (fitOut) {
    var FIT = {
      underfit: {
        train: 'High · still falling',
        val: 'High · close to training',
        verdict: 'UNDERFIT · too simple or undertrained',
        fix: 'Add capacity (layers/units), train longer, improve features.',
        note: 'Underfitting: both curves are high and close. More capacity or more training can help — but validate every change.'
      },
      balanced: {
        train: 'Low · settling',
        val: 'Low · close to training',
        verdict: 'BALANCED · generalising',
        fix: 'Keep the architecture; monitor drift and retrain when the distribution changes.',
        note: 'Balanced: both losses are low and close. This is the fit you want — do not add complexity for its own sake.'
      },
      overfit: {
        train: 'Very low · still falling',
        val: 'Rising after an early minimum',
        verdict: 'OVERFIT · memorising the training set',
        fix: 'More data, regularisation, dropout, early stopping, or a simpler model.',
        note: 'Overfitting: the training curve keeps improving while validation turns upward. The gap is the warning, not the training score.'
      }
    };
    var fitTrainEl = $('[data-fit-train]', fitOut);
    var fitValEl = $('[data-fit-val]', fitOut);
    var fitVerdictEl = $('[data-fit-verdict]', fitOut);
    var fitFixEl = $('[data-fit-fix]', fitOut);
    var fitNoteEl = $('[data-fit-note]', fitOut);

    function renderFit(key, motion) {
      var f = FIT[key] || FIT.underfit;
      if (fitTrainEl) fitTrainEl.textContent = f.train;
      if (fitValEl) fitValEl.textContent = f.val;
      if (fitVerdictEl) fitVerdictEl.textContent = f.verdict;
      if (fitFixEl) fitFixEl.textContent = f.fix;
      if (fitNoteEl) fitNoteEl.textContent = f.note;
      if (motion && hasAnime && !reduced) {
        animate($$('.wild-row dd, .wild-note', fitOut), {
          opacity: [0, 1],
          translateX: [8, 0],
          duration: 420,
          delay: stagger(55),
          easing: 'outExpo'
        });
      }
    }

    $$('[data-fit]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        $$('[data-fit]').forEach(function (b) {
          b.classList.remove('is-on');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('is-on');
        btn.setAttribute('aria-pressed', 'true');
        renderFit(btn.getAttribute('data-fit'), true);
      });
    });

    renderFit('underfit', false);
  }

  /* ---------------------------------------------------------
     Optional portal tune — Web Audio, opt-in only
  --------------------------------------------------------- */
  var tuneBtn = $('#tuneBtn');
  if (tuneBtn) {
    var audioCtx = null;
    var tunePlaying = false;
    var tuneReset = null;

    function stopTune() {
      tunePlaying = false;
      tuneBtn.classList.remove('is-on');
      tuneBtn.setAttribute('aria-pressed', 'false');
      var label = $('.tune-label', tuneBtn);
      if (label) label.textContent = 'TUNE';
      if (tuneReset) { clearTimeout(tuneReset); tuneReset = null; }
      if (audioCtx) {
        try { audioCtx.close(); } catch (err) { /* already closed */ }
        audioCtx = null;
      }
    }

    function playTune() {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) { toast('AUDIO NOT SUPPORTED'); return; }
      try { audioCtx = new Ctx(); } catch (err) { toast('AUDIO UNAVAILABLE'); return; }
      tunePlaying = true;
      tuneBtn.classList.add('is-on');
      tuneBtn.setAttribute('aria-pressed', 'true');
      var label = $('.tune-label', tuneBtn);
      if (label) label.textContent = 'TUNE ON';

      var now = audioCtx.currentTime + 0.04;
      var notes = [392.00, 523.25, 659.25, 783.99, 659.25, 523.25, 440.00, 587.33, 392.00];
      var step = 0.17;
      var master = audioCtx.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.16, now + 0.08);
      master.gain.exponentialRampToValueAtTime(0.0001, now + notes.length * step + 0.3);
      master.connect(audioCtx.destination);

      notes.forEach(function (freq, i) {
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        var start = now + i * step;
        osc.type = i % 2 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.9, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + step * 0.92);
        osc.connect(gain);
        gain.connect(master);
        osc.start(start);
        osc.stop(start + step);
      });

      tuneReset = setTimeout(stopTune, (notes.length * step + 0.7) * 1000);
    }

    tuneBtn.addEventListener('click', function () {
      if (tunePlaying) { stopTune(); toast('PORTAL TUNE · OFF'); }
      else { playTune(); toast('PORTAL TUNE · ON'); }
    });
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
