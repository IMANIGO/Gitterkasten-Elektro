import {
  describeCatalogItem,
  formatItemDims,
  getCatalog,
} from "../catalog/index.js";
import { setState, state, subscribe } from "../state.js";
import {
  CABLE_TYPES,
  CORE_COUNTS,
  CROSS_SECTIONS_MM2,
  coreColorsFor,
  formatCableSpec,
  normalizeCableSpec,
} from "../wiring/cableTypes.js";

const MODE_LABELS = {
  ansicht: "Ansicht",
  betriebsmittel: "Betriebsmittel",
  verdrahtung: "Verdrahtung",
  plaene: "Pläne",
  aufmass: "Aufmaß",
};

export function bindUi({ applyPreset, takeoff, selection, plansApi }) {
  const hoverCard = document.getElementById("hover-card");
  const hoverName = document.getElementById("hover-name");
  const hoverMeta = document.getElementById("hover-meta");
  const libraryPanel = document.getElementById("library-panel");
  const libraryTitle = document.getElementById("library-title");
  const libraryHint = document.getElementById("library-hint");
  const libraryBody = document.getElementById("library-body");
  const cableForm = document.getElementById("cable-form");
  const cableType = document.getElementById("cable-type");
  const cableMm2 = document.getElementById("cable-mm2");
  const cableCores = document.getElementById("cable-cores");
  const cablePreview = document.getElementById("cable-preview");
  const placementFeedback = document.getElementById("placement-feedback");
  const selectionCard = document.getElementById("selection-card");
  const selectionName = document.getElementById("selection-name");
  const selectionDims = document.getElementById("selection-dims");
  const takeoffCard = document.getElementById("takeoff-card");
  const takeoffSummary = document.getElementById("takeoff-summary");
  const takeoffList = document.getElementById("takeoff-list");
  const takeoffCables = document.getElementById("takeoff-cables");
  const plansPanel = document.getElementById("plans-panel");
  const planSelect = document.getElementById("plan-select");
  const planDoc = document.getElementById("plan-doc");
  const planFeedback = document.getElementById("plan-feedback");
  const statusMode = document.getElementById("status-mode");
  const presetButtons = [...document.querySelectorAll("[data-preset]")];
  const modeButtons = [...document.querySelectorAll("[data-mode]")];
  const planDocButtons = [...document.querySelectorAll("[data-plan-doc]")];

  let currentPlan = plansApi?.getActivePlan?.() || null;

  function fillPlanSelect() {
    if (!planSelect || !plansApi) return;
    const list = plansApi.listPlans();
    planSelect.innerHTML = list
      .map((p) => `<option value="${p.id}">${p.planNr || p.id} — ${p.title}</option>`)
      .join("");
    if (currentPlan) planSelect.value = currentPlan.id;
  }

  function renderPlanDoc() {
    if (!planDoc || !currentPlan || !plansApi) return;
    const view = state.planDocView || "aufbau";
    if (view === "stromlauf") {
      planDoc.innerHTML = plansApi.renderStromlauf(currentPlan);
    } else if (view === "klemmen") {
      planDoc.innerHTML = plansApi.renderKlemmen(currentPlan);
    } else {
      planDoc.innerHTML = plansApi.renderAufbau(currentPlan);
    }
  }

  function setActivePlan(plan) {
    currentPlan = plan;
    plansApi?.setActivePlan?.(plan);
    if (planSelect && plan) planSelect.value = plan.id;
    renderPlanDoc();
    setState({ activePlanId: plan?.id || null });
  }

  function fillCableSelects() {
    cableType.innerHTML = CABLE_TYPES.map(
      (t) => `<option value="${t.id}">${t.label}</option>`,
    ).join("");
    cableMm2.innerHTML = CROSS_SECTIONS_MM2.map(
      (v) => `<option value="${v}">${v} mm²</option>`,
    ).join("");
    cableCores.innerHTML = CORE_COUNTS.map(
      (v) => `<option value="${v}">${v}</option>`,
    ).join("");
    const spec = state.cableSpec;
    cableType.value = spec.typeId;
    cableMm2.value = String(spec.mm2);
    cableCores.value = String(spec.cores);
    updateCablePreview();
  }

  function readCableForm() {
    return normalizeCableSpec({
      typeId: cableType.value,
      mm2: Number(cableMm2.value),
      cores: Number(cableCores.value),
    });
  }

  function updateCablePreview() {
    const spec = readCableForm();
    // Keep UI selects in sync if single-core forced
    cableCores.value = String(spec.cores);
    const colors = coreColorsFor(spec);
    cablePreview.textContent = `${formatCableSpec(spec)} · Enden ${colors
      .map((c) => c.label)
      .join("/")}`;
    setState({ cableSpec: spec });
  }

  ["change", "input"].forEach((evt) => {
    cableType.addEventListener(evt, updateCablePreview);
    cableMm2.addEventListener(evt, updateCablePreview);
    cableCores.addEventListener(evt, updateCablePreview);
  });

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
          // Replace at current position immediately
          if (state.selectionAction === "replace" && selection?.getSelected()) {
            const object = selection.getSelected();
            const pose = {
              position: {
                x: object.position.x,
                y: object.position.y,
                z: object.position.z,
              },
              rotation: {
                x: object.rotation.x,
                y: object.rotation.y,
                z: object.rotation.z,
              },
              parent: object.parent,
              mount: object.userData?.placement?.mount,
              face: object.userData?.placement?.face,
              teIndex: object.userData?.placement?.teIndex,
              abutting: object.userData?.placement?.abutting,
              feedback: object.userData?.placement?.feedback || "gleiche Position",
            };
            import("../models/factories.js").then(({ createFromFactory }) => {
              const next = createFromFactory(item.factory);
              if (!next) return;
              selection.applyMoveOrReplace(pose, next, item);
            });
            return;
          }
          setState({
            selectedCatalogId: item.id,
            selectionAction: null,
          });
        });
        section.appendChild(btn);
      }
      libraryBody.appendChild(section);
    }
  }

  function refreshTakeoff() {
    if (!takeoff) return;
    const s = takeoff.summarize();
    takeoffSummary.textContent = `${s.laengeMm} mm Leitung gesamt · ${s.schellen} Schellen · ${s.stueckLines.reduce((a, l) => a + l.count, 0)} Bauteile`;
    takeoffList.innerHTML = "";
    if (!s.stueckLines.length) {
      const li = document.createElement("li");
      li.textContent = "Keine Bauteile";
      takeoffList.appendChild(li);
    } else {
      for (const line of s.stueckLines) {
        const li = document.createElement("li");
        li.textContent = `${line.label}: ${line.count}×`;
        takeoffList.appendChild(li);
      }
    }
    takeoffCables.innerHTML = "";
    if (!s.cableLines.length) {
      const li = document.createElement("li");
      li.textContent = "Keine Leitungen";
      takeoffCables.appendChild(li);
    } else {
      for (const line of s.cableLines) {
        const li = document.createElement("li");
        li.textContent = `${line.label}: ${line.count}× · ${line.lengthMm} mm · ${line.schellen} Schellen`;
        takeoffCables.appendChild(li);
      }
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
        selectedCatalogId: null,
        selectionAction: null,
      });
      selection?.clearSelection?.();
      if (mode === "aufmass") refreshTakeoff();
    });
  });

  document.getElementById("btn-delete")?.addEventListener("click", () => {
    selection?.deleteSelected?.();
  });
  document.getElementById("btn-move")?.addEventListener("click", () => {
    selection?.beginMove?.();
  });
  document.getElementById("btn-replace")?.addEventListener("click", () => {
    selection?.beginReplace?.();
  });

  window.addEventListener("keydown", (event) => {
    const map = { 1: "gesamt", 2: "uv", 3: "gitter", 4: "draufsicht" };
    if (map[event.key]) applyPreset(map[event.key]);
  });

  fillCableSelects();
  renderLibrary();
  fillPlanSelect();
  if (plansApi?.listPlans()?.[0]) setActivePlan(plansApi.listPlans()[0]);

  planSelect?.addEventListener("change", () => {
    const plan = plansApi.getPlan(planSelect.value);
    if (plan) setActivePlan(plan);
  });

  planDocButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      setState({ planDocView: btn.dataset.planDoc });
      planDocButtons.forEach((b) => b.classList.toggle("active", b === btn));
      renderPlanDoc();
    });
  });

  document.getElementById("btn-build-plan")?.addEventListener("click", () => {
    if (!currentPlan) return;
    const result = plansApi.build(currentPlan);
    if (planFeedback) {
      planFeedback.textContent = `${result.placed} Bauteile gebaut${
        result.skipped.length ? ` · fehlt: ${result.skipped.join(", ")}` : ""
      }`;
    }
  });

  document.getElementById("btn-export-plan")?.addEventListener("click", () => {
    if (!currentPlan) return;
    const blob = new Blob([plansApi.exportJson(currentPlan)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${currentPlan.id || "aufbauplan"}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  document.getElementById("plan-upload")?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const plan = plansApi.importJson(text);
      plansApi.registerPlan(plan);
      fillPlanSelect();
      setActivePlan(plan);
      if (planFeedback) planFeedback.textContent = `Plan geladen: ${plan.planNr || plan.id}`;
    } catch (err) {
      if (planFeedback) planFeedback.textContent = `Import fehlgeschlagen: ${err.message}`;
    }
    event.target.value = "";
  });

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
    cableForm.hidden = next.mode !== "verdrahtung";
    if (plansPanel) plansPanel.hidden = next.mode !== "plaene";

    const hasSelection = !!next.selectedObjectId;
    selectionCard.hidden = !hasSelection || (next.mode !== "betriebsmittel" && next.mode !== "ansicht");
    if (hasSelection) {
      selectionName.textContent = next.selectedLabel || "Bauteil";
      selectionDims.textContent = next.selectedPositionText || "";
    }

    if (next.mode === "betriebsmittel") {
      libraryTitle.textContent = "Betriebsmittel";
      libraryHint.textContent =
        next.selectionAction === "replace"
          ? "Ersatz wählen, dann Montagepunkt anklicken"
          : next.selectionAction === "move"
            ? "Neue Position auf Raster / TE anklicken"
            : "Artikel wählen → platzieren (Auswahl springt zurück) · Bauteil anklicken zum Bearbeiten";
      libraryBody.hidden = false;
      [...libraryBody.querySelectorAll(".catalog-item")].forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.catalogId === next.selectedCatalogId);
      });
      placementFeedback.textContent = next.placementFeedback || describeSelected(next);
    } else if (next.mode === "verdrahtung") {
      libraryTitle.textContent = "Verdrahtung";
      libraryHint.textContent =
        "Typ / Querschnitt / Adern wählen · Punkte auf Lochblech · Enter = Leitung + farbige Enden + Schellen";
      libraryBody.hidden = true;
      placementFeedback.textContent = next.wiringFeedback || "Leitungspfad zeichnen";
    }

    if (statusMode) {
      statusMode.textContent = `Modus: ${MODE_LABELS[next.mode] || next.mode}`;
    }

    if (next.hovered && !hasSelection && next.mode === "ansicht") {
      hoverCard.hidden = false;
      hoverName.textContent = next.hovered.name;
      hoverMeta.textContent = next.hovered.meta;
    } else if (next.hovered && next.mode === "verdrahtung") {
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
  if (!next.selectedCatalogId) {
    return next.selectedObjectId
      ? "Bauteil ausgewählt — Verschieben / Austauschen / Löschen"
      : "Kein Artikel gewählt — Bauteil in der Szene anklicken";
  }
  const catalog = getCatalog();
  const item = catalog.items.find((i) => i.id === next.selectedCatalogId);
  if (!item) return "";
  return `${item.label} · ${describeCatalogItem(item)}`;
}
