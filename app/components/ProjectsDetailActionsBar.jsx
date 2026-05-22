export default function ProjectsDetailActionsBar({
  t,
  detailIsNew = false,
  canManageUnrealProjects = false,
  showProjectActivation = true,
  isActiveDetail = false,
  canCreateTaskFromProject = false,
  detailMeta = null,
  isAutoRenderUsage,
  onCreateProject,
  onActivateProject,
  onStartIntegration,
  onCreateTaskFromProject,
  onDeleteProject,
}) {
  return (
    <div className="uu-section">
      <div className="uu-row uu-gap-8">
        {detailIsNew && canManageUnrealProjects ? (
          <button
            className="uu-btn"
            onClick={onCreateProject}
          >
            {t('projects.detail.buttons.add')}
          </button>
        ) : null}
        {detailIsNew ? null : (
          <>
            {canManageUnrealProjects && showProjectActivation ? (
              <button
                className={`uu-btn ${isActiveDetail ? 'prod-toggle-active' : ''}`}
                onClick={onActivateProject}
                disabled={isActiveDetail}
              >
                {isActiveDetail ? t('projects.server.card.active') : t('projects.server.card.setActive')}
              </button>
            ) : null}
            {canManageUnrealProjects && (showProjectActivation ? isActiveDetail : true) ? (
              <button
                className={showProjectActivation ? 'uu-btn prod-toggle-active' : 'uu-btn'}
                onClick={onStartIntegration}
              >
                {t('launch.buttons.start')}
              </button>
            ) : null}
            {canCreateTaskFromProject && isAutoRenderUsage(detailMeta?.usageMode, detailMeta?.status) ? (
              <button
                className="uu-btn"
                onClick={onCreateTaskFromProject}
              >
                {t('projects.actions.createTask')}
              </button>
            ) : null}
            {canManageUnrealProjects ? (
              <button className="uu-btn" onClick={onDeleteProject}>{t('projects.server.card.delete')}</button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
