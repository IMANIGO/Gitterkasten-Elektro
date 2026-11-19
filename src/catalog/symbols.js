/**
 * Installations-Schaltzeichen, nachgezeichnet (nicht als Bild übernommen).
 * Quelle: Tabelle „Schalter für Installation“.
 * Koordinaten im Quadrat 0…100, Y nach unten.
 * Kreis sitzt unten, der Stiel steigt nach rechts (60° zur Waagrechten).
 * Die Nase ist ein kurzer Strich an der Spitze nach unten rechts —
 * sie ersetzt den Stiel nicht. Haken an Serie, Kreuz und Wechsel zeigen
 * flach nach außen.
 */

const UX = 0.5;
const UY = -Math.sqrt(3) / 2;
/** Nase und Außenhaken: kurz, flach nach außen (etwa 18° zur Waagrechten). */
const NOSE_ANG = (18 * Math.PI) / 180;
const NX = Math.cos(NOSE_ANG);
const NY = Math.sin(NOSE_ANG);

function r1(v) {
  return Math.round(v * 10) / 10;
}

function line(x1, y1, x2, y2) {
  return { op: "line", x1: r1(x1), y1: r1(y1), x2: r1(x2), y2: r1(y2) };
}

function circle(x, y, rad, fill = false) {
  const op = { op: "circle", x: r1(x), y: r1(y), r: r1(rad) };
  if (fill) op.fill = true;
  return op;
}

/** Kreis + Stiel nach oben rechts, optional Nasen an der Spitze. */
function switchStem(noses, { cx = 38, cy = 64, rad = 15, reach = 34, nose = 10, step = 11 } = {}) {
  const tipX = cx + UX * (rad + reach);
  const tipY = cy + UY * (rad + reach);
  const ops = [circle(cx, cy, rad), line(cx + UX * rad, cy + UY * rad, tipX, tipY)];
  for (let i = 0; i < noses; i++) {
    const bx = tipX - UX * step * i;
    const by = tipY - UY * step * i;
    ops.push(line(bx, by, bx + NX * nose, by + NY * nose));
  }
  return ops;
}

function armTip(cx, cy, dirX, dirY, dist) {
  return [cx + dirX * dist, cy + dirY * dist];
}

/** Kurzer Außenhaken an einer Armspitze. */
function endHook(tipX, tipY, hx, hy, len) {
  return line(tipX, tipY, tipX + hx * len, tipY + hy * len);
}

/** @returns {{op:string, [key:string]: any}[]} */
export function symbolOps(kind) {
  if (kind === "aus") return switchStem(1);
  if (kind === "aus2") return switchStem(2);
  if (kind === "dimmer") {
    const cx = 38;
    const cy = 64;
    const rad = 15;
    const reach = 34;
    const ops = switchStem(0, { cx, cy, rad, reach });
    const along = rad + reach * 0.93;
    const mx = cx + UX * along;
    const my = cy + UY * along;
    const slash = (12 * Math.PI) / 180;
    const left = 12;
    const right = 17;
    const cs = Math.cos(slash);
    const sn = Math.sin(slash);
    ops.push(line(mx - cs * left, my + sn * left, mx + cs * right, my - sn * right));
    return ops;
  }
  if (kind === "wechsel") {
    const cx = 48;
    const cy = 50;
    const rad = 13;
    const reach = 24;
    const nose = 11;
    const dist = rad + reach;
    const [ux, uy] = armTip(cx, cy, UX, UY, dist);
    const [lx, ly] = armTip(cx, cy, -UX, -UY, dist);
    return [
      circle(cx, cy, rad),
      line(cx + UX * rad, cy + UY * rad, ux, uy),
      endHook(ux, uy, NX, NY, nose),
      line(cx - UX * rad, cy - UY * rad, lx, ly),
      endHook(lx, ly, -NX, -NY, nose),
    ];
  }
  if (kind === "kreuz") {
    const cx = 50;
    const cy = 50;
    const rad = 12;
    const dist = rad + 22;
    const hook = 11;
    const ur = armTip(cx, cy, UX, UY, dist);
    const dl = armTip(cx, cy, -UX, -UY, dist);
    const ul = armTip(cx, cy, -UX, UY, dist);
    const dr = armTip(cx, cy, UX, -UY, dist);
    return [
      line(ul[0], ul[1], dr[0], dr[1]),
      line(ur[0], ur[1], dl[0], dl[1]),
      endHook(ul[0], ul[1], -NX, NY, hook),
      endHook(ur[0], ur[1], NX, NY, hook),
      endHook(dl[0], dl[1], -NX, -NY, hook),
      endHook(dr[0], dr[1], NX, -NY, hook),
      circle(cx, cy, rad, true),
    ];
  }
  if (kind === "serieV") {
    const cx = 50;
    const cy = 68;
    const rad = 14;
    const dist = rad + 22;
    const hook = 12;
    const vx = Math.cos((50 * Math.PI) / 180);
    const vy = -Math.sin((50 * Math.PI) / 180);
    const left = armTip(cx, cy, -vx, vy, dist);
    const right = armTip(cx, cy, vx, vy, dist);
    return [
      circle(cx, cy, rad),
      line(cx - vx * rad, cy + vy * rad, left[0], left[1]),
      line(cx + vx * rad, cy + vy * rad, right[0], right[1]),
      endHook(left[0], left[1], -NX, NY, hook),
      endHook(right[0], right[1], NX, NY, hook),
    ];
  }
  if (kind === "taster") {
    return [circle(50, 50, 27), circle(50, 50, 16)];
  }
  if (kind === "taster-licht" || kind === "lampe") {
    const rad = kind === "lampe" ? 24 : 26;
    const o = rad / Math.SQRT2;
    return [
      circle(50, 50, rad),
      line(50 - o, 50 - o, 50 + o, 50 + o),
      line(50 + o, 50 - o, 50 - o, 50 + o),
    ];
  }
  if (kind === "schuetz") {
    return [
      { op: "line", x1: 8, y1: 64, x2: 34, y2: 64 },
      { op: "line", x1: 34, y1: 64, x2: 74, y2: 26 },
      { op: "line", x1: 74, y1: 26, x2: 92, y2: 26 },
      {
        op: "polygon",
        pts: [
          [24, 78],
          [50, 78],
          [37, 58],
        ],
        fill: true,
      },
    ];
  }
  if (kind === "stromstoss") {
    return [
      { op: "rect", x: 8, y: 34, w: 84, h: 30 },
      {
        op: "polyline",
        pts: [
          [20, 54],
          [44, 54],
          [44, 44],
          [76, 44],
        ],
      },
    ];
  }
  if (kind === "daemmerung") {
    return [
      { op: "rect", x: 16, y: 16, w: 68, h: 68 },
      { op: "text", x: 34, y: 38, text: "LX", size: 16 },
      {
        op: "polyline",
        pts: [
          [58, 33],
          [50, 39],
          [58, 45],
        ],
      },
      {
        op: "polyline",
        pts: [
          [26, 68],
          [44, 68],
          [62, 58],
        ],
      },
      { op: "line", x1: 66, y1: 68, x2: 76, y2: 68 },
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
    } else if (op.op === "polygon") {
      ctx.beginPath();
      op.pts.forEach((p, i) => (i ? ctx.lineTo(p[0] * s, p[1] * s) : ctx.moveTo(p[0] * s, p[1] * s)));
      ctx.closePath();
      if (op.fill) ctx.fill();
      else ctx.stroke();
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
      if (op.op === "polygon") {
        const pts = op.pts.map((p) => `${X(p[0])},${Y(p[1])}`).join(" ");
        const fill = op.fill ? "#111" : "none";
        return `<polygon points="${pts}" fill="${fill}" stroke="#111" stroke-width="1.1" stroke-linejoin="round"/>`;
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
  if (id === "stromstoss" || id === "stromstoss-1te") return "stromstoss";
  if (id === "schuetz-3p") return "schuetz";
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
