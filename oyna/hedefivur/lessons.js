// Dersler: bölüm başlamadan açılan pencere ve ? düğmesinin grafikleri. Metinler locales 'lesson.<ad>.title/body'.
// Kural (sahip, 2026-11-16): dersler EN BASİT örneklerle anlatır (1 birim sağa, 1 birim yukarı…);
// büyük sayılar bölümlerde kalır. Bir ders hiçbir bölümün cevabını birebir göstermez (verify denetler);
// yalnız INTRO'daki temel eğriler istisna: konunun ilk bölümü zaten o eğrinin kendisidir.
// curves: ilk eğri kesikli "ana" eğri (birden çok eğri varsa), sonrakiler renkli dönüşmüş hâlleri.
(function (root) {
  const LESSONS = {
    // Doğrular
    flat:        { view: [-2, 10, -3, 4],   curves: ['1'] },
    slope:       { view: [-1, 8, -1, 8],    curves: ['x', '2x', 'x/2'] },
    flipLine:    { view: [-1, 8, -7, 7],    curves: ['x', '-x'] },
    shiftLine:   { view: [-2, 7, -4, 7],    curves: ['x', 'x+1', 'x-1'] },
    fracSlope:   { view: [-1, 7, -1, 7],    curves: ['3x/2'], marks: [0, 2, 4] },
    lineAll:     { view: [-1, 6, -4, 4],    curves: ['-x+2'], marks: [0, 2] },
    // Kavisler
    parabola:    { view: [-4, 4, -1, 10],   curves: ['x^2'], marks: [-2, 1, 2] },
    flipCurve:   { view: [-4, 4, -10, 10],  curves: ['x^2', '-x^2'] },
    shiftH:      { view: [-4, 4, -1, 7],    curves: ['x^2', '(x-1)^2', '(x+1)^2'] },
    shiftV:      { view: [-3, 3, -2, 6],    curves: ['x^2', 'x^2+1', 'x^2-1'] },
    narrow:      { view: [-3, 3, -1, 7],    curves: ['x^2', '2x^2'] },
    wide:        { view: [-4, 4, -1, 7],    curves: ['x^2', 'x^2/2'] },
    combo:       { view: [-3, 4, -5, 5],    curves: ['x^2', '-(x-1)^2+1'], marks: [1] },
    roots:       { view: [-1, 5, -2, 5],    curves: ['(x-1)(x-3)'], marks: [1, 3] },
    rootsDown:   { view: [-1, 5, -4, 3],    curves: ['-(x-1)(x-3)'], marks: [1, 2, 3] },
    // Köşeler
    absBase:     { view: [-4, 4, -1, 5],    curves: ['abs(x)'], marks: [-2, 2] },
    absFlip:     { view: [-4, 4, -5, 5],    curves: ['abs(x)', '-abs(x)'] },
    absShiftV:   { view: [-4, 4, -2, 5],    curves: ['abs(x)', 'abs(x)+1', 'abs(x)-1'] },
    absShiftH:   { view: [-4, 4, -1, 5],    curves: ['abs(x)', 'abs(x-1)', 'abs(x+1)'] },
    absStretch:  { view: [-4, 4, -1, 7],    curves: ['abs(x)', '2abs(x)', 'abs(x)/2'] },
    foldLine:    { view: [-1, 5, -3, 4],    curves: ['x-2', 'abs(x-2)'] },
    cornerLine:  { view: [-1, 5, -1, 7],    curves: ['abs(x-1)', 'abs(x-1)+x'] },
    foldCurve:   { view: [-3, 3, -2, 5],    curves: ['x^2-1', 'abs(x^2-1)'] },
    cornerSum:   { view: [-2, 6, -4, 4],    curves: ['abs(x-1)', '-abs(x-3)', 'abs(x-1)-abs(x-3)'] },
    // Dalgalar
    sine:        { view: [-1, 10, -2, 2],   curves: ['sin(x)'], marks: [Math.PI / 2, 3 * Math.PI / 2] },
    sinePi:      { view: [-0.5, 5, -2, 2],  curves: ['sin(x)', 'sin(πx)'] },
    waveFlip:    { view: [-1, 10, -2, 2],   curves: ['sin(x)', '-sin(x)'] },
    waveShiftV:  { view: [-1, 10, -2, 3],   curves: ['sin(x)', 'sin(x)+1'] },
    waveShiftH:  { view: [-1, 10, -2, 2],   curves: ['sin(x)', 'sin(x-π/2)'] },
    waveHeight:  { view: [-1, 10, -3, 3],   curves: ['sin(x)', '2sin(x)'] },
    period:      { view: [-0.5, 7, -2, 2],  curves: ['sin(πx)', 'sin(πx/3)'] },
    waveAll:     { view: [-1, 9, -2, 4],    curves: ['sin(πx)', '2sin(πx/2)+1'] },
    sum:         { view: [-1, 7, -2, 5],    curves: ['x/2', 'sin(πx)', 'x/2+sin(πx)'] },
    absWave:     { view: [-1, 10, -2, 2],   curves: ['sin(x)', 'abs(sin(x))'] },
    growWave:    { view: [-0.5, 6, -6, 6],  curves: ['x sin(πx)'] },
    cornerWave:  { view: [-1, 7, -2, 5],    curves: ['abs(x-3)', 'abs(x-3)+sin(πx)'] },
    // Ters bulmaca
    reverse:     { view: [-2, 4, -2, 6],    curves: ['(x-1)^2-1'], marks: [0, 1, 3] },
  };
  // Konunun kendisi olan temel eğriler: dersin gösterdiği eğri, o konunun ilk bölümünün cevabı olabilir.
  const INTRO = ['x', 'x^2', '-x^2', 'abs(x)', '-abs(x)', 'sin(x)', 'sin(πx)'];
  const out = { LESSONS, INTRO };
  if (typeof module !== 'undefined' && module.exports) module.exports = out;
  else root.LESSON_DATA = out;
})(typeof window !== 'undefined' ? window : globalThis);
