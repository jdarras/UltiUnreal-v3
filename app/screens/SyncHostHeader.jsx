import { colorClass } from '../utils/colors';
import { safeStr } from './synchronisationHelpers';

function SyncHostHeader({ host, index, t }) {
  const name = safeStr(host?.name, `${t('sync.server.hostDefaultName')} ${index + 1}`);
  const ip = safeStr(host?.ip || host?.address, `#${index + 1}`);
  return (
    <div className="uu-host-row">
      <span className={`uu-host-dot ${colorClass(host?.color)}`} />
      <div className="uu-host-main">
        <span className="uu-host-name">{name}</span>
        <span className="uu-host-ip uu-hint"> - {ip}</span>
      </div>
    </div>
  );
}

export { SyncHostHeader };
