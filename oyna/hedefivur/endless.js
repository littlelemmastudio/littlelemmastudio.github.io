// Sonsuz mod parçaları (Rider modeli, sahip 2026-11-16): her aşamanın elle tasarlanmış 3 çeşidi var, oyunda biri
// rastgele gelir. Tasarlanmış aşamalar bitince 4. aşamadan sonrakiler karışık sırayla, bazen aynalanarak (y → −y) tekrar gelir.
// Her parça KENDİ koordinatlarında: karakter orijinde. Hedefe varınca orası yeni orijin olur.
// Sonsuz modda yol karakterden başlamalı (f(0) = 0): yollar uç uca eklenip kesintisiz bir "karne" çizgisi oluşturur.
// sol: örnek çözüm (verify çözülebildiğini, düz çizgi ve yatay yolun geçmediğini denetler). Duvar {x, y, w, h} sol-alt köşe.
(function (root) {
  const STAGES = [
    [ // 1: doğrular
      { sol: 'x/2', target: [8, 4], walls: [{ x: 3, y: -3, w: 1, h: 4 }] },
      { sol: '-x', target: [6, -6], walls: [{ x: 2, y: -1, w: 1, h: 5 }] },
      { sol: 'x/3', target: [9, 3], walls: [{ x: 4, y: -4, w: 1, h: 4.5 }] },
    ],
    [ // 2: dik ve yatık doğrular
      { sol: '2x', target: [4, 8], walls: [{ x: 2, y: -6, w: 3, h: 8 }] },
      { sol: '-x/3', target: [12, -4], walls: [{ x: 5, y: 0, w: 2, h: 6 }] },
      { sol: 'x', target: [10, 10], walls: [{ x: 4, y: -6, w: 2, h: 8.5 }] },
    ],
    [ // 3: orijinden geçen kavisler
      { sol: 'x(x-6)/2', target: [8, 8], walls: [{ x: 2.5, y: 0, w: 2, h: 5 }] },
      { sol: '-x(x-8)/4', target: [8, 0], walls: [{ x: 3, y: -6, w: 2, h: 8 }] },
      { sol: 'x^2/4', target: [6, 9], walls: [{ x: 1, y: 3, w: 1.5, h: 5 }] },
    ],
    [ // 4: köşeler
      { sol: 'abs(x-4)-4', target: [10, 2], walls: [{ x: 3, y: -2, w: 2, h: 8 }] },
      { sol: '-abs(x-5)+5', target: [10, 0], walls: [{ x: 4, y: -6, w: 2, h: 9 }] },
      { sol: '2abs(x-3)-6', target: [8, 4], walls: [{ x: 2, y: -3, w: 2, h: 9 }] },
    ],
    [ // 5: dalgalar
      { sol: '3sin(πx/4)', target: [8, 0], walls: [{ x: 5.5, y: -0.8, w: 1, h: 1.6 }] },
      { sol: '-3sin(πx/4)', target: [8, 0], walls: [{ x: 1.5, y: -1, w: 1, h: 2 }] },
      { sol: '2sin(πx/2)', target: [8, 0], walls: [{ x: 0.7, y: -1, w: 0.6, h: 1.6 }] },
    ],
    [ // 6: geniş ve dar kavisler
      { sol: '-x(x-10)/5', target: [10, 0], walls: [{ x: 4, y: -6, w: 2, h: 9 }] },
      { sol: 'x(x-4)', target: [6, 12], walls: [{ x: 1, y: -2, w: 2, h: 10 }] },
      { sol: '-x(x-6)/3', target: [9, -9], walls: [{ x: 2, y: -6, w: 2, h: 7.5 }] },
    ],
    [ // 7: katlama
      { sol: 'abs(x(x-4))', target: [6, 12], walls: [{ x: 3.75, y: 2, w: 0.35, h: 8 }, { x: 1.5, y: -6, w: 1, h: 5 }] },
      { sol: 'abs(x-3)+x-3', target: [8, 10], walls: [{ x: 1, y: 1, w: 1, h: 5 }] },
      { sol: '3abs(sin(πx/4))', target: [8, 0], walls: [{ x: 5.5, y: -4, w: 1, h: 3 }, { x: 1.7, y: -0.8, w: 0.6, h: 1.6 }] },
    ],
    [ // 8: toplamlar
      { sol: 'x/2+sin(πx/2)', target: [8, 4], walls: [{ x: 1, y: -3, w: 0.6, h: 3.9 }] },
      { sol: 'x+sin(πx/2)', target: [8, 8], walls: [{ x: 1, y: -1, w: 0.3, h: 2.3 }] },
      { sol: '-x/2+2sin(πx/2)', target: [8, -4], walls: [{ x: 0.5, y: -3, w: 0.4, h: 3.3 }] },
    ],
  ];
  const REPEAT_FROM = 3;   // tasarlanmış aşamalar bitince bu aşamadan (0'dan sayılır) sonrakiler tekrar gelir

  // Bir parçayı aynala (y → −y): çözüm −(…) olur
  const mirror = c => ({ sol: `-(${c.sol})`, target: [c.target[0], -c.target[1]], walls: c.walls.map(w => ({ x: w.x, y: -(w.y + w.h), w: w.w, h: w.h })) });

  // n. aşama (0'dan) için bir parça seç. rnd: 0–1 arası sayı veren fonksiyon (Math.random ya da tohumlu).
  function pick(n, rnd = Math.random) {
    if (n < STAGES.length) return STAGES[n][Math.floor(rnd() * 3)];
    const pool = STAGES.slice(REPEAT_FROM).flat();
    const c = pool[Math.floor(rnd() * pool.length)];
    return rnd() < 0.5 ? mirror(c) : c;
  }

  const out = { STAGES, pick, mirror };
  if (typeof module !== 'undefined' && module.exports) module.exports = out;
  else root.ENDLESS = out;
})(typeof window !== 'undefined' ? window : globalThis);
