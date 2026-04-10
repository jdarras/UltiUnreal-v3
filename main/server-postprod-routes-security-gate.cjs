'use strict';

async function evaluatePostprodSecurityGate(options = {}) {
  const { pathname = '' } = options;
  const isAuthHealthRoute = pathname === '/agent/postprod/auth/health';
  return {
    ok: true,
    handled: false,
    isAuthHealthRoute,
  };
}

module.exports = {
  evaluatePostprodSecurityGate,
};
