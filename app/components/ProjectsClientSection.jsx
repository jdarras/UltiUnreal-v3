import React, { Suspense } from 'react';

const ProjectsActiveBanner = React.lazy(() => import('./ProjectsActiveBanner'));
const ProjectsClientAssociationPanel = React.lazy(() => import('./ProjectsClientAssociationPanel'));

export default function ProjectsClientSection({
  t,
  fallback,
  showProjectActivation,
  projectsLoading,
  clientActiveId,
  clientActiveName,
  clientAssocPath,
  clientSyncEnabled,
  onAssociate,
}) {
  return (
    <>
      {showProjectActivation ? (
        <Suspense fallback={fallback}>
          <ProjectsActiveBanner
            t={t}
            role="client"
            canOpenProjectDetails={false}
            activeId=""
            activeName=""
            clientActiveId={clientActiveId}
            clientActiveName={clientActiveName}
            projectsLoading={projectsLoading}
          />
        </Suspense>
      ) : null}

      <Suspense fallback={fallback}>
        <ProjectsClientAssociationPanel
          t={t}
          clientActiveName={clientActiveName}
          clientActiveId={clientActiveId}
          clientAssocPath={clientAssocPath}
          clientSyncEnabled={clientSyncEnabled}
          onAssociate={onAssociate}
        />
      </Suspense>
    </>
  );
}
