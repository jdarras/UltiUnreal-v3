import React from 'react';

function useLaunchControlLifecycle({
  isVisible,
  projectsData,
  refreshHasStartLayout,
  canUseEditorLaunch,
  launchMode,
  setLaunchMode,
}) {
  React.useEffect(() => {
    const pid = String(projectsData?.activeId || projectsData?.activeName || '').trim();
    refreshHasStartLayout(pid);
  }, [projectsData?.activeId, projectsData?.activeName, refreshHasStartLayout]);

  React.useEffect(() => {
    if (!isVisible) return;
    const pid = String(projectsData?.activeId || projectsData?.activeName || '').trim();
    if (!pid) return;
    refreshHasStartLayout(pid);
  }, [isVisible, projectsData?.activeId, projectsData?.activeName, refreshHasStartLayout]);

  React.useEffect(() => {
    if (!canUseEditorLaunch && launchMode !== 'production') {
      setLaunchMode('production');
    }
  }, [canUseEditorLaunch, launchMode, setLaunchMode]);
}

export { useLaunchControlLifecycle };
