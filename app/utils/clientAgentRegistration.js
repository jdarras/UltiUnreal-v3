// A client explicitly selects its controller. Mirror only that controller and
// its own manually registered host; discovered stations never enter this list.
export function clientAgentRegistrations(identity, hosts) {
  if (identity?.role !== 'client' || identity?.mode === 'postprod') return [];
  const localIp = String(identity.localIp || '').trim();
  const serverIp = String(identity.serverIp || '').trim();
  if (!localIp || !serverIp) return [];
  const own = hosts.find((host) => String(host.ip || '').trim() === localIp);
  if (!own) return [];
  const controller = hosts.find((host) => String(host.ip || '').trim() === serverIp);
  return [
    { ip: serverIp, body: { name: controller?.name || serverIp } },
    { ip: localIp, body: own },
  ];
}

export function createClientAgentRegistrar(send) {
  let completed = '';
  let pending = Promise.resolve();
  return (identity, hosts) => {
    const registrations = clientAgentRegistrations(identity, hosts);
    if (!registrations.length) return Promise.resolve();
    const port = Number(identity.agentPort) || 4000;
    const signature = JSON.stringify({ port, registrations });
    const task = pending.catch(() => {}).then(async () => {
      if (signature === completed) return;
      for (const { ip, body } of registrations) {
        const response = await send('POST', `http://127.0.0.1:${port}/agent/host/${encodeURIComponent(ip)}`, body);
        const data = response?.data || (response?.text ? JSON.parse(response.text) : {});
        if (!response?.ok || data?.ok === false) {
          throw new Error(data?.message || data?.error || response?.error || 'Configuration de l’agent local impossible');
        }
      }
      completed = signature;
    });
    pending = task;
    return task;
  };
}

// Local provisioning must never prevent the central host list from displaying.
export function createClientHostLoader(loadHosts, readIdentity, register, reportError) {
  return async () => {
    const hosts = await loadHosts();
    void Promise.resolve()
      .then(() => register(readIdentity(), hosts))
      .catch(reportError);
    return hosts;
  };
}

// Deduplicate polling failures, but retry logging if the log endpoint is down.
export function createClientRegistrationReporter(writeLog) {
  let last = '';
  const report = async (error) => {
    const message = String(error?.message || error);
    if (last === message) return;
    last = message;
    try {
      await writeLog({
        level: 'warn',
        action: 'client_agent_registration_failed',
        message: `Déclaration de l’agent local impossible : ${message}. La liste des stations reste disponible ; nouvelle tentative au prochain chargement.`,
      });
    } catch {
      if (last === message) last = '';
    }
  };
  report.reset = () => { last = ''; };
  return report;
}
