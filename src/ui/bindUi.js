import {
  describeCatalogItem,
  formatItemDims,
  getCatalog,
} from "../catalog/index.js";
import { setState, state, subscribe } from "../state.js";

const MODE_LABELS = {
  ansicht: "Ansicht",
  betriebsmittel: "Betriebsmittel",
  verdrahtung: "Verdrahtung",
  aufmass: "Aufmaß",
};

export function bindUi({ applyPreset, takeoff }) {
  const hoverCard = document.getElementById("hover-card");
  const hoverName = document.getElementById("hover-name");
  const hoverMeta = document.getElementById("hover-meta");
  const libraryPanel = document.getElementById("library-panel");
  const libraryTitle = document.getElementById("library-title");
  const libraryHint = document.getElementById("library-hint");
  const libraryBody = document.getElementById("library-body");
  const placementFeedback = document.getElementById("placement-feedback");
  const takeoffCard = document.getElementById("takeoff-card");
  const takeoffSummary = document.getElementById("takeoff-summary");
  const takeoffList = document.getElementById("takeoff-list");
  const statusMode = document.getElementById("status-mode");
  const presetButtons = [...document.querySelectorAll("[data-preset]")];
  const modeButtons = [...document.querySelectorAll("[data-mode]")];

  function renderLibrary() {
    const catalog = getCatalog();
    libraryBody.innerHTML = "";
    for (const group of catalog.groups) {
      const section = document.createElement("section");
      section.className = "library-group";
      const title = document.createElement("h3");
      title.className = "library-group-title";
      title.textContent = group.label;
      section.appendChild(title);

      for (const item of group.items) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "catalog-item";
        btn.dataset.catalogId = item.id;
        btn.disabled = !item.placeable;
        btn.title = item.description || "";
        btn.innerHTML = `<span class="item-label">${item.label}</span><span class="item-dims">${formatItemDims(item)}${
          item.placeable ? "" : " · folgt"
        }</span>`;
        btn.addEventListener("click", () => {
          if (!item.placeable) return;
          setState({ selectedCatalogId: item.id });
        });
        section.appendChild(btn);
      }
      libraryBody.appendChild(section);
    }
  }

  function refreshTakeoff() {
    if (!takeoff) return;
    const s = takeoff.summarize();
    takeoffSummary.textContent = `${s.laengeMm} mm Leitung · ${s.schellen} Schellen · ${s.stueck} Stück`;
    takeoffList.innerHTML = "";
    for (const [id, count] of Object.entries(s.byCatalog)) {
      const li = document.createElement("li");
      li.textContent = `${id}: ${count}`;
      takeoffList.appendChild(li);
    }
    if (!Object.keys(s.byCatalog).length) {
      const li = document.createElement("li");
      li.textContent = "Noch keine Positionen";
      takeoffList.appendChild(li);
    }
  }

  presetButtons.forEach((button) => {
    button.addEventListener("click", () => applyPreset(button.dataset.preset));
  });

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.mode;
      setState({
        mode,
        selectedCatalogId: mode === "betriebsmittel" ? state.selectedCatalogId : null,
      });
      if (mode === "aufmass") refreshTakeoff();
    });
  });

  window.addEventListener("keydown", (event) => {
    const map = { 1: "gesamt", 2: "uv", 3: "gitter", 4: "draufsicht" };
    if (map[event.key]) applyPreset(map[event.key]);
  });

  renderLibrary();

  subscribe((next) => {
    presetButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.preset === next.cameraPreset);
    });
    modeButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.mode === next.mode);
    });

    const showLibrary = next.mode === "betriebsmittel" || next.mode === "verdrahtung";
    libraryPanel.hidden = !showLibrary;
    takeoffCard.hidden = next.mode !== "aufmass";

    if (next.mode === "betriebsmittel") {
      libraryTitle.textContent = "Betriebsmittel";
      libraryHint.textContent =
        "Artikel wählen, Vorschau auf Raster / TE, Klick zum Platzieren";
      libraryBody.hidden = false;
      [...libraryBody.querySelectorAll(".catalog-item")].forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.catalogId === next.selectedCatalogId);
      });
      placementFeedback.textContent = next.placementFeedback || describeSelected(next);
    } else if (next.mode === "verdrahtung") {
      libraryTitle.textContent = "Verdrahtung";
      libraryHint.textContent =
        "Punkte auf Lochblech setzen (orthogonal) · Enter / Doppelklick = Leitung + Schellen (70 / max 220 mm)";
      libraryBody.hidden = true;
      placementFeedback.textContent = next.wiringFeedback || "Leitungspfad zeichnen";
    }

    if (statusMode) {
      statusMode.textContent = `Modus: ${MODE_LABELS[next.mode] || next.mode}`;
    }

    if (next.hovered && next.mode === "ansicht") {
      hoverCard.hidden = false;
      hoverName.textContent = next.hovered.name;
      hoverMeta.textContent = next.hovered.meta;
    } else if (next.hovered && next.mode !== "betriebsmittel") {
      hoverCard.hidden = false;
      hoverName.textContent = next.hovered.name;
      hoverMeta.textContent = next.hovered.meta;
    } else {
      hoverCard.hidden = true;
    }

    if (next.mode === "aufmass") refreshTakeoff();
  });

  return { getMode: () => state.mode, refreshTakeoff };
}

function describeSelected(next) {
  if (!next.selectedCatalogId) return "Kein Artikel gewählt";
  const catalog = getCatalog();
  const item = catalog.items.find((i) => i.id === next.selectedCatalogId);
  if (!item) return "";
  return `${item.label} · ${describeCatalogItem(item)}`;
}
