// Mise à jour d'état sans réaffichage inutile : un rafraîchissement en
// arrière-plan qui ramène le même contenu conserve l'objet précédent (React
// ignore alors la mise à jour).

function sameJson(a, b) {
  if (a === b) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

export function keepIfUnchanged(prev, next) {
  return sameJson(prev, next) ? prev : next;
}
