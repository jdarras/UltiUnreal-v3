// File hors ligne tenue de façon synchrone : source de vérité unique, dont
// chaque modification est répercutée (commit) dans l'état React et le stockage
// local. Les décisions d'ajout (accepté / refusé) se prennent sur la file
// courante, au moment même de l'ajout : deux ajouts simultanés ne peuvent pas
// être annoncés comme acceptés si un seul a trouvé de la place.

function createSyncedOutbox({ initial = [], normalize = (list) => list, commit = () => {} } = {}) {
  let current = normalize(initial);

  function set(next) {
    current = normalize(next);
    commit(current);
    return current;
  }

  return {
    get: () => current,
    // Remplacement fonctionnel, appliqué à la file courante.
    update(updater) {
      return set(typeof updater === 'function' ? updater(current) : updater);
    },
    // decide(current) -> { next, accepted, ...info } ; la file n'est modifiée
    // que si accepted est vrai. Le résultat renvoyé est celui effectivement appliqué.
    tryUpdate(decide) {
      const decision = decide(current) || {};
      if (decision.accepted !== true) return { ...decision, accepted: false, list: current };
      return { ...decision, accepted: true, list: set(decision.next) };
    },
  };
}

export { createSyncedOutbox };
