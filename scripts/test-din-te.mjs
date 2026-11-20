import { getCatalogItem } from "../src/catalog/index.js";
import { UV } from "../src/layout.js";
import { dinTeFromLocal, poseFromDinTe } from "../src/placement/measures.js";
import { railLabel, railLetter } from "../src/placement/uvRails.js";

const railA = {
  userData: { railLength: UV.railLength, mount: "din", rowIndex: 0, railLetter: "A", name: "Schiene A" },
};
const railC = {
  userData: { railLength: UV.railLength, mount: "din", rowIndex: 2, railLetter: "C", name: "Schiene C" },
};
const item = getCatalogItem("ls-1p");
const pose = poseFromDinTe(railA, 1, item);
const roundTrip = dinTeFromLocal(pose.position.x, item, UV.railLength);
const wide = poseFromDinTe(railC, 4, getCatalogItem("fi-4p"));

const result = {
  letterA: railLetter(0),
  letterC: railLetter(2),
  labelA: railLabel(0),
  teIndex: pose.teIndex,
  roundTrip,
  feedback: pose.feedback,
  wideTe: wide.teIndex,
  wideFeedback: wide.feedback,
};

const pass =
  result.letterA === "A" &&
  result.letterC === "C" &&
  result.labelA === "Schiene A" &&
  result.teIndex === 0 &&
  result.roundTrip === 1 &&
  String(result.feedback).includes("Schiene A") &&
  String(result.feedback).includes("TE 1") &&
  result.wideTe === 3 &&
  String(result.wideFeedback).includes("Schiene C");

console.log(JSON.stringify({ result, pass }, null, 2));
process.exit(pass ? 0 : 1);
