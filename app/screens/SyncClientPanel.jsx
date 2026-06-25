import { colorClass } from '../utils/colors';

function SyncClientPanel({
  t,
  localHostClient,
  hasHosts,
  localHostName,
  localHostIp,
  clientRoot,
  clientSyncEnabled,
  onClientRootChange,
  onClientSyncEnabledChange,
  onBrowseClient,
  onTestClient,
  message,
  confirmDialogNode,
}) {
  return (
    <div className="uu-page uu-page-compact">
      <p className="uu-page-title">{t('sync.client.title')}</p>
      <p className="uu-page-subtitle">{t('sync.client.subtitle')}</p>

      <div className="uu-card">
        <div className="uu-field">
          <label className="uu-label">{t('sync.client.machineLabel')}</label>
          {!hasHosts && <p className="uu-hint">{t('sync.client.noHostsHint')}</p>}
          {hasHosts && localHostClient && (
            <div className="uu-host-row">
              <span className={`uu-host-dot ${colorClass(localHostClient.color)}`} />
              <div className="uu-host-main">
                <span className="uu-host-name">{localHostName}</span>
                <span className="uu-host-ip uu-hint"> - {localHostIp}</span>
              </div>
            </div>
          )}
        </div>

        <div className="uu-field">
          <label className="uu-label">
            <input
              type="checkbox"
              checked={!!clientSyncEnabled}
              onChange={(event) => onClientSyncEnabledChange(event.target.checked)}
            />{' '}
            {t('sync.client.enabledLabel')}
          </label>
        </div>

        <div className="uu-field">
          <label className="uu-label">{t('sync.client.rootLabel')}</label>
          <div className="uu-input-row">
            <input
              className="uu-input"
              type="text"
              value={clientRoot}
              onChange={(event) => onClientRootChange(event.target.value)}
              placeholder={t('sync.client.rootPlaceholder')}
            />
            <button type="button" className="uu-btn" onClick={onBrowseClient}>
              {t('sync.client.browse')}
            </button>
          </div>
        </div>

        <div className="uu-buttons-row">
          <button type="button" className="uu-btn" onClick={onTestClient}>
            {t('sync.client.test')}
          </button>
        </div>

        {message && <div className={`uu-msg ${message.type || ''}`}>{message.text}</div>}
        {confirmDialogNode}
      </div>
    </div>
  );
}

export default SyncClientPanel;
