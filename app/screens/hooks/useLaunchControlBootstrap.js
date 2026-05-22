import React from 'react';
import { readIdentity } from '../../utils/identity';
import { createT } from '../../i18n';

function useLaunchControlBootstrap({
  canOpenProjectDetail,
  projectsData,
}) {
  const identity = React.useMemo(readIdentity, []);
  const localIp = String(identity?.localIp || '').trim();
  const lang = String(identity?.lang || 'fr').trim();
  const t = React.useMemo(() => createT(lang), [lang]);
  const sortLocale = lang || 'fr';

  const editActiveProject = React.useCallback(() => {
    if (!canOpenProjectDetail) return;
    const projectId = String(projectsData?.activeId || '').trim();
    if (!projectId) return;
    if (window.goToProjectDetail) {
      window.goToProjectDetail(projectId);
    }
  }, [canOpenProjectDetail, projectsData]);

  return {
    localIp,
    t,
    sortLocale,
    editActiveProject,
  };
}

export { useLaunchControlBootstrap };
