// Hedefi Vur motoru: ifade ayrıştırıcı + yol simülasyonu + yıldız kuralı.
// Arayüzden bağımsızdır: tarayıcıda window.Engine, Node'da require('./engine.js') ile kullanılır
// (tools/verify.js bölümleri bununla doğrular). eval / new Function KULLANILMAZ.
//
// Koordinatlar matematik koordinatlarıdır: karakter ORİJİNDE (0, 0), y yukarı. Oyuncunun yazdığı f kaydırılmadan çizilir.
// Yol x = startX'te (varsayılan 0) f(startX)'ten başlar (tırmanma yok; eğri orijinden geçmiyorsa geçtiği yerden başlar).
// Elmas ve hedef matematiksel denetlenir (|f(x) − y| ≤ TOL), duvarlar geometrik.
(function (root) {
  'use strict';

  // ---------- Ayrıştırıcı ----------
  const FUNCS = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan, abs: Math.abs, sqrt: Math.sqrt,
    exp: Math.exp, ln: Math.log, log: Math.log10,
  };
  const CONSTS = { pi: Math.PI, e: Math.E };
  // Açgözlü eşleştirme için uzundan kısaya (exp, e'den önce denenmeli).
  const NAMES = ['sqrt', 'sin', 'cos', 'tan', 'abs', 'exp', 'log', 'ln', 'pi', 'x', 'e'];

  class ParseError extends Error {
    constructor(code, pos) { super(code); this.code = code; this.pos = pos; }
  }

  // Ekrandaki güzel simgeleri ve yaygın yazım biçimlerini düz ASCII'ye çevirir.
  function normalize(src) {
    return String(src)
      .replace(/\s+/g, ' ')
      .replace(/[×·∗]/g, '*').replace(/÷/g, '/').replace(/[−–]/g, '-')
      .replace(/π/g, 'pi').replace(/²/g, '^2').replace(/³/g, '^3')
      .replace(/,/g, '.')
      .toLowerCase();
  }

  function tokenize(src) {
    const s = normalize(src);
    const out = [];
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (c === ' ') { i++; continue; }  // boşluk yalnız ayırır: "2 3" = 2·3, 23 değil
      if (c === '√') { out.push({ t: 'fn', v: 'sqrt', root: true, i }); i++; continue; } // √x ve √(x) ikisi de olur
      if (/[0-9.]/.test(c)) {
        let j = i;
        while (j < s.length && /[0-9.]/.test(s[j])) j++;
        const txt = s.slice(i, j);
        if (txt === '.' || (txt.match(/\./g) || []).length > 1) throw new ParseError('number', i);
        out.push({ t: 'num', v: parseFloat(txt), i });
        i = j; continue;
      }
      if ('+-*/^()'.includes(c)) { out.push({ t: c, i }); i++; continue; }
      if (/[a-z]/.test(c)) {
        const name = NAMES.find(n => s.startsWith(n, i));
        if (!name) throw new ParseError('unknown', i);
        if (FUNCS[name]) out.push({ t: 'fn', v: name, i });
        else if (name === 'x') out.push({ t: 'x', i });
        else out.push({ t: 'const', v: name, i });
        i += name.length; continue;
      }
      throw new ParseError('unknown', i);
    }
    // Örtük çarpma: 2x, 3sin(x), x(x+1), (x+1)(x−1), 2π …
    const res = [];
    const ends = t => t.t === 'num' || t.t === 'x' || t.t === 'const' || t.t === ')';
    const starts = t => t.t === 'num' || t.t === 'x' || t.t === 'const' || t.t === 'fn' || t.t === '(';
    for (const tok of out) {
      const prev = res[res.length - 1];
      if (prev && ends(prev) && starts(tok)) res.push({ t: '*', i: tok.i, implicit: true });
      res.push(tok);
    }
    return res;
  }

  // Öncelik: + − < × ÷ < tekli − < ^ (sağdan birleşir). −x^2 = −(x^2), 2^−x geçerli.
  // Eksik kapanış parantezleri sonda kendiliğinden kapatılır (telefonda kolaylık).
  function parseTokens(toks) {
    let p = 0, autoClosed = 0;
    const peek = () => toks[p];
    const eat = t => (toks[p] && toks[p].t === t ? toks[p++] : null);
    const endPos = () => (toks.length ? toks[toks.length - 1].i + 1 : 0);

    function expr() {
      let a = term();
      for (;;) {
        const op = eat('+') || eat('-');
        if (!op) return a;
        a = { k: 'bin', op: op.t, a, b: term() };
      }
    }
    function term() {
      let a = unary();
      for (;;) {
        const op = eat('*') || eat('/');
        if (!op) return a;
        a = { k: 'bin', op: op.t, a, b: unary() };
      }
    }
    function unary() {
      if (eat('-')) {
        const a = unary();
        return a.k === 'num' ? { k: 'num', v: -a.v } : { k: 'neg', a };
      }
      if (eat('+')) return unary();
      return power();
    }
    function power() {
      const a = primary();
      if (eat('^')) return { k: 'bin', op: '^', a, b: unary() };
      return a;
    }
    function closeParen() {
      if (eat(')')) return;
      if (p >= toks.length) { autoClosed++; return; }
      throw new ParseError('paren', toks[p].i);
    }
    function primary() {
      const tok = peek();
      if (!tok) throw new ParseError('incomplete', endPos());
      p++;
      switch (tok.t) {
        case 'num': return { k: 'num', v: tok.v };
        case 'x': return { k: 'x' };
        case 'const': return { k: 'const', v: tok.v };
        case 'fn': {
          // √x: parantez yoksa hemen ardındaki terimin kökü (√x², √2 gibi); sin, abs… için parantez şart
          if (tok.root && !(peek() && peek().t === '(')) return { k: 'fn', f: 'sqrt', a: power() };
          if (!eat('(')) throw new ParseError('fnparen', tok.i);
          const a = expr(); closeParen();
          return { k: 'fn', f: tok.v, a };
        }
        case '(': {
          const a = expr(); closeParen();
          return a;
        }
        default: throw new ParseError(tok.t === ')' ? 'paren' : 'incomplete', tok.i);
      }
    }

    if (!toks.length) throw new ParseError('empty', 0);
    const ast = expr();
    if (p < toks.length) throw new ParseError(toks[p].t === ')' ? 'paren' : 'unexpected', toks[p].i);
    return { ast, autoClosed };
  }

  function compile(n) {
    switch (n.k) {
      case 'num': { const v = n.v; return () => v; }
      case 'x': return x => x;
      case 'const': { const v = CONSTS[n.v]; return () => v; }
      case 'neg': { const a = compile(n.a); return x => -a(x); }
      case 'fn': { const f = FUNCS[n.f], a = compile(n.a); return x => f(a(x)); }
      case 'bin': {
        const a = compile(n.a), b = compile(n.b);
        switch (n.op) {
          case '+': return x => a(x) + b(x);
          case '-': return x => a(x) - b(x);
          case '*': return x => a(x) * b(x);
          case '/': return x => a(x) / b(x);
          case '^': return x => Math.pow(a(x), b(x));
        }
      }
    }
    throw new Error('bilinmeyen düğüm ' + n.k);
  }

  // "Parça sayısı": ağaçtaki düğüm sayısı. Bir sayı ne kadar uzun olursa olsun 1 parçadır.
  // 2x → 3, sin(x) → 2, −abs(x−8) → 5, 0.15(x−8)^2 → 7
  function size(n) {
    switch (n.k) {
      case 'num': case 'x': case 'const': return 1;
      case 'neg': case 'fn': return 1 + size(n.a);
      case 'bin': return 1 + size(n.a) + size(n.b);
    }
    return 0;
  }

  // Ağacı düzgün bir metne çevirir (hata ayıklama ve belgeler için).
  function show(n, parentPrec = 0) {
    const prec = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 4 };
    switch (n.k) {
      case 'num': return n.v < 0 && parentPrec > 0 ? `(${n.v})` : String(n.v);
      case 'x': return 'x';
      case 'const': return n.v === 'pi' ? 'π' : n.v;
      case 'neg': { const s = '-' + show(n.a, 3); return parentPrec > 1 ? `(${s})` : s; }
      case 'fn': return `${n.f}(${show(n.a)})`;
      case 'bin': {
        const q = prec[n.op];
        const s = show(n.a, n.op === '^' ? q + 1 : q) + n.op + show(n.b, n.op === '^' ? q : q + 1);
        return q < parentPrec ? `(${s})` : s;
      }
    }
  }

  // parse("0.5x") → { ok: true, fn, cost, ast, autoClosed }  |  { ok: false, error, pos }
  function parse(src) {
    try {
      const { ast, autoClosed } = parseTokens(tokenize(src));
      return { ok: true, ast, fn: compile(ast), cost: size(ast), autoClosed, text: show(ast) };
    } catch (e) {
      if (e instanceof ParseError) return { ok: false, error: e.code, pos: e.pos };
      throw e;
    }
  }

  // ---------- Simülasyon ----------
  // Harita matematik koordinatlarıdır: karakter orijinde (0, 0). Varsayılan sınırlar aşağıda;
  // ekran bunun ancak bir kısmını gösterir (kaydırılabilir, yakınlaştırılabilir).
  const DEFAULT_BOARD = { xmin: -10, xmax: 30, ymin: -20, ymax: 20 };
  const R = 0.3;          // karakter yarıçapı (duvar ve kayalar için, geometrik)
  const GEM_R = 0.35;     // yalnız çizim
  const TARGET_R = 0.6;   // yalnız çizim
  // Elmas/hedef ve ters bulmaca KESİN denetlenir: eğri noktadan gerçekten geçmeli (f(5) = 0, 0.1 değil).
  // TOL yalnız bilgisayarın yuvarlama hatası içindir (sin(π) ≈ 1e-16 gibi). Koordinatlar tam sayı olduğu için yeterli.
  // Karar 2026-11-15: 0.25 pay vardı, "0.1" ve "0.01" de 1-1'i geçiyordu.
  const TOL = 1e-6;
  const SHAPE_BAND = 0.3; // ters bulmacada çizilen şeridin yarı genişliği (yalnız görsel)
  const DU = 0.02;        // ana adım
  const MAX_SEG = 0.08;   // bundan uzun parça ikiye bölünür
  const MAX_POINTS = 20000; // yol bundan çok noktaya bölünürse "çok dalgalı" (telefonu dondurmasın; normal yollar < 3000)
  const MAX_DEPTH = 12;   // bölmeye rağmen hâlâ uzunsa eğri "kopmuş" (sıçrama/sonsuz) sayılır

  function boardOf(level) { return Object.assign({}, DEFAULT_BOARD, level.board || {}); }

  function distRect(x, y, r) {
    const dx = Math.max(r.x - x, 0, x - (r.x + r.w));
    const dy = Math.max(r.y - y, 0, y - (r.y + r.h));
    return Math.hypot(dx, dy);
  }

  // Kurallar:
  //  - Yol x = 0'da f(0) noktasından başlar (karakter oraya konur), x arttıkça eğriyi izler.
  //  - Elmas ve hedef MATEMATİKSEL ve KESİN denetlenir: karakter o x'e çarpmadan ulaşırsa ve f(x) = y ise
  //    elmas toplanır / hedef vurulur. Yakınından sıyırmak sayılmaz.
  //  - Duvar ve kayalar geometriktir: karakterin (yarıçap R) değmesi yeter.
  //  - Ters bulmaca (level.shape = { fn, from, to }): x ∈ [from, to] boyunca y = g(x) olmalı (TOL içinde),
  //    yoksa 'off'; x = to'ya varınca 'win'. Hedef ve elmas yoktur.
  //  - Adımlar sabit değil, düzensiz (altın oran sırası): sabit adımla sin(50πx) gibi dalgalar tam kontrol
  //    noktalarında 0 olup aradan "kaçıyordu" (ters bulmacada 2x−3+sin(50πx) kazanıyordu).
  // Sonuç: { result: 'win'|'wall'|'broken'|'out'|'miss'|'off'|'wiggle', path: [[x,y],…], gems: [{index, at}], allGems, hit }
  // gems[].at: elmasın toplandığı path indeksi (animasyon bu anda toplar).
  function simulate(level, fn) {
    const B = boardOf(level);
    // Başlangıç x'i (2026-11-16): bazı bölümlerde karakter solda başlar (ör. −6), |x|'in köşesi, x²'nin tamamı görünsün.
    const x0 = level.startX || 0;
    const walls = level.walls || [], rocks = level.rocks || [], gems = level.gems || [];
    const T = level.target;
    const path = [];
    const got = [];
    let done = null, hit = -1;
    const Y = u => fn(x0 + u);

    // Elmas ve hedef olayları x sırasıyla (aynı x'te önce elmaslar)
    const SH = level.shape;
    const events = gems.map((g, k) => ({ x: g[0], y: g[1], k })).concat(T ? [{ x: T.x, y: T.y, k: -1 }] : [])
      .sort((a, b) => a.x - b.x || b.k - a.k);
    let ev = 0;

    function step(x, y) {
      path.push([x, y]);
      if (path.length > MAX_POINTS) { done = 'wiggle'; return; }
      if (y > B.ymax + R || y < B.ymin - R) { done = 'out'; return; }
      for (let k = 0; k < walls.length; k++) if (distRect(x, y, walls[k]) <= R) { done = 'wall'; hit = k; return; }
      for (let k = 0; k < rocks.length; k++) {
        const r = rocks[k];
        if (Math.hypot(x - r.x, y - r.y) <= r.r + R) { done = 'wall'; hit = walls.length + k; return; }
      }
      if (SH && x >= SH.from - 1e-9) {
        const gx = Math.min(x, SH.to), g = SH.fn(gx), yy = x > SH.to ? Y(SH.to - x0) : y;
        if (!(Math.abs(yy - g) <= TOL)) { done = 'off'; return; }
        if (x >= SH.to - 1e-9) { done = 'win'; return; }
      }
      while (ev < events.length && events[ev].x <= x + 1e-9) {
        const e = events[ev++];
        const fy = Y(e.x - x0);
        if (!(Math.abs(fy - e.y) <= TOL)) continue;
        if (e.k >= 0) got.push({ index: e.k, at: path.length - 1 });
        else { path.push([e.x, fy]); done = 'win'; return; }
      }
    }

    function walk(xa, ya, ua, ub, yb, depth) {
      if (done) return;
      if (!Number.isFinite(yb)) { done = 'broken'; return; }
      const xb = x0 + ub;
      if (Math.hypot(xb - xa, yb - ya) > MAX_SEG) {
        if (depth >= MAX_DEPTH) {
          // Çok dik ama kesintisiz (100000x, x^1000): tahtanın dışına çıkıyorsa "çıktın", içinde sıçrıyorsa "koptu"
          if (yb > B.ymax + R || yb < B.ymin - R) { step(xb, yb); return; }
          // Dik mi, sıçrama mı? Kesintisiz dik eğride orta nokta iki ucun arasına düşer;
          // sıçramada (abs(x−3)/(x−3) gibi) uçlardan birinin değerini alır.
          const ym = Y((ua + ub) / 2);
          if (Number.isFinite(ym) && Math.abs(ym - (ya + yb) / 2) <= 0.25 * Math.abs(yb - ya)) step(xb, yb);
          else done = 'broken';
          return;
        }
        const um = (ua + ub) / 2, ym = Y(um);
        walk(xa, ya, ua, um, ym, depth + 1);
        if (done) return;
        walk(x0 + um, ym, um, ub, yb, depth + 1);
        return;
      }
      step(xb, yb);
    }

    const ys = Y(0);
    if (!Number.isFinite(ys)) { path.push([x0, 0]); done = 'broken'; }
    else step(x0, ys);
    const uMax = B.xmax - x0;
    let u = 0, py = ys, k = 0;
    while (!done && u < uMax) {
      const jitter = 0.7 + 0.6 * ((++k * 0.6180339887498949) % 1);  // 0.7–1.3 × DU, tekrarsız
      const u1 = Math.min(u + DU * jitter, uMax);
      const y1 = Y(u1);
      walk(x0 + u, py, u, u1, y1, 0);
      u = u1; py = y1;
    }
    if (!done) done = 'miss';
    return { result: done, path, gems: got, allGems: got.length === gems.length, hit };
  }

  // 3. yıldızın parça sınırı: bölümde açıkça verilmişse o, yoksa örnek çözümün parça sayısı.
  function limitOf(level) {
    if (level.limit) return level.limit;
    const p = parse(level.solution);
    return p.ok ? p.cost : Infinity;
  }

  // Yıldızlar (sahip, 2026-11-16; "en kısa yazma" sınırı kaldırıldı):
  // ★ hedefe ulaştın · ★★ elmasların en az yarısı · ★★★ bütün elmaslar. Elmas yoksa (ters bulmaca) kazanmak ★★★.
  function stars(level, sim) {
    if (sim.result !== 'win') return 0;
    const n = (level.gems || []).length, g = sim.gems.length;
    if (g >= n) return 3;
    return 2 * g >= n ? 2 : 1;
  }

  // Yasak ve zorunlu tuşlar: level.ban / level.need tuş adları (sq, pow, abs, sin, cos, sqrt, pi).
  // Formülde hangi "özellikler" var: ^ (üs), fonksiyon adları, π.
  const KEY_FEATURE = { sq: '^', pow: '^', abs: 'abs', sin: 'sin', cos: 'cos', sqrt: 'sqrt', pi: 'pi' };
  function features(n, out = new Set()) {
    if (!n) return out;
    if (n.k === 'bin') { if (n.op === '^') out.add('^'); features(n.a, out); features(n.b, out); }
    else if (n.k === 'fn') { out.add(n.f); features(n.a, out); }
    else if (n.k === 'neg') features(n.a, out);
    else if (n.k === 'const') out.add(n.v);
    return out;
  }
  // Kural bozuluyorsa { code: 'ban' | 'need', key }, yoksa null.
  function checkRules(level, parsed) {
    if (!parsed || !parsed.ok) return null;
    const f = features(parsed.ast);
    for (const key of level.ban || []) if (f.has(KEY_FEATURE[key])) return { code: 'ban', key };
    for (const key of level.need || []) if (!f.has(KEY_FEATURE[key])) return { code: 'need', key };
    return null;
  }

  function play(level, src) {
    const p = parse(src);
    if (!p.ok) return { parse: p };
    const rule = checkRules(level, p);
    if (rule) return { parse: p, rule, stars: 0, sim: { result: 'rule', path: [], gems: [], allGems: false } };
    const sim = simulate(level, p.fn);
    return { parse: p, sim, stars: stars(level, sim) };
  }

  const Engine = {
    parse, tokenize, simulate, stars, limitOf, play, boardOf, show, checkRules, features,
    R, GEM_R, TARGET_R, TOL, SHAPE_BAND, DEFAULT_BOARD,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Engine;
  else root.Engine = Engine;
})(typeof window !== 'undefined' ? window : globalThis);
