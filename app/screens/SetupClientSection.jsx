const GRID_ONE_AUTO_STYLE = { gridTemplateColumns: '1fr auto' };

function SetupClientSection({
  t,
  clientVersions,
  clientEditors,
  setClientEditors,
  saveClientEditors,
  showClientTransientMessage,
  handleClientToggleSync,
  clientSyncState,
  versionsLoaded,
  clientMsg,
  clientMsgType,
}) {
  const versionsToDisplay = clientVersions.length
    ? clientVersions
    : Object.keys(clientEditors || {}).filter(Boolean);

  return (
    <div className="uu-page">
      <h2>{t('setup.client.title')}</h2>

      <div className="uu-section uu-maxw-640">
        {!versionsLoaded && versionsToDisplay.length === 0 ? (
          <div className="uu-muted">{t('common.loading')}</div>
        ) : versionsToDisplay.length === 0 ? (
          <div className="uu-muted">{t('setup.client.noVersions')}</div>
        ) : (
          versionsToDisplay.map((ver) => (
            <div key={ver} className="uu-grid-field mt-8">
              <label className="uu-label w-160">
                {t('setup.client.unrealVersionLabel', { version: ver })}
              </label>
              <div className="uu-grid-2" style={GRID_ONE_AUTO_STYLE}>
                <input
                  className="uu-input"
                  value={clientEditors[ver] || ''}
                  onChange={(e) =>
                    setClientEditors((prev) => ({
                      ...prev,
                      [ver]: e.target.value,
                    }))
                  }
                  onBlur={() => {
                    saveClientEditors();
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    e.preventDefault();
                    saveClientEditors();
                  }}
                  placeholder={t('setup.client.editorPlaceholder')}
                />
                <button
                  className="uu-btn"
                  type="button"
                  onClick={async () => {
                    if (!window.electron?.openExecutable) {
                      showClientTransientMessage(t('setup.client.msg.browseUnavailable'), 'error', 2500);
                      return;
                    }
                    let file = '';
                    try {
                      file = await window.electron.openExecutable({
                        defaultPath: String(clientEditors?.[ver] || '').trim(),
                      });
                    } catch {}
                    if (!file) return;
                    const path = String(file).trim();
                    const nextEditors = {
                      ...(clientEditors && typeof clientEditors === 'object' ? clientEditors : {}),
                      [ver]: path,
                    };
                    setClientEditors(nextEditors);
                    saveClientEditors(nextEditors);
                  }}
                >
                  {t('common.browse')}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="uu-section uu-maxw-640 mt-16">
        <div className="uu-grid-field">
          <label className="uu-label">
            <input
              type="checkbox"
              checked={!!clientSyncState}
              onChange={handleClientToggleSync}
            />{' '}
            {t('setup.client.syncCheckboxLabel')}
          </label>
          <p className="uu-hint">
            {t('setup.client.syncHint.beforeTab')}{' '}
            <strong>{t('nav.sync')}</strong>{' '}
            {t('setup.client.syncHint.afterTab')}
          </p>
        </div>
      </div>

      {clientMsg && (
        <div className={`uu-msg ${clientMsgType || ''} mt-8`}>
          {clientMsg}
        </div>
      )}
    </div>
  );
}

export { SetupClientSection };
