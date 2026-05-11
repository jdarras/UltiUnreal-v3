// app/hooks/usePostprodEntityMutations.js
import { usePostprodUserRoleMutations } from "./usePostprodUserRoleMutations";
import { usePostprodTaskMutations } from "./usePostprodTaskMutations";
import { usePostprodRenderTemplateMutations } from "./usePostprodRenderTemplateMutations";

function usePostprodEntityMutations({
  postprodAuth,
  t,
  showNotice,
  postprodCanManageUsers,
  postprodCanManageRoles: _postprodCanManageRoles,
  postprodCanManageProjectPermissions,
  postprodCanBanUsers,
  postprodCanManageRenderTemplates,
  applyUserLanguageToIdentity,
  loadPostprodUsers,
  loadPostprodRoles,
  loadPostprodTasks,
  loadPostprodRenderTemplates,
  loadPostprodRenderForms,
  setPostprodProfile,
  setPostprodAuth,
  setPostprodUsers,
  setPostprodRoles,
  setPostprodTasks,
  setPostprodRenderTemplates,
  setPostprodRenderForms,
}) {
  const userRoleApi = usePostprodUserRoleMutations({
    postprodAuth,
    t,
    showNotice,
    postprodCanManageUsers,
    postprodCanManageProjectPermissions,
    postprodCanBanUsers,
    applyUserLanguageToIdentity,
    loadPostprodUsers,
    loadPostprodRoles,
    setPostprodProfile,
    setPostprodAuth,
    setPostprodUsers,
    setPostprodRoles,
  });

  const taskApi = usePostprodTaskMutations({
    postprodAuth,
    t,
    showNotice,
    loadPostprodTasks,
    setPostprodTasks,
  });

  const templateApi = usePostprodRenderTemplateMutations({
    postprodAuth,
    t,
    showNotice,
    postprodCanManageRenderTemplates,
    loadPostprodRenderTemplates,
    loadPostprodRenderForms,
    setPostprodRenderTemplates,
    setPostprodRenderForms,
  });

  return {
    ...userRoleApi,
    ...taskApi,
    ...templateApi,
  };
}

export { usePostprodEntityMutations };
