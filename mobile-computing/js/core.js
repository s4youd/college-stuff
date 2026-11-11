/* ============================================================
   MOBILE COMPUTING - scroll-linked 3D core stage
   Custom Canvas 2D renderer. No external 3D library.
   ============================================================ */
(function () {
  'use strict';

  var stage = document.getElementById('coreStage');
  var canvas = document.getElementById('coreCanvas');
  if (!stage || !canvas) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (motionQuery.matches) return;

  var wideQuery = window.matchMedia('(min-width: 1280px)');

  // Let CSS reserve the right-hand column only when this renderer exists.
  document.body.classList.add('has-core');

  var TAU = Math.PI * 2;
  var MONO = "'JetBrains Mono', 'Fira Code', Consolas, monospace";
  var clamp = function (v, min, max) { return v < min ? min : v > max ? max : v; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };

  var W = 1, H = 1, cx = 0, cy = 0, unit = 1;
  var maxScroll = 1;
  var scroll = 0, scrollRaw = 0, scrollVel = 0;
  var pointerX = 0, pointerY = 0, pointerTX = 0, pointerTY = 0;
  var active = false, raf = 0, lastNow = 0;
  var modeIndex = -1;
  var hudLast = 0;
  var sizeTick = 0;

  var yawEl = document.getElementById('coreYaw');
  var depthEl = document.getElementById('coreDepth');
  var modeEl = document.getElementById('coreMode');
  var gaugeEl = document.getElementById('coreGauge');

  var modes = ['CALIBRATE', 'MOBILE', 'PROTOTYPE', 'LOCATE', 'POSITION', 'SERVE'];

  var CORE_R = 1.12;
  var CAM_Z = 12.0;
  var FOCAL = 8.5;

  /* ---------- math ---------- */
  function rotX(p, a) {
    var c = Math.cos(a), s = Math.sin(a);
    return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c];
  }
  function rotY(p, a) {
    var c = Math.cos(a), s = Math.sin(a);
    return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
  }
  function rotZ(p, a) {
    var c = Math.cos(a), s = Math.sin(a);
    return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]];
  }
  function vlen(v) { return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]); }
  function vnorm(v) {
    var l = vlen(v) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
  }
  function mix(c1, c2, t) {
    return [
      Math.round(lerp(c1[0], c2[0], t)),
      Math.round(lerp(c1[1], c2[1], t)),
      Math.round(lerp(c1[2], c2[2], t))
    ];
  }
  function rgba(c, a) {
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a.toFixed(3) + ')';
  }

  /* ---------- camera ---------- */
  var cam = { yaw: 0, pitch: 0, roll: 0, z: CAM_Z, offsetY: 0 };

  function project(p) {
    var c = Math.cos(cam.yaw), s = Math.sin(cam.yaw);
    var x = p[0] * c + p[2] * s;
    var z = -p[0] * s + p[2] * c;
    var y = p[1];
    c = Math.cos(cam.pitch); s = Math.sin(cam.pitch);
    var y2 = y * c - z * s;
    var z2 = y * s + z * c;
    var depth = cam.z - z2;
    if (depth < 0.4) depth = 0.4;
    var scale = (FOCAL / depth) * unit;
    var px = cx + x * scale;
    var py = cy - y2 * scale + cam.offsetY * unit;
    var dx = px - cx, dy = py - cy;
    var cr = Math.cos(cam.roll), sr = Math.sin(cam.roll);
    return {
      x: cx + dx * cr - dy * sr,
      y: cy + dx * sr + dy * cr,
      z: depth,
      s: scale,
      fade: clamp((cam.z + 1.9 - depth) / 3.7, 0.08, 1)
    };
  }

  /* ---------- geometry ---------- */
  var phi = (1 + Math.sqrt(5)) / 2;
  var icoRaw = [
    [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
    [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
    [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1]
  ];
  var icoVerts = [];
  var i, j, k;
  for (i = 0; i < icoRaw.length; i++) {
    var nv = vnorm(icoRaw[i]);
    icoVerts.push([nv[0] * CORE_R, nv[1] * CORE_R, nv[2] * CORE_R]);
  }
  var icoEdges = [];
  var edgeKeys = {};
  for (i = 0; i < icoRaw.length; i++) {
    for (j = i + 1; j < icoRaw.length; j++) {
      var ddx = icoRaw[i][0] - icoRaw[j][0];
      var ddy = icoRaw[i][1] - icoRaw[j][1];
      var ddz = icoRaw[i][2] - icoRaw[j][2];
      if (ddx * ddx + ddy * ddy + ddz * ddz < 4.4) {
        icoEdges.push([i, j]);
        edgeKeys[Math.min(i, j) + '_' + Math.max(i, j)] = true;
      }
    }
  }
  function hasEdge(a, b) {
    return !!edgeKeys[Math.min(a, b) + '_' + Math.max(a, b)];
  }
  var icoFaces = [];
  for (i = 0; i < 12; i++) {
    for (j = i + 1; j < 12; j++) {
      for (k = j + 1; k < 12; k++) {
        if (hasEdge(i, j) && hasEdge(j, k) && hasEdge(i, k)) icoFaces.push([i, j, k]);
      }
    }
  }

  var coreDots = [];
  var DOT_N = 38;
  for (i = 0; i < DOT_N; i++) {
    var yy = 1 - (i / (DOT_N - 1)) * 2;
    var rad = Math.sqrt(Math.max(0, 1 - yy * yy));
    var theta = i * 2.399963229728653;
    coreDots.push([
      Math.cos(theta) * rad * CORE_R * 0.78,
      yy * CORE_R * 0.78,
      Math.sin(theta) * rad * CORE_R * 0.78
    ]);
  }

  var HELIX_N = 36;
  var helixA = [], helixB = [];
  for (i = 0; i <= HELIX_N; i++) {
    var ht = i / HELIX_N;
    var hAng = ht * TAU * 2.4;
    var hY = (ht - 0.5) * 1.9;
    var hR = 0.44 * (1 - 0.16 * Math.abs(ht - 0.5));
    helixA.push([Math.cos(hAng) * hR, hY, Math.sin(hAng) * hR]);
    helixB.push([Math.cos(hAng + Math.PI) * hR, hY, Math.sin(hAng + Math.PI) * hR]);
  }

  function ringPoint(ring, a) {
    var p = [Math.cos(a) * ring.r, 0, Math.sin(a) * ring.r];
    p = rotX(p, ring.tx);
    p = rotZ(p, ring.tz);
    return p;
  }

  var rings = [
    { r: 1.42, tx: 0.62, tz: 0.18, speed: 0.24, seg: 84, c1: [94, 234, 212], c2: [34, 211, 238], sats: 3, phase: 0.4, spin: 0.0, scrollSpin: 0.7 },
    { r: 1.55, tx: -0.92, tz: 0.44, speed: -0.17, seg: 84, c1: [167, 139, 250], c2: [244, 114, 182], sats: 2, phase: 2.1, spin: 1.1, scrollSpin: 0.55 },
    { r: 1.30, tx: 1.22, tz: -0.36, speed: 0.33, seg: 76, c1: [34, 211, 238], c2: [94, 234, 212], sats: 2, phase: 4.4, spin: 2.3, scrollSpin: 0.9 }
  ];
  rings.forEach(function (ring) {
    ring.pts = [];
    for (var ri = 0; ri <= ring.seg; ri++) {
      ring.pts.push(ringPoint(ring, (ri / ring.seg) * TAU));
    }
    ring.satPts = [];
    for (var rs = 0; rs < ring.sats; rs++) {
      ring.satPts.push(ringPoint(ring, ring.phase + (rs / ring.sats) * TAU));
    }
  });

  var docs = [
    { r: 1.54, y: 1.18, a: 0.3, speed: 0.16, w: 0.74, h: 0.90, title: 'LECTURE 01', sub: 'MOBILE COMP', tag: '01', c: [167, 139, 250] },
    { r: 1.66, y: -1.14, a: 2.3, speed: -0.12, w: 0.68, h: 0.84, title: 'LECTURE 02', sub: 'PROTOTYPING', tag: '02', c: [94, 234, 212] },
    { r: 1.46, y: 1.46, a: 4.2, speed: 0.20, w: 0.78, h: 0.94, title: 'LECTURE 03', sub: 'LOCALIZATION', tag: '03', c: [244, 114, 182] },
    { r: 1.70, y: -1.38, a: 5.5, speed: -0.09, w: 0.66, h: 0.82, title: 'LECTURE 04', sub: 'POSITIONING', tag: '04', c: [251, 191, 36] },
    { r: 1.42, y: 0.10, a: 3.2, speed: 0.13, w: 0.72, h: 0.88, title: 'LECTURE 05', sub: 'LBS · CONTEXT', tag: '05', c: [34, 211, 238] }
  ];

  var seed = 7;
  function rand() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }
  var particles = [];
  for (i = 0; i < 78; i++) {
    var pt = rand() * TAU;
    var pu = rand() * 2 - 1;
    var pr = 1.7 + rand() * 0.7;
    var ps = Math.sqrt(1 - pu * pu);
    var pc = rand() < 0.16 ? [167, 139, 250] : (rand() < 0.12 ? [244, 114, 182] : [94, 234, 212]);
    particles.push({
      p: [Math.cos(pt) * ps * pr, pu * pr, Math.sin(pt) * ps * pr],
      size: 0.55 + rand() * 1.35,
      phase: rand() * TAU,
      speed: 0.3 + rand() * 0.8,
      c: pc
    });
  }
  var streaks = [];
  for (i = 0; i < 18; i++) streaks.push(rand() * TAU);

  /* ---------- canvas sizing ---------- */
  function resize() {
    var rect = canvas.getBoundingClientRect();
    W = Math.max(1, rect.width);
    H = Math.max(1, rect.height);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var pw = Math.round(W * dpr);
    var ph = Math.round(H * dpr);
    if (canvas.width !== pw) canvas.width = pw;
    if (canvas.height !== ph) canvas.height = ph;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = W / 2;
    cy = H / 2;
    unit = Math.min(W * 0.34, H * 0.27);
  }

  function measure() {
    var docH = document.documentElement.scrollHeight || document.body.scrollHeight || 0;
    maxScroll = Math.max(1, docH - window.innerHeight);
  }

  /* ---------- drawing ---------- */
  function drawBackdrop() {
    var r = unit * 2.5;
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, 'rgba(34, 211, 238, 0.09)');
    g.addColorStop(0.34, 'rgba(167, 139, 250, 0.05)');
    g.addColorStop(0.7, 'rgba(244, 114, 182, 0.018)');
    g.addColorStop(1, 'rgba(5, 6, 10, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function drawRadar(time) {
    var R = unit;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.lineWidth = 1;
    var radii = [0.78, 1.15, 1.52];
    for (var ri = 0; ri < radii.length; ri++) {
      ctx.beginPath();
      ctx.arc(0, 0, R * radii[ri], 0, TAU);
      ctx.strokeStyle = 'rgba(94, 234, 212, ' + (0.055 - ri * 0.012) + ')';
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.10)';
    for (var ti = 0; ti < 24; ti++) {
      var a = (ti / 24) * TAU + time * 0.02;
      var r1 = R * (ti % 6 === 0 ? 1.52 : 1.48);
      var r2 = R * 1.6;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.075)';
    ctx.beginPath(); ctx.moveTo(-R * 1.35, 0); ctx.lineTo(R * 1.35, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -R * 1.35); ctx.lineTo(0, R * 1.35); ctx.stroke();
    var sweep = time * 0.45;
    ctx.strokeStyle = 'rgba(94, 234, 212, 0.10)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(sweep) * R * 1.52, Math.sin(sweep) * R * 1.52);
    ctx.stroke();
    ctx.restore();
  }

  function drawStreaks(vel, time) {
    if (vel < 0.0006) return;
    var a0 = Math.min(0.22, vel * 9);
    if (a0 < 0.01) return;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.lineWidth = 1;
    for (var si = 0; si < streaks.length; si++) {
      var ang = streaks[si] + time * 0.05;
      var r1 = unit * 0.55;
      var r2 = unit * (0.95 + Math.min(0.75, vel * 26));
      ctx.strokeStyle = 'rgba(94, 234, 212, ' + a0.toFixed(3) + ')';
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * r1, Math.sin(ang) * r1);
      ctx.lineTo(Math.cos(ang) * r2, Math.sin(ang) * r2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawParticles(time) {
    for (var pi = 0; pi < particles.length; pi++) {
      var part = particles[pi];
      var p = rotY(part.p, time * 0.05 + scroll * 0.55);
      var q = project(p);
      if (q.x < -24 || q.x > W + 24 || q.y < -24 || q.y > H + 24) continue;
      var tw = 0.5 + 0.5 * Math.sin(time * part.speed + part.phase);
      var a = (0.08 + 0.30 * tw) * q.fade;
      var sz = part.size * (0.6 + (q.s / unit) * 0.35);
      ctx.beginPath();
      ctx.arc(q.x, q.y, Math.max(0.4, sz), 0, TAU);
      ctx.fillStyle = rgba(part.c, a);
      ctx.fill();
    }
  }

  function drawRings(time) {
    for (var ri = 0; ri < rings.length; ri++) {
      var ring = rings[ri];
      var spin = ring.spin + time * ring.speed + scroll * ring.scrollSpin;
      var proj = [];
      for (var pi = 0; pi < ring.pts.length; pi++) {
        proj.push(project(rotY(ring.pts[pi], spin)));
      }
      ctx.beginPath();
      for (pi = 0; pi < proj.length; pi++) {
        if (pi === 0) ctx.moveTo(proj[pi].x, proj[pi].y);
        else ctx.lineTo(proj[pi].x, proj[pi].y);
      }
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.055)';
      ctx.lineWidth = 1.1;
      ctx.stroke();
      for (pi = 0; pi < proj.length - 1; pi++) {
        var q1 = proj[pi], q2 = proj[pi + 1];
        var tt = 0.5 + 0.5 * Math.sin((pi / ring.seg) * TAU * 1.5 + time * 0.6 + ring.phase);
        var col = mix(ring.c1, ring.c2, tt);
        var pulse = 0.5 + 0.5 * Math.sin((pi / ring.seg) * TAU * 2 - time * 1.5 + ring.phase);
        var a = (0.14 + 0.42 * q1.fade) * (0.55 + 0.45 * pulse);
        ctx.beginPath();
        ctx.moveTo(q1.x, q1.y);
        ctx.lineTo(q2.x, q2.y);
        ctx.strokeStyle = rgba(col, a);
        ctx.lineWidth = 0.55 + q1.fade * 0.85 + pulse * 0.25;
        ctx.stroke();
      }
      for (var si = 0; si < ring.satPts.length; si++) {
        var sq = project(rotY(ring.satPts[si], spin));
        var ss = clamp(sq.s * 0.022, 2, 7);
        var satCol = mix(ring.c1, ring.c2, si / Math.max(1, ring.satPts.length - 1));
        ctx.save();
        ctx.translate(sq.x, sq.y);
        ctx.rotate(Math.PI / 4 + time * 0.2);
        ctx.fillStyle = rgba(satCol, 0.18 * sq.fade);
        ctx.fillRect(-ss, -ss, ss * 2, ss * 2);
        ctx.fillStyle = rgba(satCol, 0.72 * sq.fade);
        ctx.fillRect(-ss * 0.42, -ss * 0.42, ss * 0.84, ss * 0.84);
        ctx.restore();
      }
    }
  }

  function drawHelix(time) {
    var spin = time * 0.55 + scroll * 2.2;
    var tilt = 0.12 + Math.sin(time * 0.18) * 0.08;
    var A = [], B = [];
    for (var hi = 0; hi <= HELIX_N; hi++) {
      A.push(project(rotY(rotZ(helixA[hi], tilt), spin)));
      B.push(project(rotY(rotZ(helixB[hi], tilt), spin)));
    }
    for (hi = 0; hi < HELIX_N; hi += 2) {
      var ra = A[hi], rb = B[hi];
      var fade = (ra.fade + rb.fade) * 0.5;
      ctx.beginPath();
      ctx.moveTo(ra.x, ra.y);
      ctx.lineTo(rb.x, rb.y);
      ctx.strokeStyle = 'rgba(244, 114, 182, ' + (0.05 + fade * 0.10).toFixed(3) + ')';
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }
    for (hi = 0; hi < HELIX_N; hi++) {
      var t = hi / HELIX_N;
      var fadeA = (A[hi].fade + A[hi + 1].fade) * 0.5;
      var fadeB = (B[hi].fade + B[hi + 1].fade) * 0.5;
      var colA = mix([94, 234, 212], [167, 139, 250], t);
      var colB = mix([34, 211, 238], [244, 114, 182], t);
      ctx.beginPath();
      ctx.moveTo(A[hi].x, A[hi].y);
      ctx.lineTo(A[hi + 1].x, A[hi + 1].y);
      ctx.strokeStyle = rgba(colA, 0.16 + fadeA * 0.42);
      ctx.lineWidth = 0.7 + fadeA * 0.8;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(B[hi].x, B[hi].y);
      ctx.lineTo(B[hi + 1].x, B[hi + 1].y);
      ctx.strokeStyle = rgba(colB, 0.14 + fadeB * 0.36);
      ctx.lineWidth = 0.7 + fadeB * 0.7;
      ctx.stroke();
    }
    for (hi = 0; hi <= HELIX_N; hi += 3) {
      var pa = A[hi];
      ctx.beginPath();
      ctx.arc(pa.x, pa.y, 0.7 + pa.fade * 1.1, 0, TAU);
      ctx.fillStyle = 'rgba(94, 234, 212, ' + (0.16 + pa.fade * 0.45).toFixed(3) + ')';
      ctx.fill();
    }
  }

  function drawCore(time) {
    var spin = time * 0.18 + scroll * 1.65;
    var tilt = 0.1 + Math.sin(time * 0.21) * 0.16;
    var roll = Math.sin(time * 0.16) * 0.07;
    var P = [];
    for (var vi = 0; vi < icoVerts.length; vi++) {
      P.push(project(rotZ(rotX(rotY(icoVerts[vi], spin), tilt), roll)));
    }
    for (var di = 0; di < coreDots.length; di++) {
      var dq = project(rotY(rotX(coreDots[di], tilt), spin * 1.35));
      ctx.beginPath();
      ctx.arc(dq.x, dq.y, 0.5 + dq.fade * 0.9, 0, TAU);
      ctx.fillStyle = 'rgba(94, 234, 212, ' + (0.08 + dq.fade * 0.22).toFixed(3) + ')';
      ctx.fill();
    }
    for (var fi = 0; fi < icoFaces.length; fi++) {
      var f = icoFaces[fi];
      var qa = P[f[0]], qb = P[f[1]], qc = P[f[2]];
      var fa = (qa.fade + qb.fade + qc.fade) / 3;
      ctx.beginPath();
      ctx.moveTo(qa.x, qa.y);
      ctx.lineTo(qb.x, qb.y);
      ctx.lineTo(qc.x, qc.y);
      ctx.closePath();
      ctx.fillStyle = 'rgba(34, 211, 238, ' + (0.008 + fa * 0.014).toFixed(3) + ')';
      ctx.fill();
    }
    for (var ei = 0; ei < icoEdges.length; ei++) {
      var e = icoEdges[ei];
      var ea = P[e[0]], eb = P[e[1]];
      var ef = (ea.fade + eb.fade) * 0.5;
      ctx.beginPath();
      ctx.moveTo(ea.x, ea.y);
      ctx.lineTo(eb.x, eb.y);
      ctx.strokeStyle = 'rgba(34, 211, 238, ' + (0.05 + ef * 0.10).toFixed(3) + ')';
      ctx.lineWidth = 2.6 + ef * 1.8;
      ctx.stroke();
    }
    for (ei = 0; ei < icoEdges.length; ei++) {
      e = icoEdges[ei];
      ea = P[e[0]]; eb = P[e[1]];
      ef = (ea.fade + eb.fade) * 0.5;
      var col = mix([94, 234, 212], [167, 139, 250], 0.5 + 0.5 * Math.sin(ei * 0.7 + time * 0.4));
      ctx.beginPath();
      ctx.moveTo(ea.x, ea.y);
      ctx.lineTo(eb.x, eb.y);
      ctx.strokeStyle = rgba(col, 0.16 + ef * 0.48);
      ctx.lineWidth = 0.65 + ef * 0.75;
      ctx.stroke();
    }
    for (vi = 0; vi < P.length; vi++) {
      var vq = P[vi];
      ctx.beginPath();
      ctx.arc(vq.x, vq.y, 2.2 + vq.fade * 2.4, 0, TAU);
      ctx.fillStyle = 'rgba(94, 234, 212, ' + (0.08 + vq.fade * 0.16).toFixed(3) + ')';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(vq.x, vq.y, 0.9 + vq.fade * 1.1, 0, TAU);
      ctx.fillStyle = 'rgba(226, 232, 240, ' + (0.35 + vq.fade * 0.45).toFixed(3) + ')';
      ctx.fill();
    }
    var nq = project([0, 0, 0]);
    var nr = Math.max(10, 0.16 * nq.s);
    var ng = ctx.createRadialGradient(nq.x, nq.y, 0, nq.x, nq.y, nr * 4.2);
    ng.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
    ng.addColorStop(0.18, 'rgba(94, 234, 212, 0.55)');
    ng.addColorStop(0.52, 'rgba(34, 211, 238, 0.12)');
    ng.addColorStop(1, 'rgba(34, 211, 238, 0)');
    ctx.fillStyle = ng;
    ctx.beginPath();
    ctx.arc(nq.x, nq.y, nr * 4.2, 0, TAU);
    ctx.fill();
  }

  function drawScanRing(time) {
    var sy = Math.sin(time * 0.72) * 1.04;
    var sr = Math.sqrt(Math.max(0, CORE_R * CORE_R - sy * sy)) * 1.04;
    if (sr < 0.04) return;
    var N = 64;
    var pts = [];
    for (var si = 0; si <= N; si++) {
      var a = (si / N) * TAU;
      pts.push(project([Math.cos(a) * sr, sy, Math.sin(a) * sr]));
    }
    ctx.beginPath();
    for (si = 0; si < pts.length; si++) {
      if (si === 0) ctx.moveTo(pts[si].x, pts[si].y);
      else ctx.lineTo(pts[si].x, pts[si].y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(94, 234, 212, 0.022)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(94, 234, 212, 0.22)';
    ctx.lineWidth = 0.9;
    ctx.stroke();
    var sy2 = sy - 0.09;
    var sr2 = Math.sqrt(Math.max(0, CORE_R * CORE_R - sy2 * sy2)) * 1.02;
    if (sr2 > 0.04) {
      ctx.beginPath();
      for (si = 0; si <= N; si++) {
        var a2 = (si / N) * TAU;
        var q2 = project([Math.cos(a2) * sr2, sy2, Math.sin(a2) * sr2]);
        if (si === 0) ctx.moveTo(q2.x, q2.y);
        else ctx.lineTo(q2.x, q2.y);
      }
      ctx.strokeStyle = 'rgba(167, 139, 250, 0.10)';
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }
  }

  function roundRect(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }

  function fitText(text, maxW, size, weight) {
    ctx.font = weight + ' ' + size.toFixed(2) + 'px ' + MONO;
    var tw = ctx.measureText(text).width;
    if (tw > maxW && tw > 0) size = Math.max(2.2, size * (maxW / tw));
    return size;
  }

  function drawDocs(time) {
    var center = project([0, 0, 0]);
    var items = [];
    for (var di = 0; di < docs.length; di++) {
      var doc = docs[di];
      var ang = doc.a + time * doc.speed + scroll * 1.35;
      var p = [
        Math.cos(ang) * doc.r,
        doc.y + Math.sin(ang * 1.7 + di) * 0.06,
        Math.sin(ang) * doc.r
      ];
      items.push({ doc: doc, ang: ang, q: project(p) });
    }
    items.sort(function (a, b) { return b.q.z - a.q.z; });
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.075)';
    ctx.lineWidth = 0.7;
    for (var li = 0; li < items.length; li++) {
      var lq = items[li].q;
      ctx.beginPath();
      ctx.moveTo(lq.x, lq.y);
      ctx.lineTo(center.x, center.y);
      ctx.stroke();
    }
    for (var ii = 0; ii < items.length; ii++) {
      var item = items[ii];
      var d = item.doc;
      var qq = item.q;
      if (qq.x < -80 || qq.x > W + 80 || qq.y < -80 || qq.y > H + 80) continue;
      var w = d.w * qq.s;
      var h = d.h * qq.s;
      var rot = Math.sin(item.ang) * 0.14 + (qq.x - cx) * 0.0005;
      var rad = Math.min(7, w * 0.09);
      var pad = w * 0.09;
      var maxW = w - pad * 2 - w * 0.06;
      ctx.save();
      ctx.translate(qq.x, qq.y);
      ctx.rotate(rot);
      ctx.globalAlpha = 0.55 + qq.fade * 0.45;

      // card body
      ctx.fillStyle = 'rgba(6, 9, 16, 0.88)';
      ctx.strokeStyle = rgba(d.c, 0.55);
      ctx.lineWidth = 1;
      roundRect(ctx, -w / 2, -h / 2, w, h, rad);
      ctx.fill();
      ctx.stroke();

      // accent rule
      ctx.fillStyle = rgba(d.c, 0.55);
      ctx.fillRect(-w / 2 + pad, -h / 2 + pad, w - pad * 2, Math.max(1, h * 0.014));

      // status dot
      ctx.beginPath();
      ctx.arc(w / 2 - pad, -h / 2 + h * 0.19, Math.max(1, w * 0.03), 0, TAU);
      ctx.fillStyle = rgba(d.c, 0.9);
      ctx.fill();

      // title
      var tSize = fitText(d.title, maxW, Math.max(4, w * 0.15), '700');
      ctx.font = '700 ' + tSize.toFixed(2) + 'px ' + MONO;
      ctx.fillStyle = 'rgba(232, 238, 248, 0.92)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(d.title, -w / 2 + pad, -h / 2 + h * 0.19);

      // subtitle
      var sSize = fitText(d.sub, maxW, Math.max(3, w * 0.1), '500');
      ctx.font = '500 ' + sSize.toFixed(2) + 'px ' + MONO;
      ctx.fillStyle = rgba(d.c, 0.82);
      ctx.fillText(d.sub, -w / 2 + pad, -h / 2 + h * 0.19 + tSize * 1.2 + sSize * 0.7);

      // data bars
      ctx.fillStyle = 'rgba(226, 232, 240, 0.22)';
      var bottom = h / 2 - pad;
      for (var b = 0; b < 3; b++) {
        ctx.fillRect(
          -w / 2 + pad,
          bottom - (b + 1) * Math.max(2.4, h * 0.075),
          maxW * (0.92 - b * 0.24),
          Math.max(0.8, h * 0.012)
        );
      }

      // id tag
      ctx.fillStyle = rgba(d.c, 0.5);
      ctx.font = '500 ' + Math.max(2.4, w * 0.062).toFixed(2) + 'px ' + MONO;
      ctx.textAlign = 'right';
      ctx.fillText('DOC_' + d.tag, w / 2 - pad, h / 2 - h * 0.08);

      ctx.restore();
    }
  }

  function updateHud(progress, now) {
    if (gaugeEl) {
      gaugeEl.style.transform = 'scaleY(' + (0.05 + progress * 0.95).toFixed(4) + ')';
    }
    if (now - hudLast < 110) return;
    hudLast = now;
    if (yawEl) {
      var deg = Math.round(((cam.yaw * 180 / Math.PI) % 360 + 360) % 360);
      yawEl.textContent = String(deg).padStart(3, '0');
    }
    if (depthEl) {
      depthEl.textContent = (CAM_Z / cam.z).toFixed(2) + 'x';
    }
    var idx = Math.min(modes.length - 1, Math.floor(progress * modes.length));
    if (idx !== modeIndex) {
      modeIndex = idx;
      if (modeEl) modeEl.textContent = modes[idx];
    }
  }

  /* ---------- loop ---------- */
  function frame(now) {
    if (!active) return;
    raf = requestAnimationFrame(frame);
    // Guard against stale backing-store sizes after loader/layout changes.
    if (++sizeTick % 30 === 0) {
      if (Math.abs(canvas.clientWidth - W) > 1 || Math.abs(canvas.clientHeight - H) > 1) resize();
    }
    var time = now * 0.001;
    var dt = lastNow ? Math.min(0.1, Math.max(0.001, (now - lastNow) / 1000)) : 0.016;
    lastNow = now;
    var raw = maxScroll > 0 ? clamp(window.scrollY / maxScroll, 0, 1) : 0;
    var inst = raw - scrollRaw;
    scrollRaw = raw;
    var kScroll = 1 - Math.exp(-dt * 7.5);
    var kPointer = 1 - Math.exp(-dt * 5.5);
    var kVel = 1 - Math.exp(-dt * 12);
    scrollVel = lerp(scrollVel, Math.abs(inst), kVel);
    scroll = lerp(scroll, raw, kScroll);
    pointerX = lerp(pointerX, pointerTX, kPointer);
    pointerY = lerp(pointerY, pointerTY, kPointer);

    cam.yaw = 0.55 + scroll * 2.4 + pointerX * 0.22 + Math.sin(time * 0.18) * 0.05;
    cam.pitch = -0.18 + Math.sin(scroll * TAU) * 0.22 + pointerY * 0.16;
    cam.roll = (scroll - 0.5) * 0.55 + pointerX * 0.03;
    cam.z = CAM_Z - Math.sin(scroll * Math.PI) * 0.72;
    cam.offsetY = Math.sin(scroll * TAU * 1.2) * 0.05;

    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    drawBackdrop();
    drawRadar(time);
    drawStreaks(scrollVel, time);
    ctx.globalCompositeOperation = 'lighter';
    drawParticles(time);
    drawRings(time);
    drawHelix(time);
    drawCore(time);
    drawScanRing(time);
    ctx.globalCompositeOperation = 'source-over';
    drawDocs(time);
    updateHud(raw, now);
  }

  function start() {
    if (active) return;
    active = true;
    lastNow = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    active = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }
  function sync() {
    if (!wideQuery.matches || document.hidden || motionQuery.matches) {
      stop();
      return;
    }
    measure();
    resize();
    start();
  }

  /* ---------- events ---------- */
  window.addEventListener('resize', function () {
    measure();
    resize();
    sync();
  }, { passive: true });
  document.addEventListener('visibilitychange', sync);
  if (wideQuery.addEventListener) wideQuery.addEventListener('change', sync);
  else if (wideQuery.addListener) wideQuery.addListener(sync);
  if (motionQuery.addEventListener) motionQuery.addEventListener('change', sync);
  else if (motionQuery.addListener) motionQuery.addListener(sync);

  window.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    pointerTX = clamp((e.clientX / window.innerWidth) * 2 - 1, -1, 1);
    pointerTY = clamp((e.clientY / window.innerHeight) * 2 - 1, -1, 1);
  }, { passive: true });

  if (window.ResizeObserver) {
    new ResizeObserver(function () { resize(); }).observe(stage);
    new ResizeObserver(function () { measure(); }).observe(document.body);
  }
  if (window.MutationObserver) {
    new MutationObserver(function () {
      requestAnimationFrame(function () { resize(); measure(); });
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  window.addEventListener('load', function () {
    measure();
    resize();
    sync();
    setTimeout(resize, 900);
    setTimeout(resize, 2000);
  });

  measure();
  resize();
  sync();
  requestAnimationFrame(function () { resize(); });
})();
