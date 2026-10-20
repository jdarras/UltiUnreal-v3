// Libellés de la liste « Assigné à » : deux comptes au même nom affiché
// (même prénom et nom, par exemple) sont distingués par leur identifiant de
// connexion, sinon par leur numéro.
export function disambiguateAssigneeLabels(options = []) {
  const list = Array.isArray(options) ? options : [];
  const countByLabel = new Map();
  for (const option of list) {
    const key = String(option?.label || "").trim().toLocaleLowerCase();
    countByLabel.set(key, (countByLabel.get(key) || 0) + 1);
  }
  return list.map((option) => {
    const label = String(option?.label || "").trim();
    if ((countByLabel.get(label.toLocaleLowerCase()) || 0) <= 1) return option;
    const username = String(option?.username || "").trim();
    const suffix = username && username.toLocaleLowerCase() !== label.toLocaleLowerCase()
      ? username
      : `#${option?.id}`;
    return { ...option, label: `${label} (${suffix})` };
  });
}
