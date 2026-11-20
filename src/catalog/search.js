/**
 * Ähnlichkeitssuche über den Betriebsmittel-Katalog.
 * Groß/Klein und Umlaute sind egal, einzelne Tippfehler auch.
 * Mehrere Wörter müssen alle irgendwo im Artikel vorkommen,
 * damit „kreuz“ Kombinationen und den einzelnen Kreuzschalter trifft
 * und „kreuz taster“ die gemischte Kombination.
 */

function fold(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function tokens(value) {
  return fold(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 0);
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) row[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return row[b.length];
}

function typoLimit(length) {
  if (length <= 3) return 0;
  if (length <= 5) return 1;
  return 2;
}

function tokenScore(queryToken, hayToken) {
  if (queryToken === hayToken) return 100;
  if (hayToken.startsWith(queryToken)) return 86;
  if (queryToken.length >= 3 && hayToken.includes(queryToken)) return 72;
  if (queryToken.length <= 3) return 0;
  const window = hayToken.slice(0, Math.min(hayToken.length, queryToken.length + 1));
  const distance = levenshtein(queryToken, window);
  if (distance <= typoLimit(queryToken.length)) return 58 - distance * 12;
  return 0;
}

export function itemSearchText(item) {
  return [item?.label, item?.short, item?.description, item?.id, item?.group, item?.symbol]
    .filter(Boolean)
    .join(" ");
}

export function scoreCatalogItem(item, query) {
  const queryTokens = tokens(query);
  if (!queryTokens.length) return 1;
  const hay = tokens(itemSearchText(item));
  if (!hay.length) return 0;
  let total = 0;
  for (const queryToken of queryTokens) {
    let best = 0;
    for (const hayToken of hay) best = Math.max(best, tokenScore(queryToken, hayToken));
    if (best === 0) return 0;
    total += best;
  }
  return total;
}

/** @returns {{ item: object, score: number }[]} */
export function rankCatalogItems(items, query) {
  const ranked = [];
  for (const item of items || []) {
    const score = scoreCatalogItem(item, query);
    if (score > 0) ranked.push({ item, score });
  }
  const searching = tokens(query).length > 0;
  if (!searching) return ranked;
  ranked.sort((a, b) => b.score - a.score);
  return ranked;
}
