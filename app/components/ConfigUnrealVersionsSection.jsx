const GRID_ONE_AUTO_STYLE = { gridTemplateColumns: '1fr auto' };
const VERSION_ROW_GRID_STYLE = { gridTemplateColumns: '140px 1fr', gap: '8px' };
const VERSION_ACTIONS_ROW_STYLE = { gridColumn: '1 / -1', flexWrap: 'nowrap' };

export default function ConfigUnrealVersionsSection({
  t,
  SectionTitleComponent,
  canUseEditorLaunch = false,
  showUnrealLaunchButtons = false,
  onToggleShowUnrealLaunchButtons,
  onAddVersionEntry,
  versions = [],
  onUpdateVersionEntry,
  onBrowseVersionPath,
  onLaunchVersion,
  onRemoveVersionEntry,
}) {
  const titleNode = SectionTitleComponent
    ? (
        <SectionTitleComponent>
          {t('config.unreal.sectionTitle')}
        </SectionTitleComponent>
      )
    : (
        <h3 className="uu-h3 uu-block-title">
          {t('config.unreal.sectionTitle')}
        </h3>
      );

  return (
    <div className="uu-section mt-16">
      {titleNode}

      {canUseEditorLaunch ? (
        <label className="uu-check mt-8">
          <input
            type="checkbox"
            checked={!!showUnrealLaunchButtons}
            onChange={(e) => onToggleShowUnrealLaunchButtons?.(!!e.target.checked)}
          />
          {t('config.unreal.showLaunchButtons')}
        </label>
      ) : null}

      <div className="uu-row mt-8">
        <button
          type="button"
          className="uu-btn"
          onClick={() => onAddVersionEntry?.()}
        >
          {t('config.unreal.addVersion')}
        </button>
      </div>

      {versions.map((v, idx) => (
        <div
          key={idx}
          className="uu-grid-2 uu-maxw-720 mt-12"
          style={VERSION_ROW_GRID_STYLE}
        >
          <div className="uu-grid-field">
            <label className="uu-label">{t('config.unreal.versionLabel')}</label>
            <input
              className="uu-input"
              value={v.name}
              onChange={(e) => {
                onUpdateVersionEntry?.(idx, { name: e.target.value });
              }}
              placeholder="5.7"
            />
          </div>
          <div className="uu-grid-field">
            <label className="uu-label">{t('config.unreal.pathLabel')}</label>
            <div className="uu-grid-2" style={GRID_ONE_AUTO_STYLE}>
              <input
                className="uu-input"
                value={v.path}
                onChange={(e) => {
                  onUpdateVersionEntry?.(idx, { path: e.target.value });
                }}
                placeholder="C:\\Program Files\\Epic Games\\UE_5.7\\Engine\\Binaries\\Win64\\UnrealEditor.exe"
              />
              <button
                type="button"
                className="uu-btn"
                onClick={() => { void onBrowseVersionPath?.(idx, v?.path); }}
              >
                {t('common.browse')}
              </button>
            </div>
          </div>
          <div className="uu-row uu-gap-8" style={VERSION_ACTIONS_ROW_STYLE}>
            {canUseEditorLaunch ? (
              <button
                type="button"
                className="uu-btn"
                onClick={() => onLaunchVersion?.(v?.name)}
              >
                {t('config.unreal.launchVersion')}
              </button>
            ) : null}
            <button
              type="button"
              className="uu-btn"
              onClick={() => onRemoveVersionEntry?.(idx)}
            >
              {t('common.delete')}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
