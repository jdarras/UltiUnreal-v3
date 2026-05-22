export default function ProjectsActiveBanner({
  t,
  role,
  canOpenProjectDetails,
  activeId,
  activeName,
  clientActiveId,
  clientActiveName,
  projectsLoading,
  onOpenDetails,
}) {
  const isServer = role === 'server';
  const displayName = isServer ? activeName : clientActiveName;
  const displayId = isServer ? activeId : clientActiveId;

  return (
    <div className="uu-section">
      <div className="uu-kv">
        {isServer && canOpenProjectDetails && activeId ? (
          <button className="uu-btn" onClick={() => onOpenDetails(activeId)}>
            {t('projects.actions.edit')}
          </button>
        ) : null}
        <span className="uu-k">{t('projects.active.label')}</span>
        <span className="uu-v">
          {projectsLoading ? t('projects.active.loading') : (displayName || t('projects.active.none'))}{' '}
          {displayId ? <span className="uu-id-tag uu-muted">[{displayId}]</span> : null}
        </span>
      </div>
    </div>
  );
}
