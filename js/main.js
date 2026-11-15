/* KATE stage LASH 蒲田西口店 — MEN'S BROW
   依存ライブラリなし。動きはすべて「一度だけ・順番に」再生し、reduced-motion では静止状態を表示する。 */
(function () {
  'use strict';

  var doc = document;
  doc.documentElement.classList.add('js');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(s, c) { return (c || doc).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function easeIn(t) { return t * t; }
  function smooth(a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

  /* ------------------------------------------------------------------
     1. テキスト分割（見出しを1文字ずつ出す）
  ------------------------------------------------------------------ */
  $$('[data-split-io]').forEach(function (el) {
    var i = 0;
    el.setAttribute('aria-label', el.textContent);
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = doc.createDocumentFragment();
          Array.from(n.textContent).forEach(function (c) {
            var s = doc.createElement('span');
            s.className = 'ch'; s.textContent = c; s.setAttribute('aria-hidden', 'true');
            s.style.setProperty('--i', i++);
            frag.appendChild(s);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1) { walk(n); }
      });
    })(el);
  });

  /* ------------------------------------------------------------------
     2. 流れる帯（タグ／ティッカー）
  ------------------------------------------------------------------ */
  $$('[data-tags]').forEach(function (t) {
    var html = t.getAttribute('data-tags').split('|').map(function (s) { return '<span>' + s + '</span>'; }).join('');
    t.innerHTML = html + html;
  });
  $$('[data-ticker]').forEach(function (t) {
    var items = t.getAttribute('data-ticker').split('|'), html = '';
    for (var k = 0; k < 4; k++) {
      items.forEach(function (s) { html += '<span' + (/[^\x00-\x7F]/.test(s) ? ' class="jp"' : '') + '>' + s + '</span>'; });
    }
    t.innerHTML = html + html;
  });

  /* ------------------------------------------------------------------
     3. カウントアップ
  ------------------------------------------------------------------ */
  function countUp(el) {
    if (reduce || el.getAttribute('data-counted')) return;
    el.setAttribute('data-counted', '1');
    var to = parseFloat(el.getAttribute('data-count')), dec = +(el.getAttribute('data-dec') || 0), sep = el.hasAttribute('data-sep');
    var t0 = null, dur = 1400;
    function fmt(v) { var s = v.toFixed(dec); return sep ? Number(s).toLocaleString('ja-JP') : s; }
    function step(ts) {
      if (!t0) t0 = ts;
      var k = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(to * e);
      if (k < 1) requestAnimationFrame(step); else el.textContent = fmt(to);
    }
    requestAnimationFrame(step);
  }

  /* ------------------------------------------------------------------
     4. 眉の描画エンジン（毛を1本ずつ生成してCanvasに描く）
        座標系：400×232 の箱の中に「向かって右の眉＋目」。眉頭が左、眉尻が右。
  ------------------------------------------------------------------ */
  var BOX_W = 400, BOX_H = 232, PAIR_W = 720;
  var SHAPE = [[88, 106], [170, 86], [290, 50], [372, 94]];            // 骨格に合わせた設計ライン（3次ベジェ）
  var GUIDES = [[[95, 232], [95, 78]], [[204, 232], [290, 50]], [[273, 232], [390, 78]]];   // 小鼻から伸びる3本の基準線
  var MARKS = [[95, 104], [277, 73], [373, 95]];                       // 眉頭・眉山・眉尻
  var HW = 21;                                                         // 眉の半分の太さ
  var MINW = 1;                                                        // 縮小表示でも毛が消えないための最小幅（fit() が更新）

  function prng(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function makeSpine(P) {
    var sp = {
      tan: function (t) {
        t = clamp(t, 0, 1);
        var u = 1 - t;
        var dx = 3 * u * u * (P[1][0] - P[0][0]) + 6 * u * t * (P[2][0] - P[1][0]) + 3 * t * t * (P[3][0] - P[2][0]);
        var dy = 3 * u * u * (P[1][1] - P[0][1]) + 6 * u * t * (P[2][1] - P[1][1]) + 3 * t * t * (P[3][1] - P[2][1]);
        var l = Math.sqrt(dx * dx + dy * dy) || 1;
        return [dx / l, dy / l];
      },
      pt: function (t) {
        if (t < 0) { var a = sp.pt(0), d = sp.tan(0); return [a[0] + d[0] * t * 290, a[1] + d[1] * t * 290]; }
        if (t > 1) { var b = sp.pt(1), e = sp.tan(1); return [b[0] + e[0] * (t - 1) * 290, b[1] + e[1] * (t - 1) * 290]; }
        var u = 1 - t;
        return [u * u * u * P[0][0] + 3 * u * u * t * P[1][0] + 3 * u * t * t * P[2][0] + t * t * t * P[3][0],
                u * u * u * P[0][1] + 3 * u * u * t * P[1][1] + 3 * u * t * t * P[2][1] + t * t * t * P[3][1]];
      }
    };
    return sp;
  }

  function halfWidth(t) {
    t = clamp(t, 0, 1);
    var w = t <= 0.5 ? HW : HW * (1 - Math.pow((t - 0.5) / 0.5, 1.3) * 0.9);
    if (t < 0.07) w *= 0.6 + 0.4 * Math.sqrt(t / 0.07);
    return w;
  }

  /* o: seed, P, n(本数), mess(乱れ), thick(太さ), tmax(長さ), sb/sa/sm/st(下・上・眉間・眉尻のムダ毛), stubble(剃り跡) */
  function buildBrow(o) {
    o = o || {};
    var rnd = prng(o.seed || 7), sp = makeSpine(o.P || SHAPE);
    var mess = o.mess == null ? 1 : o.mess, thick = o.thick || 1, tmax = o.tmax || 1;
    var hairs = [];

    function add(t, u, kind, fine) {
      var p = sp.pt(t), tg = sp.tan(t), nx = -tg[1], ny = tg[0];
      var w = halfWidth(t);
      var ta = Math.atan2(tg[1], tg[0]);
      var a1 = ta - u * 0.34;                                           // 下の毛は上向き、上の毛は下向きに流れて中央で重なる
      a1 = lerp(a1, -Math.PI / 2 + 0.38, (1 - smooth(0, 0.26, t)) * 0.85);   // 眉頭の毛は立ち上がる
      var L = (17.5 - 6.5 * clamp(t, 0, 1)) * (0.9 + rnd() * 0.25);
      var a0 = a1 + (rnd() - 0.5) * 1.9 * mess * (0.5 + rnd());
      if (rnd() < 0.18 * mess) a0 += (rnd() < 0.5 ? -1 : 1) * (0.6 + rnd() * 0.7);
      var l0 = L * (1 + (rnd() < 0.42 * mess ? 0.35 + rnd() * 0.75 : rnd() * 0.18));
      var h = {
        x: p[0] + nx * u * w, y: p[1] + ny * u * w, t: t, k: kind,
        a0: a0, a1: a1, l0: l0, l1: L,
        c0: (rnd() - 0.5) * 0.5 * mess, c1: 0.1 + rnd() * 0.05,
        w: 1.05 + rnd() * 0.5, al: 0.72 + rnd() * 0.28, r: rnd()
      };
      if (fine) { h.l0 = h.l1 = 5 + rnd() * 6.5; h.w = 0.75 + rnd() * 0.3; h.al = 0.45 + rnd() * 0.35; h.a1 = h.a0; h.c1 = h.c0; }
      hairs.push(h);
    }

    var n = o.n || 320, i, t, u;
    for (i = 0; i < n; i++) {
      t = rnd() * tmax;
      u = ((rnd() + rnd() - 1) * 0.62 + (rnd() * 2 - 1) * 0.38) * thick;
      var kind = 0;
      if (Math.abs(u) > 1.02) kind = u > 0 ? 1 : 2;                      // 設計ラインからはみ出した毛 → WAXで除去
      else if (Math.abs(u) < 0.62 && t < 0.62 && rnd() < 0.17) kind = 4; // 密集部分の毛 → 間引き
      add(t, u, kind, false);
    }
    for (i = 0; i < (o.sb || 0); i++) add(0.04 + rnd() * 0.98, 1.12 + rnd() * 1.2, 1, true);
    for (i = 0; i < (o.sa || 0); i++) add(0.1 + rnd() * 0.85, -(1.12 + rnd() * 0.85), 2, true);
    for (i = 0; i < (o.sm || 0); i++) add(-(0.01 + rnd() * (o.smSpan || 0.24)), -1.1 + rnd() * 2.4, 3, true);
    for (i = 0; i < (o.st || 0); i++) add(1 + rnd() * 0.1, -2 + rnd() * 4, 3, true);

    var dots = [];
    for (i = 0; i < (o.stubble || 0); i++) {
      t = rnd(); u = (rnd() * 2 - 1) * 1.05;
      if (Math.abs(u) < thick && t < tmax) continue;
      var p = sp.pt(t), tg = sp.tan(t), w = halfWidth(t);
      dots.push([p[0] - tg[1] * u * w, p[1] + tg[0] * u * w, 0.5 + rnd() * 0.5]);
    }
    return { hairs: hairs, dots: dots, sp: sp };
  }

  /* st: comb(毛流れ) / trim(長さ・間引き) / wb, wa, wm(下・上・眉間のWAX) を 0〜1 で渡す */
  function drawHairs(ctx, B, st, color) {
    var hs = B.hairs, i, h;
    ctx.fillStyle = color;
    for (i = 0; i < hs.length; i++) {
      h = hs[i];
      var alpha = h.al, ox = 0, oy = 0, q;
      if (h.k === 1 || h.k === 2 || h.k === 3) {
        q = clamp(((h.k === 1 ? st.wb : h.k === 2 ? st.wa : st.wm) - 0.45) / 0.55, 0, 1);
        if (q >= 1) continue;
        alpha *= 1 - q;
        ox = -44 * easeIn(q); oy = -10 * easeIn(q);
      } else if (h.k === 4) {
        q = clamp(st.trim * 1.5 - h.t * 0.5, 0, 1);
        if (q >= 1) continue;
        alpha *= 1 - q;
      }
      var len = lerp(h.l0, h.l1, ease(clamp(st.trim * 1.6 - h.t * 0.6, 0, 1)));
      var cb = ease(clamp(st.comb * 1.5 - h.t * 0.5, 0, 1));
      var ang = lerp(h.a0, h.a1, cb), curv = lerp(h.c0, h.c1, cb);
      var cs = Math.cos(ang), sn = Math.sin(ang);
      var x0 = h.x + ox, y0 = h.y + oy, tx = x0 + cs * len, ty = y0 + sn * len;
      var mx = (x0 + tx) / 2 - sn * curv * len, my = (y0 + ty) / 2 + cs * curv * len;
      var hw = Math.max(h.w, MINW) * 0.5, px = -sn * hw, py = cs * hw;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(x0 + px, y0 + py);
      ctx.quadraticCurveTo(mx + px * 0.6, my + py * 0.6, tx, ty);
      ctx.quadraticCurveTo(mx - px * 0.6, my - py * 0.6, x0 - px, y0 - py);
      ctx.closePath();
      ctx.fill();
    }
    for (i = 0; i < B.dots.length; i++) {
      ctx.globalAlpha = 0.32 * B.dots[i][2];
      ctx.beginPath(); ctx.arc(B.dots[i][0], B.dots[i][1], Math.max(0.9, MINW * 0.42), 0, 6.3); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawEye(ctx, color, bg, chalk) {
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.save();
    ctx.beginPath(); ctx.moveTo(112, 181); ctx.quadraticCurveTo(208, 100, 322, 168); ctx.quadraticCurveTo(216, 212, 112, 181); ctx.closePath();
    ctx.clip();
    if (chalk) {
      ctx.fillStyle = color; ctx.globalAlpha = 0.82;
      ctx.beginPath(); ctx.arc(212, 163, 29, 0, 6.3); ctx.fill();
      ctx.fillStyle = bg; ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(212, 163, 12.5, 0, 6.3); ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(205, 156, 3.6, 0, 6.3); ctx.fill();
    } else {
      ctx.fillStyle = color; ctx.globalAlpha = 0.94;
      ctx.beginPath(); ctx.arc(212, 163, 30, 0, 6.3); ctx.fill();
      ctx.fillStyle = bg; ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(201, 152, 7, 0, 6.3); ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = color;
    ctx.globalAlpha = 1; ctx.lineWidth = Math.max(3.2, MINW * 1.5);
    ctx.beginPath(); ctx.moveTo(106, 184); ctx.quadraticCurveTo(208, 98, 328, 167); ctx.stroke();
    ctx.globalAlpha = 0.5; ctx.lineWidth = Math.max(1.4, MINW * 0.8);
    ctx.beginPath(); ctx.moveTo(322, 168); ctx.quadraticCurveTo(216, 213, 120, 184); ctx.stroke();
    ctx.restore();
  }

  function fit(cv, bw, bh) {
    var r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 3);
    var w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    var ctx = cv.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    var s = Math.min(w / bw, h / bh);
    MINW = 0.92 / (s / dpr);
    ctx.setTransform(s, 0, 0, s, (w - bw * s) / 2, (h - bh * s) / 2);
    return ctx;
  }

  var INK = '#111110', PAPERC = '#f8f7f3', CHALK = '#f1eee6', BRASS = '#ecd9a6';
  var DONE = { comb: 1, trim: 1, wb: 1, wa: 1, wm: 1 }, RAW = { comb: 0, trim: 0, wb: 0, wa: 0, wm: 0 };

  /* 左右の眉を並べて描く（左は右の箱を反転） */
  function drawPair(ctx, L, R, st, color, bg, chalk, raise) {
    var dy = -(raise || 0) * 9, rot = -(raise || 0) * 0.05;
    function one(B) {
      ctx.save();
      ctx.translate(88, 106 + dy); ctx.rotate(rot); ctx.translate(-88, -106);
      drawHairs(ctx, B, st, color);
      ctx.restore();
      drawEye(ctx, color, bg, chalk);
    }
    ctx.save(); ctx.translate(BOX_W, 0); ctx.scale(-1, 1); one(L); ctx.restore();
    ctx.save(); ctx.translate(PAIR_W - BOX_W, 0); one(R); ctx.restore();
  }

  /* --- お悩みタイプのカード --- */
  var TYPES = {
    bushy: function () {
      return [buildBrow({ seed: 11, n: 380, mess: 1.15, thick: 1.2, sb: 70, sa: 42, sm: 22, st: 10 }),
              buildBrow({ seed: 23, n: 380, mess: 1.15, thick: 1.2, sb: 70, sa: 42, sm: 22, st: 10 })];
    },
    unibrow: function () {
      return [buildBrow({ seed: 31, n: 330, mess: 0.7, thick: 1.06, sb: 24, sa: 12, sm: 120, smSpan: 0.18 }),
              buildBrow({ seed: 47, n: 330, mess: 0.7, thick: 1.06, sb: 24, sa: 12, sm: 120, smSpan: 0.18 })];
    },
    shaved: function () {
      return [buildBrow({ seed: 53, n: 130, mess: 0.22, thick: 0.36, tmax: 0.7, stubble: 170 }),
              buildBrow({ seed: 61, n: 130, mess: 0.22, thick: 0.36, tmax: 0.7, stubble: 170 })];
    },
    asym: function () {
      return [buildBrow({ seed: 71, n: 340, mess: 0.6, thick: 1.12, sb: 22, sa: 10, P: [[88, 98], [168, 70], [288, 34], [372, 86]] }),
              buildBrow({ seed: 83, n: 230, mess: 0.6, thick: 0.72, sb: 22, sa: 10, P: [[88, 116], [172, 106], [290, 86], [372, 110]] })];
    }
  };
  var redraws = [];
  $$('canvas[data-brow]').forEach(function (cv) {
    var kind = cv.getAttribute('data-brow');
    if (kind === 'map') {
      var B = buildBrow({ seed: 5, mess: 1 });
      redraws.push(function () {
        var ctx = fit(cv, BOX_W, 230);
        drawHairs(ctx, B, DONE, INK);
        drawEye(ctx, INK, '#ffffff', false);
      });
    } else if (TYPES[kind]) {
      var pair = TYPES[kind]();
      redraws.push(function () {
        var ctx = fit(cv, PAIR_W, 262);
        ctx.translate(0, 16);
        drawPair(ctx, pair[0], pair[1], RAW, INK, PAPERC, false, 0);
      });
    }
  });

  /* --- 「眉が効く。」の眉（クイッと上がる） --- */
  var shoutCv = $('#shoutBrow');
  if (shoutCv) {
    var sL = buildBrow({ seed: 101, n: 430 }), sR = buildBrow({ seed: 113, n: 430 });
    var raise = 0, rafS = 0;
    var drawShout = function () {
      var ctx = fit(shoutCv, PAIR_W, 250);
      ctx.translate(0, 14);
      drawPair(ctx, sL, sR, DONE, CHALK, INK, true, raise);
    };
    redraws.push(drawShout);
    var bump = function () {
      if (reduce) return;
      cancelAnimationFrame(rafS);
      var t0 = null, dur = 1100;
      (function step(ts) {
        if (!t0) t0 = ts;
        var k = Math.min(1, (ts - t0) / dur);
        raise = Math.pow(Math.abs(Math.sin(k * Math.PI * 2)), 0.8) * (1 - k * 0.25);   // クイッ、クイッ
        if (k >= 1) raise = 0;
        drawShout();
        if (k < 1) rafS = requestAnimationFrame(step);
      })(performance.now());
    };
    var seenS = false, timerS = 0;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        var on = es[0].isIntersecting;
        clearInterval(timerS);
        if (!on) return;
        setTimeout(bump, seenS ? 300 : 1250);
        seenS = true;
        timerS = setInterval(bump, 5200);
      }, { threshold: 0.6 }).observe(shoutCv);
    }
  }

  /* --- 施術の流れ：スクロールで眉が整っていく --- */
  var procCv = $('#processBrow');
  var procState = { g: 0, q2: 0, trim: 0, comb: 0 };
  var drawProcess = function () {};
  if (procCv) {
    var PB = buildBrow({ seed: 19, n: 380, mess: 1.1, thick: 1.2, sb: 78, sa: 44, sm: 30, st: 12 });
    var strip = function (ctx, q, pts, rx, ry) {
      if (q <= 0 || q >= 1) return;
      var a = q < 0.45 ? q / 0.45 : 1 - (q - 0.45) / 0.55, m = q < 0.45 ? 0 : easeIn((q - 0.45) / 0.55);
      ctx.save();
      ctx.translate(rx * m, ry * m);
      ctx.globalAlpha = 0.86 * clamp(a * 1.6, 0, 1);
      ctx.fillStyle = '#ece2c8';
      ctx.beginPath();
      pts.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha *= 0.5; ctx.strokeStyle = '#80601f'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.stroke();
      ctx.restore();
    };
    var band = function (u0, u1, t0, t1) {
      var pts = [], i, t, p, tg, w;
      for (i = 0; i <= 12; i++) { t = lerp(t0, t1, i / 12); p = PB.sp.pt(t); tg = PB.sp.tan(t); w = halfWidth(t); pts.push([p[0] - tg[1] * u0 * w, p[1] + tg[0] * u0 * w]); }
      for (i = 12; i >= 0; i--) { t = lerp(t0, t1, i / 12); p = PB.sp.pt(t); tg = PB.sp.tan(t); w = Math.max(halfWidth(t), 7); pts.push([p[0] - tg[1] * u1 * w, p[1] + tg[0] * u1 * w]); }
      return pts;
    };
    var BELOW = band(1.06, 2.5, 0.02, 1.04), ABOVE = band(-1.06, -2.15, 0.06, 0.98);
    var MID = [[32, 62], [82, 68], [82, 146], [32, 142]];

    drawProcess = function () {
      var s = procState, ctx = fit(procCv, BOX_W, BOX_H);
      var wb = clamp(s.q2 / 0.42, 0, 1), wa = clamp((s.q2 - 0.3) / 0.4, 0, 1), wm = clamp((s.q2 - 0.6) / 0.4, 0, 1);
      var fin = clamp((s.comb - 0.72) / 0.28, 0, 1);
      var i, t, p, tg, w;

      /* 設計ライン（点線） */
      var oa = s.g * (1 - fin) * 0.85;
      if (oa > 0.01) {
        ctx.save();
        ctx.globalAlpha = oa; ctx.strokeStyle = BRASS; ctx.lineWidth = 1.1; ctx.setLineDash([4, 4]);
        ctx.beginPath();
        for (i = 0; i <= 30; i++) { t = i / 30; p = PB.sp.pt(t); tg = PB.sp.tan(t); w = halfWidth(t); if (i) ctx.lineTo(p[0] + tg[1] * w, p[1] - tg[0] * w); else ctx.moveTo(p[0] + tg[1] * w, p[1] - tg[0] * w); }
        for (i = 30; i >= 0; i--) { t = i / 30; p = PB.sp.pt(t); tg = PB.sp.tan(t); w = halfWidth(t); ctx.lineTo(p[0] - tg[1] * w, p[1] + tg[0] * w); }
        ctx.closePath(); ctx.stroke();
        ctx.restore();
      }

      drawHairs(ctx, PB, { comb: s.comb / 0.8, trim: s.trim, wb: wb, wa: wa, wm: wm }, CHALK);
      drawEye(ctx, CHALK, '#0b0b0a', true);

      /* 基準線（小鼻 → 眉頭・眉山・眉尻） */
      var ga = 1 - fin * 0.75;
      ctx.save();
      ctx.strokeStyle = BRASS; ctx.fillStyle = '#0b0b0a'; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
      GUIDES.forEach(function (g, k) {
        var li = ease(clamp(s.g * 3 - k, 0, 1));
        if (li <= 0) return;
        ctx.globalAlpha = 0.9 * ga;
        ctx.beginPath(); ctx.moveTo(g[0][0], g[0][1]); ctx.lineTo(lerp(g[0][0], g[1][0], li), lerp(g[0][1], g[1][1], li)); ctx.stroke();
        if (li > 0.72) { ctx.beginPath(); ctx.arc(MARKS[k][0], MARKS[k][1], 4, 0, 6.3); ctx.fill(); ctx.stroke(); }
      });
      ctx.restore();

      /* WAXストリップ */
      strip(ctx, wb, BELOW, -46, -8);
      strip(ctx, wa, ABOVE, -46, -12);
      strip(ctx, wm, MID, -30, -20);

      /* ハサミ */
      if (s.trim > 0.02 && s.trim < 0.98) {
        t = s.trim; p = PB.sp.pt(t); tg = PB.sp.tan(t);
        var open = 0.25 + 0.75 * Math.abs(Math.sin(s.trim * 26));
        ctx.save();
        ctx.translate(p[0] + tg[1] * 30, p[1] - tg[0] * 30);
        ctx.rotate(Math.atan2(tg[1], tg[0]) + 0.5);
        ctx.globalAlpha = Math.min(1, Math.sin(s.trim * Math.PI) * 3);
        ctx.strokeStyle = BRASS; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(17, -6 * open); ctx.moveTo(-2, 0); ctx.lineTo(17, 6 * open);
        ctx.moveTo(-2, 0); ctx.lineTo(-10, 6); ctx.moveTo(-2, 0); ctx.lineTo(-10, -6); ctx.stroke();
        ctx.beginPath(); ctx.arc(-13.5, 8.5, 4.2, 0, 6.3); ctx.stroke();
        ctx.beginPath(); ctx.arc(-13.5, -8.5, 4.2, 0, 6.3); ctx.stroke();
        ctx.restore();
      }
      /* ブラシ */
      var cq = s.comb / 0.8;
      if (cq > 0.02 && cq < 1) {
        p = PB.sp.pt(cq); tg = PB.sp.tan(cq);
        ctx.save();
        ctx.translate(p[0], p[1]);
        ctx.rotate(Math.atan2(tg[1], tg[0]) - 1.15);
        ctx.globalAlpha = Math.min(1, Math.sin(cq * Math.PI) * 3);
        ctx.strokeStyle = BRASS; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(46, 0); ctx.stroke();
        ctx.lineWidth = 1.1;
        for (i = 0; i < 7; i++) { ctx.beginPath(); ctx.moveTo(-6 + i * 3.4, -5.5); ctx.lineTo(-6 + i * 3.4, 5.5); ctx.stroke(); }
        ctx.restore();
      }
    };
    redraws.push(drawProcess);
  }

  function redrawAll() { redraws.forEach(function (f) { f(); }); }
  redrawAll();
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(redrawAll);
  window.addEventListener('load', redrawAll);
  var rsz = 0;
  window.addEventListener('resize', function () { clearTimeout(rsz); rsz = setTimeout(function () { redrawAll(); onScroll(); }, 120); });

  /* ------------------------------------------------------------------
     5. スクロールで現れる（.rv）
  ------------------------------------------------------------------ */
  var targets = $$('.rv,[data-split-io]');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        $$('[data-count]', e.target).forEach(countUp);
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    targets.forEach(function (t) { io.observe(t); });
  } else {
    targets.forEach(function (t) { t.classList.add('is-in'); });
  }

  /* ------------------------------------------------------------------
     6. カルーセル（中央のカードがアクティブ）
  ------------------------------------------------------------------ */
  function carousel(root, opts) {
    if (!root) return;
    var track = $('[class$="__track"]', root), cards = Array.prototype.slice.call(track.children), dots = $('.dots', root);
    var cur = 0, timer = null, visible = false;
    cards.forEach(function (c, i) {
      var b = doc.createElement('button');
      b.type = 'button'; b.setAttribute('aria-label', (i + 1) + '枚目を表示');
      b.addEventListener('click', function () { go(i); restart(); });
      dots.appendChild(b);
      c.addEventListener('click', function () { go(i); restart(); });
    });
    function center(i) { var c = cards[i]; return c.offsetLeft + c.offsetWidth / 2 - track.clientWidth / 2; }
    function go(i) { cur = (i + cards.length) % cards.length; track.scrollTo({ left: center(cur), behavior: reduce ? 'auto' : 'smooth' }); }
    function mark() {
      var mid = track.scrollLeft + track.clientWidth / 2, best = 0, bd = 1e9;
      cards.forEach(function (c, i) { var d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = i; } });
      cur = best;
      cards.forEach(function (c, i) { c.classList.toggle('is-active', i === best); });
      Array.prototype.slice.call(dots.children).forEach(function (d, i) { d.setAttribute('aria-current', i === best ? 'true' : 'false'); });
    }
    var raf = 0;
    track.addEventListener('scroll', function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(mark); }, { passive: true });
    $$('[data-dir]', root).forEach(function (b) { b.addEventListener('click', function () { go(cur + (+b.getAttribute('data-dir'))); restart(); }); });
    function restart() {
      clearInterval(timer);
      if (opts.auto && !reduce) timer = setInterval(function () { if (!doc.hidden && visible) go(cur + 1); }, opts.auto);
    }
    if ('IntersectionObserver' in window) { new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(root); }
    ['pointerdown', 'touchstart', 'wheel'].forEach(function (ev) { track.addEventListener(ev, restart, { passive: true }); });
    window.addEventListener('resize', function () { track.scrollTo({ left: center(cur) }); });
    requestAnimationFrame(function () { track.scrollTo({ left: center(0) }); mark(); });
    restart();
  }
  carousel($('[data-carousel="types"]'), { auto: 3400 });
  carousel($('[data-carousel="voice"]'), { auto: 5600 });

  /* ------------------------------------------------------------------
     7. ファーストビュー：50分のタイムラプス
  ------------------------------------------------------------------ */
  (function () {
    var ph = $('#fvPhoto'); if (!ph) return;
    var line = $('#karteLine'), min = $('#karteMin');
    if (reduce) {
      ph.classList.add('is-map', 'is-wipe', 'is-done');
      line.classList.remove('typing'); line.textContent = '仕上がり確認 ✓'; min.textContent = '50';
      return;
    }
    var timers = [], raf = 0, visible = true, running = false, first = true;
    function at(ms, fn) { timers.push(setTimeout(fn, ms)); }
    function type(text) {
      var i = 0;
      line.classList.add('typing');
      (function tick() { line.textContent = text.slice(0, ++i); if (i < text.length) timers.push(setTimeout(tick, 70)); })();
    }
    function count(dur) {
      var t0 = null;
      (function step(ts) {
        if (!t0) t0 = ts;
        var k = Math.min(1, (ts - t0) / dur), v = Math.round(50 * k);
        min.textContent = (v < 10 ? '0' : '') + v;
        if (k < 1) raf = requestAnimationFrame(step);
      })(performance.now());
    }
    function cycle() {
      running = true;
      if (!first) {
        ph.classList.add('is-hide');
        ph.classList.remove('is-wipe', 'is-done', 'is-map');
        void ph.offsetWidth;
        ph.classList.remove('is-hide');
      }
      first = false;
      min.textContent = '00';
      type('骨格を計測中…');
      at(500, function () { ph.classList.add('is-map'); });
      at(2400, function () { type('WAX・間引き・仕上げ'); ph.classList.add('is-wipe'); count(2400); });
      at(4850, function () { cancelAnimationFrame(raf); min.textContent = '50'; ph.classList.add('is-done'); line.classList.remove('typing'); line.textContent = '仕上がり確認 ✓'; });
      at(11800, function () { if (visible && !doc.hidden) cycle(); else running = false; });
    }
    setTimeout(cycle, 1500);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        if (visible && !running) cycle();
      }, { threshold: 0.2 }).observe(ph);
    }
    doc.addEventListener('visibilitychange', function () { if (!doc.hidden && visible && !running) cycle(); });
  })();

  /* ------------------------------------------------------------------
     8. ビフォーアフター（WAXストリップを動かす）
  ------------------------------------------------------------------ */
  (function () {
    var root = $('#ba'); if (!root) return;
    var view = $('#baView'), strip = $('#baStrip'), imgA = $('#baAfter'), imgB = $('#baBefore'), cap = $('#baCap'), lbl = $('#baStripLbl');
    var lblA = $('.ba__lbl--a', root), lblB = $('.ba__lbl--b', root);
    var DATA = {
      natural: { f: 'style-natural', strip: 'WAX', rest: 50, cap: '眉の輪郭を整えて、余分な毛をオフ。太さは残した自然な仕上がりのイメージです。' },
      business: { f: 'style-business', strip: 'WAX', rest: 50, cap: '眉間と眉下をすっきりさせて、スーツに合う清潔感のある印象に整えたイメージです。' },
      lash: { f: 'style-lash', strip: 'LIFT', rest: 84, cap: '下向きのまつ毛を根元から立ち上げたイメージ。瞳にかかる影が減り、目元がはっきり見えます。' }
    };
    var pos = 30, demo = [], rest = 50;
    function set(p, anim) {
      pos = clamp(p, 3, 97);
      root.classList.toggle('is-anim', !!anim);
      view.style.setProperty('--pos', pos + '%');
      strip.setAttribute('aria-valuenow', Math.round(pos));
      lblA.style.opacity = pos < 22 ? 0 : 1;
      lblB.style.opacity = pos > 78 ? 0 : 1;
    }
    function stopDemo() { demo.forEach(clearTimeout); demo = []; }
    function runDemo() {
      stopDemo();
      if (reduce) { set(rest); return; }
      demo.push(setTimeout(function () { set(92, true); }, 450));
      demo.push(setTimeout(function () { set(rest, true); }, 2300));
      demo.push(setTimeout(function () { root.classList.remove('is-anim'); }, 4000));
    }
    function fromEvent(e) { var r = view.getBoundingClientRect(); return (e.clientX - r.left) / r.width * 100; }
    var drag = false;
    view.addEventListener('pointerdown', function (e) {
      drag = true; stopDemo();
      try { view.setPointerCapture(e.pointerId); } catch (err) {}
      set(fromEvent(e));
    });
    view.addEventListener('pointermove', function (e) { if (drag) set(fromEvent(e)); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (ev) { view.addEventListener(ev, function () { drag = false; }); });
    strip.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowLeft' ? -4 : e.key === 'ArrowRight' ? 4 : e.key === 'Home' ? -100 : e.key === 'End' ? 100 : 0;
      if (!d) return;
      e.preventDefault(); stopDemo(); set(pos + d);
    });
    $$('[data-ba]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-ba'), d = DATA[k];
        if (root.getAttribute('data-kind') === k) return;
        $$('[data-ba]', root).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        root.setAttribute('data-kind', k);
        imgA.src = 'assets/images/' + d.f + '-after.webp';
        imgB.src = 'assets/images/' + d.f + '-before.webp';
        lbl.textContent = d.strip; cap.textContent = d.cap; rest = d.rest;
        set(k === 'lash' ? 12 : 30); runDemo();
      });
    });
    set(30);
    if ('IntersectionObserver' in window) {
      var o = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return;
        runDemo(); o.disconnect();
      }, { threshold: 0.55 });
      o.observe(view);
    }
  })();

  /* ------------------------------------------------------------------
     9. FAQ
  ------------------------------------------------------------------ */
  $$('.qa__q').forEach(function (b) {
    b.addEventListener('click', function () {
      var open = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
      b.closest('.qa').classList.toggle('is-open', open);
    });
  });

  /* ------------------------------------------------------------------
     10. スクロール連動（進捗バー／理由のドット／追従CTA／目次／道順／施術の流れ）
  ------------------------------------------------------------------ */
  var fv = $('.fv'), stick = $('#stick'), closeSec = $('#reserve'), prog = $('#progress');
  var reasons = $$('[data-reason]'), dots5 = $$('.rnav span'), rnav = $('.rnav');
  var rail = $('.route__rail'), rlist = $('.route__steps'), rsteps = $$('.rstep');
  var psticky = $('.pstage__sticky'), psteps = $$('[data-step]'), ptags = $$('.pstage__tag'), pdone = $('.pstage__done'), pbar = $('#pstageBar'), pno = $('#pstageNo');
  var sections = $$('[data-index]'), index = $('#index'), links = [];
  if (index) {
    sections.forEach(function (s, i) {
      if (!s.id) s.id = 'sec-' + i;
      var li = doc.createElement('li');
      li.innerHTML = '<a href="#' + s.id + '">' + s.getAttribute('data-index') + '</a>';
      index.appendChild(li);
    });
    links = $$('a', index);
  }

  function onScroll() {
    var vh = window.innerHeight, sy = window.pageYOffset || 0, max = doc.documentElement.scrollHeight - vh;
    if (prog) prog.style.setProperty('--p', max > 0 ? (sy / max).toFixed(4) : 0);

    var seen = -1;
    reasons.forEach(function (p, i) { if (p.getBoundingClientRect().top < vh * 0.62) seen = i; });
    dots5.forEach(function (d, i) { d.classList.toggle('is-on', i <= seen); d.classList.toggle('is-cur', i === seen); });
    if (rnav && reasons.length) {
      var lastR = reasons[reasons.length - 1].getBoundingClientRect();
      rnav.classList.toggle('is-on', seen >= 0 && lastR.bottom > vh * 0.45);
    }

    if (stick && fv && closeSec) stick.classList.toggle('is-on', fv.getBoundingClientRect().bottom < 0 && closeSec.getBoundingClientRect().top > vh * 0.72);

    var cur = 0;
    sections.forEach(function (s, i) { if (s.getBoundingClientRect().top < vh * 0.4) cur = i; });
    links.forEach(function (a, i) { a.classList.toggle('is-current', i === cur); });

    if (rail && rlist) {
      var r = rlist.getBoundingClientRect();
      rail.style.setProperty('--p', clamp((vh * 0.6 - r.top) / r.height, 0, 1).toFixed(3));
      rsteps.forEach(function (s) { s.classList.toggle('is-lit', s.getBoundingClientRect().top < vh * (s.classList.contains('rstep--goal') ? 0.52 : 0.6)); });
    }

    if (psticky && psteps.length) {
      var bottom = psticky.getBoundingClientRect().bottom, trig = Math.max(vh * 0.64, bottom + 150), span = Math.max(120, trig - bottom - 16);
      var q = psteps.map(function (s) { return clamp((trig - s.getBoundingClientRect().top) / span, 0, 1); });
      if (reduce) q = q.map(function (v) { return v > 0.5 ? 1 : 0; });
      var act = 0;
      q.forEach(function (v, i) { if (v > 0) act = i; });
      psteps.forEach(function (s, i) { s.classList.toggle('is-on', i === act); });
      var changed = procState.g !== q[0] || procState.q2 !== q[1] || procState.trim !== q[2] || procState.comb !== q[3];
      procState.g = q[0]; procState.q2 = q[1]; procState.trim = q[2]; procState.comb = q[3];
      if (changed) drawProcess();
      var fin = q[3] > 0.72;
      ptags.forEach(function (t, i) { t.classList.toggle('is-on', !fin && q[0] * 3 - i > 0.8); });
      if (pdone) pdone.classList.toggle('is-on', q[3] >= 0.97);
      if (pbar) pbar.style.setProperty('--p', ((q[0] + q[1] + q[2] + q[3]) / 4).toFixed(3));
      if (pno) pno.textContent = 'STEP ' + (act + 1) + ' / 4';
    }
  }
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { onScroll(); ticking = false; });
  }, { passive: true });
  onScroll();
})();
