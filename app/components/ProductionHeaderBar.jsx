export default function ProductionHeaderBar({
  t,
  loading,
  activeName,
  activeId,
  onEditActiveProject,
  editMode,
  canManageLayouts,
  presetReloadNeeded,
  onLoadPreset,
  target,
  onEnterEditMode,
  onEnterLiveMode,
}) {
  return (
    <div className="uu-section uu-section-prod-header">
      <div className="uu-toolbar">
        <div className="uu-kv">
          {activeId ? (
            <button className="uu-btn" onClick={onEditActiveProject}>
              {t('projects.actions.edit')}
            </button>
          ) : null}
          <span className="uu-k">{t('production.active.label')}</span>
          <span className="uu-v">
            {loading ? t('production.active.loading') : (activeName || t('production.active.none'))}{' '}
            {activeId ? <span className="uu-id-tag uu-muted">[{activeId}]</span> : null}
          </span>
        </div>

        <div className="uu-toolbar-actions prod-toolbar-actions">
          {editMode && (
            <button
              className={`uu-btn ${presetReloadNeeded ? 'uu-btn-danger' : ''}`}
              onClick={onLoadPreset}
              disabled={!target.ip || !target.port || !target.preset}
              title={
                presetReloadNeeded
                  ? t('production.preset.reloadNeededTooltip')
                  : t('production.preset.loadTooltip')
              }
            >
              {t('production.preset.loadButton')}
            </button>
          )}

          <div className="uu-toggle-mode prod-toggle-mode" title={t('production.mode.tooltip')}>
            <button
              className={`uu-btn ${editMode ? 'prod-toggle-active' : ''}`}
              disabled={canManageLayouts !== true}
              onClick={onEnterEditMode}
            >
              {t('production.mode.edit')}
            </button>
            <button
              className={`uu-btn ${!editMode ? 'prod-toggle-active' : ''}`}
              onClick={onEnterLiveMode}
            >
              {t('production.mode.live')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
