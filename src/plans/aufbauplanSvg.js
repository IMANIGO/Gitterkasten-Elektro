/**
 * Unfolded Aufbauplan as SVG (like the training sheet).
 */
export function renderAufbauplanSvg(plan) {
  const scale = 3.2; // px per cm
  const leftW = (plan.faces.left?.widthCm || 48.5) * scale;
  const backW = (plan.faces.back?.widthCm || 96.5) * scale;
  const rightW = (plan.faces.right?.widthCm || 48.5) * scale;
  const wallH = (plan.faces.back?.heightCm || 51) * scale;
  const floorH = (plan.faces.floor?.heightCm || 48.5) * scale;
  const gap = 8;
  const ox = 24;
  const oy = 56;
  const totalW = ox + leftW + backW + rightW + 40;
  const totalH = oy + wallH + floorH + 80;

  const faceOrigin = {
    left: { x: ox, y: oy },
    back: { x: ox + leftW, y: oy },
    right: { x: ox + leftW + backW, y: oy },
    floor: { x: ox + leftW, y: oy + wallH + gap },
  };

  function devicePos(p) {
    const o = faceOrigin[p.face];
    if (!o) return null;
    if (p.face === "back") {
      return { x: o.x + (p.fromLeftCm || 0) * scale, y: o.y + (p.fromTopCm || 0) * scale };
    }
    if (p.face === "left" || p.face === "right") {
      return { x: o.x + (p.fromBackCm || 0) * scale, y: o.y + (p.fromTopCm || 0) * scale };
    }
    if (p.face === "floor") {
      return { x: o.x + (p.fromLeftCm || 0) * scale, y: o.y + (p.fromBackCm || 0) * scale };
    }
    return null;
  }

  const panels = [
    ["left", faceOrigin.left, leftW, wallH, "1"],
    ["back", faceOrigin.back, backW, wallH, "2"],
    ["right", faceOrigin.right, rightW, wallH, "3"],
    ["floor", faceOrigin.floor, backW, floorH, "4"],
  ];

  let devices = "";
  for (const p of plan.placements || []) {
    const pos = devicePos(p);
    if (!pos) continue;
    devices += `<g class="dev" data-tag="${p.tag}">
      <rect x="${pos.x - 14}" y="${pos.y - 10}" width="28" height="20" rx="2" fill="#f4f1ea" stroke="#222" stroke-width="1.2"/>
      <text x="${pos.x}" y="${pos.y + 4}" text-anchor="middle" font-size="10" font-family="IBM Plex Sans, sans-serif" fill="#111">${p.tag}</text>
    </g>`;
  }

  let legend = "";
  (plan.legend || []).forEach((l, i) => {
    const y = oy + i * 16;
    legend += `<text x="${totalW - 8}" y="${y}" text-anchor="end" font-size="11" font-family="IBM Plex Sans, sans-serif" fill="#333"><tspan font-weight="600">${l.tag}</tspan>  ${l.label}</text>`;
  });

  const panelRects = panels
    .map(
      ([, o, w, h, nr]) =>
        `<rect x="${o.x}" y="${o.y}" width="${w}" height="${h}" fill="#faf8f4" stroke="#222" stroke-width="1.5"/>
         <text x="${o.x + 8}" y="${o.y + 16}" font-size="13" font-weight="600" font-family="IBM Plex Sans, sans-serif">${nr}</text>`,
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW + 160} ${totalH}" width="100%" role="img" aria-label="${plan.title}">
    <rect width="100%" height="100%" fill="#fff"/>
    <text x="${ox}" y="28" font-size="18" font-weight="600" font-family="IBM Plex Sans, sans-serif">${plan.title}</text>
    <text x="${ox}" y="46" font-size="11" fill="#666" font-family="IBM Plex Sans, sans-serif">${plan.modul || ""} · ${plan.planNr || ""} · Blatt ${plan.blatt || "01"}</text>
    ${panelRects}
    ${devices}
    <text x="${totalW - 8}" y="${oy - 12}" text-anchor="end" font-size="11" font-weight="600" fill="#666" font-family="IBM Plex Sans, sans-serif">LEGENDE</text>
    ${legend}
    <text x="${ox}" y="${totalH - 16}" font-size="10" fill="#888" font-family="IBM Plex Sans, sans-serif">Maße in cm · Abwicklung Flächen 1–4 · digital erzeugt (markenneutral)</text>
  </svg>`;
}
