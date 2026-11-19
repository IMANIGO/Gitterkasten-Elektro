/**
 * Installations-Schaltzeichen, nachgezeichnet (nicht als Bild übernommen).
 * Quelle der Formen: Schaltzeichen „Schalter für Installation“, „Bauteile“,
 * „Verbinder“ — Kreis mit Stiel und Nase für Schalter, Doppelkreis für Taster.
 * Koordinaten im Quadrat 0…100.
 */

function nose(x1, y1, x2, y2, count) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const ops = [];
  for (let i = 0; i < count; i++) {
    const along = len - 4 - i * 11;
    const bx = x1 + ux * along;
    const by = y1 + uy * along;
    ops.push({ op: "line", x1: bx, y1: by, x2: bx + px * 14, y2: by + py * 14 });
  }
  return ops;
}

function switchStem(noses) {
  const x1 = 46;
  const y1 = 54;
  const x2 = 84;
  const y2 = 16;
  return [
    { op: "circle", x: 34, y: 66, r: 16 },
    { op: "line", x1, y1, x2, y2 },
    ...nose(x1, y1, x2, y2, noses),
  ];
}

/** @returns {{op:string, [key:string]: any}[]} */
export function symbolOps(kind) {
  if (kind === "aus") return switchStem(1);
  if (kind === "aus2") return switchStem(2);
  if (kind === "dimmer") {
    const stem = switchStem(1);
    const x1 = 46;
    const y1 = 54;
    const x2 = 84;
    const y2 = 16;
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const px = -dy / len;
    const py = dx / len;
    stem.push({
      op: "line",
      x1: mx - px * 9,
      y1: my - py * 9,
      x2: mx + px * 9,
      y2: my + py * 9,
    });
    return stem;
  }
  if (kind === "wechsel") {
    const x1 = 48;
    const y1 = 50;
    const x2 = 84;
    const y2 = 16;
    return [
      { op: "circle", x: 36, y: 58, r: 14 },
      { op: "line", x1, y1, x2, y2 },
      ...nose(x1, y1, x2, y2, 1),
      { op: "line", x1: 46, y1: 68, x2: 86, y2: 90 },
    ];
  }
  if (kind === "kreuz") {
    return [
      { op: "line", x1: 16, y1: 16, x2: 84, y2: 84 },
      { op: "line", x1: 84, y1: 16, x2: 16, y2: 84 },
      { op: "circle", x: 50, y: 50, r: 13, fill: true },
    ];
  }
  if (kind === "serieV") {
    return [
      { op: "circle", x: 50, y: 70, r: 16 },
      { op: "line", x1: 42, y1: 56, x2: 20, y2: 16 },
      { op: "line", x1: 58, y1: 56, x2: 80, y2: 16 },
    ];
  }
  if (kind === "taster") {
    return [
      { op: "circle", x: 50, y: 50, r: 28 },
      { op: "circle", x: 50, y: 50, r: 14 },
    ];
  }
  if (kind === "taster-licht" || kind === "lampe") {
    const r = kind === "lampe" ? 24 : 28;
    return [
      { op: "circle", x: 50, y: 50, r },
      { op: "line", x1: 50 - r * 0.62, y1: 50 - r * 0.62, x2: 50 + r * 0.62, y2: 50 + r * 0.62 },
      { op: "line", x1: 50 + r * 0.62, y1: 50 - r * 0.62, x2: 50 - r * 0.62, y2: 50 + r * 0.62 },
    ];
  }
  if (kind === "stromstoss") {
    return [
      { op: "rect", x: 14, y: 26, w: 72, h: 48 },
      {
        op: "polyline",
        pts: [
          [26, 58],
          [26, 40],
          [50, 40],
          [50, 58],
          [74, 58],
        ],
      },
    ];
  }
  if (kind === "daemmerung") {
    return [
      { op: "rect", x: 16, y: 16, w: 68, h: 68 },
      { op: "text", x: 50, y: 42, text: "LX", size: 22 },
      { op: "line", x1: 30, y1: 64, x2: 62, y2: 64 },
      {
        op: "polyline",
        pts: [
          [54, 56],
          [68, 64],
          [54, 72],
        ],
      },
    ];
  }
  if (kind === "dose") {
    return [
      { op: "line", x1: 6, y1: 50, x2: 94, y2: 50 },
      { op: "line", x1: 50, y1: 50, x2: 50, y2: 86 },
      { op: "circle", x: 50, y: 50, r: 12, fill: true },
    ];
  }
  return [{ op: "rect", x: 22, y: 22, w: 56, h: 56 }];
}

export function paintSymbol(ctx, kind, size = 256, bg = "#f6f3ea") {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "#1c1c1c";
  ctx.fillStyle = "#1c1c1c";
  ctx.lineWidth = Math.max(2, size * 0.05);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const s = size / 100;
  for (const op of symbolOps(kind)) {
    if (op.op === "circle") {
      ctx.beginPath();
      ctx.arc(op.x * s, op.y * s, op.r * s, 0, Math.PI * 2);
      if (op.fill) {
        ctx.fillStyle = bg;
        ctx.fill();
        ctx.strokeStyle = "#1c1c1c";
        ctx.fillStyle = "#1c1c1c";
      }
      ctx.stroke();
    } else if (op.op === "line") {
      ctx.beginPath();
      ctx.moveTo(op.x1 * s, op.y1 * s);
      ctx.lineTo(op.x2 * s, op.y2 * s);
      ctx.stroke();
    } else if (op.op === "polyline") {
      ctx.beginPath();
      op.pts.forEach((p, i) => (i ? ctx.lineTo(p[0] * s, p[1] * s) : ctx.moveTo(p[0] * s, p[1] * s)));
      ctx.stroke();
    } else if (op.op === "rect") {
      ctx.strokeRect(op.x * s, op.y * s, op.w * s, op.h * s);
    } else if (op.op === "text") {
      ctx.font = `600 ${op.size * s}px sans-serif`;
      ctx.fillStyle = "#1c1c1c";
      ctx.fillText(op.text, op.x * s, op.y * s);
    }
  }
}

/** SVG-Fragment, Mittelpunkt (cx, cy), Kantenlänge box. */
export function symbolSvg(kind, cx, cy, box = 16) {
  const s = box / 100;
  const ox = cx - box / 2;
  const oy = cy - box / 2;
  const X = (v) => (ox + v * s).toFixed(2);
  const Y = (v) => (oy + v * s).toFixed(2);
  return symbolOps(kind)
    .map((op) => {
      if (op.op === "circle") {
        const fill = op.fill ? ' fill="#fff"' : ' fill="none"';
        return `<circle cx="${X(op.x)}" cy="${Y(op.y)}" r="${(op.r * s).toFixed(2)}"${fill} stroke="#111" stroke-width="1.2"/>`;
      }
      if (op.op === "line") {
        return `<line x1="${X(op.x1)}" y1="${Y(op.y1)}" x2="${X(op.x2)}" y2="${Y(op.y2)}" stroke="#111" stroke-width="1.2" stroke-linecap="round"/>`;
      }
      if (op.op === "polyline") {
        const pts = op.pts.map((p) => `${X(p[0])},${Y(p[1])}`).join(" ");
        return `<polyline points="${pts}" fill="none" stroke="#111" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>`;
      }
      if (op.op === "rect") {
        return `<rect x="${X(op.x)}" y="${Y(op.y)}" width="${(op.w * s).toFixed(2)}" height="${(op.h * s).toFixed(2)}" fill="none" stroke="#111" stroke-width="1.1"/>`;
      }
      if (op.op === "text") {
        return `<text x="${X(op.x)}" y="${Y(op.y)}" text-anchor="middle" dominant-baseline="middle" font-size="${(op.size * s).toFixed(1)}" font-family="IBM Plex Sans, sans-serif" fill="#111">${op.text}</text>`;
      }
      return "";
    })
    .join("");
}

/** Katalog-Id → Schaltzeichen für Wippe und Aufbauplan. */
export function symbolForCatalog(id) {
  if (!id) return "generic";
  if (id === "taster-leucht") return "taster-licht";
  if (id === "schalter-aus-2p") return "aus2";
  if (id === "schalter-serie") return "serieV";
  if (id === "dimmer") return "dimmer";
  if (id === "stromstoss") return "stromstoss";
  if (id === "daemmerung") return "daemmerung";
  if (id.includes("tasterblock")) return "tasterblock";
  if (id.includes("taster") && !id.includes("wechsel") && !id.includes("kreuz") && !id.includes("aus")) {
    return "taster";
  }
  if (id.startsWith("serie")) return "serie";
  if (id.includes("kreuz")) return "kreuz";
  if (id.includes("wechsel") || id === "schalter") return "wechsel";
  if (id.includes("aus")) return "aus";
  if (id.includes("steck") || id.startsWith("cee")) return "steck";
  if (id.startsWith("uv")) return "uv";
  if (id.startsWith("leuchte")) return "lampe";
  if (id === "abzweigdose") return "dose";
  return "generic";
}
