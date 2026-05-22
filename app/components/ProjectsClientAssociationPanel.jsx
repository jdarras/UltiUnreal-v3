export default function ProjectsClientAssociationPanel({
  t,
  clientActiveName,
  clientActiveId,
  clientAssocPath,
  clientSyncEnabled,
  onAssociate,
}) {
  return (
    <div className="uu-section uu-maxw-640">
      {!clientActiveName ? (
        <div className="uu-muted">
          {t('projects.client.noActiveServer')}
        </div>
      ) : (
        <>
          <div className="uu-row">
            <div className="uu-label w-160">{t('projects.client.activeLabel')}</div>
            <div className="uu-value">
              <span className="uu-id-tag">
                [{clientActiveId || '----'}]
              </span>
              {clientActiveName}
            </div>
          </div>

          <div className="uu-grid-field mt-12">
            <label className="uu-label">{t('projects.client.pathLabel')}</label>
            <div className="uu-grid-2">
              <input
                className="uu-input"
                value={clientAssocPath}
                readOnly
                placeholder="D:\\Projets\\MonJeu\\MonJeu.uproject"
              />
              <button
                type="button"
                className="uu-btn"
                onClick={onAssociate}
                disabled={!clientActiveName || clientSyncEnabled}
              >
                {t('projects.client.associateButton')}
              </button>
            </div>
          </div>

          {clientSyncEnabled && (
            <div className="uu-message uu-message-info">
              {t('projects.client.syncInfo.line1')}
              <br />
              {t('projects.client.syncInfo.line2')}
              <br />
              {t('projects.client.syncInfo.line3')}
            </div>
          )}
        </>
      )}
    </div>
  );
}
