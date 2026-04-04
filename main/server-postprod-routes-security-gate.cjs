'use strict';

async function evaluatePostprodSecurityGate(options = {}) {
  const {
    req,
    res,
    pathname = '',
    sendJSON,
    isSecureRequestTransport,
    inspectClientCertificate,
    evaluateClientCertificatePolicy,
    trustProxyClientCertHeaders = false,
    allowedClientCertSubjects = [],
    allowedClientCertIssuers = [],
    allowedClientCertFingerprintsSha256 = [],
    brokerRequireSecureTransport = false,
    requireClientCert = false,
    brokerTokenRequired = false,
    getBrokerToken,
    verifyBrokerAuth,
    brokerToken = '',
    brokerJwtConfig = {},
  } = options;

  const requestTransportSecure = isSecureRequestTransport(req);
  const clientCertInfo = inspectClientCertificate(req, {
    trustProxyHeaders: trustProxyClientCertHeaders,
  });
  const clientCertVerified = clientCertInfo?.verified === true;
  const clientCertSource = clientCertVerified
    ? String(clientCertInfo?.source || '')
    : '';
  const clientCertSubject = clientCertVerified
    ? String(clientCertInfo?.subject || '')
    : '';
  const clientCertIssuer = clientCertVerified
    ? String(clientCertInfo?.issuer || '')
    : '';
  const clientCertFingerprintSha256 = clientCertVerified
    ? String(clientCertInfo?.fingerprintSha256 || '')
    : '';
  const clientCertPolicy = evaluateClientCertificatePolicy(clientCertInfo, {
    allowedSubjects: allowedClientCertSubjects,
    allowedIssuers: allowedClientCertIssuers,
    allowedFingerprints: allowedClientCertFingerprintsSha256,
  });
  const clientCertAccepted = clientCertPolicy?.ok === true;
  const clientCertPolicyReason = String(clientCertPolicy?.reason || '');
  const isAuthHealthRoute = pathname === '/agent/postprod/auth/health';

  if (brokerRequireSecureTransport && !requestTransportSecure) {
    sendJSON(res, 426, { ok: false, error: 'insecure_transport' });
    return { handled: true };
  }

  if (requireClientCert && !clientCertAccepted && !isAuthHealthRoute) {
    sendJSON(res, 401, { ok: false, error: 'client_cert_required' });
    return { handled: true };
  }

  if (brokerTokenRequired && !isAuthHealthRoute) {
    const requestBrokerToken = getBrokerToken(req);
    const brokerAuth = await verifyBrokerAuth(requestBrokerToken, {
      expectedToken: brokerToken,
      jwtConfig: brokerJwtConfig,
    });
    if (!brokerAuth.ok) {
      sendJSON(res, 403, { ok: false, error: 'invalid_broker_token' });
      return { handled: true };
    }
  }

  return {
    handled: false,
    isAuthHealthRoute,
    requestTransportSecure,
    clientCertVerified,
    clientCertAccepted,
    clientCertSource,
    clientCertSubject,
    clientCertIssuer,
    clientCertFingerprintSha256,
    clientCertPolicyReason,
  };
}

module.exports = {
  evaluatePostprodSecurityGate,
};
