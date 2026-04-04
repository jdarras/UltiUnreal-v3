import { useEffect, useRef, useState } from "react";
import { safeT } from "../../../shared/helpers";

export function useRoleAutosave({
  t,
  editorMode = "list",
  editingRoleKey = "",
  draft = {},
  rolesLoading = false,
  onUpdateRole = null,
  buildRolePayloadFromDraft = null,
} = {}) {
  const roleAutosaveTimerRef = useRef(null);
  const roleAutosaveLastSignatureRef = useRef("");
  const [roleAutosaveBusy, setRoleAutosaveBusy] = useState(false);
  const [roleAutosaveError, setRoleAutosaveError] = useState("");
  const [roleAutosaveInfo, setRoleAutosaveInfo] = useState("");

  useEffect(() => {
    if (editorMode !== "edit") {
      roleAutosaveLastSignatureRef.current = "";
      if (roleAutosaveTimerRef.current) {
        clearTimeout(roleAutosaveTimerRef.current);
        roleAutosaveTimerRef.current = null;
      }
      setRoleAutosaveBusy(false);
      setRoleAutosaveError("");
      setRoleAutosaveInfo("");
      return;
    }
    if (!editingRoleKey || rolesLoading) return;
    if (typeof onUpdateRole !== "function") return;
    if (typeof buildRolePayloadFromDraft !== "function") return;

    const payload = buildRolePayloadFromDraft(draft);
    const signature = JSON.stringify(payload);
    if (!roleAutosaveLastSignatureRef.current) {
      roleAutosaveLastSignatureRef.current = signature;
      return;
    }
    if (signature === roleAutosaveLastSignatureRef.current) return;

    if (roleAutosaveTimerRef.current) {
      clearTimeout(roleAutosaveTimerRef.current);
      roleAutosaveTimerRef.current = null;
    }
    setRoleAutosaveBusy(true);
    setRoleAutosaveError("");
    setRoleAutosaveInfo("");
    roleAutosaveTimerRef.current = setTimeout(async () => {
      try {
        const ok = await onUpdateRole(editingRoleKey, payload);
        if (ok === false) {
          setRoleAutosaveError(
            safeT(t, "postprod.roles.form.autosaveFailed", "Enregistrement automatique impossible.")
          );
          return;
        }
        roleAutosaveLastSignatureRef.current = signature;
        setRoleAutosaveInfo(
          safeT(t, "postprod.roles.form.autosaveOk", "Modifications enregistrees automatiquement.")
        );
      } catch (e) {
        setRoleAutosaveError(
          String(
            e?.message
            || safeT(t, "postprod.roles.form.autosaveFailed", "Enregistrement automatique impossible.")
          )
        );
      } finally {
        setRoleAutosaveBusy(false);
      }
    }, 500);

    return () => {
      if (roleAutosaveTimerRef.current) {
        clearTimeout(roleAutosaveTimerRef.current);
        roleAutosaveTimerRef.current = null;
      }
    };
  }, [editorMode, editingRoleKey, draft, rolesLoading, onUpdateRole, buildRolePayloadFromDraft, t]);

  return {
    roleAutosaveBusy,
    roleAutosaveError,
    roleAutosaveInfo,
  };
}

export default useRoleAutosave;

