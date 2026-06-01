const TITLE_ROW_STYLE = { marginBottom: '12px' };

export default function ProjectsDetailPluginsCard({
  t,
  pluginsList = [],
}) {
  if (!pluginsList.length) return null;

  return (
    <div className="uu-card">
      <div className="uu-row uu-align-center uu-gap-8" style={TITLE_ROW_STYLE}>
        <strong className="uu-block-title">{t('projects.detail.blocks.plugins')}</strong>
      </div>
      <div className="uu-row wrap">
        <div className="uu-label w-160" />
        <div className="uu-value uu-muted">
          {pluginsList.map((pl, idx) => (
            <div key={idx}>
              {pl.name} {pl.marketplace ? t('projects.detail.plugins.marketplace') : ''}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
