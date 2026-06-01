import React, { Suspense } from 'react';

const ProjectsActiveBanner = React.lazy(() => import('./ProjectsActiveBanner'));
const ProjectsClientSection = React.lazy(() => import('./ProjectsClientSection'));
const ProjectsServerSection = React.lazy(() => import('./ProjectsServerSection'));

export default function ProjectsMainView({
  role,
  showProjectActivation,
  lazyBlockFallback,
  activeBannerProps,
  serverSectionProps,
  clientSectionProps,
  confirmDialogNode,
}) {
  return (
    <div className="uu-page uu-page-compact">
      {role === 'server' && showProjectActivation ? (
        <Suspense fallback={lazyBlockFallback}>
          <ProjectsActiveBanner {...activeBannerProps} />
        </Suspense>
      ) : null}

      {role === 'server' ? (
        <Suspense fallback={lazyBlockFallback}>
          <ProjectsServerSection {...serverSectionProps} />
        </Suspense>
      ) : (
        <Suspense fallback={lazyBlockFallback}>
          <ProjectsClientSection {...clientSectionProps} />
        </Suspense>
      )}

      {confirmDialogNode}
    </div>
  );
}
