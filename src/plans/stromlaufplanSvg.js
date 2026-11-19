/**
 * Simplified VDE-oriented Stromlaufplan (Stromlauf) as SVG.
 * Vertical power rails + circuit stacks — didactic, not a CAD substitute.
 */
export function renderStromlaufplanSvg(plan) {
  const W = 720;
  const H = 920;
  const left = 80;
  const railX = { L1: 140, L2: 170, L3: 200, N: 240, PE: 280 };
  let y = 70;
  const rowH = 78;

  const railLines = Object.entries(railX)
    .map(
      ([name, x]) =>
        `<line x1="${x}" y1="50" x2="${x}" y2="${H - 40}" stroke="#222" stroke-width="1.4"/>
         <text x="${x}" y="42" text-anchor="middle" font-size="11" font-weight="600" font-family="IBM Plex Sans, sans-serif">${name}</text>`,
    )
    .join("");

  const blocks = [];
  const circuits = plan.circuits || [];

  function contact(x, cy, label) {
    return `<g>
      <circle cx="${x}" cy="${cy}" r="5" fill="none" stroke="#111" stroke-width="1.3"/>
      <text x="${x + 10}" y="${cy + 4}" font-size="10" font-family="IBM Plex Sans, sans-serif">${label}</text>
    </g>`;
  }

  circuits.forEach((c, i) => {
    const cy = y + i * rowH;
    const title = `<text x="${left}" y="${cy - 18}" font-size="12" font-weight="600" font-family="IBM Plex Sans, sans-serif">${c.title}</text>`;
    const cable = c.cable
      ? `<text x="${left}" y="${cy - 4}" font-size="10" fill="#666" font-family="IBM Plex Sans, sans-serif">${c.cable.typeId?.toUpperCase?.() || ""} ${c.cable.cores}×${c.cable.mm2}</text>`
      : "";

    let body = "";
    if (c.id === "wechsel-e1") {
      body = `
        <line x1="${railX.L1}" y1="${cy}" x2="360" y2="${cy}" stroke="#8b5a2b" stroke-width="1.5"/>
        ${contact(360, cy, "S1")}
        <line x1="380" y1="${cy - 10}" x2="460" y2="${cy - 10}" stroke="#808080" stroke-width="1.2"/>
        <line x1="380" y1="${cy + 10}" x2="460" y2="${cy + 10}" stroke="#111" stroke-width="1.2"/>
        ${contact(470, cy, "S2")}
        <line x1="490" y1="${cy}" x2="560" y2="${cy}" stroke="#8b5a2b" stroke-width="1.5"/>
        <circle cx="580" cy="${cy}" r="12" fill="none" stroke="#111"/><text x="580" y="${cy + 4}" text-anchor="middle" font-size="10">E1</text>
        <line x1="600" y1="${cy}" x2="${railX.N}" y2="${cy + 28}" stroke="#1f6fb2" stroke-width="1.3"/>
        <line x1="580" y1="${cy + 12}" x2="${railX.PE}" y2="${cy + 36}" stroke="#c7a81a" stroke-width="1.3"/>
      `;
    } else if (c.id === "steuern-k1") {
      body = `
        <line x1="${railX.L1}" y1="${cy}" x2="360" y2="${cy}" stroke="#8b5a2b" stroke-width="1.5"/>
        ${contact(360, cy, "S3")}
        <line x1="380" y1="${cy}" x2="450" y2="${cy}" stroke="#111" stroke-width="1.3"/>
        ${contact(460, cy, "S0")}
        <line x1="480" y1="${cy}" x2="540" y2="${cy}" stroke="#111" stroke-width="1.3"/>
        <rect x="540" y="${cy - 14}" width="50" height="28" fill="none" stroke="#111"/><text x="565" y="${cy + 4}" text-anchor="middle" font-size="10">K1</text>
        <line x1="590" y1="${cy}" x2="${railX.N}" y2="${cy + 24}" stroke="#1f6fb2" stroke-width="1.3"/>
      `;
    } else if (c.id === "cee-x2") {
      body = `
        <line x1="${railX.L1}" y1="${cy - 10}" x2="520" y2="${cy - 10}" stroke="#8b5a2b" stroke-width="1.2"/>
        <line x1="${railX.L2}" y1="${cy}" x2="520" y2="${cy}" stroke="#111" stroke-width="1.2"/>
        <line x1="${railX.L3}" y1="${cy + 10}" x2="520" y2="${cy + 10}" stroke="#808080" stroke-width="1.2"/>
        <rect x="520" y="${cy - 18}" width="54" height="36" fill="#b83228" stroke="#111"/><text x="547" y="${cy + 4}" text-anchor="middle" font-size="10" fill="#fff">X2</text>
        <line x1="574" y1="${cy}" x2="${railX.N}" y2="${cy + 22}" stroke="#1f6fb2" stroke-width="1.2"/>
        <line x1="547" y1="${cy + 18}" x2="${railX.PE}" y2="${cy + 34}" stroke="#c7a81a" stroke-width="1.2"/>
      `;
    } else {
      const tag = (c.to || "?").toString();
      body = `
        <line x1="${railX.L1}" y1="${cy}" x2="520" y2="${cy}" stroke="#8b5a2b" stroke-width="1.4"/>
        <rect x="520" y="${cy - 14}" width="54" height="28" fill="#f4f1ea" stroke="#111"/><text x="547" y="${cy + 4}" text-anchor="middle" font-size="10">${tag}</text>
        <line x1="574" y1="${cy}" x2="${railX.N}" y2="${cy + 20}" stroke="#1f6fb2" stroke-width="1.3"/>
        <line x1="547" y1="${cy + 14}" x2="${railX.PE}" y2="${cy + 32}" stroke="#c7a81a" stroke-width="1.3"/>
      `;
    }

    blocks.push(`<g>${title}${cable}${body}</g>`);
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Stromlaufplan">
    <rect width="100%" height="100%" fill="#fff"/>
    <text x="24" y="28" font-size="18" font-weight="600" font-family="IBM Plex Sans, sans-serif">Stromlaufplan — ${plan.planNr || plan.id}</text>
    <text x="24" y="46" font-size="11" fill="#666" font-family="IBM Plex Sans, sans-serif">VDE-orientierte Darstellung (didaktisch) · ${plan.title}</text>
    ${railLines}
    ${blocks.join("\n")}
    <text x="24" y="${H - 16}" font-size="10" fill="#888" font-family="IBM Plex Sans, sans-serif">Farben: braun L · blau N · gn/ge PE · schwarz/grau Steuer-/Phasenadern</text>
  </svg>`;
}
