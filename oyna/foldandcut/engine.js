// Tek Kesim motoru: kâğıt katlama ve tek düz kesik geometrisi.
// Tarayıcıda (window.Engine) ve Node'da (üretici/doğrulayıcı, require) aynı dosya.
(function (root) {
'use strict';

// ---------------------------------------------------------------------
// GÖSTERİM
// Kâğıt [0,N]×[0,N] karesi, y aşağı (ekran gibi). Kâğıt bir katman listesidir.
// Katman = { poly, Ms }: poly şu anki konumdaki dışbükey çokgen; Ms[j] = j. katlamadan sonra
// orijinal kâğıttan o konuma giden dönüşüm (Ms[0] = birim). Son eleman şu anki dönüşüm.
// Her katman dışbükeydir (kare, yarı düzlemlerle kırpılıp yansıtılır), kesişim hesapları buna dayanır.
// Liste sırası = alttan üste.
// Dönüşüm M = [a,b,c, d,e,f]: (x,y) → (a x + b y + c, d x + e y + f).
// Doğru: { a:[x,y], b:[x,y] }. Katlama doğruları ızgaraya oturur: x=k, y=k, x+y=k, x−y=k (k tam sayı).
// Bu yansımalar tam sayı noktaları tam sayı noktalara götürür; köşeler en kötü yarım sayı olur.
// ---------------------------------------------------------------------
const N = 8;
const EPS = 1e-7;
const ID = [1, 0, 0, 0, 1, 0];

const cv = v => (Math.abs(v - Math.round(v * 2) / 2) < 1e-9 ? Math.round(v * 2) / 2 : v);   // yarım sayılara yapıştır
const cl = p => [cv(p[0]), cv(p[1])];
const square = () => [[0, 0], [N, 0], [N, N], [0, N]];

const sideVal = (l, p) => (l.b[0] - l.a[0]) * (p[1] - l.a[1]) - (l.b[1] - l.a[1]) * (p[0] - l.a[0]);
const sideOf = (l, p) => { const v = sideVal(l, p); return v > 1e-9 ? 1 : v < -1e-9 ? -1 : 0; };

// Çokgeni yarı düzleme kırp: sg * sideVal ≥ 0 olan kısım kalır
function clip(poly, l, sg) {
  const out = [], n = poly.length;
  for (let i = 0; i < n; i++) {
    const P = poly[i], Q = poly[(i + 1) % n];
    const sp = sg * sideVal(l, P), sq = sg * sideVal(l, Q);
    if (sp >= -1e-9) out.push(P);
    if ((sp > 1e-9 && sq < -1e-9) || (sp < -1e-9 && sq > 1e-9)) {
      const t = sp / (sp - sq);
      out.push(cl([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]));
    }
  }
  return out;
}
function signedArea(p) { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; }
const area = p => (!p || p.length < 3 ? 0 : Math.abs(signedArea(p)));
const areaSum = ps => ps.reduce((s, p) => s + area(p), 0);

const ap = (M, p) => [M[0] * p[0] + M[1] * p[1] + M[2], M[3] * p[0] + M[4] * p[1] + M[5]];
const comp = (A, B) => [A[0] * B[0] + A[1] * B[3], A[0] * B[1] + A[1] * B[4], A[0] * B[2] + A[1] * B[5] + A[2],
                        A[3] * B[0] + A[4] * B[3], A[3] * B[1] + A[4] * B[4], A[3] * B[2] + A[4] * B[5] + A[5]];
function inv(M) {
  const d = M[0] * M[4] - M[1] * M[3];
  const a = M[4] / d, b = -M[1] / d, c = -M[3] / d, e = M[0] / d;
  return [a, b, -(a * M[2] + b * M[5]), c, e, -(c * M[2] + e * M[5])];
}
function refl(l) {
  let dx = l.b[0] - l.a[0], dy = l.b[1] - l.a[1]; const L = Math.hypot(dx, dy); dx /= L; dy /= L;
  const a = dx * dx - dy * dy, b = 2 * dx * dy, e = dy * dy - dx * dx, x = l.a[0], y = l.a[1];
  return [a, b, x - (a * x + b * y), b, e, y - (b * x + e * y)].map(cv);
}
const cur = L => L.Ms[L.Ms.length - 1];

// ---------------------------------------------------------------------
// IZGARA DOĞRULARI
// Katlama doğrusu kodu: 'x=3', 'y=5', 'x+y=8', 'x-y=0'. Kesik: iki ızgara noktası.
// ---------------------------------------------------------------------
function lineOf(code) {
  const m = /^(x|y|x\+y|x-y)=(-?\d+(?:\.\d+)?)$/.exec(code);
  if (!m) throw new Error('doğru kodu: ' + code);
  const k = +m[2];
  switch (m[1]) {
    case 'x': return { a: [k, 0], b: [k, 1] };
    case 'y': return { a: [0, k], b: [1, k] };
    case 'x+y': return { a: [k, 0], b: [k - 1, 1] };
    case 'x-y': return { a: [k, 0], b: [k + 1, 1] };
  }
}
// doğru kodu (yalnız ızgara katlama doğruları için); değilse null
function codeOf(l) {
  const dx = l.b[0] - l.a[0], dy = l.b[1] - l.a[1];
  const f = v => +cv(v).toFixed(3);
  if (Math.abs(dx) < 1e-9) return 'x=' + f(l.a[0]);
  if (Math.abs(dy) < 1e-9) return 'y=' + f(l.a[1]);
  if (Math.abs(dx + dy) < 1e-9) return 'x+y=' + f(l.a[0] + l.a[1]);
  if (Math.abs(dx - dy) < 1e-9) return 'x-y=' + f(l.a[0] - l.a[1]);
  return null;
}
const sameLine = (l1, l2) => Math.abs(sideVal(l1, l2.a)) < 1e-6 && Math.abs(sideVal(l1, l2.b)) < 1e-6;

// ---------------------------------------------------------------------
// KATLAMA ve KESME
// ---------------------------------------------------------------------
const flat = () => [{ poly: square(), Ms: [ID] }];

// Doğru kâğıdı gerçekten ikiye ayırıyor mu? (her iki tarafta da kâğıt var)
function splits(layers, l, minA = 1e-4) {
  let a = 0, b = 0;
  for (const L of layers) { a += area(clip(L.poly, l, 1)); b += area(clip(L.poly, l, -1)); }
  return a > minA && b > minA;
}

// Katla: s tarafındaki kâğıt (sg = s) doğru üzerinden öbür tarafa kapanır.
// Kalan katmanlar sırasını korur; katlanan katmanlar ters sırayla en üste gelir (gerçek kâğıttaki gibi).
function fold(layers, l, s) {
  const R = refl(l), stay = [], mov = [];
  for (const L of layers) {
    const k = clip(L.poly, l, -s), m = clip(L.poly, l, s);
    if (area(k) > EPS) stay.push({ poly: k, Ms: L.Ms.concat([cur(L)]) });
    if (area(m) > EPS) mov.push({ poly: m.map(p => cl(ap(R, p))), Ms: L.Ms.concat([comp(R, cur(L)).map(cv)]), from: m });
  }
  return stay.concat(mov.reverse());
}

// Kes: iki tarafın orijinal kâğıttaki parçaları + her parçanın katlama geçmişi (açılma animasyonu için).
// pieces[side] = [{ orig, Ms }], side 0 = doğrunun +1 tarafı, 1 = −1 tarafı.
function cut(layers, l) {
  return [1, -1].map(sg => layers.map(L => {
    const c = clip(L.poly, l, sg); if (area(c) <= EPS) return null;
    return { orig: c.map(p => cl(ap(inv(cur(L)), p))), Ms: L.Ms };
  }).filter(Boolean));
}
// Ucuz ön kontrol: iki tarafın alanı (yansıma alanı korur, ters dönüşüme gerek yok)
function cutAreas(layers, l) {
  let a = 0, b = 0;
  for (const L of layers) { a += area(clip(L.poly, l, 1)); b += area(clip(L.poly, l, -1)); }
  return [a, b];
}

// ---------------------------------------------------------------------
// ŞEKİL KARŞILAŞTIRMA (kesin): iki parça kümesi aynı bölgeyi mi kaplıyor?
// Parçalar ayrık ve dışbükey → kesişim = çiftlerin dışbükey kesişimlerinin toplamı.
// ---------------------------------------------------------------------
function convexIntersect(A, B) {
  const o = signedArea(B) > 0 ? 1 : -1;
  let P = A;
  for (let i = 0; i < B.length && P.length >= 3; i++) {
    const l = { a: B[i], b: B[(i + 1) % B.length] };
    P = clip(P, l, o);
  }
  return P;
}
function overlap(As, Bs) {
  let s = 0;
  for (const A of As) for (const B of Bs) s += area(convexIntersect(A, B));
  return s;
}
// benzerlik (kesişim / birleşim) ve tam eşleşme
function compare(As, Bs) {
  const a = areaSum(As), b = areaSum(Bs), i = overlap(As, Bs), u = a + b - i;
  return { score: u > 0 ? i / u : 0, exact: a + b - 2 * i < 1e-6 };
}

// ---------------------------------------------------------------------
// YARDIMCILAR
// ---------------------------------------------------------------------
function bboxOf(polys) {
  let a = 1e9, b = -1e9, c = 1e9, d = -1e9;
  for (const p of polys) for (const q of p) { a = Math.min(a, q[0]); b = Math.max(b, q[0]); c = Math.min(c, q[1]); d = Math.max(d, q[1]); }
  return { minx: a, maxx: b, miny: c, maxy: d };
}
function pointIn(poly, x, y) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if (((a[1] > y) !== (b[1] > y)) && (x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0])) c = !c;
  }
  return c;
}
// en üstteki katmanın indeksi (yoksa −1)
function topLayerAt(layers, p) {
  for (let i = layers.length - 1; i >= 0; i--) if (pointIn(layers[i].poly, p[0], p[1])) return i;
  return -1;
}

// Kâğıdın şu anki şeklini ızgaraya göre bölen bütün katlama doğruları (üretici ve doğrulayıcı için)
function foldCandidates(layers) {
  const bb = bboxOf(layers.map(L => L.poly)), c = [];
  const X0 = Math.floor(bb.minx), X1 = Math.ceil(bb.maxx), Y0 = Math.floor(bb.miny), Y1 = Math.ceil(bb.maxy);
  for (let k = X0 + 1; k < X1; k++) c.push('x=' + k);
  for (let k = Y0 + 1; k < Y1; k++) c.push('y=' + k);
  for (let k = X0 + Y0 + 1; k < X1 + Y1; k++) c.push('x+y=' + k);
  for (let k = X0 - Y1 + 1; k < X1 - Y0; k++) c.push('x-y=' + k);
  return c.filter(code => splits(layers, lineOf(code), 1e-4));
}
// Görünen ızgara noktalarından geçen bütün farklı kesik doğruları (kâğıdı bölenler)
function cutCandidates(layers, margin = 1) {
  const bb = bboxOf(layers.map(L => L.poly));
  const pts = [];
  for (let x = Math.floor(bb.minx) - margin; x <= Math.ceil(bb.maxx) + margin; x++)
    for (let y = Math.floor(bb.miny) - margin; y <= Math.ceil(bb.maxy) + margin; y++) pts.push([x, y]);
  const seen = new Set(), out = [];
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
    const a = pts[i], b = pts[j];
    // doğrunun kanonik biçimi: A x + B y = C, gcd ile sadeleştirilmiş, işaret sabit
    let A = b[1] - a[1], B = a[0] - b[0];
    const g = gcd(Math.abs(A), Math.abs(B)); A /= g; B /= g;
    if (A < 0 || (A === 0 && B < 0)) { A = -A; B = -B; }
    const C = A * a[0] + B * a[1], k = A + ',' + B + ',' + C;
    if (seen.has(k)) continue;
    seen.add(k);
    const l = { a, b };
    if (splits(layers, l, 1e-4)) out.push(l);
  }
  return out;
}
function gcd(a, b) { while (b) [a, b] = [b, a % b]; return a || 1; }

// ---------------------------------------------------------------------
// HEDEFİN ÇİZGİSİ: kâğıda basılan şeklin dış sınırı (orijinal koordinatlarda doğru parçaları).
// Kâğıt kenarındaki parçalar ve hedef parçaları arasındaki kat izleri çizilmez (çözümü ele verirdi).
// Kenarlar, üzerine düşen başka köşelerde bölünür; her alt parçanın iki yanı denenir.
// ---------------------------------------------------------------------
function targetOutline(target) {
  const inPaper = p => p[0] > 1e-6 && p[0] < N - 1e-6 && p[1] > 1e-6 && p[1] < N - 1e-6;
  const inT = p => target.some(poly => pointIn(poly, p[0], p[1]));
  const verts = target.flat();
  const out = [];
  for (const poly of target) for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
    if (L2 < 1e-12) continue;
    const ts = [0, 1];
    for (const v of verts) {
      const t = ((v[0] - a[0]) * dx + (v[1] - a[1]) * dy) / L2;
      if (t > 1e-6 && t < 1 - 1e-6 && Math.abs((v[0] - a[0]) * dy - (v[1] - a[1]) * dx) / Math.sqrt(L2) < 1e-6) ts.push(t);
    }
    ts.sort((x, y) => x - y);
    const L = Math.sqrt(L2), nx = -dy / L * 1e-4, ny = dx / L * 1e-4;
    for (let k = 0; k + 1 < ts.length; k++) {
      if (ts[k + 1] - ts[k] < 1e-6) continue;
      const tm = (ts[k] + ts[k + 1]) / 2, m = [a[0] + dx * tm, a[1] + dy * tm];
      const p1 = [m[0] + nx, m[1] + ny], p2 = [m[0] - nx, m[1] - ny];
      if (!inPaper(p1) || !inPaper(p2)) continue;
      if (inT(p1) === inT(p2)) continue;
      out.push([[a[0] + dx * ts[k], a[1] + dy * ts[k]], [a[0] + dx * ts[k + 1], a[1] + dy * ts[k + 1]]]);
    }
  }
  return out;
}

// Doğru parçasını dışbükey çokgene kırp (yoksa null)
function clipSeg(seg, poly) {
  let [p, q] = seg;
  const o = signedArea(poly) > 0 ? 1 : -1;
  for (let i = 0; i < poly.length; i++) {
    const l = { a: poly[i], b: poly[(i + 1) % poly.length] };
    const sp = o * sideVal(l, p), sq = o * sideVal(l, q);
    if (sp < -1e-9 && sq < -1e-9) return null;
    if (sp < -1e-9) { const t = sp / (sp - sq); p = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]; }
    else if (sq < -1e-9) { const t = sp / (sp - sq); q = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]; }
  }
  return Math.hypot(q[0] - p[0], q[1] - p[1]) > 1e-6 ? [p, q] : null;
}

// Katlanmış kâğıtta görünen hedef çizgilerinin doğruları (tekrarsız). Hepsi tek doğruya düştüyse kesilecek yer belli.
// Kesik mıknatısı bu doğrulara çeker.
function outlineLines(layers, outline) {
  const out = [], keys = new Set();
  for (const L of layers) {
    const M = cur(L);
    for (const s of outline) {
      const seg = clipSeg([ap(M, s[0]), ap(M, s[1])], L.poly);
      if (!seg) continue;
      const [a, b] = seg;
      let A = b[1] - a[1], B = a[0] - b[0];
      const n = Math.hypot(A, B); A /= n; B /= n;
      if (A < -1e-9 || (Math.abs(A) < 1e-9 && B < 0)) { A = -A; B = -B; }
      const C = A * a[0] + B * a[1], k = A.toFixed(4) + ',' + B.toFixed(4) + ',' + C.toFixed(3);
      if (keys.has(k)) continue;
      keys.add(k);
      out.push({ a, b });
    }
  }
  return out;
}

// Katmanların durum anahtarı (aynı katlanmış durumları ayıklamak için)
function stateKey(layers) {
  return layers.map(L => cur(L).map(v => +v.toFixed(4)).join(',') + '|' + L.poly.map(p => p.join(',')).sort().join(';')).sort().join('/');
}

// ---------------------------------------------------------------------
// ARAMA: hedef en az kaç katlamayla çıkar? (üretici, doğrulayıcı ve oyundaki ipucu kullanır)
// Kesik adayları: hedefin kesikten gelen bir kenarı e (kâğıt kenarında değil, iki hedef parçası
// arasındaki kat izi de değil). Gerçek kesik, e'nin geldiği katmanda e'nin görüntüsü olmak zorunda:
// c = M_L(e). Durum başına yalnız katman sayısı kadar aday.
// ---------------------------------------------------------------------
// hedefin dış sınırında, kâğıt kenarında olmayan bir kenar (kesikten gelen)
function cutEdge(target) {
  const inPaper = p => p[0] > 1e-6 && p[0] < N - 1e-6 && p[1] > 1e-6 && p[1] < N - 1e-6;
  const inTarget = p => target.some(poly => pointIn(poly, p[0], p[1]));
  for (const poly of target) for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
    if (L < 1e-6) continue;
    const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], n = [-dy / L * 1e-3, dx / L * 1e-3];
    const p1 = [m[0] + n[0], m[1] + n[1]], p2 = [m[0] - n[0], m[1] - n[1]];
    if (!inPaper(p1) || !inPaper(p2)) continue;          // kâğıt kenarı
    if (inTarget(p1) && inTarget(p2)) continue;           // iki parça arasındaki kat izi
    return { a, b };
  }
  return null;
}

function solvesWith(layers, ctx) {
  const lines = ctx.edge ? layers.map(L => ({ a: ap(cur(L), ctx.edge.a), b: ap(cur(L), ctx.edge.b) })) : [];
  for (const l of lines) {
    if (!splits(layers, l)) continue;
    const [a, b] = cutAreas(layers, l);
    const okA = Math.abs(a - ctx.tArea) < 1e-6, okB = Math.abs(b - ctx.tArea) < 1e-6;
    if (!okA && !okB) continue;
    const sides = cut(layers, l);
    for (const s of [0, 1]) {
      if (!(s === 0 ? okA : okB)) continue;
      if (compare(sides[s].map(p => p.orig), ctx.target).exact) return l;
    }
  }
  return null;
}

// En az katlama sayısı (≤ maxDepth), bulunamazsa null. Bulunca { depth, folds, cut } döner.
// Genişlik öncelikli; her yeni durum üretilir üretilmez denenir (son derinliği baştan sona açmaya gerek kalmaz).
function minFolds(target, maxDepth, from) {
  const ctx = { target, tArea: areaSum(target), edge: cutEdge(target) };
  const start = { layers: from || flat(), folds: [] };
  let l = solvesWith(start.layers, ctx);
  if (l) return { depth: 0, folds: [], cut: l };
  let frontier = [start];
  const seen = new Set([stateKey(start.layers)]);
  for (let d = 1; d <= maxDepth; d++) {
    const next = [];
    for (const st of frontier) {
      for (const code of foldCandidates(st.layers)) {
        for (const s of [1, -1]) {
          const nl = fold(st.layers, lineOf(code), s);
          const k = stateKey(nl);
          if (seen.has(k)) continue;
          seen.add(k);
          const folds = st.folds.concat([[code, s]]);
          l = solvesWith(nl, ctx);
          if (l) return { depth: d, folds, cut: l };
          if (d < maxDepth) next.push({ layers: nl, folds });
        }
      }
    }
    frontier = next;
  }
  return null;
}

const Engine = {
  N, ID, square, flat, clip, area, areaSum, signedArea, ap, comp, inv, refl, cur,
  sideVal, sideOf, lineOf, codeOf, sameLine, splits, fold, cut, cutAreas,
  compare, overlap, bboxOf, pointIn, topLayerAt, foldCandidates, cutCandidates, stateKey, cutEdge, minFolds, targetOutline, clipSeg, outlineLines,
};
if (typeof module !== 'undefined' && module.exports) module.exports = Engine;
else root.Engine = Engine;
})(this);
