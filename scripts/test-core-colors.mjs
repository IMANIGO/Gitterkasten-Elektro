import { chromium } from "playwright";
import * as THREE from "three";
import { coreColorsFor } from "../src/wiring/cableTypes.js";
import { createWireEndFan } from "../src/wiring/pathGeometry.js";

function labels(cores, typeId = "h07rn-f") {
  return coreColorsFor({ typeId, cores }).map((core) => core.label);
}

const five = coreColorsFor({ typeId: "nym-j", cores: 5 });
const fan = createWireEndFan(new THREE.Vector3(), new THREE.Vector3(0, 0, 1), five, 0.006);
const xs = [];
fan.traverse((object) => {
  if (object.geometry?.type === "CylinderGeometry") xs.push(object.position.x);
});
const spanMm = Math.round((Math.max(...xs) - Math.min(...xs)) * 1000);

const unit = {
  c3: labels(3),
  c4: labels(4),
  c5: labels(5),
  c7: labels(7),
  sameOnNym: labels(5, "nym-j").join("/") === labels(5, "h07rn-f").join("/"),
  marks: coreColorsFor({ typeId: "h07rn-f", cores: 7 }).map((core) => core.mark || ""),
  spanMm,
};
console.log(JSON.stringify(unit, null, 2));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });
await page.keyboard.press("v");
await page.waitForSelector("#cable-cores");

async function preview(cores) {
  await page.selectOption("#cable-cores", String(cores));
  await page.waitForTimeout(40);
  return page.locator("#cable-preview").textContent();
}

const ui = {
  p3: await preview(3),
  p4: await preview(4),
  p5: await preview(5),
  p7: await preview(7),
};
const numbered = await page.evaluate(async () => {
  const types = await import("/src/wiring/cableTypes.js");
  const geo = await import("/src/wiring/pathGeometry.js");
  const THREE = window.__pruefwand.THREE;
  const cores = types.coreColorsFor({ typeId: "h07rn-f", cores: 7 });
  const group = geo.createWireEndFan(new THREE.Vector3(), new THREE.Vector3(0, 0, 1), cores, 0.007);
  const marks = [];
  group.traverse((object) => {
    if (object.userData?.coreMark) marks.push(object.userData.coreMark);
  });
  return marks;
});
console.log(JSON.stringify({ ui, numbered }, null, 2));

const pass =
  unit.c3.join(",") === "blau,grün-gelb,braun" &&
  unit.c4.join(",") === "blau,grün-gelb,braun,schwarz" &&
  unit.c5.join(",") === "blau,grün-gelb,braun,schwarz,grau" &&
  unit.c7.join(",") === "grün-gelb,schwarz 1,schwarz 2,schwarz 3,schwarz 4,schwarz 5,schwarz 6" &&
  unit.marks.join(",") === ",1,2,3,4,5,6" &&
  unit.sameOnNym &&
  unit.spanMm >= 24 &&
  ui.p3.includes("blau/grün-gelb/braun") &&
  ui.p5.includes("schwarz/grau") &&
  ui.p7.includes("schwarz 1") &&
  ui.p7.includes("schwarz 6") &&
  numbered.filter((mark) => mark === "1").length === 2 &&
  numbered.includes("6");

console.log(JSON.stringify({ pass }));
await browser.close();
process.exit(pass ? 0 : 1);
