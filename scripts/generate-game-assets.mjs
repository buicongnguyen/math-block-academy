import fs from "node:fs/promises";
import path from "node:path";

const outDir = path.join(process.cwd(), "public/assets/game-art");

const assets = {
  "academy-backdrop.svg": `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 620" role="img" aria-label="Math academy puzzle board backdrop">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b211f"/>
      <stop offset="0.52" stop-color="#163a36"/>
      <stop offset="1" stop-color="#071412"/>
    </linearGradient>
    <radialGradient id="goldGlow" cx="0.18" cy="0.12" r="0.45">
      <stop offset="0" stop-color="#ffc96b" stop-opacity="0.34"/>
      <stop offset="1" stop-color="#ffc96b" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="mintGlow" cx="0.88" cy="0.78" r="0.42">
      <stop offset="0" stop-color="#8fe0c4" stop-opacity="0.25"/>
      <stop offset="1" stop-color="#8fe0c4" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="46" height="42" patternUnits="userSpaceOnUse">
      <path d="M46 0H0V42" fill="none" stroke="#8fe0c4" stroke-opacity="0.12" stroke-width="1"/>
    </pattern>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#000000" flood-opacity="0.28"/>
    </filter>
  </defs>
  <rect width="960" height="620" fill="url(#bg)"/>
  <rect width="960" height="620" fill="url(#goldGlow)"/>
  <rect width="960" height="620" fill="url(#mintGlow)"/>
  <rect x="26" y="26" width="908" height="568" rx="34" fill="#193b37" fill-opacity="0.68" stroke="#8fe0c4" stroke-opacity="0.28"/>
  <rect x="42" y="42" width="876" height="536" rx="26" fill="url(#grid)" opacity="0.9"/>
  <g filter="url(#softShadow)">
    <path d="M152 506h656" stroke="#ffc96b" stroke-width="10" stroke-linecap="round" opacity="0.35"/>
    <path d="M460 508l-42 66h124l-42-66z" fill="#ffc96b" opacity="0.6"/>
    <circle cx="480" cy="506" r="22" fill="#8fe0c4" opacity="0.75"/>
  </g>
  <g font-family="Rockwell, Georgia, serif" font-size="30" fill="#8fe0c4" opacity="0.22">
    <text x="682" y="96">x + 7 = 18</text>
    <text x="690" y="146">A = lw</text>
    <text x="666" y="196">y = 3x + 1</text>
    <text x="638" y="246">a^2 + b^2 = c^2</text>
  </g>
  <g fill="none" stroke="#ffc96b" stroke-opacity="0.2" stroke-width="4">
    <path d="M130 130c70-54 142-54 216 0"/>
    <path d="M126 180c94 48 184 48 270 0"/>
  </g>
</svg>`,
  "term-variable.svg": tokenSvg("#8fe0c4", "#dffff4", "#12332f"),
  "term-constant.svg": tokenSvg("#ffc96b", "#fff1c8", "#33260f"),
  "term-formula.svg": tokenSvg("#ff9a76", "#ffe1d6", "#361a13"),
  "term-neutral.svg": tokenSvg("#b9d2ca", "#f6f1dc", "#172826"),
  "choice-card.svg": `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 100" role="img" aria-label="Answer choice card">
  <defs>
    <linearGradient id="choice" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffe09a"/>
      <stop offset="0.58" stop-color="#ffc96b"/>
      <stop offset="1" stop-color="#ff9a76"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-30%" width="140%" height="160%">
      <feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#000000" flood-opacity="0.26"/>
    </filter>
  </defs>
  <rect x="8" y="8" width="244" height="84" rx="22" fill="url(#choice)" filter="url(#shadow)"/>
  <rect x="15" y="15" width="230" height="70" rx="18" fill="none" stroke="#fff6d4" stroke-opacity="0.72" stroke-width="3"/>
  <path d="M30 72c58-20 127-20 202 0" fill="none" stroke="#2f2712" stroke-opacity="0.12" stroke-width="7" stroke-linecap="round"/>
</svg>`,
  "lesson-orb.svg": `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" role="img" aria-label="Lesson energy orb">
  <defs>
    <radialGradient id="orb" cx="0.35" cy="0.28" r="0.75">
      <stop offset="0" stop-color="#f6f1dc"/>
      <stop offset="0.42" stop-color="#8fe0c4"/>
      <stop offset="1" stop-color="#0f4b45"/>
    </radialGradient>
    <filter id="glow" x="-35%" y="-35%" width="170%" height="170%">
      <feGaussianBlur stdDeviation="7" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <circle cx="80" cy="80" r="54" fill="#8fe0c4" opacity="0.28" filter="url(#glow)"/>
  <circle cx="80" cy="80" r="40" fill="url(#orb)" stroke="#dffff4" stroke-opacity="0.8" stroke-width="4"/>
  <path d="M58 82l16 16 32-42" fill="none" stroke="#10211e" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,
  "boss-badge.svg": `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" role="img" aria-label="Boss exam badge">
  <defs>
    <linearGradient id="badge" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffcf73"/>
      <stop offset="0.46" stop-color="#ff8e6a"/>
      <stop offset="1" stop-color="#8fe0c4"/>
    </linearGradient>
  </defs>
  <path d="M90 12l22 32 38-8-8 38 32 22-32 22 8 38-38-8-22 32-22-32-38 8 8-38-32-22 32-22-8-38 38 8z" fill="url(#badge)"/>
  <circle cx="90" cy="90" r="48" fill="#10211e" fill-opacity="0.82" stroke="#fff1c8" stroke-width="5"/>
  <path d="M64 101l18-52 18 52m-27-16h18m20-36v52h26" fill="none" stroke="#fff1c8" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,
};

await fs.mkdir(outDir, { recursive: true });

for (const [filename, contents] of Object.entries(assets)) {
  await fs.writeFile(path.join(outDir, filename), `${contents}\n`, "utf8");
}

console.log(`Generated ${Object.keys(assets).length} game art assets in ${path.relative(process.cwd(), outDir)}.`);

function tokenSvg(fill, highlight, ink) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 128" role="img" aria-label="Math block token">
  <defs>
    <linearGradient id="face" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${highlight}"/>
      <stop offset="0.32" stop-color="${fill}"/>
      <stop offset="1" stop-color="${fill}" stop-opacity="0.78"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-25%" width="140%" height="150%">
      <feDropShadow dx="0" dy="12" stdDeviation="10" flood-color="#000000" flood-opacity="0.26"/>
    </filter>
  </defs>
  <rect x="12" y="18" width="216" height="92" rx="24" fill="url(#face)" filter="url(#shadow)"/>
  <rect x="22" y="28" width="196" height="72" rx="18" fill="none" stroke="${highlight}" stroke-opacity="0.74" stroke-width="4"/>
  <circle cx="48" cy="64" r="9" fill="${ink}" fill-opacity="0.24"/>
  <circle cx="192" cy="64" r="9" fill="${ink}" fill-opacity="0.24"/>
  <path d="M78 78c30 12 58 12 84 0" fill="none" stroke="${ink}" stroke-opacity="0.22" stroke-width="8" stroke-linecap="round"/>
</svg>`;
}
