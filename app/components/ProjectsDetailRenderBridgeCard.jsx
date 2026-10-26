const TITLE_ROW_STYLE = { marginBottom: '12px' };
const RENDER_BRIDGE_STATE_READY_STYLE = { color: 'var(--uu-ok)' };
const RENDER_BRIDGE_STATE_DEFAULT_STYLE = { color: 'var(--uu-color-text)' };
const RENDER_BRIDGE_STATE_ERROR_STYLE = { color: 'var(--uu-error)' };
const WORD_BREAK_ALL_STYLE = { wordBreak: 'break-all' };

export default function ProjectsDetailRenderBridgeCard({
  t,
  renderBridgeReady = false,
  renderBridgeUpdateAvailable = false,
  renderBridgeStateLabel = '',
  renderBridgePackageAvailable = false,
  renderBridgeStatus = null,
  renderBridgeBusy = false,
  renderBridgeInstalled = false,
  onRefresh,
  onInstallOrUpdate,
}) {
  return (
    <div className="uu-card">
      <div className="uu-row uu-align-center uu-gap-8" style={TITLE_ROW_STYLE}>
        <strong className="uu-block-title">{t('projects.detail.blocks.renderBridge')}</strong>
      </div>
      <div className="uu-col uu-gap-10">
        <div className="uu-row wrap uu-align-center uu-gap-8">
          <div className="uu-label w-160">{t('projects.detail.renderBridge.stateLabel')}</div>
          <div
            className="uu-value"
            style={renderBridgeReady && !renderBridgeUpdateAvailable ? RENDER_BRIDGE_STATE_READY_STYLE : RENDER_BRIDGE_STATE_DEFAULT_STYLE}
          >
            {renderBridgeStateLabel}
          </div>
        </div>
        {!renderBridgePackageAvailable ? (
          <div className="uu-row wrap uu-align-center uu-gap-8">
            <div className="uu-label w-160">{t('projects.detail.renderBridge.packageLabel')}</div>
            <div className="uu-value" style={RENDER_BRIDGE_STATE_ERROR_STYLE}>
              {t('projects.detail.renderBridge.compatibilityHint')}
            </div>
          </div>
        ) : null}
        {renderBridgeStatus?.packageDir ? (
          <div className="uu-row wrap uu-align-center uu-gap-8">
            <div className="uu-label w-160">{t('projects.detail.renderBridge.packagePathLabel')}</div>
            <div className="uu-value uu-muted" style={WORD_BREAK_ALL_STYLE}>
              {String(renderBridgeStatus.packageDir || '')}
            </div>
          </div>
        ) : null}
        {/* Actions : plugin absent, non activé, ou différent de la version fournie. */}
        {!renderBridgeReady || renderBridgeUpdateAvailable ? (
          <div className="uu-row wrap uu-align-center uu-gap-8">
            <div className="uu-label w-160">{t('projects.detail.renderBridge.actionsLabel')}</div>
            <div className="uu-row uu-gap-8">
              <button
                type="button"
                className="uu-btn"
                disabled={renderBridgeBusy}
                onClick={onRefresh}
              >
                {t('projects.detail.renderBridge.refresh')}
              </button>
              <button
                type="button"
                className="uu-btn"
                disabled={renderBridgeBusy || !renderBridgePackageAvailable}
                onClick={onInstallOrUpdate}
              >
                {renderBridgeInstalled
                  ? t('projects.detail.renderBridge.update')
                  : t('projects.detail.renderBridge.install')}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
