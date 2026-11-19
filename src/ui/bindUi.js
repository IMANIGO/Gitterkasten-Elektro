import {
  describeCatalogItem,
  formatItemDims,
  getCatalog,
  getCatalogItem,
  itemDepthM,
} from "../catalog/index.js";
import { rankCatalogItems } from "../catalog/search.js";
import { catalogThumbUrl } from "../catalog/thumbnails.js";
import * as THREE from "three";
import { applyStationSlots, STATION_SLOT_OPTIONS } from "../models/controlStation.js";
import { setDistributionCoverVisible } from "../models/distributionBoard.js";
import {
  dinMeasureFromLocal,
  measureLabels,
  panelMeasuresFromWorld,
  poseFromDinMeasure,
  poseFromPanelMeasures,
} from "../placement/measures.js";
import { inferFaceFromWorld } from "../plans/planFromWorld.js";
import { applyMcbSpec, MCB_FIELDS, mcbSpecFromFields, mcbSpecKey } from "../models/mcbSpec.js";
import { applyRcdSpec, RCD_FIELDS, rcdSpecFromFields, rcdSpecKey } from "../models/rcdSpec.js";
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
  const librarySearch = document.getElementById("library-search");
  const libraryQuery = document.getElementById("library-query");
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
  const coverToggle = document.getElementById("cover-toggle");
  const coverVisibleInput = document.getElementById("cover-visible");
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
  const mcbSetup = document.getElementById("mcb-setup");
  const mcbEdit = document.getElementById("mcb-edit");
  const rcdSetup = document.getElementById("rcd-setup");
  const rcdEdit = document.getElementById("rcd-edit");
  let stationSetupKey = "";
  let stationEditKey = "";
  let rcboSetupKey = "";
  let rcboEditKey = "";
  let mcbSetupKey = "";
  let mcbEditKey = "";
  let rcdSetupKey = "";
  let rcdEditKey = "";

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

  function fillMcbFields(container, spec, onChange) {
    container.innerHTML = "";
    const title = document.createElement("p");
    title.textContent = "Charakteristik";
    container.appendChild(title);
    for (const field of MCB_FIELDS) {
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
        onChange(mcbSpecFromFields(values));
      });
      label.appendChild(select);
      container.appendChild(label);
    }
  }

  function syncMcbSetup(next) {
    if (!mcbSetup) return;
    const show =
      next.mode === "betriebsmittel" && (next.selectedCatalogId === "ls-1p" || next.selectedCatalogId === "ls-3p");
    mcbSetup.hidden = !show;
    if (!show) {
      mcbSetupKey = "";
      return;
    }
    const key = mcbSpecKey(next.mcbSpec);
    if (key === mcbSetupKey && mcbSetup.childElementCount) return;
    mcbSetupKey = key;
    fillMcbFields(mcbSetup, next.mcbSpec, (spec) => {
      mcbSetupKey = mcbSpecKey(spec);
      setState({ mcbSpec: spec });
    });
  }

  function syncMcbEdit(next) {
    if (!mcbEdit) return;
    const spec = next.selectedMcbSpec;
    const show = !!spec && !!next.selectedObjectId;
    mcbEdit.hidden = !show;
    if (!show) {
      mcbEditKey = "";
      return;
    }
    const key = `${next.selectedObjectId}:${mcbSpecKey(spec)}`;
    if (key === mcbEditKey && mcbEdit.childElementCount) return;
    mcbEditKey = key;
    fillMcbFields(mcbEdit, spec, (nextSpec) => {
      const object = selection?.getSelected?.();
      if (!object) return;
      applyMcbSpec(object, nextSpec);
      mcbEditKey = `${object.uuid}:${mcbSpecKey(nextSpec)}`;
      setState({
        selectedMcbSpec: { ...nextSpec },
        selectedLabel: object.userData.name,
      });
    });
  }

  function fillRcdFields(container, spec, onChange) {
    container.innerHTML = "";
    const title = document.createElement("p");
    title.textContent = "Bemessung";
    container.appendChild(title);
    for (const field of RCD_FIELDS) {
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
        onChange(rcdSpecFromFields(values));
      });
      label.appendChild(select);
      container.appendChild(label);
    }
  }

  function syncRcdSetup(next) {
    if (!rcdSetup) return;
    const show = next.mode === "betriebsmittel" && next.selectedCatalogId === "fi-4p";
    rcdSetup.hidden = !show;
    if (!show) {
      rcdSetupKey = "";
      return;
    }
    const key = rcdSpecKey(next.rcdSpec);
    if (key === rcdSetupKey && rcdSetup.childElementCount) return;
    rcdSetupKey = key;
    fillRcdFields(rcdSetup, next.rcdSpec, (spec) => {
      rcdSetupKey = rcdSpecKey(spec);
      setState({ rcdSpec: spec });
    });
  }

  function syncRcdEdit(next) {
    if (!rcdEdit) return;
    const spec = next.selectedRcdSpec;
    const show = !!spec && !!next.selectedObjectId;
    rcdEdit.hidden = !show;
    if (!show) {
      rcdEditKey = "";
      return;
    }
    const key = `${next.selectedObjectId}:${rcdSpecKey(spec)}`;
    if (key === rcdEditKey && rcdEdit.childElementCount) return;
    rcdEditKey = key;
    fillRcdFields(rcdEdit, spec, (nextSpec) => {
      const object = selection?.getSelected?.();
      if (!object) return;
      applyRcdSpec(object, nextSpec);
      rcdEditKey = `${object.uuid}:${rcdSpecKey(nextSpec)}`;
      setState({
        selectedRcdSpec: { ...nextSpec },
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

  let libraryView = "list";
  const libraryViewBar = document.getElementById("library-view");

  function renderLibrary() {
    const catalog = getCatalog();
    const query = libraryQuery?.value || "";
    const ranked = rankCatalogItems(catalog.items, query);
    const scoreOf = new Map(ranked.map((entry) => [entry.item.id, entry.score]));
    const searching = query.trim().length > 0;
    libraryBody.classList.toggle("tiles", libraryView === "tiles");
    libraryBody.innerHTML = "";
    if (searching && !ranked.length) {
      const empty = document.createElement("p");
      empty.className = "library-empty";
      empty.textContent = "Nichts gefunden";
      libraryBody.appendChild(empty);
      return;
    }
    for (const group of catalog.groups) {
      let items = group.items.filter((item) => !searching || scoreOf.has(item.id));
      if (!items.length) continue;
      if (searching) items = items.slice().sort((a, b) => scoreOf.get(b.id) - scoreOf.get(a.id));
      const section = document.createElement("section");
      section.className = "library-group";
      const title = document.createElement("h3");
      title.className = "library-group-title";
      title.textContent = group.label;
      section.appendChild(title);

      for (const item of items) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "catalog-item";
        btn.dataset.catalogId = item.id;
        btn.disabled = !item.placeable;
        btn.title = libraryView === "tiles" ? "" : item.description || "";
        const thumb = document.createElement("img");
        thumb.className = "item-thumb";
        thumb.alt = "";
        const copy = document.createElement("span");
        copy.className = "item-copy";
        const label = document.createElement("span");
        label.className = "item-label";
        label.textContent = item.label;
        const dims = document.createElement("span");
        dims.className = "item-dims";
        dims.textContent = `${formatItemDims(item)}${item.placeable ? "" : " · folgt"}`;
        const desc = document.createElement("span");
        desc.className = "item-desc";
        desc.textContent = item.description || "";
        copy.append(label, dims, desc);
        btn.append(thumb, copy);
        catalogThumbUrl(item).then((url) => {
          if (url && thumb.isConnected) thumb.src = url;
        });
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
                    : item.factory === "mcb1p" || item.factory === "mcb3p"
                      ? { spec: state.mcbSpec }
                      : item.factory === "rcd4p"
                        ? { spec: state.rcdSpec }
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
    const active = state.selectedCatalogId;
    if (active) {
      libraryBody.querySelector(`[data-catalog-id="${active}"]`)?.classList.add("active");
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
    document.getElementById("move-a")?.focus();
  });
  coverVisibleInput?.addEventListener("change", () => {
    const object = selection?.getSelected?.();
    if (object?.userData?.kind !== "distributionBoard") return;
    setDistributionCoverVisible(object, coverVisibleInput.checked);
  });

  function syncCoverToggle() {
    const object = selection?.getSelected?.();
    const isUv = object?.userData?.kind === "distributionBoard";
    if (coverToggle) coverToggle.hidden = !isUv;
    if (!isUv || !coverVisibleInput) return;
    const on = object.userData.coverVisible === true;
    setDistributionCoverVisible(object, on);
    coverVisibleInput.checked = on;
  }

  const measurePlace = document.getElementById("measure-place");
  const moveForm = document.getElementById("measure-move");

  function applyMeasureLabels(prefix, face) {
    const labels = measureLabels(face);
    const aLabel = document.getElementById(`${prefix}-a-label`);
    const bWrap = document.getElementById(`${prefix}-b-wrap`);
    const bLabel = document.getElementById(`${prefix}-b-label`);
    if (aLabel) aLabel.textContent = labels.a;
    if (bWrap) bWrap.hidden = !labels.b;
    if (bLabel && labels.b) bLabel.textContent = labels.b;
  }

  /** Lochblech stays on the back wall; a rail device uses the first DIN row. */
  function placeTarget(item) {
    if (item?.mount === "din") {
      const rails = selection?.listDinRails?.() || [];
      return { face: "din", rail: rails[0] || null };
    }
    return { face: "back", rail: null };
  }

  /** Keep the face and, on a rail, the row the device already occupies. */
  function moveTarget(object) {
    const railParent = object.parent?.userData?.mount === "din" ? object.parent : null;
    const stored = object.userData?.placement;
    if (railParent || stored?.face === "din" || stored?.mount === "din") {
      return { face: "din", rail: railParent };
    }
    const world = new THREE.Vector3();
    object.getWorldPosition(world);
    const face = stored?.face && stored.face !== "din" ? stored.face : inferFaceFromWorld(world);
    return { face, rail: null };
  }

  function readMeasure(prefix, item, target) {
    const face = target?.face || "back";
    const a = Number(document.getElementById(`${prefix}-a`)?.value);
    const b = Number(document.getElementById(`${prefix}-b`)?.value);
    if (!Number.isFinite(a) || (face !== "din" && !Number.isFinite(b))) {
      setState({ placementFeedback: "Maß fehlt" });
      return null;
    }
    if (face === "din") {
      if (!target?.rail) {
        setState({ placementFeedback: "Keine Hutschiene im Aufbau" });
        return null;
      }
      return poseFromDinMeasure(target.rail, a, item);
    }
    return poseFromPanelMeasures(face, a, b, itemDepthM(item));
  }

  function syncMoveForm() {
    const object = selection?.getSelected?.();
    if (!moveForm || !object) return;
    if (moveForm.contains(document.activeElement)) return;
    const target = moveTarget(object);
    applyMeasureLabels("move", target.face);
    if (target.face === "din") {
      if (!target.rail) return;
      document.getElementById("move-a").value = String(
        dinMeasureFromLocal(object.position.x, target.rail.userData.railLength),
      );
      return;
    }
    const world = new THREE.Vector3();
    object.getWorldPosition(world);
    const measures = panelMeasuresFromWorld(target.face, world);
    document.getElementById("move-a").value = String(measures.a);
    document.getElementById("move-b").value = String(measures.b);
  }

  function syncPlaceForm() {
    const item = getCatalogItem(state.selectedCatalogId);
    if (!item) return;
    applyMeasureLabels("place", placeTarget(item).face);
  }

  applyMeasureLabels("move", "back");
  applyMeasureLabels("place", "back");
  document.getElementById("btn-move-measure")?.addEventListener("click", () => {
    const object = selection?.getSelected?.();
    const item = getCatalogItem(object?.userData?.catalogId);
    if (!item || !object) return;
    const pose = readMeasure("move", item, moveTarget(object));
    if (!pose) return;
    selection.moveToPose(pose);
  });
  document.getElementById("btn-place-measure")?.addEventListener("click", () => {
    const item = getCatalogItem(state.selectedCatalogId);
    if (!item?.placeable) return;
    const pose = readMeasure("place", item, placeTarget(item));
    if (!pose) return;
    selection.placeFresh(item, pose);
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
  libraryViewBar?.querySelectorAll("[data-library-view]").forEach((button) => {
    button.addEventListener("click", () => {
      libraryView = button.dataset.libraryView || "list";
      libraryViewBar.querySelectorAll("[data-library-view]").forEach((entry) => {
        entry.classList.toggle("active", entry === button);
      });
      renderLibrary();
    });
  });
  libraryQuery?.addEventListener("input", () => renderLibrary());
  libraryQuery?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      libraryQuery.value = "";
      renderLibrary();
    }
  });
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
    const moveButton = document.getElementById("btn-move");
    if (moveButton) {
      const moveArmed = hasSelection && next.selectionAction === "move";
      moveButton.classList.toggle("active", moveArmed);
      moveButton.setAttribute("aria-pressed", moveArmed ? "true" : "false");
    }

    if (librarySearch) librarySearch.hidden = next.mode !== "betriebsmittel";
    if (libraryViewBar) libraryViewBar.hidden = next.mode !== "betriebsmittel";
    if (measurePlace) {
      measurePlace.hidden = !(
        next.mode === "betriebsmittel" &&
        next.selectedCatalogId &&
        next.selectionAction !== "move"
      );
    }
    if (measurePlace && !measurePlace.hidden) syncPlaceForm();
    if (next.selectedObjectId) syncMoveForm();

    if (next.mode === "betriebsmittel") {
      libraryTitle.textContent = "Betriebsmittel";
      libraryHint.textContent =
        next.selectionAction === "replace"
          ? "Ersatz wählen, dann Montagepunkt anklicken"
          : next.selectionAction === "move"
            ? "Ziehen, neue Stelle anklicken oder Maß eintragen"
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

    syncCoverToggle();
    syncStationSetup(next);
    syncStationEdit(next);
    syncRcboSetup(next);
    syncRcboEdit(next);
    syncMcbSetup(next);
    syncMcbEdit(next);
    syncRcdSetup(next);
    syncRcdEdit(next);

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
