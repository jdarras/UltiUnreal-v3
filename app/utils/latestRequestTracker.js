// Ignore les réponses périmées : seule la dernière requête d'une clé donnée,
// lancée dans la session courante, a le droit de modifier l'état.
function createLatestRequestTracker() {
  const seqByKey = new Map();
  let session = '';
  return {
    setSession(nextSession) {
      session = String(nextSession || '');
    },
    begin(key) {
      const seq = (seqByKey.get(key) || 0) + 1;
      seqByKey.set(key, seq);
      const startSession = session;
      return () => seqByKey.get(key) === seq && session === startSession;
    },
  };
}

export { createLatestRequestTracker };
