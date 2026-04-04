import { useCallback } from "react";
import { safeT } from "../../../shared/helpers";
import {
  createEmptyPermissionDraft,
  normalizePermissionDraft,
} from "./projectPermissionHelpers";

function useUserProjectPermissionActions({
  t,
  canManageProjectPermissions = false,
  projectOptions = [],
  selectedPermissionProjectRef = "",
  permissionDraft = null,
  onLoadUserProjectPermissions = null,
  onUpdateUserProjectPermissions = null,
  setProjectPermissionsByRef = null,
  setSelectedPermissionProjectRef = null,
  setPermissionDraft = null,
  setPermissionLoading = null,
  setPermissionSaving = null,
  setPermissionError = null,
  setPermissionInfo = null,
  setPermissionTableSearch = null,
  setPermissionTableScope = null,
} = {}) {
  const resetPermissionState = useCallback(() => {
    setProjectPermissionsByRef?.({});
    setSelectedPermissionProjectRef?.("");
    setPermissionDraft?.(createEmptyPermissionDraft());
    setPermissionLoading?.(false);
    setPermissionSaving?.(false);
    setPermissionError?.("");
    setPermissionInfo?.("");
    setPermissionTableSearch?.("");
    setPermissionTableScope?.("all");
  }, [
    setProjectPermissionsByRef,
    setSelectedPermissionProjectRef,
    setPermissionDraft,
    setPermissionLoading,
    setPermissionSaving,
    setPermissionError,
    setPermissionInfo,
    setPermissionTableSearch,
    setPermissionTableScope,
  ]);

  const loadUserProjectPermissions = useCallback(async (userId) => {
    if (!canManageProjectPermissions) {
      resetPermissionState();
      return;
    }
    const targetId = Number(userId || 0);
    if (!targetId) return;
    if (typeof onLoadUserProjectPermissions !== "function") {
      setProjectPermissionsByRef?.({});
      setPermissionLoading?.(false);
      return;
    }
    setPermissionLoading?.(true);
    setPermissionError?.("");
    setPermissionInfo?.("");
    try {
      const res = await onLoadUserProjectPermissions(targetId);
      const list = Array.isArray(res?.projectPermissions) ? res.projectPermissions : [];
      const nextByRef = {};
      for (const row of list) {
        const ref = String(row?.projectId || "").trim();
        if (!ref) continue;
        nextByRef[ref] = normalizePermissionDraft(row);
      }
      setProjectPermissionsByRef?.(nextByRef);
      setSelectedPermissionProjectRef?.((prev) => {
        const currentRef = String(prev || "").trim();
        if (currentRef) return currentRef;
        const firstWithPerm = Object.keys(nextByRef)[0] || "";
        if (firstWithPerm) return firstWithPerm;
        return String(projectOptions?.[0]?.ref || "");
      });
    } catch (e) {
      const msg = String(
        e?.message || safeT(t, "postprod.users.permissions.error.load", "Impossible de charger les droits projet.")
      ).trim();
      setProjectPermissionsByRef?.({});
      setPermissionError?.(
        msg || safeT(t, "postprod.users.permissions.error.load", "Impossible de charger les droits projet.")
      );
    } finally {
      setPermissionLoading?.(false);
    }
  }, [
    canManageProjectPermissions,
    onLoadUserProjectPermissions,
    projectOptions,
    resetPermissionState,
    setProjectPermissionsByRef,
    setSelectedPermissionProjectRef,
    setPermissionLoading,
    setPermissionError,
    setPermissionInfo,
    t,
  ]);

  const submitProjectPermissions = useCallback(async (userId) => {
    if (!canManageProjectPermissions) return;
    const targetUserId = Number(userId || 0);
    const projectRef = String(selectedPermissionProjectRef || "").trim();
    if (!Number.isFinite(targetUserId) || targetUserId <= 0) return;
    if (!projectRef) {
      setPermissionError?.(safeT(t, "postprod.users.permissions.error.project", "Selectionne un projet."));
      setPermissionInfo?.("");
      return;
    }
    if (typeof onUpdateUserProjectPermissions !== "function") return;
    setPermissionSaving?.(true);
    setPermissionError?.("");
    setPermissionInfo?.("");
    try {
      const payload = normalizePermissionDraft(permissionDraft);
      if (payload.canSync) payload.isReferent = true;
      const saved = await onUpdateUserProjectPermissions(targetUserId, projectRef, payload);
      const normalized = saved && typeof saved === "object"
        ? normalizePermissionDraft(saved)
        : payload;
      setProjectPermissionsByRef?.((prev) => ({
        ...(prev || {}),
        [projectRef]: normalized,
      }));
      setPermissionDraft?.(normalized);
      setPermissionInfo?.(safeT(t, "postprod.users.permissions.msg.saved", "Droits projet enregistres."));
    } catch (e) {
      const msg = String(
        e?.message || safeT(t, "postprod.users.permissions.error.save", "Impossible de sauvegarder les droits projet.")
      ).trim();
      setPermissionError?.(
        msg || safeT(t, "postprod.users.permissions.error.save", "Impossible de sauvegarder les droits projet.")
      );
    } finally {
      setPermissionSaving?.(false);
    }
  }, [
    canManageProjectPermissions,
    selectedPermissionProjectRef,
    onUpdateUserProjectPermissions,
    permissionDraft,
    setPermissionSaving,
    setPermissionError,
    setPermissionInfo,
    setProjectPermissionsByRef,
    setPermissionDraft,
    t,
  ]);

  return {
    resetPermissionState,
    loadUserProjectPermissions,
    submitProjectPermissions,
  };
}

export { useUserProjectPermissionActions };
export default useUserProjectPermissionActions;
