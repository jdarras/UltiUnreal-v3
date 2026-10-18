import { useCallback } from "react";
import { postprodListUsers, postprodListRoles } from "../utils/agent";
import {
  resolvePostprodUsersError,
  resolvePostprodRolesError,
} from "../utils/postprodErrorHelpers";

function usePostprodUsersApi({
  postprodAuth,
  postprodCanManageUsers,
  postprodCanManageRoles,
  t,
  setPostprodUsers,
  setPostprodRoles,
}) {
  const loadPostprodUsers = useCallback(async () => {
    const token = String(postprodAuth.token || '').trim();
    if (!token || !postprodCanManageUsers) {
      setPostprodUsers({ items: [], loading: false, error: '' });
      return;
    }
    setPostprodUsers((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await postprodListUsers(token);
      const items = Array.isArray(res?.users) ? res.users : [];
      setPostprodUsers({ items, loading: false, error: '' });
    } catch (e) {
      setPostprodUsers((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodUsersError(e, t),
      }));
    }
  }, [postprodAuth.token, postprodCanManageUsers, t, setPostprodUsers]);

  const loadPostprodRoles = useCallback(async () => {
    const token = String(postprodAuth.token || '').trim();
    if (!token || (!postprodCanManageUsers && !postprodCanManageRoles)) {
      setPostprodRoles({ items: [], loading: false, error: '' });
      return;
    }
    setPostprodRoles((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await postprodListRoles(token);
      const items = Array.isArray(res?.roles) ? res.roles : [];
      setPostprodRoles({ items, loading: false, error: '' });
    } catch (e) {
      setPostprodRoles((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodRolesError(e, t),
      }));
    }
  }, [postprodAuth.token, postprodCanManageUsers, postprodCanManageRoles, t, setPostprodRoles]);

  return { loadPostprodUsers, loadPostprodRoles };
}

export { usePostprodUsersApi };
