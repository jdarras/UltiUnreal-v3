import { safeStr } from '../synchronisationHelpers';

function normalizeSyncHosts(rawHosts) {
  return (Array.isArray(rawHosts) ? rawHosts : []).filter(
    (host) =>
      host &&
      typeof host === 'object' &&
      safeStr(host.ip || host.address, '')
  );
}

function normalizeSyncProjectsData(rawProjects) {
  if (!rawProjects || typeof rawProjects !== 'object') return null;

  let activeName = '';
  if (typeof rawProjects.activeName === 'string') {
    activeName = rawProjects.activeName;
  } else if (Array.isArray(rawProjects.projects)) {
    const activeProject = rawProjects.projects.find(
      (project) => project && (project.active || project.isActive)
    );
    if (activeProject && typeof activeProject.name === 'string') {
      activeName = activeProject.name;
    }
  }

  return {
    activeId:
      typeof rawProjects.activeId === 'string' ||
      typeof rawProjects.activeId === 'number'
        ? rawProjects.activeId
        : undefined,
    activeName: activeName || '',
    projects: Array.isArray(rawProjects.projects) ? rawProjects.projects : [],
    activeByHost:
      rawProjects.activeByHost &&
      typeof rawProjects.activeByHost === 'object'
        ? rawProjects.activeByHost
        : {},
  };
}

export {
  normalizeSyncHosts,
  normalizeSyncProjectsData,
};
