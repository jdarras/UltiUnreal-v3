// app/hooks/usePostprodApiCallbacks.js
import { usePostprodUsersApi } from "./usePostprodUsersApi";
import { usePostprodAuditApi } from "./usePostprodAuditApi";
import { usePostprodContentApi } from "./usePostprodContentApi";
import { usePostprodRendersApi } from "./usePostprodRendersApi";

function usePostprodApiCallbacks({
  postprodAuth,
  t,
  showNotice,
  postprodCanManageUsers,
  postprodCanManageRoles,
  postprodAudit,
  postprodWrcCacheNoticeRef,
  postprodRendersRequestSeqRef,
  refreshPostprodProjectWrcSnapshots,
  current,
  hostsCfg,
  localIp,
  safeIdentity,
  setPostprodUsers,
  setPostprodMyActivity,
  setPostprodAudit,
  setPostprodRenderHealthAuditMaintenance,
  setPostprodRoles,
  setPostprodTasks,
  setPostprodProjects,
  setPostprodResources,
  setPostprodTaskCatalog,
  setPostprodRenderProjectCatalog,
  setPostprodRenders,
  setPostprodUserAlerts,
  setPostprodRenderTemplates,
  setPostprodRenderForms,
  setPostprodRenderHealth,
}) {
  const usersApi = usePostprodUsersApi({
    postprodAuth,
    postprodCanManageUsers,
    postprodCanManageRoles,
    t,
    setPostprodUsers,
    setPostprodRoles,
  });

  const auditApi = usePostprodAuditApi({
    postprodAuth,
    postprodCanManageRoles,
    postprodAudit,
    t,
    showNotice,
    setPostprodMyActivity,
    setPostprodAudit,
    setPostprodRenderHealthAuditMaintenance,
  });

  const contentApi = usePostprodContentApi({
    postprodAuth,
    t,
    showNotice,
    postprodWrcCacheNoticeRef,
    refreshPostprodProjectWrcSnapshots,
    setPostprodTasks,
    setPostprodProjects,
    setPostprodResources,
    setPostprodTaskCatalog,
    setPostprodRenderProjectCatalog,
  });

  const rendersApi = usePostprodRendersApi({
    postprodAuth,
    t,
    showNotice,
    postprodRendersRequestSeqRef,
    current,
    hostsCfg,
    localIp,
    safeIdentity,
    setPostprodRenders,
    setPostprodUserAlerts,
    setPostprodRenderTemplates,
    setPostprodRenderForms,
    setPostprodRenderHealth,
  });

  return {
    ...usersApi,
    ...auditApi,
    ...contentApi,
    ...rendersApi,
  };
}

export { usePostprodApiCallbacks };
