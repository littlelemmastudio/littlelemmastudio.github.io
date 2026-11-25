// Bölümler: müfredat haritası docs/MUFREDAT.md (ağ: düğüm → kenar → sentez). Koordinatlar MATEMATİK koordinatları.
//   sol:    örnek çözüm. Elmaslar ve hedef bu eğrinin üstüne kendiliğinden konur.
//   gems:   elmasların x'leri · target: hedefin x'i · startX: karakterin başladığı x (varsayılan 0;
//           |x|, x² ve dalganın iki yanı görünsün diye bazı bölümlerde solda başlar)
//   walls:  dikdörtgen {x, y, w, h} (sol-alt köşe). Öğretme bölümlerinde duvar yok, yalnız sentezlerde.
//   wrong:  "yakın ama yanlış" çözümler: verify bunların ★★★ ALAMADIĞINI denetler (bölüm atlatılamasın).
//   lesson: bölümün dersi (www/lessons.js) · topic: konu adı (locales 'topic.<ad>', ipucunda görünür) · ipucu 'lv.<id>'.
//   shape:  ters bulmaca [başlangıç x, bitiş x] · marks: koordinatı yazılan noktalar.
// Noktalar "güzel" olmalı: tam sayı, yarım ya da π'nin katı (verify denetler); |y| ≤ 14.
// Zorluk hesaptan değil akıl yürütmeden gelir (simetri, kökler, geriye uzatma, katlama). Sayılar küçük.
(function (root) {
  const E = root.Engine || (typeof require !== 'undefined' ? require('./engine.js') : null);
  const PI = Math.PI;
  const K1 = [], K2 = ['sq'], K3 = ['abs', 'sq'], K4 = ['abs', 'sq', 'sin', 'pi'], K5 = ['abs', 'sq', 'sin', 'cos', 'pi'];

  const SPEC = [
    // ===== 1. Doğrular =====
    { w: 1, keys: K1, lesson: 'flat', topic: 'flat', sol: '0', gems: [5, 10, 15], target: 20 },
    { w: 1, keys: K1, lesson: 'flat', topic: 'const', sol: '3', gems: [4, 8], target: 12, wrong: ['0', '4'] },
    { w: 1, keys: K1, lesson: 'slope', topic: 'slope', sol: 'x', gems: [4, 8], target: 12, wrong: ['3', '2x'] },
    { w: 1, keys: K1, lesson: 'slope', topic: 'steep', sol: '3x', gems: [1, 2], target: 4, wrong: ['x', '2x'] },
    { w: 1, keys: K1, lesson: 'slope', topic: 'gentle', sol: 'x/3', gems: [3, 9, 15], target: 21, wrong: ['x', 'x/2'] },
    { w: 1, keys: K1, lesson: 'flipLine', topic: 'flipLine', sol: '-2x', gems: [2, 4], target: 6, wrong: ['2x', '-x'] },
    { w: 1, keys: K1, lesson: 'flipLine', topic: 'flipGentle', sol: '-x/3', gems: [3, 9], target: 15, wrong: ['x/3', '-x/2'] },
    { w: 1, keys: K1, lesson: 'shiftLine', topic: 'up', sol: 'x+4', gems: [0, 5], target: 10, wrong: ['x', 'x+3'] },
    { w: 1, keys: K1, lesson: 'fracSlope', topic: 'fracSlope', sol: '2x/3', gems: [3, 6], target: 12, wrong: ['x/2', 'x'] },
    { w: 1, keys: K1, lesson: 'lineAll', topic: 'down', sol: 'x/2-6', gems: [4, 8], target: 20, wrong: ['x/2', 'x/2+6'] },
    { w: 1, keys: K1, lesson: 'lineAll', topic: 'lineBoss', sol: '-2x/3+8', gems: [3, 9], target: 21, wrong: ['-x/2+8', '-2x/3'] },

    // ===== 2. Kavisler (+ doğruyla ilişkisi) =====
    { w: 2, keys: K2, lesson: 'parabola', topic: 'curve', sol: 'x^2', startX: -3, gems: [-2, 0, 2], target: 3, wrong: ['2x', 'x^2+1'] },
    { w: 2, keys: K2, lesson: 'flipCurve', topic: 'flip', sol: '-x^2', startX: -3, gems: [-2, 0, 2], target: 3, wrong: ['x^2', '-2x'] },
    { w: 2, keys: K2, lesson: 'shiftH', topic: 'right', sol: '(x-3)^2', gems: [0, 3], target: 6, wrong: ['x^2', '(x+3)^2'] },
    { w: 2, keys: K2, lesson: 'shiftH', topic: 'left', sol: '(x+2)^2', startX: -5, gems: [-4, -2, 0], target: 1, wrong: ['(x-2)^2', 'x^2+4'] },
    { w: 2, keys: K2, lesson: 'shiftV', topic: 'up', sol: 'x^2+5', gems: [0, 1, 2], target: 3, wrong: ['x^2'] },
    { w: 2, keys: K2, lesson: 'shiftV', topic: 'down', sol: 'x^2-8', gems: [0, 2], target: 4, wrong: ['x^2', 'x^2+8'] },
    { w: 2, keys: K2, lesson: 'narrow', topic: 'narrow', sol: '3x^2', startX: -2, gems: [-1, 0, 1], target: 2, wrong: ['x^2', '2x^2'] },
    { w: 2, keys: K2, lesson: 'wide', topic: 'wide', sol: 'x^2/4', gems: [2, 4], target: 6, wrong: ['x^2', 'x^2/2'] },
    { w: 2, keys: K2, lesson: 'combo', topic: 'symmetry', sol: '(x-4)^2-6', gems: [2, 6], target: 7, wrong: ['(x-4)^2', 'x^2-6'] },
    { w: 2, keys: K2, lesson: 'roots', topic: 'roots', sol: '(x-2)(x-6)', gems: [2, 6], target: 8, wrong: ['(x-2)(x+6)', 'x(x-6)'] },
    { w: 2, keys: K2, lesson: 'roots', topic: 'rootsOrigin', sol: 'x(x-4)', gems: [2, 4], target: 6, wrong: ['x(x+4)', '(x-4)^2'] },
    { w: 2, keys: K2, lesson: 'rootsDown', topic: 'rootsDown', sol: '-(x-1)(x-7)', gems: [1, 4, 7], target: 8, wrong: ['(x-1)(x-7)', '-(x-1)(x+7)'] },
    { w: 2, keys: K2, lesson: 'combo', topic: 'curveBoss', sol: '-(x-4)^2+10', gems: [2, 6], target: 8,
      walls: [{ x: 3, y: -14, w: 2, h: 16 }, { x: 3, y: 12, w: 2, h: 6 }], wrong: ['-(x-4)^2+12', '-(x-4)^2'] },

    // ===== 3. Köşeler: |x|, dönüşümler, ilişkiler =====
    { w: 3, keys: K3, lesson: 'absBase', topic: 'corner', sol: 'abs(x)', startX: -6, gems: [-4, 0, 3], target: 6, wrong: ['x', '-x'] },
    { w: 3, keys: K3, lesson: 'absFlip', topic: 'cornerFlip', sol: '-abs(x)', startX: -6, gems: [-4, 0, 3], target: 6, wrong: ['abs(x)', '-x'] },
    { w: 3, keys: K3, lesson: 'absShiftV', topic: 'cornerUp', sol: 'abs(x)+3', startX: -5, gems: [-3, 0, 2], target: 5, wrong: ['abs(x)', 'abs(x+3)'] },
    { w: 3, keys: K3, lesson: 'absShiftH', topic: 'cornerRight', sol: 'abs(x-4)', gems: [0, 4], target: 10, wrong: ['abs(x)', 'abs(x+4)', 'abs(x)-4'] },
    { w: 3, keys: K3, lesson: 'absShiftH', topic: 'cornerMoved', sol: '-abs(x-5)+5', gems: [3, 7], target: 10, wrong: ['abs(x-5)-5', '-abs(x-5)'] },
    { w: 3, keys: K3, lesson: 'absStretch', topic: 'cornerSteep', sol: '2abs(x-3)-6', gems: [1, 5], target: 8, wrong: ['abs(x-3)-6'] },
    { w: 3, keys: K3, lesson: 'foldLine', topic: 'foldLine', sol: 'abs(2x-6)', gems: [1, 5], target: 7, wrong: ['2x-6', 'abs(x-6)'] },
    { w: 3, keys: K3, lesson: 'cornerLine', topic: 'cornerLine', sol: 'abs(x-4)+x', gems: [1, 3, 6], target: 8, wrong: ['abs(x-4)', 'x'] },
    { w: 3, keys: K3, lesson: 'foldCurve', topic: 'foldCurve', sol: 'abs(x^2-4)', startX: -4, gems: [-3, -2, 0, 2], target: 3, wrong: ['x^2-4', 'abs(x^2-2)'] },
    { w: 3, keys: K3, lesson: 'foldCurve', topic: 'foldHidden', sol: 'abs(x^2-2)', startX: -3, gems: [-2, -1, 0, 1, 2], target: 3, wrong: ['x^2-2', 'abs(x^2-4)'] },
    { w: 3, keys: K3, lesson: 'foldCurve', topic: 'foldRoots', sol: 'abs((x-2)(x-6))', gems: [0, 2, 4, 6], target: 8, wrong: ['(x-2)(x-6)'] },
    { w: 3, keys: K3, lesson: 'cornerSum', topic: 'cornerBoss', sol: 'abs(x-4)-abs(x-12)', gems: [2, 8, 14], target: 18, wrong: ['2abs(x-8)-8'] },

    // ===== 4. Dalgalar: sinüs, π, dönüşümler, periyot, ilişkiler =====
    { w: 4, keys: K4, lesson: 'sine', topic: 'sine', sol: 'sin(x)', gems: [PI / 2, 3 * PI / 2, 5 * PI / 2], target: 7 * PI / 2, wrong: ['sin(πx)', 'cos(x)'] },
    { w: 4, keys: K4, lesson: 'sinePi', topic: 'sinePi', sol: 'sin(πx)', gems: [0.5, 1.5, 2.5], target: 3.5, wrong: ['sin(x)', 'sin(πx/2)'] },
    { w: 4, keys: K4, lesson: 'waveFlip', topic: 'waveFlip', sol: '-sin(πx)', gems: [0.5, 1.5, 2.5], target: 3.5, wrong: ['sin(πx)'] },
    { w: 4, keys: K4, lesson: 'waveShiftV', topic: 'waveUp', sol: 'sin(πx)+2', gems: [0.5, 1.5, 2.5], target: 3.5, wrong: ['sin(πx)', 'sin(πx)+1'] },
    { w: 4, keys: K4, lesson: 'waveShiftH', topic: 'waveRight', sol: 'sin(π(x-0.5))', gems: [0, 1, 2], target: 3, wrong: ['sin(πx)', '-sin(πx)'] },
    { w: 4, keys: K4, lesson: 'waveHeight', topic: 'waveTall', sol: '3sin(πx)', gems: [0.5, 1.5, 2.5], target: 3.5, wrong: ['sin(πx)', '2sin(πx)'] },
    { w: 4, keys: K4, lesson: 'period', topic: 'period', sol: 'sin(πx/2)', gems: [1, 3, 5], target: 7, wrong: ['sin(πx)', 'sin(πx/4)'] },
    { w: 4, keys: K4, lesson: 'period', topic: 'periodTall', sol: '3sin(πx/4)', gems: [2, 6, 10], target: 14, wrong: ['3sin(πx/2)', 'sin(πx/4)'] },
    { w: 4, keys: K4, lesson: 'waveAll', topic: 'waveAll', sol: '3sin(πx/4)+6', gems: [0, 2, 6], target: 10, wrong: ['3sin(πx/4)'] },
    { w: 4, keys: K4, lesson: 'sum', topic: 'sumStairs', sol: 'x+sin(πx/2)', gems: [1, 3, 5, 7], target: 9, wrong: ['x'] },
    { w: 4, keys: K4, lesson: 'absWave', topic: 'absWave', sol: '3abs(sin(πx/4))', gems: [2, 4, 6, 8], target: 10, wrong: ['3sin(πx/4)'] },
    { w: 4, keys: K4, lesson: 'growWave', topic: 'growWave', sol: 'x sin(πx/2)', gems: [1, 3, 5, 7, 9], target: 11, wrong: ['sin(πx/2)', 'x'] },
    { w: 4, keys: K4, lesson: 'cornerWave', topic: 'cornerWave', sol: 'abs(x-6)+sin(πx/2)', gems: [3, 5, 7, 9], target: 12, wrong: ['abs(x-6)'] },

    // ===== 5. Ters bulmaca (eğri çizili, formülü oyuncu bulur) =====
    { w: 5, keys: K5, lesson: 'reverse', topic: 'revLine', sol: '2x-3', shape: [0, 8], marks: [0, 3, 8], wrong: ['2x', 'x-3'] },
    { w: 5, keys: K5, lesson: 'reverse', topic: 'revLine', sol: '-x/2+4', shape: [0, 16], marks: [0, 8, 16], wrong: ['-x/2', '-2x+4'] },
    { w: 5, keys: K5, lesson: 'reverse', topic: 'revCurve', sol: '(x-3)^2-4', shape: [0, 7], marks: [0, 3, 7], wrong: ['(x+3)^2-4', '(x-3)^2'] },
    { w: 5, keys: K5, lesson: 'reverse', topic: 'revCurve', sol: '-(x-4)^2+9', shape: [0, 8], marks: [0, 4, 8], wrong: ['(x-4)^2+9', '-(x-4)^2'] },
    { w: 5, keys: K5, lesson: 'reverse', topic: 'revStretch', sol: 'x^2/4-5', shape: [0, 8], marks: [0, 4, 8], wrong: ['x^2-5', 'x^2/2-5'] },
    { w: 5, keys: K5, lesson: 'reverse', topic: 'revStretch', sol: '2(x-2)^2-6', shape: [0, 5], marks: [0, 2, 4], wrong: ['(x-2)^2-6'] },
    { w: 5, keys: K5, lesson: 'reverse', topic: 'revCorner', sol: 'abs(x-5)-3', shape: [0, 12], marks: [0, 5, 12], wrong: ['abs(x+5)-3', 'abs(x-5)'] },
    { w: 5, keys: K5, lesson: 'reverse', topic: 'revCorner', sol: '-2abs(x-4)+6', shape: [0, 10], marks: [0, 4, 10], wrong: ['-abs(x-4)+6'] },
    { w: 5, keys: K5, lesson: 'reverse', topic: 'revWave', sol: '3sin(πx/4)', shape: [0, 16], marks: [2, 6, 10, 14], wrong: ['3sin(πx/2)', 'sin(πx/4)'] },
    { w: 5, keys: K5, lesson: 'reverse', topic: 'revSum', sol: 'x+2sin(πx/2)', shape: [0, 12], marks: [1, 3, 5, 12], wrong: ['x', 'x+sin(πx/2)'] },
  ];

  const counts = {};
  const LEVELS = SPEC.map(S => {
    const n = (counts[S.w] = (counts[S.w] || 0) + 1);
    const p = E.parse(S.sol);
    if (!p.ok) throw new Error(`bölüm ${S.w}-${n}: çözüm ayrıştırılamadı`);
    const at = x => [x, p.fn(x)];
    const shape = S.shape ? { fn: p.fn, from: S.shape[0], to: S.shape[1] } : null;
    return {
      id: `${S.w}-${n}`, world: S.w, n, keys: S.keys, topic: S.topic, lesson: S.lesson, solution: S.sol,
      start: [0, 0], startX: S.startX || 0,
      target: shape ? null : { x: S.target, y: p.fn(S.target) }, gems: (S.gems || []).map(at),
      shape, marks: (S.marks || []).map(at),
      walls: S.walls || [], rocks: S.rocks || [], wrong: S.wrong || [], ban: S.ban, need: S.need,
    };
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = LEVELS;
  else root.LEVELS = LEVELS;
})(typeof window !== 'undefined' ? window : globalThis);
