import { colorClass } from '../utils/colors';
import { safeStr } from './synchronisationHelpers';

const SYNC_WARN_MSG_STYLE = { margin: 0 };
const SYNC_DIFF_LABEL_KEYS = {
  added: 'sync.diff.added',
  modified: 'sync.diff.modified',
  removed: 'sync.diff.removed',
};

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

function SyncDiffSection({
  ip,
  type,
  items,
  isOpen,
  isRenderMode,
  isBusy,
  isChecked,
  onToggleSection,
  onBulkSelect,
  onToggleFileSelection,
  t,
}) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return null;
  const labelKey = SYNC_DIFF_LABEL_KEYS[type];
  if (!labelKey) return null;

  return (
    <div className="uu-sync-diff-block">
      <div className="uu-sync-diff-title">
        <button
          type="button"
          className="uu-sync-diff-toggle"
          onClick={() => onToggleSection(ip, type)}
        >
          {isOpen(type) ? 'v' : '>'}
        </button>
        <span className="uu-sync-diff-label">
          {t(labelKey, { count: list.length })}
        </span>
        {!isRenderMode && (
          <>
            <button
              type="button"
              className="uu-sync-diff-bulk"
              onClick={() => onBulkSelect(ip, type, true)}
              disabled={isBusy}
            >
              Tout
            </button>
            <button
              type="button"
              className="uu-sync-diff-bulk"
              onClick={() => onBulkSelect(ip, type, false)}
              disabled={isBusy}
            >
              Aucun
            </button>
          </>
        )}
      </div>
      {isOpen(type) && (
        <div className="uu-sync-diff-list">
          {list.map((rel) => (
            <label key={rel} className="uu-sync-diff-item">
              {!isRenderMode ? (
                <input
                  type="checkbox"
                  checked={isChecked(type, rel)}
                  disabled={isBusy}
                  onChange={() => onToggleFileSelection(ip, type, rel)}
                />
              ) : null}{' '}
              <span className="uu-sync-diff-path">{rel}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export {
  SyncHostHeader,
  SyncWarnCard,
  SyncDiffSection,
};
