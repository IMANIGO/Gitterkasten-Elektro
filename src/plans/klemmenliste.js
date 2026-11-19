/**
 * Klemmenliste nach üblicher VDE-/Ausbildungs-Tabellenform.
 */
export function renderKlemmenlisteHtml(plan) {
  const rows = (plan.terminals || [])
    .map(
      (t) => `<tr>
      <td>${escapeHtml(t.id)}</td>
      <td>${escapeHtml(t.potential)}</td>
      <td>${escapeHtml(t.color)}</td>
      <td>${t.qmm ?? ""}</td>
      <td>${escapeHtml(t.from)}</td>
      <td>${escapeHtml(t.to)}</td>
    </tr>`,
    )
    .join("");

  return `<div class="klemmenliste">
    <header>
      <h3>Klemmenliste — ${escapeHtml(plan.planNr || plan.id)}</h3>
      <p>${escapeHtml(plan.title)} · nach VDE-üblicher Ausbildungsform</p>
    </header>
    <table>
      <thead>
        <tr>
          <th>Klemme</th>
          <th>Potential</th>
          <th>Aderfarbe</th>
          <th>mm²</th>
          <th>von</th>
          <th>nach</th>
        </tr>
      </thead>
      <tbody>${rows || `<tr><td colspan="6">Keine Klemmen definiert</td></tr>`}</tbody>
    </table>
  </div>`;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function klemmenlisteToCsv(plan) {
  const header = "Klemme;Potential;Aderfarbe;mm2;von;nach";
  const lines = (plan.terminals || []).map(
    (t) => `${t.id};${t.potential};${t.color};${t.qmm ?? ""};${t.from};${t.to}`,
  );
  return [header, ...lines].join("\n");
}
