import { useCallback } from "react";
import {
  postprodUpdateMe,
  postprodAuthMe,
  postprodCreateUser,
  postprodUpdateUser,
  postprodDeleteUser,
  postprodUpdateUserProjectPermissions,
  postprodListUserProjectPermissions,
  postprodListUserActivity,
  postprodPurgeUserActivity,
  postprodCreateRole,
  postprodUpdateRole,
  postprodDeleteRole,
} from "../utils/agent";
import {
  resolvePostprodUsersError,
  resolvePostprodRolesError,
} from "../utils/postprodErrorHelpers";
import { writePostprodAuth } from "../utils/postprodAuthHelpers";

function usePostprodUserRoleMutations({
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
}) {
  const refreshPostprodSessionUser = useCallback(async () => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return null;
    try {
      const me = await postprodAuthMe(token);
      const meUser = me?.user && typeof me.user === 'object' ? me.user : null;
      if (!meUser) return null;
      setPostprodAuth((prev) => {
        const next = {
          ...prev,
          user: meUser,
          expiresAt: String(me?.session?.expiresAt || prev.expiresAt || '').trim(),
          error: '',
          busy: false,
          hydrated: true,
        };
        writePostprodAuth({
          token: String(next.token || ''),
          user: next.user,
          expiresAt: String(next.expiresAt || ''),
        });
        return next;
      });
      applyUserLanguageToIdentity(meUser);
      return meUser;
    } catch {
      return null;
    }
  }, [postprodAuth.token, applyUserLanguageToIdentity]);

  const handlePostprodUpdateMe = useCallback(async (payload = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return false;
    setPostprodProfile({ saving: true, error: '' });
    try {
      const res = await postprodUpdateMe(token, payload);
      const user = res?.user && typeof res.user === 'object' ? res.user : null;
      if (!user) {
        throw Object.assign(new Error('invalid_session'), { code: 'invalid_session', status: 401 });
      }
      setPostprodAuth((prev) => {
        const next = {
          ...prev,
          user,
          busy: false,
          error: '',
          hydrated: true,
        };
        writePostprodAuth({
          token: String(next.token || ''),
          user: next.user,
          expiresAt: String(next.expiresAt || ''),
        });
        return next;
      });
      applyUserLanguageToIdentity(user);
      setPostprodProfile({ saving: false, error: '' });
      if (postprodCanManageUsers) {
        await loadPostprodUsers();
      }
      showNotice(t('postprod.profile.msg.updated'), 'ok');
      return true;
    } catch (e) {
      setPostprodProfile({
        saving: false,
        error: resolvePostprodUsersError(e, t),
      });
      return false;
    }
  }, [postprodAuth.token, postprodCanManageUsers, loadPostprodUsers, showNotice, t, applyUserLanguageToIdentity]);

  const handlePostprodCreateUser = useCallback(async (payload = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return false;
    setPostprodUsers((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      await postprodCreateUser(token, payload);
      await loadPostprodUsers();
      showNotice(t('postprod.users.msg.created'), 'ok');
      return true;
    } catch (e) {
      setPostprodUsers((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodUsersError(e, t),
      }));
      return false;
    }
  }, [postprodAuth.token, loadPostprodUsers, showNotice, t]);

  const handlePostprodUpdateUser = useCallback(async (userId, payload = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return false;
    setPostprodUsers((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await postprodUpdateUser(token, userId, payload);
      await loadPostprodUsers();

      const targetId = Number(res?.user?.id || userId || 0);
      const selfId = Number(postprodAuth.user?.id || 0);
      if (targetId > 0 && selfId > 0 && targetId === selfId) {
        try {
          const me = await postprodAuthMe(token);
          const meUser = me?.user && typeof me.user === 'object' ? me.user : null;
          if (meUser) {
            setPostprodAuth((prev) => ({
              ...prev,
              user: meUser,
              expiresAt: String(me?.session?.expiresAt || prev.expiresAt || '').trim(),
              error: '',
              busy: false,
              hydrated: true,
            }));
            applyUserLanguageToIdentity(meUser);
          }
        } catch {}
      }

      showNotice(t('postprod.users.msg.updated'), 'info');
      return true;
    } catch (e) {
      setPostprodUsers((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodUsersError(e, t),
      }));
      return false;
    }
  }, [postprodAuth.token, postprodAuth.user?.id, loadPostprodUsers, showNotice, t, applyUserLanguageToIdentity]);

  const handlePostprodDeleteUser = useCallback(async (userId) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return false;
    setPostprodUsers((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      await postprodDeleteUser(token, userId);
      await loadPostprodUsers();
      showNotice(t('postprod.users.msg.deleted'), 'info');
      return true;
    } catch (e) {
      setPostprodUsers((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodUsersError(e, t),
      }));
      return false;
    }
  }, [postprodAuth.token, loadPostprodUsers, showNotice, t]);

  const handlePostprodUpdateUserProjectPermissions = useCallback(async (userId, projectRef, payload = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return null;
    if (!postprodCanManageProjectPermissions) {
      const err = new Error(resolvePostprodUsersError({ code: 'forbidden_project_permissions_manage' }, t));
      err.code = 'forbidden_project_permissions_manage';
      throw err;
    }
    const normalizedPayload = {
      isReferent: payload?.isReferent === true,
      canValidate: payload?.canValidate === true,
      canSync: payload?.canSync === true,
      canLaunchRender: payload?.canLaunchRender === true,
      canEditData: payload?.canEditData === true,
    };
    if (normalizedPayload.canSync) {
      normalizedPayload.isReferent = true;
    }
    try {
      const res = await postprodUpdateUserProjectPermissions(
        token,
        userId,
        projectRef,
        normalizedPayload
      );
      showNotice(t('postprod.users.permissions.msg.updated'), 'ok');
      const permissions = res?.projectPermissions && typeof res.projectPermissions === 'object'
        ? res.projectPermissions
        : null;
      return permissions;
    } catch (e) {
      const err = new Error(resolvePostprodUsersError(e, t));
      err.code = e?.code || '';
      throw err;
    }
  }, [postprodAuth.token, postprodCanManageProjectPermissions, showNotice, t]);

  const handlePostprodToggleUserActive = useCallback(async (userId, isActive) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return;
    if (!postprodCanBanUsers) return;
    setPostprodUsers((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      await postprodUpdateUser(token, userId, { isActive });
      await loadPostprodUsers();
      showNotice(
        isActive ? t('postprod.users.msg.activated') : t('postprod.users.msg.deactivated'),
        'info'
      );
    } catch (e) {
      setPostprodUsers((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodUsersError(e, t),
      }));
    }
  }, [postprodAuth.token, postprodCanBanUsers, loadPostprodUsers, showNotice, t]);

  const handlePostprodLoadUserActivity = useCallback(async (userId, limit = 50, options = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return { ok: true, activities: [], summary: { total: 0, actions: {}, projects: [] } };
    return await postprodListUserActivity(token, userId, limit, options);
  }, [postprodAuth.token]);

  const handlePostprodPurgeUserActivity = useCallback(async (userId) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return false;
    try {
      await postprodPurgeUserActivity(token, userId);
      showNotice(t('postprod.users.activity.msg.purged'), 'ok');
      return true;
    } catch {
      return false;
    }
  }, [postprodAuth.token, showNotice, t]);

  const handlePostprodLoadUserProjectPermissions = useCallback(async (userId) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return { ok: true, userId: Number(userId || 0), projectPermissions: [] };
    if (!postprodCanManageProjectPermissions) {
      return { ok: true, userId: Number(userId || 0), projectPermissions: [] };
    }
    try {
      const res = await postprodListUserProjectPermissions(token, userId);
      return {
        ok: true,
        userId: Number(res?.userId || userId || 0),
        projectPermissions: Array.isArray(res?.projectPermissions) ? res.projectPermissions : [],
      };
    } catch (e) {
      const err = new Error(resolvePostprodUsersError(e, t));
      err.code = e?.code || '';
      throw err;
    }
  }, [postprodAuth.token, postprodCanManageProjectPermissions, t]);

  const handlePostprodCreateRole = useCallback(async (payload = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return false;
    setPostprodRoles((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      await postprodCreateRole(token, payload);
      await loadPostprodRoles();
      showNotice(t('postprod.roles.msg.created'), 'ok');
      return true;
    } catch (e) {
      setPostprodRoles((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodRolesError(e, t),
      }));
      return false;
    }
  }, [postprodAuth.token, loadPostprodRoles, showNotice, t]);

  const handlePostprodUpdateRole = useCallback(async (roleKey, payload = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return false;
    setPostprodRoles((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      await postprodUpdateRole(token, roleKey, payload);
      await Promise.all([loadPostprodRoles(), refreshPostprodSessionUser()]);
      showNotice(t('postprod.roles.msg.updated'), 'info');
      return true;
    } catch (e) {
      setPostprodRoles((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodRolesError(e, t),
      }));
      return false;
    }
  }, [postprodAuth.token, loadPostprodRoles, refreshPostprodSessionUser, showNotice, t]);

  const handlePostprodDeleteRole = useCallback(async (roleKey) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return false;
    setPostprodRoles((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      await postprodDeleteRole(token, roleKey);
      await Promise.all([loadPostprodRoles(), loadPostprodUsers(), refreshPostprodSessionUser()]);
      showNotice(t('postprod.roles.msg.deleted'), 'ok');
      return true;
    } catch (e) {
      setPostprodRoles((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodRolesError(e, t),
      }));
      return false;
    }
  }, [postprodAuth.token, loadPostprodRoles, loadPostprodUsers, refreshPostprodSessionUser, showNotice, t]);

  return {
    refreshPostprodSessionUser,
    handlePostprodUpdateMe,
    handlePostprodCreateUser,
    handlePostprodUpdateUser,
    handlePostprodDeleteUser,
    handlePostprodUpdateUserProjectPermissions,
    handlePostprodToggleUserActive,
    handlePostprodLoadUserActivity,
    handlePostprodPurgeUserActivity,
    handlePostprodLoadUserProjectPermissions,
    handlePostprodCreateRole,
    handlePostprodUpdateRole,
    handlePostprodDeleteRole,
  };
}

export { usePostprodUserRoleMutations };
