// Üreteç motoru: permütasyonlar, BFS, yerleşim geometrisi.
// Tarayıcıda (window.Engine) ve Node'da (üretici, require) aynı dosya.
(function (root) {
'use strict';

// ---------------------------------------------------------------------
// GÖSTERİM
// Durum s: konum → taş. s[k] = k konumundaki taşın numarası (0..n-1). Ekranda numara+1 yazılır.
// Üreteç (buton) p: p[k] = k konumundaki taşın gideceği konum. Buton hep aynı yer değişimini yapar
// (taşlara değil konumlara etki eder; yani grubun konumlar üzerindeki etkisi).
// ---------------------------------------------------------------------
const identity = n => Array.from({ length: n }, (_, k) => k);
const apply = (s, p) => { const r = new Array(s.length); for (let k = 0; k < s.length; k++) r[p[k]] = s[k]; return r; };
const inverse = p => { const q = new Array(p.length); for (let k = 0; k < p.length; k++) q[p[k]] = k; return q; };
const then = (p, q) => p.map(x => q[x]);            // önce p, sonra q (makro: dizinin toplam etkisi)
const isIdentity = p => p.every((x, k) => x === k);
const same = (a, b) => a.length === b.length && a.every((x, k) => x === b[k]);
const key = s => s.join('');                         // n ≤ 10: tek haneli taş numaraları
// işaret: çift permütasyon +1, tek −1 (döngü sayımıyla)
function sign(p) {
  const seen = new Array(p.length).fill(false); let s = 1;
  for (let k = 0; k < p.length; k++) {
    if (seen[k]) continue;
    let len = 0; for (let j = k; !seen[j]; j = p[j]) { seen[j] = true; len++; }
    if (len % 2 === 0) s = -s;
  }
  return s;
}

// Üreteç yapıcıları (konumlar saat yönünde, 0 = en üst)
const rot = (n, k = 1) => identity(n).map(i => (((i + k) % n) + n) % n);          // hepsi k adım saat yönünde
const flip = n => identity(n).map(i => (n - i) % n);                                // dikey eksene göre ayna (0 sabit)
const swap = (n, a, b) => identity(n).map(i => (i === a ? b : i === b ? a : i));
const cycle = (n, list) => { const p = identity(n); list.forEach((x, t) => { p[x] = list[(t + 1) % list.length]; }); return p; };

// ---------------------------------------------------------------------
// BFS: hedeften geriye doğru (ters üreteçlerle) → her ulaşılabilir durumun hedefe en kısa uzaklığı.
// n ≤ 8 için en çok 8! = 40320 durum.
// ---------------------------------------------------------------------
function bfs(target, gens) {
  const inv = gens.map(inverse);
  const dist = new Map([[key(target), 0]]);
  const queue = [target];
  for (let h = 0; h < queue.length; h++) {
    const u = queue[h], du = dist.get(key(u));
    for (const q of inv) {
      const v = apply(u, q), kv = key(v);
      if (!dist.has(kv)) { dist.set(kv, du + 1); queue.push(v); }
    }
  }
  return dist;
}
// s'den hedefe en kısa yolun ilk hamlesi (perms listesindeki sıra); ulaşılamıyorsa ya da zaten hedefse -1
// perms: düğmeler ya da moves(...).map(m => m.p)
function nextMove(s, gens, dist) {
  const d = dist.get(key(s));
  if (!d) return -1;
  for (let g = 0; g < gens.length; g++) if (dist.get(key(apply(s, gens[g]))) === d - 1) return g;
  return -1;
}
function solution(s, gens, dist) {
  const out = [];
  for (let g; (g = nextMove(s, gens, dist)) >= 0;) { out.push(g); s = apply(s, gens[g]); }
  return out;
}

// Oyuncunun yapabildiği hamleler: her düğme ileri; ters hamle açıksa uzun basınca tersi
// (kendi tersi olan düğmede ters hamle aynı hamledir, eklenmez). BFS ve ipucu bu listeyle çalışır.
// Kodlama (JSON'daki çözüm dizisi): g ≥ 0 → g. düğme ileri, −(g+1) → g. düğmenin tersi.
function moves(gens, inverseAllowed) {
  const out = [];
  gens.forEach((p, g) => {
    out.push({ g, inv: false, p, code: g });
    if (inverseAllowed) { const q = inverse(p); if (!same(q, p)) out.push({ g, inv: true, p: q, code: -(g + 1) }); }
  });
  return out;
}
const decode = (gens, code) => (code >= 0 ? gens[code] : inverse(gens[-code - 1]));

// Tohumlu rastgele (mulberry32)
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ---------------------------------------------------------------------
// YERLEŞİM ve YOLLAR (viewBox 0..100)
// layout = { slots: [{x,y}], rings: [{cx,cy,r, order:[konumlar saat yönünde]}] }
// 5. bölümdeki iki halka da aynı yapıyla tanımlanacak.
// ---------------------------------------------------------------------
function circleLayout(n, cx = 50, cy = 50, R = 36) {
  const slots = identity(n).map(i => { const a = -Math.PI / 2 + 2 * Math.PI * i / n; return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) }; });
  return { slots, rings: [{ cx, cy, r: R, order: identity(n) }] };
}
// İki kesişen halka: a ve b konumlu iki halka, iki ortak konum (her halkada komşu). n = a + b − 2.
// Numaralar şeklin dış çizgisini saat yönünde dolaşır: 0 = üst ortak, 1..b−2 sağ halka, b−1 = alt ortak, b..n−1 sol halka.
// Sağ halka sırası [0..b−1], sol halka sırası [b−1, b, …, n−1, 0] (ikisi de saat yönünde).
function ringsLayout(a, b) {
  const sA = 2 * Math.PI / a, sB = 2 * Math.PI / b;
  const rA = 1 / Math.sin(sA / 2), rB = 1 / Math.sin(sB / 2);       // ortak noktalar arası yarı yükseklik = 1
  const xA = -rA * Math.cos(sA / 2), xB = rB * Math.cos(sB / 2);     // merkezler (ortak noktalar x = 0'da)
  const left = xA - rA, right = xB + rB, top = -Math.max(rA, rB), bottom = Math.max(rA, rB);
  const k = Math.min(74 / (right - left), 74 / (bottom - top));      // kenarda taş yarıçapı kadar pay
  const ox = 50 - k * (left + right) / 2;
  const P = (x, y) => ({ x: ox + k * x, y: 50 + k * y });
  const n = a + b - 2, slots = new Array(n);
  for (let t = 0; t < b; t++) { const ang = Math.PI + sB / 2 + t * sB; slots[t] = P(xB + rB * Math.cos(ang), rB * Math.sin(ang)); }
  for (let t = 1; t < a - 1; t++) { const ang = sA / 2 + t * sA; slots[b - 1 + t] = P(xA + rA * Math.cos(ang), rA * Math.sin(ang)); }
  const C = (x, r) => ({ cx: ox + k * x, cy: 50, r: k * r });
  return { slots, rings: [{ ...C(xB, rB), order: identity(b) }, { ...C(xA, rA), order: [b - 1, ...identity(a - 2).map(t => b + t), 0] }] };
}
// halka düğmesi: o halkadaki taşları bir adım saat yönünde döndürür
const ringTurn = (L, r) => cycle(L.slots.length, L.rings[r].order);
// JSON'daki yerleşim tanımından geometri
const layoutOf = (spec, n) => (spec && spec.type === 'rings' ? ringsLayout(spec.a, spec.b) : circleLayout(n));

// taş yarıçapı: en yakın iki konum arasının ~%34'ü, en çok 9.5 (halka görünür kalsın)
function stoneRadius(L) {
  let m = Infinity;
  for (let i = 0; i < L.slots.length; i++) for (let j = i + 1; j < L.slots.length; j++)
    m = Math.min(m, Math.hypot(L.slots[i].x - L.slots[j].x, L.slots[i].y - L.slots[j].y));
  return Math.min(9.5, m * 0.34);
}

// i konumundaki taşın p ile izlediği yol, N+1 nokta. Kural (ok diyagramı ve animasyon aynı kuralı kullanır):
//  - aynı halkada komşu konuma gidiyorsa ve karşılıklı takas değilse: halkanın üzerinden yay (taş halkada kayar);
//  - yoksa hafif kavisli kiriş, hareket yönünün SOLUNA doğru şişkin. Böylece karşılıklı takas (i↔j)
//    iki ayrı kavisli ok olur (mercek), saat yönünde komşu kayma da dışarıya, halkaya doğru kıvrılır.
function movePath(L, p, i, N = 24) {
  const j = p[i];
  if (i === j) return null;
  const A = L.slots[i], B = L.slots[j];
  // Ortak taş iki halkada da komşu olabilir: düğmenin en çok taşı komşuya kaydırdığı halka seçilir.
  const adjOn = (ring, x, y) => { const a = ring.order.indexOf(x), b = ring.order.indexOf(y), m = ring.order.length; if (a < 0 || b < 0) return 0; const d = (b - a + m) % m; return d === 1 ? 1 : d === m - 1 ? -1 : 0; };
  const score = ring => ring.order.filter(x => p[x] !== x && adjOn(ring, x, p[x])).length;
  const rings = L.rings.filter(ring => adjOn(ring, i, j)).sort((r1, r2) => score(r2) - score(r1));
  for (const ring of rings.slice(0, 1)) {
    const a = ring.order.indexOf(i), b = ring.order.indexOf(j);
    const m = ring.order.length, d = (b - a + m) % m;
    if (p[j] !== i) {
      const t0 = Math.atan2(A.y - ring.cy, A.x - ring.cx);
      let t1 = Math.atan2(B.y - ring.cy, B.x - ring.cx);
      const dir = d === 1 ? 1 : -1;                      // saat yönü (ekranda açı artar)
      while (dir > 0 ? t1 <= t0 : t1 >= t0) t1 += dir * 2 * Math.PI;
      return Array.from({ length: N + 1 }, (_, k) => { const t = t0 + (t1 - t0) * k / N; return { x: ring.cx + ring.r * Math.cos(t), y: ring.cy + ring.r * Math.sin(t) }; });
    }
  }
  const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy);
  const bulge = 0.2 * len;
  // ekranda (y aşağı) hareket yönünün solu: (dy, −dx)
  const C = { x: (A.x + B.x) / 2 + dy / len * bulge, y: (A.y + B.y) / 2 - dx / len * bulge };
  return Array.from({ length: N + 1 }, (_, k) => {
    const t = k / N, u = 1 - t;
    return { x: u * u * A.x + 2 * u * t * C.x + t * t * B.x, y: u * u * A.y + 2 * u * t * C.y + t * t * B.y };
  });
}

// çoklu çizgiyi baştan a, sondan b uzunluk kadar kırp (ok ucu taşa/noktaya girmesin)
function trimPath(pts, a, b) {
  const cut = (P, len) => {
    let acc = 0;
    for (let k = 1; k < P.length; k++) {
      const seg = Math.hypot(P[k].x - P[k - 1].x, P[k].y - P[k - 1].y);
      if (acc + seg >= len) { const t = (len - acc) / seg; return [{ x: P[k - 1].x + (P[k].x - P[k - 1].x) * t, y: P[k - 1].y + (P[k].y - P[k - 1].y) * t }, ...P.slice(k)]; }
      acc += seg;
    }
    return P.slice(-1);
  };
  return cut(cut(pts, a).reverse(), b).reverse();
}
function pathLength(pts) { let s = 0; for (let k = 1; k < pts.length; k++) s += Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y); return s; }
// yol üzerinde 0..1 arası (yay uzunluğuna göre) nokta
function pointAt(pts, t) {
  const total = pathLength(pts); let want = total * t;
  for (let k = 1; k < pts.length; k++) {
    const seg = Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y);
    if (want <= seg || k === pts.length - 1) { const u = seg ? Math.min(1, want / seg) : 1; return { x: pts[k - 1].x + (pts[k].x - pts[k - 1].x) * u, y: pts[k - 1].y + (pts[k].y - pts[k - 1].y) * u }; }
    want -= seg;
  }
  return pts[pts.length - 1];
}

const Engine = { identity, apply, inverse, then, isIdentity, same, key, sign, rot, flip, swap, cycle,
  bfs, nextMove, solution, moves, decode, rng, circleLayout, ringsLayout, ringTurn, layoutOf, stoneRadius, movePath, trimPath, pathLength, pointAt };
if (typeof module !== 'undefined' && module.exports) module.exports = Engine;
else root.Engine = Engine;
})(typeof window !== 'undefined' ? window : globalThis);
