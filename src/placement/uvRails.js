/** Top rail is Schiene A, then B, C. */
export const UV_RAIL_LETTERS = ["A", "B", "C"];

export function railLetter(rowIndex) {
  const index = Number(rowIndex);
  if (!Number.isFinite(index) || index < 0) return null;
  return UV_RAIL_LETTERS[index] || `R${index + 1}`;
}

export function railLabel(rowIndex) {
  const letter = railLetter(rowIndex);
  return letter ? `Schiene ${letter}` : "Hutschiene";
}

export function rowIndexFromLetter(letter) {
  const key = String(letter || "").trim().toUpperCase();
  const index = UV_RAIL_LETTERS.indexOf(key);
  return index >= 0 ? index : 0;
}
