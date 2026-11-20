import { getCatalogItem } from "../catalog/index.js";
import { symbolForCatalog } from "../catalog/symbols.js";
import { formatCableSpec } from "../wiring/cableTypes.js";
import { toMm } from "../units.js";
import { coordsFromPlacedObject, defaultFacesCm } from "./planFromWorld.js";

/** Catalog → plan tag prefix (Ausbildungs-übliche Kennzeichnung). */
const TAG_PREFIX = {
  "steckdose": "X",
  "cee-16a": "X",
  "tasterblock-4": "TB",
  "schalter": "S",
  "taster": "S",
  "schalter-aus": "S",
  "schalter-kreuz": "S",
  "schalter-aus-2p": "S",
  "schalter-serie": "S",
  dimmer: "S",
  "taster-leucht": "S",
  stromstoss: "S",
  "stromstoss-1te": "K",
  "schuetz-3p": "K",
  daemmerung: "S",
  "serie-aus-aus": "S",
  "serie-wechsel-wechsel": "S",
  "serie-kreuz-wechsel": "S",
  "serie-taster-taster": "S",
  "serie-wechsel-taster": "S",
  "serie-aus-taster": "S",
  "serie-kreuz-taster": "S",
  "leuchte": "E",
  "abzweigdose": "D",
  "uv-3reihen": "UV",
  "ls-1p": "F",
  "ls-3p": "F",
  "fi-4p": "Q",
  "fils-1p": "F",
  "reihenklemme-l": "K",
  "reihenklemme-n": "K",
  "reihenklemme-pe": "K",
  "leitungsschelle": "C",
};

const CORE_COLOR = {
  L: "braun",
  L1: "braun",
  L2: "schwarz",
  L3: "grau",
  N: "blau",
  PE: "gn/ge",
};

/**
 * Collect top-level placed items (not nested DIN inside UV for wall plan —
 * those go into uvContents).
 */
function collectPlaced(placedRoot) {
  const surface = [];
  const dinInsideUv = [];

  placedRoot.traverse((o) => {
    if (!o.userData?.placed || !o.userData?.catalogId) return;
    if (o.userData.kind === "clamp" && o.userData.autoPlaced) return;

    const coords = coordsFromPlacedObject(o);
    const entry = {
      object: o,
      catalogId: o.userData.catalogId,
      name: o.userData.name || o.userData.catalogId,
      kind: o.userData.kind,
      coords,
      planTag: o.userData.planTag || null,
    };

    if (coords.mount === "din") {
      // Find enclosing UV
      let uv = o.parent;
      while (uv && uv.userData?.kind !== "distributionBoard") uv = uv.parent;
      entry.uvUuid = uv?.uuid || null;
      dinInsideUv.push(entry);
    } else {
      surface.push(entry);
    }
  });

  return { surface, dinInsideUv };
}

function assignTags(entries) {
  const counters = {};
  const usedPreferred = new Set();

  for (const e of entries) {
    if (e.planTag && !usedPreferred.has(e.planTag)) {
      e.tag = e.planTag;
      usedPreferred.add(e.planTag);
      continue;
    }
    const prefix = TAG_PREFIX[e.catalogId] || "B";
    counters[prefix] = (counters[prefix] || 0) + 1;
    e.tag = `${prefix}${counters[prefix]}`;
  }
  return entries;
}

function buildCircuits(surface, wires) {
  const circuits = [];

  // One didactic circuit per surface consumer / actuator
  for (const e of surface) {
    if (e.kind === "distributionBoard" || e.catalogId === "leitungsschelle") continue;
    const item = getCatalogItem(e.catalogId);
    circuits.push({
      id: `live-${e.tag}`,
      title: `${e.tag} — ${item?.label || e.name}`,
      from: "UV1",
      to: e.tag,
      cable: guessCableFor(e.catalogId),
      protection: e.catalogId.startsWith("cee") ? "F2" : "F1",
    });
  }

  // Document each drawn wire as a run note
  (wires || []).forEach((w, i) => {
    circuits.push({
      id: `wire-${w.id || i + 1}`,
      title: `Leitung ${i + 1} · ${w.label || formatCableSpec(w.cableSpec || {})}`,
      from: w.faces?.[0] || "—",
      to: w.faces?.[w.faces.length - 1] || "—",
      cable: w.cableSpec
        ? {
            typeId: w.cableSpec.typeId,
            cores: w.cableSpec.cores,
            mm2: w.cableSpec.mm2,
          }
        : undefined,
      note: `${w.lengthMm ?? toMm(w.lengthM || 0)} mm · Flächen ${(w.faces || []).join("→") || "—"}`,
    });
  });

  return circuits;
}

function symbolKey(id) {
  return symbolForCatalog(id);
}

function guessCableFor(catalogId) {
  if (catalogId === "cee-16a") return { typeId: "nym-j", cores: 5, mm2: 2.5 };
  if (catalogId === "steckdose" || catalogId === "leuchte") {
    return { typeId: "nym-j", cores: 3, mm2: 1.5 };
  }
  if (catalogId === "schalter" || catalogId?.startsWith("taster")) {
    return { typeId: "nym-j", cores: 3, mm2: 1.5 };
  }
  return { typeId: "nym-j", cores: 3, mm2: 1.5 };
}

function buildTerminals(dinInsideUv, surface) {
  const rows = [];
  const klemmen = dinInsideUv.filter((e) => e.kind === "terminal");
  klemmen.forEach((e, i) => {
    const pot =
      e.catalogId.includes("-pe") || e.catalogId.endsWith("-pe")
        ? "PE"
        : e.catalogId.includes("-n") || e.catalogId.endsWith("-n")
          ? "N"
          : "L";
    rows.push({
      id: `${e.tag || `K${i + 1}`}`,
      potential: pot,
      color: CORE_COLOR[pot] || "braun",
      qmm: 2.5,
      from: "UV",
      to: pot === "PE" ? "PE" : pot === "N" ? "N" : "Verbraucher",
    });
  });

  // Consumer terminals from surface devices
  for (const e of surface) {
    if (!["steckdose", "cee-16a", "leuchte"].includes(e.catalogId)) continue;
    const cores =
      e.catalogId === "cee-16a"
        ? ["L1", "L2", "L3", "N", "PE"]
        : ["L", "N", "PE"];
    for (const c of cores) {
      rows.push({
        id: `${e.tag}:${c}`,
        potential: c,
        color: CORE_COLOR[c] || "braun",
        qmm: e.catalogId === "cee-16a" ? 2.5 : 1.5,
        from: "UV",
        to: e.tag,
      });
    }
  }
  return rows;
}

/**
 * Build a live plan document from the current 3D scene.
 * @param {THREE.Object3D} placedRoot
 * @param {{ wires?: object[] }} [wiring]
 */
export function capturePlanFromScene(placedRoot, wiring = null) {
  const { surface, dinInsideUv } = collectPlaced(placedRoot);
  assignTags(surface);
  assignTags(dinInsideUv);

  const uvByUuid = new Map();
  for (const e of surface) {
    if (e.kind === "distributionBoard") uvByUuid.set(e.object.uuid, e);
  }

  const placements = surface
    .filter((e) => e.catalogId !== "leitungsschelle")
    .map((e) => {
      const c = e.coords;
      const p = {
        tag: e.tag,
        catalogId: e.catalogId,
        face: c.face,
      };
      if (c.fromLeftCm != null) p.fromLeftCm = c.fromLeftCm;
      if (c.fromTopCm != null) p.fromTopCm = c.fromTopCm;
      if (c.fromBackCm != null) p.fromBackCm = c.fromBackCm;
      return p;
    });

  // Group DIN contents under UV tags for legend / klemmen
  const uvContents = {};
  for (const e of dinInsideUv) {
    const uv = e.uvUuid ? uvByUuid.get(e.uvUuid) : null;
    const key = uv?.tag || "UV";
    if (!uvContents[key]) uvContents[key] = [];
    uvContents[key].push({
      tag: e.tag,
      catalogId: e.catalogId,
      name: e.name,
      teIndex: e.coords.teIndex,
    });
  }

  const legend = [
    ...placements.map((p) => {
      const item = getCatalogItem(p.catalogId);
      return {
        tag: p.tag,
        label: item?.label || p.catalogId,
        catalogId: p.catalogId,
        symbol: item?.symbol || symbolKey(p.catalogId),
      };
    }),
  ];

  // Append UV interior to legend
  for (const [uvTag, items] of Object.entries(uvContents)) {
    for (const it of items) {
      const item = getCatalogItem(it.catalogId);
      legend.push({
        tag: `${uvTag}/${it.tag}`,
        label: item?.label || it.name,
        catalogId: it.catalogId,
      });
    }
  }

  const wires = wiring?.wires || [];
  const now = new Date();
  const stamp = now.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return {
    id: "live-aufbau",
    title: "Aufbauplan — Live aus 3D-Aufbau",
    planNr: "LIVE",
    modul: "E-Box Simulator",
    blatt: "01",
    generatedAt: stamp,
    live: true,
    faces: defaultFacesCm(),
    legend,
    placements,
    uvContents,
    circuits: buildCircuits(surface, wires),
    terminals: buildTerminals(dinInsideUv, surface),
    wireRuns: wires.map((w, i) => ({
      id: w.id || i + 1,
      label: w.label,
      lengthMm: w.lengthMm,
      faces: w.faces || [],
      cableSpec: w.cableSpec,
      clamps: w.clamps?.length || 0,
    })),
  };
}
