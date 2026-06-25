const TITLE_ROW_STYLE = { marginBottom: '12px' };
const PLUGIN_READY_CARD_STYLE = {
  backgroundColor: 'rgba(27, 153, 73, 0.22)',
  borderColor: 'var(--uu-color-green)',
};
const PLUGIN_MISSING_CARD_STYLE = {
  backgroundColor: 'rgba(163, 46, 46, 0.22)',
  borderColor: 'var(--uu-color-red)',
};
const PLUGIN_STATE_TEXT_STYLE = { color: 'var(--uu-color-text)' };
const WORD_BREAK_ALL_STYLE = { wordBreak: 'break-all' };

function getPluginStateLabel(t, status = {}) {
  if (status?.ready === true) return t('projects.detail.livePlugins.state.ready');
  if (status?.installedInProject === true) {
    return status?.enabledInProject === true
      ? t('projects.detail.livePlugins.state.ready')
      : t('projects.detail.livePlugins.state.notEnabled');
  }
  return t('projects.detail.livePlugins.state.notInstalled');
}

function openManual(filePath = '') {
  const p = String(filePath || '').trim();
  if (!p) return;
  if (window?.electron?.openPath) {
    window.electron.openPath(p);
    return;
  }
  const uri = p.startsWith('file://') ? p : `file:///${p.replace(/\\/g, '/')}`;
  try { window.open(encodeURI(uri)); } catch {}
}

export default function ProjectsDetailLivePluginsCard({
  t,
  livePluginsStatus = [],
  livePluginsBusy = false,
  onRefresh,
  onInstallPlugin,
}) {
  const plugins = Array.isArray(livePluginsStatus) ? livePluginsStatus : [];
  if (!plugins.length) return null;

  return (
    <div className="uu-card">
      <div className="uu-row uu-align-center uu-gap-8" style={TITLE_ROW_STYLE}>
        <strong className="uu-block-title">{t('projects.detail.blocks.livePlugins')}</strong>
        <button
          type="button"
          className="uu-btn"
          disabled={livePluginsBusy}
          onClick={onRefresh}
        >
          {t('projects.detail.livePlugins.refresh')}
        </button>
      </div>
      <div className="uu-col uu-gap-12">
        {plugins.map((status) => {
          const key = String(status?.key || status?.pluginName || '');
          const ready = status?.ready === true;
          const installed = status?.installedInProject === true;
          const packageAvailable = status?.packageAvailable === true;
          const canInstallOrUpdate = !ready || installed;
          const manuals = status?.manuals && typeof status.manuals === 'object' ? status.manuals : {};
          return (
            <div
              key={key}
              className="uu-card uu-col uu-gap-8"
              style={ready ? PLUGIN_READY_CARD_STYLE : PLUGIN_MISSING_CARD_STYLE}
            >
              <div className="uu-row wrap uu-align-center uu-gap-8">
                <strong className="uu-label w-160">{status?.displayName || key}</strong>
                <span
                  className="uu-value"
                  style={PLUGIN_STATE_TEXT_STYLE}
                >
                  {getPluginStateLabel(t, status)}
                </span>
              </div>

              {!packageAvailable ? (
                <div className="uu-row wrap uu-align-center uu-gap-8">
                  <div className="uu-label w-160">{t('projects.detail.livePlugins.packageLabel')}</div>
                  <div className="uu-value">
                    {t('projects.detail.livePlugins.compatibilityHint')}
                  </div>
                </div>
              ) : null}

              {status?.packageDir ? (
                <div className="uu-row wrap uu-align-center uu-gap-8">
                  <div className="uu-label w-160">{t('projects.detail.livePlugins.packagePathLabel')}</div>
                  <div className="uu-value uu-muted" style={WORD_BREAK_ALL_STYLE}>
                    {String(status.packageDir || '')}
                  </div>
                </div>
              ) : null}

              <div className="uu-row wrap uu-align-center uu-gap-8">
                <div className="uu-label w-160">{t('projects.detail.livePlugins.actionsLabel')}</div>
                <div className="uu-row uu-gap-8">
                  {canInstallOrUpdate ? (
                    <button
                      type="button"
                      className="uu-btn"
                      disabled={livePluginsBusy || !packageAvailable}
                      onClick={() => onInstallPlugin?.(key)}
                    >
                      {installed
                        ? t('projects.detail.livePlugins.update')
                        : t('projects.detail.livePlugins.install')}
                    </button>
                  ) : null}
                  {manuals.fr ? (
                    <button
                      type="button"
                      className="uu-btn"
                      onClick={() => openManual(manuals.fr)}
                    >
                      {t('projects.detail.livePlugins.manualFr')}
                    </button>
                  ) : null}
                  {manuals.en ? (
                    <button
                      type="button"
                      className="uu-btn"
                      onClick={() => openManual(manuals.en)}
                    >
                      {t('projects.detail.livePlugins.manualEn')}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
