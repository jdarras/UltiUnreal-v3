const GRID_ONE_AUTO_AUTO_STYLE = { gridTemplateColumns: '1fr auto auto' };
const CHECK_ALIGN_CENTER_STYLE = { alignItems: 'center' };
const SCAN_ITEM_CONTENT_STYLE = { gap: '4px' };
const CARD_ROW_ALIGN_CENTER_STYLE = { alignItems: 'center' };

export default function ConfigProjectRootsSection({
  t,
  SectionTitleComponent,
  catalogStats,
  projectRoots = [],
  projectScanRecursive = false,
  onSetProjectScanRecursive,
  projectScanBusy = false,
  projectImportBusy = false,
  cleanedProjectRootsCount = 0,
  hasImportableProjectSelection = false,
  hasProjectScanResults = false,
  onAddProjectRootEntry,
  onProjectScan,
  onProjectImport,
  onHideScanResults,
  onUpdateProjectRootEntry,
  onBrowseProjectRootPath,
  onRemoveProjectRootEntry,
  selectableScanCount = 0,
  allSelectableSelected = false,
  onToggleAllScanRows,
  hideImportedProjects = false,
  onSetHideImportedProjects,
  visibleScanRows = [],
  onToggleScanRowSelection,
}) {
  const titleNode = SectionTitleComponent
    ? (
        <SectionTitleComponent>
          {t('setup.server.projectRoots.title')}
        </SectionTitleComponent>
      )
    : (
        <h3 className="uu-h3 uu-block-title">
          {t('setup.server.projectRoots.title')}
        </h3>
      );

  return (
    <div className="uu-section mt-16">
      <div className="uu-config-stack">
        {titleNode}
        <div className="uu-muted">
          {t('config.catalog.projectsSummary', {
            count: catalogStats.projectsCount,
            date: catalogStats.projectsLastImport || '—',
          })}
        </div>

        <div className="uu-row uu-gap-8">
          <button
            type="button"
            className="uu-btn"
            onClick={() => onAddProjectRootEntry?.()}
          >
            {t('setup.server.projectRoots.add')}
          </button>
          <label className="uu-check" style={CHECK_ALIGN_CENTER_STYLE}>
            <input
              type="checkbox"
              checked={!!projectScanRecursive}
              onChange={(e) => onSetProjectScanRecursive?.(!!e.target.checked)}
            />
            {t('setup.server.projectRoots.recursive')}
          </label>
          <button
            type="button"
            className="uu-btn"
            onClick={() => onProjectScan?.()}
            disabled={projectScanBusy || projectImportBusy || cleanedProjectRootsCount === 0}
          >
            {projectScanBusy
              ? t('common.loading')
              : t('setup.server.projectRoots.scanButton')}
          </button>
          {hasImportableProjectSelection ? (
            <button
              type="button"
              className="uu-btn"
              onClick={() => onProjectImport?.()}
              disabled={projectImportBusy || projectScanBusy}
            >
              {projectImportBusy
                ? t('common.loading')
                : t('setup.server.projectRoots.importButton')}
            </button>
          ) : null}
          {hasProjectScanResults ? (
            <button
              type="button"
              className="uu-btn"
              onClick={() => onHideScanResults?.()}
            >
              {t('setup.server.projectRoots.hideList')}
            </button>
          ) : null}
        </div>

        {projectRoots.length === 0 ? (
          <div className="uu-muted">
            {t('setup.server.projectRoots.empty')}
          </div>
        ) : (
          projectRoots.map((root, idx) => (
            <div key={`project-root-${idx}`} className="uu-grid-field">
              <label className="uu-label w-160">
                {t('setup.server.projectRoots.pathLabel')}
              </label>
              <div className="uu-grid-2" style={GRID_ONE_AUTO_AUTO_STYLE}>
                <input
                  className="uu-input"
                  value={root}
                  onChange={(e) => {
                    onUpdateProjectRootEntry?.(idx, e.target.value);
                  }}
                  placeholder="D:\\Unreal_Projects"
                />
                <button
                  type="button"
                  className="uu-btn"
                  onClick={() => {
                    void onBrowseProjectRootPath?.(idx);
                  }}
                >
                  {t('common.browse')}
                </button>
                <button
                  type="button"
                  className="uu-btn"
                  onClick={() => onRemoveProjectRootEntry?.(idx)}
                >
                  {t('common.delete')}
                </button>
              </div>
            </div>
          ))
        )}

        {hasProjectScanResults ? (
          <>
            <div className="uu-row uu-gap-8">
              <button
                type="button"
                className="uu-btn"
                disabled={selectableScanCount === 0}
                onClick={() => onToggleAllScanRows?.()}
              >
                {allSelectableSelected
                  ? (t('setup.server.projectRoots.unselectAll'))
                  : (t('setup.server.projectRoots.selectAll'))}
              </button>
              <label className="uu-check" style={CHECK_ALIGN_CENTER_STYLE}>
                <input
                  type="checkbox"
                  checked={!!hideImportedProjects}
                  onChange={(e) => onSetHideImportedProjects?.(!!e.target.checked)}
                />
                {t('setup.server.projectRoots.hideImported')}
              </label>
            </div>
            <div className="uu-list">
              {visibleScanRows.map(({ item, index }) => (
                <div key={item.__rowKey} className="uu-card uu-row" style={CARD_ROW_ALIGN_CENTER_STYLE}>
                  <input
                    type="checkbox"
                    checked={!!item.selected}
                    disabled={!!item.exists}
                    onChange={(e) => {
                      onToggleScanRowSelection?.(index, !!e.target.checked);
                    }}
                  />
                  <div className="uu-col" style={SCAN_ITEM_CONTENT_STYLE}>
                    <div className="uu-item-title">{item.name || '—'}</div>
                    <div className="uu-muted">{item.uprojectPath}</div>
                  </div>
                  {item.exists ? (
                    <div className="uu-row uu-row-gap4 ml-auto" title={t('setup.server.projectRoots.alreadyImported')}>
                      <span className="uu-dot ok" />
                      <span className="uu-muted">{t('setup.server.projectRoots.alreadyImported')}</span>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
