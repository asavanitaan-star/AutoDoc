// Reusable GenePlus logo as inline SVG (approximation of the printed mark:
// a dot-matrix glyph + "GenePlus" wordmark with a swoosh).
// Usage: genePlusLogo(heightPx)
function genePlusLogo(height = 48) {
  const navy = '#0f2f6b';
  const blue = '#1f7fc4';

  // 5x5 dot matrix. 1 = solid navy, 0 = hollow outline.
  const grid = [
    [1, 1, 0, 1, 1],
    [1, 1, 1, 0, 1],
    [0, 1, 1, 1, 0],
    [1, 0, 1, 1, 1],
    [1, 1, 0, 1, 1],
  ];
  const r = 5.2, gap = 13, ox = 8, oy = 10;
  let dots = '';
  grid.forEach((row, y) => row.forEach((v, x) => {
    const cx = ox + x * gap, cy = oy + y * gap;
    dots += v
      ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${navy}"/>`
      : `<circle cx="${cx}" cy="${cy}" r="${r - 1.1}" fill="none" stroke="${navy}" stroke-width="1.6"/>`;
  }));

  // viewBox tuned so the whole lockup scales by height
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 80" height="${height}" role="img" aria-label="GenePlus">
  <g>${dots}</g>
  <text x="88" y="52" font-family="Georgia,'Times New Roman',serif" font-size="46" font-weight="700">
    <tspan fill="${navy}">Gene</tspan><tspan fill="${blue}">Plus</tspan>
  </text>
  <path d="M92 60 C140 74 220 74 292 46" fill="none" stroke="${blue}" stroke-width="4.5" stroke-linecap="round"/>
</svg>`;
  return svg.trim();
}

if (typeof module !== 'undefined') module.exports = { genePlusLogo };
