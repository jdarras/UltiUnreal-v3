const TITLE_ROW_STYLE = { marginBottom: '12px' };

export default function ProjectsDetailRenderPresetsCard({
  t,
  renderPresetsList = [],
}) {
  const hasRenderPresets = renderPresetsList.length > 0;

  return (
    <div className="uu-card">
      <div className="uu-row uu-align-center uu-gap-8 uu-row-nowrap" style={TITLE_ROW_STYLE}>
        <strong className="uu-block-title">{t('projects.detail.blocks.renderPresets')}</strong>
        {!hasRenderPresets ? (
          <div className="uu-muted">{t('projects.detail.renderPresets.noInfo')}</div>
        ) : null}
      </div>
      <div className="uu-row wrap">
        <div className="uu-label w-160">{t('projects.detail.renderPresets.count')}</div>
        <div className="uu-value">{renderPresetsList.length}</div>
      </div>
      {hasRenderPresets ? (
        <div className="uu-row wrap">
          <div className="uu-label w-160" />
          <div className="uu-value uu-small mt-4">
            {renderPresetsList.map((entry, idx) => {
              const assetPath = String(entry?.assetPath || '').trim();
              const relativePath = String(entry?.relativePath || '').trim();
              const name = String(entry?.name || '').trim();
              const key = assetPath || relativePath || `${name}-${idx}`;
              return (
                <div key={`project-render-preset-${key}`}>
                  {assetPath || relativePath || name || '-'}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
