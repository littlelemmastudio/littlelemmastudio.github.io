// Hedef motoru: işlem kuralı, çözücü, en kısa çözüm, ifade metni, ipucu adımı.
// Tarayıcıda window.Engine, Node'da require('./engine.js') (üretici tools/gen.js aynı kodu kullanır).
(function (root) {
'use strict';

const SYM = { '+': '+', '-': '−', '*': '×', '/': '÷' };
const PREC = { '+': 1, '-': 1, '*': 2, '/': 2 };

// Kural: ara sonuç pozitif tam sayı. Çıkarma sıfır/negatif veremez, bölme yalnız tam bölünüyorsa.
function apply(a, op, b) {
  switch (op) {
    case '+': return a + b;
    case '-': return a > b ? a - b : null;
    case '*': return a * b;
    case '/': return b > 0 && a % b === 0 ? a / b : null;
  }
  return null;
}

const popcount = m => { let c = 0; while (m) { m &= m - 1; c++; } return c; };

// Çözücü: alt küme dinamik programlama.
// M[mask] : değer → kayıt. Tek elemanlı kümede kayıt [1]. Diğerlerinde [çözüm sayısı, işlem, A, a, b]:
// "A alt kümesinin a değeri  işlem  kalanın b değeri". Bir alt kümeden çıkan her ifade |mask|−1 işlem kullanır,
// dolayısıyla en kısa çözüm = hedefi veren en küçük alt küme.
// Çözüm sayısı: farklı ifade ağaçları (değişme özelliği ayıklanır, birleşme özelliği ayıklanmaz:
// a+b+c üç ayrı ağaç sayılır). Zorluk ölçüsü olarak kullanılır, matematiksel "farklı çözüm" sayısı değildir.
function solve(nums) {
  const n = nums.length, full = (1 << n) - 1;
  const M = new Array(full + 1);
  const add = (m, v, c, op, A, a, b) => {
    const e = m.get(v);
    if (e) e[0] += c; else m.set(v, [c, op, A, a, b]);
  };
  for (let mask = 1; mask <= full; mask++) {
    if ((mask & (mask - 1)) === 0) { M[mask] = new Map([[nums[31 - Math.clz32(mask)], [1]]]); continue; }
    const m = new Map(), low = mask & -mask;
    // her sırasız {A, B} bölüşü bir kez: A en düşük biti içerir
    for (let A = (mask - 1) & mask; A > 0; A = (A - 1) & mask) {
      if (!(A & low)) continue;
      const B = mask ^ A;
      for (const [a, ea] of M[A]) for (const [b, eb] of M[B]) {
        const c = ea[0] * eb[0];
        add(m, a + b, c, '+', A, a, b);
        add(m, a * b, c, '*', A, a, b);
        if (a > b) add(m, a - b, c, '-', A, a, b); else if (b > a) add(m, b - a, c, '-', B, b, a);
        if (a % b === 0) add(m, a / b, c, '/', A, a, b);
        if (a !== b && b % a === 0) add(m, b / a, c, '/', B, b, a);
      }
    }
    M[mask] = m;
  }
  return { nums, M, full };
}

// İfade ağacı: yaprak {v, i} (i = sayının sırası), iç düğüm {v, op, l, r}
function tree(sol, mask, v) {
  const e = sol.M[mask].get(v);
  if (e.length === 1) return { v, i: 31 - Math.clz32(mask) };
  const [, op, A, a, b] = e;
  return { v, op, l: tree(sol, A, a), r: tree(sol, mask ^ A, b) };
}

// Hedef için: toplam çözüm sayısı, en kısa çözümün işlem sayısı ve ağacı. Ulaşılamıyorsa null.
function lookup(sol, target) {
  let count = 0, best = 0;
  for (let mask = 1; mask <= sol.full; mask++) {
    const e = sol.M[mask].get(target);
    if (!e) continue;
    count += e[0];
    if (!best || popcount(mask) < popcount(best)) best = mask;
  }
  if (!best) return null;
  return { count, ops: popcount(best) - 1, mask: best, tree: tree(sol, best, target) };
}

// Gösterim sırası: + ve × için bileşik parça önde, iki yaprak ise büyük önde ("(75 − 7) × 9 + 3")
function tidy(t) {
  if (t.op == null) return t;
  let l = tidy(t.l), r = tidy(t.r);
  if (t.op === '+' || t.op === '*') {
    const li = l.op != null, ri = r.op != null;
    if ((!li && ri) || (li === ri && r.v > l.v && !li)) [l, r] = [r, l];
  }
  return { v: t.v, op: t.op, l, r };
}

// En az parantezli metin
function format(t) {
  if (t.op == null) return String(t.v);
  const wrap = (c, right) => {
    const s = format(c);
    if (c.op == null) return s;
    const need = PREC[c.op] < PREC[t.op] || (right && PREC[c.op] === PREC[t.op] && (t.op === '-' || t.op === '/'));
    return need ? '(' + s + ')' : s;
  };
  return wrap(t.l, false) + ' ' + SYM[t.op] + ' ' + wrap(t.r, true);
}
const formatSolution = t => { const x = tidy(t); return format(x) + ' = ' + x.v; };

// Adımlar (soldan sağa, alttan üste): {a, op, b, r, ai, bi}; ai/bi yaprağın sırası (yaprak değilse -1)
function steps(t) {
  const out = [];
  (function walk(n) {
    if (n.op == null) return;
    walk(n.l); walk(n.r);
    out.push({ a: n.l.v, op: n.op, b: n.r.v, r: n.v, ai: n.l.op == null ? n.l.i : -1, bi: n.r.op == null ? n.r.i : -1 });
  })(tidy(t));
  return out;
}

const api = { SYM, apply, solve, lookup, tree, tidy, format, formatSolution, steps, popcount };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Engine = api;
})(typeof window !== 'undefined' ? window : globalThis);
