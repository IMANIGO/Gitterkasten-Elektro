import {
  describeCatalogItem,
  formatItemDims,
  getCatalog,
} from "../catalog/index.js";
import { applyStationSlots, STATION_SLOT_OPTIONS } from "../models/controlStation.js";
import { applyRcboSpec, RCBO_FIELDS, rcboSpecKey, specFromFields } from "../models/rcboSpec.js";
import { setState, state, subscribe } from "../state.js";
import {
  CABLE_TYPES,
  CIRCUIT_KINDS,
  CORE_COLOR_OPTIONS,
  CORE_COUNTS,
  CROSS_SECTIONS_MM2,
  coreColorsFor,
  formatCableSpec,
  isSingleCoreType,
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
  const cableColor = document.getElementById("cable-color");
  const cableCircuit = document.getElementById("cable-circuit");
  const cableColorLabel = document.getElementById("cable-color-label");
  const cableCircuitLabel = document.getElementById("cable-circuit-label");
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
  const stationSetup = document.getElementById("station-setup");
  const stationEdit = document.getElementById("station-edit");
  const rcboSetup = document.getElementById("rcbo-setup");
  const rcboEdit = document.getElementById("rcbo-edit");
  let stationSetupKey = "";
  let stationEditKey = "";
  let rcboSetupKey = "";
  let rcboEditKey = "";

  function fillStationFields(container, slots, onChange) {
    container.innerHTML = "";
    const title = document.createElement("p");
    title.textContent = "Bestückung";
    container.appendChild(title);
    (slots || []).forEach((value, index) => {
      const label = document.createElement("label");
      label.append(`Stelle ${index + 1}`);
      const select = document.createElement("select");
      select.innerHTML = STATION_SLOT_OPTIONS.map(
        (o) => `<option value="${o.id}">${o.label}</option>`,
      ).join("");
      select.value = value;
      select.addEventListener("change", () => {
        const next = [...container.querySelectorAll("select")].map((s) => s.value);
        onChange(next);
      });
      label.appendChild(select);
      container.appendChild(label);
    });
  }

  function fillRcboFields(container, spec, onChange) {
    container.innerHTML = "";
    const title = document.createElement("p");
    title.textContent = "Charakteristik";
    container.appendChild(title);
    for (const field of RCBO_FIELDS) {
      const label = document.createElement("label");
      label.append(field.label);
      const select = document.createElement("select");
      select.dataset.field = field.key;
      select.innerHTML = field.options
        .map((o) => `<option value="${o.id}">${o.label}</option>`)
        .join("");
      select.value = String(spec?.[field.key] ?? "");
      select.addEventListener("change", () => {
        const values = {};
        for (const node of container.querySelectorAll("select")) values[node.dataset.field] = node.value;
        onChange(specFromFields(values));
      });
      label.appendChild(select);
      container.appendChild(label);
    }
  }

  function syncRcboSetup(next) {
    if (!rcboSetup) return;
    const show = next.mode === "betriebsmittel" && next.selectedCatalogId === "fils-1p";
    rcboSetup.hidden = !show;
    if (!show) {
      rcboSetupKey = "";
      return;
    }
    const key = rcboSpecKey(next.rcboSpec);
    if (key === rcboSetupKey && rcboSetup.childElementCount) return;
    rcboSetupKey = key;
    fillRcboFields(rcboSetup, next.rcboSpec, (spec) => {
      rcboSetupKey = rcboSpecKey(spec);
      setState({ rcboSpec: spec });
    });
  }

  function syncRcboEdit(next) {
    if (!rcboEdit) return;
    const spec = next.selectedRcboSpec;
    const show = !!spec && !!next.selectedObjectId;
    rcboEdit.hidden = !show;
    if (!show) {
      rcboEditKey = "";
      return;
    }
    const key = `${next.selectedObjectId}:${rcboSpecKey(spec)}`;
    if (key === rcboEditKey && rcboEdit.childElementCount) return;
    rcboEditKey = key;
    fillRcboFields(rcboEdit, spec, (nextSpec) => {
      const object = selection?.getSelected?.();
      if (!object) return;
      applyRcboSpec(object, nextSpec);
      rcboEditKey = `${object.uuid}:${rcboSpecKey(nextSpec)}`;
      setState({
        selectedRcboSpec: { ...nextSpec },
        selectedLabel: object.userData.name,
      });
    });
  }

  function syncStationSetup(next) {
    if (!stationSetup) return;
    const show = next.mode === "betriebsmittel" && next.selectedCatalogId === "tasterblock-4";
    stationSetup.hidden = !show;
    if (!show) {
      stationSetupKey = "";
      return;
    }
    const key = (next.stationSlots || []).join("|");
    if (key === stationSetupKey && stationSetup.childElementCount) return;
    stationSetupKey = key;
    fillStationFields(stationSetup, next.stationSlots, (slots) => {
      stationSetupKey = slots.join("|");
      setState({ stationSlots: slots });
    });
  }

  function syncStationEdit(next) {
    if (!stationEdit) return;
    const slots = next.selectedStationSlots;
    const show = Array.isArray(slots) && slots.length === 4 && !!next.selectedObjectId;
    stationEdit.hidden = !show;
    if (!show) {
      stationEditKey = "";
      return;
    }
    const key = `${next.selectedObjectId}:${slots.join("|")}`;
    if (key === stationEditKey && stationEdit.childElementCount) return;
    stationEditKey = key;
    fillStationFields(stationEdit, slots, (nextSlots) => {
      const object = selection?.getSelected?.();
      if (!object) return;
      applyStationSlots(object, nextSlots);
      stationEditKey = `${object.uuid}:${nextSlots.join("|")}`;
      setState({ selectedStationSlots: [...nextSlots] });
    });
  }

  let currentPlan = plansApi?.getActivePlan?.() || null;
  let lastPlanSceneKey = "";
  const plansHint = document.getElementById("plans-hint");
  const btnBuildPlan = document.getElementById("btn-build-plan");
  const btnRefreshPlan = document.getElementById("btn-refresh-plan");

  function fillPlanSelect() {
    if (!planSelect || !plansApi) return;
    const list = plansApi.listPlans();
    planSelect.innerHTML = list
      .map((p) => {
        const label = p.live
          ? `LIVE — Aufbauplan aus 3D-Szene`
          : `${p.planNr || p.id} — ${p.title}${p.id === "m6-p01" ? " (Beispiel)" : ""}`;
        return `<option value="${p.id}">${label}</option>`;
      })
      .join("");
    if (currentPlan) planSelect.value = currentPlan.id;
  }

  function syncPlanToolbar() {
    const live = !!(currentPlan?.live || plansApi?.isLive?.());
    if (btnBuildPlan) {
      btnBuildPlan.disabled = live;
      btnBuildPlan.title = live
        ? "Live-Plan kommt aus der Szene — Vorlage wählen, um in 3D zu bauen"
        : "Ausgewählte Vorlage in die 3D-Szene bauen";
    }
    if (btnRefreshPlan) {
      btnRefreshPlan.hidden = !live && currentPlan?.id !== "live-aufbau";
    }
    if (plansHint) {
      plansHint.textContent = live
        ? "Aufbauplan / Stromlauf / Klemmenliste werden live aus dem aktuellen 3D-Aufbau erzeugt"
        : "Beispielvorlage — „In 3D bauen“ oder zurück zu LIVE für den echten Aufbau";
    }
  }

  function renderPlanDoc() {
    if (!planDoc || !plansApi) return;
    // Always refresh live plan from scene when documenting
    if (plansApi.isLive?.() || currentPlan?.id === "live-aufbau") {
      currentPlan = plansApi.refreshLive?.() || plansApi.getActivePlan?.();
    }
    if (!currentPlan) return;
    const view = state.planDocView || "aufbau";
    if (view === "stromlauf") {
      planDoc.innerHTML = plansApi.renderStromlauf(currentPlan);
    } else if (view === "klemmen") {
      planDoc.innerHTML = plansApi.renderKlemmen(currentPlan);
    } else {
      planDoc.innerHTML = plansApi.renderAufbau(currentPlan);
    }
    syncPlanToolbar();
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
    if (cableColor) {
      cableColor.innerHTML = CORE_COLOR_OPTIONS.map(
        (c) => `<option value="${c.id}">${c.label}</option>`,
      ).join("");
    }
    if (cableCircuit) {
      cableCircuit.innerHTML = CIRCUIT_KINDS.map(
        (c) => `<option value="${c.id}">${c.label}</option>`,
      ).join("");
    }
    const spec = state.cableSpec;
    cableType.value = spec.typeId;
    cableMm2.value = String(spec.mm2);
    cableCores.value = String(spec.cores);
    if (cableColor) cableColor.value = spec.coreColor || "braun";
    if (cableCircuit) cableCircuit.value = spec.circuitKind || "last";
    updateCablePreview();
  }

  function readCableForm() {
    return normalizeCableSpec({
      typeId: cableType.value,
      mm2: Number(cableMm2.value),
      cores: Number(cableCores.value),
      coreColor: cableColor?.value,
      circuitKind: cableCircuit?.value,
    });
  }

  function updateCablePreview() {
    const spec = readCableForm();
    const single = isSingleCoreType(spec.typeId);
    cableCores.value = String(spec.cores);
    cableCores.disabled = single;
    if (cableColorLabel) cableColorLabel.hidden = !single;
    if (cableCircuitLabel) cableCircuitLabel.hidden = !single;
    const colors = coreColorsFor(spec);
    cablePreview.textContent = single
      ? `${formatCableSpec(spec)} · nur in Betriebsmitteln · ohne Schellen`
      : `${formatCableSpec(spec)} · Enden ${colors.map((c) => c.label).join("/")}`;
    setState({ cableSpec: spec });
  }

  ["change", "input"].forEach((evt) => {
    cableType.addEventListener(evt, updateCablePreview);
    cableMm2.addEventListener(evt, updateCablePreview);
    cableCores.addEventListener(evt, updateCablePreview);
    cableColor?.addEventListener(evt, updateCablePreview);
    cableCircuit?.addEventListener(evt, updateCablePreview);
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
              const opts =
                item.factory === "controlStation"
                  ? { slots: state.stationSlots }
                  : item.factory === "rcbo1p"
                    ? { spec: state.rcboSpec }
                    : {};
              const next = createFromFactory(item.factory, opts);
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
    if (event.target && /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
    const camMap = { 1: "gesamt", 2: "uv", 3: "gitter", 4: "draufsicht" };
    if (camMap[event.key]) applyPreset(camMap[event.key]);
    const modeMap = {
      a: "ansicht",
      b: "betriebsmittel",
      v: "verdrahtung",
      p: "plaene",
      m: "aufmass",
    };
    const modeKey = event.key.toLowerCase();
    if (modeMap[modeKey] && !event.ctrlKey && !event.metaKey && !event.altKey) {
      setState({
        mode: modeMap[modeKey],
        selectedCatalogId: null,
        selectionAction: null,
      });
      selection?.clearSelection?.();
      if (modeMap[modeKey] === "aufmass") refreshTakeoff();
    }
  });

  fillCableSelects();
  renderLibrary();
  fillPlanSelect();
  // Default: live plan from scene (not the example photo/template)
  if (plansApi) {
    setActivePlan(plansApi.getPlan("live-aufbau") || plansApi.getActivePlan());
  }

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

  btnRefreshPlan?.addEventListener("click", () => {
    currentPlan = plansApi.refreshLive?.() || plansApi.getActivePlan?.();
    fillPlanSelect();
    renderPlanDoc();
    if (planFeedback) {
      planFeedback.textContent = `Live-Plan aktualisiert · ${(currentPlan?.placements || []).length} Bauteile · ${(currentPlan?.wireRuns || []).length} Leitungen`;
    }
  });

  btnBuildPlan?.addEventListener("click", () => {
    if (!currentPlan || currentPlan.live) return;
    const result = plansApi.build(currentPlan);
    if (planFeedback) {
      planFeedback.textContent = `${result.placed} Bauteile gebaut${
        result.skipped.length ? ` · fehlt: ${result.skipped.join(", ")}` : ""
      }`;
    }
    // After building a template, jump back to live view of the new scene
    setActivePlan(plansApi.getPlan("live-aufbau"));
    fillPlanSelect();
  });

  document.getElementById("btn-export-plan")?.addEventListener("click", () => {
    if (plansApi.isLive?.()) {
      currentPlan = plansApi.refreshLive?.() || currentPlan;
    }
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
    if (plansPanel) {
      const showPlans = next.mode === "plaene";
      const wasHidden = plansPanel.hidden;
      plansPanel.hidden = !showPlans;
      const sceneKey = `${next.placedCount}|${next.wireCount}|${next.lastWireLengthMm}`;
      if (showPlans && (wasHidden || sceneKey !== lastPlanSceneKey)) {
        lastPlanSceneKey = sceneKey;
        if (plansApi?.isLive?.() || currentPlan?.id === "live-aufbau") {
          currentPlan = plansApi.refreshLive?.() || currentPlan;
          fillPlanSelect();
          renderPlanDoc();
        }
      }
    }

    const hasSelection = !!next.selectedObjectId;
    selectionCard.hidden =
      !hasSelection ||
      (next.mode !== "betriebsmittel" && next.mode !== "ansicht" && next.mode !== "plaene");
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
        "Mantelleitung über Flächen · Einzelader nur im Betriebsmittel (Farbe, UV links Last / rechts Steuer) · Enter = fertig";
      libraryBody.hidden = true;
      placementFeedback.textContent = next.wiringFeedback || "Leitungspfad zeichnen";
    }

    if (statusMode) {
      statusMode.textContent = `Modus: ${MODE_LABELS[next.mode] || next.mode}`;
    }

    syncStationSetup(next);
    syncStationEdit(next);
    syncRcboSetup(next);
    syncRcboEdit(next);

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
