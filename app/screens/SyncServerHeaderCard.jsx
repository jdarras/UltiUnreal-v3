function SyncServerHeaderCard({
  t,
  isRenderMode,
  projectsData,
  displayProjectName,
  sourceDir,
  hostsLoading,
  hostsError,
  hasClientHosts,
  onEditActiveProject,
  children,
}) {
  return (
    <>
      {!isRenderMode && (
        <div className="uu-section">
          <div className="uu-kv">
            {projectsData?.activeId ? (
              <button className="uu-btn" onClick={onEditActiveProject}>
                {t('projects.actions.edit')}
              </button>
            ) : null}
            <span className="uu-k">{t('sync.server.activeProjectLabel')}</span>
            <span className="uu-v">
              {displayProjectName ? (
                <>
                  {displayProjectName}{' '}
                  {projectsData?.activeId ? (
                    <span className="uu-id-tag uu-muted">[{projectsData.activeId}]</span>
                  ) : null}
                </>
              ) : (
                t('sync.server.activeProjectUnknown')
              )}
            </span>
          </div>
        </div>
      )}

      <div className="uu-card">
        {!isRenderMode && (
          <p>
            <strong>{t('sync.server.sourceDirLabel')}&nbsp;</strong>{' '}
            {sourceDir ? <code>{sourceDir}</code> : <span>{t('sync.server.sourceDirUnknown')}</span>}
          </p>
        )}

        {hostsLoading && <p className="uu-hint">{t('sync.server.loadingHosts')}</p>}

        {!hostsLoading && hostsError && <div className="uu-msg error">{hostsError}</div>}

        {!hostsLoading && !hostsError && !hasClientHosts && (
          <p className="uu-hint">{t('sync.server.noClientHosts')}</p>
        )}

        {children}
      </div>
    </>
  );
}

export default SyncServerHeaderCard;
