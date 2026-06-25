export default function ConfigSyncSection({
  t,
  SectionTitleComponent,
  syncEnabled = false,
  syncRoot = '',
  loading = false,
  message = null,
  onToggleSyncEnabled,
  onChangeSyncRoot,
  onBrowseSyncRoot,
}) {
  const titleNode = SectionTitleComponent
    ? (
        <SectionTitleComponent>
          {t('config.sync.sectionTitle')}
        </SectionTitleComponent>
      )
    : (
        <h3 className="uu-h3 uu-block-title">
          {t('config.sync.sectionTitle')}
        </h3>
      );
  return (
    <div className="uu-section mt-16" id="config-sync">
      {titleNode}
      <p className="uu-hint">{t('config.sync.localHint')}</p>

      {loading ? (
        <div className="uu-muted">{t('config.sync.loading')}</div>
      ) : null}

      <label className="uu-check mt-12">
        <input
          type="checkbox"
          disabled={loading}
          checked={!!syncEnabled}
          onChange={(event) => onToggleSyncEnabled?.(event.target.checked)}
        />
        {t('config.sync.enabledLabel')}
      </label>

      <div className="uu-grid-field uu-maxw-620 mt-12">
        <label className="uu-label">{t('config.sync.rootLabel')}</label>
        <div className="uu-input-row">
          <input
            className="uu-input"
            type="text"
            disabled={loading}
            value={syncRoot}
            onChange={(event) => onChangeSyncRoot?.(event.target.value)}
            placeholder={t('sync.client.rootPlaceholder')}
          />
          <button
            type="button"
            className="uu-btn"
            disabled={loading}
            onClick={onBrowseSyncRoot}
          >
            {t('sync.client.browse')}
          </button>
        </div>
      </div>

      {message ? (
        <div className={`uu-msg ${message.type || ''} mt-12`}>{message.text}</div>
      ) : null}
    </div>
  );
}
