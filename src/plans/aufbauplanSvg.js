/**
 * Unfolded Aufbauplan as SVG (like the training sheet), driven by plan.placements.
 */
export function renderAufbauplanSvg(plan) {
  const scale = 3.2; // px per cm
  const leftW = (plan.faces?.left?.widthCm || 48.5) * scale;
  const backW = (plan.faces?.back?.widthCm || 96.5) * scale;
  const rightW = (plan.faces?.right?.widthCm || 48.5) * scale;
  const wallH = (plan.faces?.back?.heightCm || 51) * scale;
  const floorH = (plan.faces?.floor?.heightCm || 48.5) * scale;
  const gap = 8;
  const ox = 24;
  const oy = 56;
  const totalW = ox + leftW + backW + rightW + 40;
  const totalH = oy + wallH + floorH + 120;

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

  function dimLabel(p) {
    if (p.face === "back" || p.face === "floor") {
      const a = p.fromLeftCm != null ? `${p.fromLeftCm}` : "–";
      const b =
        p.face === "back"
          ? p.fromTopCm != null
            ? `${p.fromTopCm}`
            : "–"
          : p.fromBackCm != null
            ? `${p.fromBackCm}`
            : "–";
      return `${a}/${b}`;
    }
    const a = p.fromBackCm != null ? `${p.fromBackCm}` : "–";
    const b = p.fromTopCm != null ? `${p.fromTopCm}` : "–";
    return `${a}/${b}`;
  }

  const panels = [
    ["left", faceOrigin.left, leftW, wallH, "1", plan.faces?.left?.label || "links"],
    ["back", faceOrigin.back, backW, wallH, "2", plan.faces?.back?.label || "Rückwand"],
    ["right", faceOrigin.right, rightW, wallH, "3", plan.faces?.right?.label || "rechts"],
    ["floor", faceOrigin.floor, backW, floorH, "4", plan.faces?.floor?.label || "Boden"],
  ];

  let devices = "";
  for (const p of plan.placements || []) {
    const pos = devicePos(p);
    if (!pos) continue;
    const isUv = p.catalogId === "uv-3reihen";
    const w = isUv ? 44 : 28;
    const h = isUv ? 32 : 20;
    devices += `<g class="dev" data-tag="${escapeXml(p.tag)}">
      <rect x="${pos.x - w / 2}" y="${pos.y - h / 2}" width="${w}" height="${h}" rx="2" fill="${isUv ? "#d8dce0" : "#f4f1ea"}" stroke="#222" stroke-width="1.2"/>
      <text x="${pos.x}" y="${pos.y + 4}" text-anchor="middle" font-size="10" font-family="IBM Plex Sans, sans-serif" fill="#111">${escapeXml(p.tag)}</text>
      <text x="${pos.x}" y="${pos.y + h / 2 + 11}" text-anchor="middle" font-size="8" fill="#666" font-family="IBM Plex Sans, sans-serif">${escapeXml(dimLabel(p))} cm</text>
    </g>`;
  }

  let legend = "";
  (plan.legend || []).forEach((l, i) => {
    const y = oy + i * 15;
    legend += `<text x="${totalW + 150}" y="${y}" text-anchor="end" font-size="11" font-family="IBM Plex Sans, sans-serif" fill="#333"><tspan font-weight="600">${escapeXml(l.tag)}</tspan>  ${escapeXml(l.label)}</text>`;
  });

  // UV interior block
  let uvBlock = "";
  const uvContents = plan.uvContents || {};
  let uvY = oy + wallH + floorH + gap + 28;
  const uvKeys = Object.keys(uvContents);
  if (uvKeys.length) {
    uvBlock += `<text x="${ox}" y="${uvY}" font-size="12" font-weight="600" font-family="IBM Plex Sans, sans-serif">UV-Inhalt (Hutschiene)</text>`;
    uvY += 16;
    for (const key of uvKeys) {
      const items = uvContents[key]
        .map((it) => `${it.tag} ${it.name || it.catalogId}`)
        .join(" · ");
      uvBlock += `<text x="${ox}" y="${uvY}" font-size="10" fill="#444" font-family="IBM Plex Sans, sans-serif">${escapeXml(key)}: ${escapeXml(items)}</text>`;
      uvY += 14;
    }
  }

  // Wire runs
  let wireBlock = "";
  if (plan.wireRuns?.length) {
    wireBlock += `<text x="${ox}" y="${uvY + 8}" font-size="12" font-weight="600" font-family="IBM Plex Sans, sans-serif">Leitungen (live)</text>`;
    uvY += 24;
    plan.wireRuns.forEach((w) => {
      wireBlock += `<text x="${ox}" y="${uvY}" font-size="10" fill="#444" font-family="IBM Plex Sans, sans-serif">L${w.id}: ${escapeXml(w.label || "")} · ${w.lengthMm ?? "–"} mm · ${(w.faces || []).join("→") || "–"} · ${w.clamps || 0} Schellen</text>`;
      uvY += 14;
    });
  }

  const panelRects = panels
    .map(
      ([, o, w, h, nr, label]) =>
        `<rect x="${o.x}" y="${o.y}" width="${w}" height="${h}" fill="#faf8f4" stroke="#222" stroke-width="1.5"/>
         <text x="${o.x + 8}" y="${o.y + 16}" font-size="13" font-weight="600" font-family="IBM Plex Sans, sans-serif">${nr}</text>
         <text x="${o.x + w - 8}" y="${o.y + 16}" text-anchor="end" font-size="10" fill="#888" font-family="IBM Plex Sans, sans-serif">${escapeXml(label)}</text>`,
    )
    .join("");

  const liveBadge = plan.live
    ? `<text x="${ox}" y="${totalH - 36}" font-size="11" fill="#1f6fb2" font-family="IBM Plex Sans, sans-serif">Live aus 3D-Szene${plan.generatedAt ? ` · ${escapeXml(plan.generatedAt)}` : ""} · ${ (plan.placements || []).length } Bauteile</text>`
    : "";

  const emptyHint =
    !(plan.placements || []).length && plan.live
      ? `<text x="${ox + leftW + backW / 2}" y="${oy + wallH / 2}" text-anchor="middle" font-size="13" fill="#999" font-family="IBM Plex Sans, sans-serif">Noch keine Bauteile platziert — Aufbau in der 3D-Ansicht erzeugen</text>`
      : "";

  const viewH = Math.max(totalH, uvY + 40);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW + 160} ${viewH}" width="100%" role="img" aria-label="${escapeXml(plan.title)}">
    <rect width="100%" height="100%" fill="#fff"/>
    <text x="${ox}" y="28" font-size="18" font-weight="600" font-family="IBM Plex Sans, sans-serif">${escapeXml(plan.title)}</text>
    <text x="${ox}" y="46" font-size="11" fill="#666" font-family="IBM Plex Sans, sans-serif">${escapeXml(plan.modul || "")} · ${escapeXml(plan.planNr || "")} · Blatt ${escapeXml(plan.blatt || "01")}</text>
    ${panelRects}
    ${emptyHint}
    ${devices}
    <text x="${totalW + 150}" y="${oy - 12}" text-anchor="end" font-size="11" font-weight="600" fill="#666" font-family="IBM Plex Sans, sans-serif">LEGENDE</text>
    ${legend}
    ${uvBlock}
    ${wireBlock}
    ${liveBadge}
    <text x="${ox}" y="${viewH - 16}" font-size="10" fill="#888" font-family="IBM Plex Sans, sans-serif">Maße in cm (von Bezugskante) · Abwicklung Flächen 1–4 · digital erzeugt (markenneutral)</text>
  </svg>`;
}

function escapeXml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
