import { safeStr } from './synchronisationHelpers';
import { SyncHostHeader } from './SyncHostHeader';

const SYNC_WARN_MSG_STYLE = { margin: 0 };
const SYNC_SECTION_TITLE_STYLE = { marginBottom: '12px' };

function SyncWarnCard({ host, index, messageText, t }) {
  return (
    <div className="uu-card launch-host-invalid">
      <div className="uu-row uu-row-gap12 uu-wrap uu-align-center">
        <div className="uu-col">
          <SyncHostHeader host={host} index={index} t={t} />
        </div>
        <div className="uu-col">
          <div className="uu-msg error" style={SYNC_WARN_MSG_STYLE}>
            {messageText}
          </div>
        </div>
      </div>
    </div>
  );
}

function SyncWarnHostsSection({ hosts, title, messageText, t }) {
  if (!hosts.length) return null;
  return (
    <div className="uu-section">
      <h3 className="uu-h3 uu-block-title" style={SYNC_SECTION_TITLE_STYLE}>
        {title}
      </h3>
      <div className="uu-list">
        {hosts.map((host, index) => (
          <SyncWarnCard
            key={`${safeStr(host?.ip || host?.address, index)}-${index}`}
            host={host}
            index={index}
            t={t}
            messageText={messageText}
          />
        ))}
      </div>
    </div>
  );
}

export { SyncWarnCard, SyncWarnHostsSection };
