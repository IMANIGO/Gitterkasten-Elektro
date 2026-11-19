import { state, subscribe } from "../state.js";

export function bindUi({ applyPreset }) {
  const hoverCard = document.getElementById("hover-card");
  const hoverName = document.getElementById("hover-name");
  const hoverMeta = document.getElementById("hover-meta");
  const presetButtons = [...document.querySelectorAll("[data-preset]")];

  presetButtons.forEach((button) => {
    button.addEventListener("click", () => applyPreset(button.dataset.preset));
  });

  window.addEventListener("keydown", (event) => {
    const map = { 1: "gesamt", 2: "uv", 3: "gitter", 4: "draufsicht" };
    if (map[event.key]) applyPreset(map[event.key]);
  });

  subscribe((next) => {
    presetButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.preset === next.cameraPreset);
    });
    if (next.hovered) {
      hoverCard.hidden = false;
      hoverName.textContent = next.hovered.name;
      hoverMeta.textContent = next.hovered.meta;
    } else {
      hoverCard.hidden = true;
    }
  });

  return { getMode: () => state.mode };
}
