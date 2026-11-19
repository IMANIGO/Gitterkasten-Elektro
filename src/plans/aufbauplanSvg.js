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

  const legendItems = plan.legend?.length
    ? plan.legend
    : (plan.placements || []).map((p) => ({
        tag: p.tag,
        label: p.catalogId,
        catalogId: p.catalogId,
        symbol: symbolForCatalog(p.catalogId),
      }));
  const legendX = totalW + 20;
  const legendW = 280;
  const rowH = 22;
  const legendTop = oy;
  const legendH = Math.max(48, 28 + legendItems.length * rowH);
  let legend = `<rect x="${legendX}" y="${legendTop - 8}" width="${legendW}" height="${legendH}" fill="#faf8f4" stroke="#222" stroke-width="1"/>
    <text x="${legendX + 12}" y="${legendTop + 10}" font-size="11" font-weight="600" fill="#666" font-family="IBM Plex Sans, sans-serif">LEGENDE${plan.live ? " · live" : ""}</text>`;
  if (!legendItems.length) {
    legend += `<text x="${legendX + 12}" y="${legendTop + 32}" font-size="11" fill="#999" font-family="IBM Plex Sans, sans-serif">folgt dem 3D-Aufbau</text>`;
  }
  legendItems.forEach((l, i) => {
    const y = legendTop + 28 + i * rowH;
    legend += legendGlyph(l.symbol || symbolForCatalog(l.catalogId), legendX + 16, y - 4);
    legend += `<text x="${legendX + 36}" y="${y}" font-size="11" font-family="IBM Plex Sans, sans-serif" fill="#222"><tspan font-weight="600">${escapeXml(l.tag)}</tspan>  ${escapeXml(l.label)}</text>`;
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

  const viewH = Math.max(totalH, uvY + 40, legendTop + legendH + 48);
  const viewW = legendX + legendW + 16;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewW} ${viewH}" width="100%" role="img" aria-label="${escapeXml(plan.title)}">
    <rect width="100%" height="100%" fill="#fff"/>
    <text x="${ox}" y="28" font-size="18" font-weight="600" font-family="IBM Plex Sans, sans-serif">${escapeXml(plan.title)}</text>
    <text x="${ox}" y="46" font-size="11" fill="#666" font-family="IBM Plex Sans, sans-serif">${escapeXml(plan.modul || "")} · ${escapeXml(plan.planNr || "")} · Blatt ${escapeXml(plan.blatt || "01")}</text>
    ${panelRects}
    ${emptyHint}
    ${devices}
    ${legend}
    ${uvBlock}
    ${wireBlock}
    ${liveBadge}
    <text x="${ox}" y="${viewH - 16}" font-size="10" fill="#888" font-family="IBM Plex Sans, sans-serif">Maße in cm (von Bezugskante) · Abwicklung Flächen 1–4 · digital erzeugt (markenneutral)</text>
  </svg>`;
}

function symbolForCatalog(id) {
  if (!id) return "generic";
  if (id.includes("tasterblock")) return "tasterblock";
  if (id.includes("taster") && !id.includes("wechsel") && !id.includes("kreuz") && !id.includes("aus")) return "taster";
  if (id.startsWith("serie")) return "serie";
  if (id.includes("kreuz")) return "kreuz";
  if (id.includes("wechsel") || id === "schalter") return "wechsel";
  if (id.includes("aus")) return "aus";
  if (id.includes("steck") || id.startsWith("cee")) return "steck";
  if (id.startsWith("uv")) return "uv";
  if (id.startsWith("leuchte")) return "licht";
  if (id.includes("tasterblock")) return "tasterblock";
  return "generic";
}

function legendGlyph(symbol, x, y) {
  const s = 12;
  if (symbol === "taster") {
    return `<circle cx="${x}" cy="${y - 2}" r="5" fill="none" stroke="#111" stroke-width="1.2"/>
      <line x1="${x}" y1="${y - 7}" x2="${x}" y2="${y - 12}" stroke="#111" stroke-width="1.2"/>`;
  }
  if (symbol === "kreuz") {
    return `<line x1="${x - 5}" y1="${y - 8}" x2="${x + 5}" y2="${y + 2}" stroke="#111" stroke-width="1.3"/>
      <line x1="${x + 5}" y1="${y - 8}" x2="${x - 5}" y2="${y + 2}" stroke="#111" stroke-width="1.3"/>`;
  }
  if (symbol === "wechsel") {
    return `<polyline points="${x - 6},${y} ${x - 1},${y} ${x + 6},${y - 8}" fill="none" stroke="#111" stroke-width="1.2"/>
      <circle cx="${x + 6}" cy="${y - 8}" r="1.6" fill="#111"/>`;
  }
  if (symbol === "aus") {
    return `<polyline points="${x - 6},${y + 2} ${x},${y + 2} ${x + 6},${y - 8}" fill="none" stroke="#111" stroke-width="1.2"/>`;
  }
  if (symbol === "serie") {
    return `<rect x="${x - 7}" y="${y - 8}" width="${s}" height="10" fill="none" stroke="#111" stroke-width="1"/>
      <line x1="${x - 1}" y1="${y - 8}" x2="${x - 1}" y2="${y + 2}" stroke="#111" stroke-width="1"/>`;
  }
  if (symbol === "steck") {
    return `<circle cx="${x}" cy="${y - 2}" r="5" fill="none" stroke="#111" stroke-width="1.2"/>`;
  }
  if (symbol === "uv") {
    return `<rect x="${x - 6}" y="${y - 8}" width="12" height="10" fill="#d8dce0" stroke="#111" stroke-width="1"/>`;
  }
  if (symbol === "licht") {
    return `<circle cx="${x}" cy="${y - 2}" r="5" fill="#f5f0c8" stroke="#111" stroke-width="1"/>`;
  }
  if (symbol === "tasterblock") {
    return [0, 1, 2, 3]
      .map(
        (i) =>
          `<circle cx="${x}" cy="${y - 10 + i * 4}" r="1.6" fill="none" stroke="#111" stroke-width="0.8"/>`,
      )
      .join("");
  }
  return `<rect x="${x - 4}" y="${y - 6}" width="8" height="8" fill="none" stroke="#111" stroke-width="1"/>`;
}

function escapeXml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
