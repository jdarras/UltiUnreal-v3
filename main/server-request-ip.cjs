// Adresse de la station à l'origine d'une requête, enregistrée dans les
// sessions et le journal. Le serveur est joint directement par les stations :
// seule l'adresse réelle de la connexion fait foi. Les en-têtes de type
// x-forwarded-for, écrits librement par le client, sont ignorés (aucun proxy
// de confiance n'est déclaré).
function getRequestIp(req) {
  return String(req?.socket?.remoteAddress || '').trim();
}

module.exports = { getRequestIp };
