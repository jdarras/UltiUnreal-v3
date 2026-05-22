import React, { Suspense } from 'react';

const ProjectsListView = React.lazy(() => import('./ProjectsListView'));
const ProjectsCardsView = React.lazy(() => import('./ProjectsCardsView'));
const ProjectsThumbsView = React.lazy(() => import('./ProjectsThumbsView'));

export default function ProjectsContentView({
  t,
  projectsCount,
  projectsLoading,
  viewMode,
  fallback,
  projectViewCommonProps,
  integrationMsg,
  removeOne,
  sortMode,
  sortDir,
  onSort,
}) {
  if (projectsCount === 0) {
    return (
      <div className="uu-muted">
        {projectsLoading ? t('projects.detail.loading') : t('projects.server.empty')}
      </div>
    );
  }

  if (viewMode === 'cards') {
    return (
      <Suspense fallback={fallback}>
        <ProjectsCardsView
          {...projectViewCommonProps}
          integrationMsg={integrationMsg}
          removeOne={removeOne}
        />
      </Suspense>
    );
  }

  if (viewMode === 'list') {
    return (
      <Suspense fallback={fallback}>
        <ProjectsListView
          {...projectViewCommonProps}
          sortMode={sortMode}
          sortDir={sortDir}
          onSort={onSort}
        />
      </Suspense>
    );
  }

  if (viewMode === 'thumbs') {
    return (
      <Suspense fallback={fallback}>
        <ProjectsThumbsView
          {...projectViewCommonProps}
        />
      </Suspense>
    );
  }

  return null;
}
