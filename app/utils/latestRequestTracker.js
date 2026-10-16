// Ignore les réponses périmées : seule la dernière requête d'une clé donnée,
// lancée avec le jeton de la session courante, a le droit de modifier l'état.
// Le jeton est celui réellement utilisé par la requête (et non la session lue
// au moment de l'appel) : un ancien callback appelé après une déconnexion est
// donc rejeté dès le départ.
function createLatestRequestTracker() {
  const seqByKey = new Map();
  let session = '';
  return {
    setSession(nextSession) {
      session = String(nextSession || '');
    },
    isSessionCurrent(requestSession) {
      return String(requestSession || '') === session;
    },
    begin(key, requestSession) {
      const seq = (seqByKey.get(key) || 0) + 1;
      seqByKey.set(key, seq);
      const usedSession = String(requestSession || '');
      return () => seqByKey.get(key) === seq && session === usedSession;
    },
  };
}

export { createLatestRequestTracker };
