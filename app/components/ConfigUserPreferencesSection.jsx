const INLINE_FIELD_ROW_STYLE = { display: 'flex', alignItems: 'center', gap: '10px' };
const INLINE_FIELD_LABEL_STYLE = { width: '170px', minWidth: '170px', margin: 0 };
const FLEX_ONE_STYLE = { flex: 1 };

export default function ConfigUserPreferencesSection({
  t,
  SectionTitleComponent,
  interfaceLanguageForUser = 'fr',
  userPrefsSaving = false,
  onChangeInterfaceLanguage,
  showFabResourcesForUser = false,
  onToggleFabResourcesForUser,
}) {
  const titleNode = SectionTitleComponent
    ? (
        <SectionTitleComponent noMargin>
          {t('config.userPreferences.title')}
        </SectionTitleComponent>
      )
    : (
        <h3 className="uu-h3 uu-block-title">
          {t('config.userPreferences.title')}
        </h3>
      );

  return (
    <div className="uu-section">
      <div className="uu-config-stack">
        {titleNode}
        <div className="uu-grid-field uu-maxw-420 mt-12" style={INLINE_FIELD_ROW_STYLE}>
          <label className="uu-label" style={INLINE_FIELD_LABEL_STYLE}>
            {t('config.lang.label')}
          </label>
          <select
            className="uu-input"
            style={FLEX_ONE_STYLE}
            value={interfaceLanguageForUser}
            disabled={userPrefsSaving}
            onChange={(e) => {
              void onChangeInterfaceLanguage?.(e.target.value);
            }}
          >
            <option value="fr">{t('common.lang.fr')}</option>
            <option value="en">{t('common.lang.en')}</option>
          </select>
        </div>
        <label className="uu-check">
          <input
            type="checkbox"
            checked={!!showFabResourcesForUser}
            disabled={userPrefsSaving}
            onChange={(e) => {
              void onToggleFabResourcesForUser?.(e.target.checked);
            }}
          />
          {t('config.userPreferences.showFabResources')}
        </label>
      </div>
    </div>
  );
}
