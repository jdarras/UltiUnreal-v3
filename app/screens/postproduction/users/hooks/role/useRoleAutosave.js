import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { safeT } from "../../../shared/helpers";
import { NoticeContext } from "../../../../../NoticeContext";

export function useRoleAutosave({
  t,
  editorMode = "list",
  editingRoleKey = "",
  draft = {},
  rolesLoading = false,
  onUpdateRole = null,
  buildRolePayloadFromDraft = null,
} = {}) {
  const noticeApi = useContext(NoticeContext);
  const timerRef = useRef(null);
  const lastNonTextSignatureRef = useRef("");
  const draftRef = useRef(draft);
  draftRef.current = draft;

  // Keep always-current refs for async callbacks (avoids stale closure issues)
  const ctxRef = useRef({});
  ctxRef.current = { editingRoleKey, onUpdateRole, buildRolePayloadFromDraft, t, noticeApi, rolesLoading };

  const [roleAutosaveBusy, setRoleAutosaveBusy] = useState(false);
  const [roleAutosaveError, setRoleAutosaveError] = useState("");
  const [roleAutosaveInfo, setRoleAutosaveInfo] = useState("");

  // Stable save function — reads everything from refs, never needs to be recreated
  const executeSaveRef = useRef(null);
  executeSaveRef.current = async () => {
    const { editingRoleKey: rk, onUpdateRole: update, buildRolePayloadFromDraft: build, t: tFn, noticeApi: api, rolesLoading: loading } = ctxRef.current;
    if (!rk || typeof update !== "function" || typeof build !== "function" || loading) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const payload = build(draftRef.current);
    setRoleAutosaveBusy(true);
    setRoleAutosaveError("");
    setRoleAutosaveInfo("");
    try {
      const ok = await update(rk, payload);
      if (ok === false) {
        const msg = safeT(tFn, "postprod.roles.form.autosaveFailed", "Enregistrement automatique impossible.");
        setRoleAutosaveError(msg);
        api.showNotice?.(msg, "warn");
        return;
      }
      const { displayName: _dn, note: _n, ...rest } = payload;
      lastNonTextSignatureRef.current = JSON.stringify(rest);
      const msg = safeT(tFn, "postprod.roles.form.autosaveOk", "Modifications enregistrées automatiquement.");
      setRoleAutosaveInfo(msg);
      api.showNotice?.(msg, "ok");
    } catch (e) {
      const msg = String(
        e?.message
        || safeT(tFn, "postprod.roles.form.autosaveFailed", "Enregistrement automatique impossible.")
      );
      setRoleAutosaveError(msg);
      api.showNotice?.(msg, "warn");
    } finally {
      setRoleAutosaveBusy(false);
    }
  };

  // Non-text signature: computed during render, excludes displayName & note.
  // Changes ONLY when permissions/checkboxes change — not on every keystroke.
  const nonTextSignature = useMemo(() => {
    if (editorMode !== "edit" || typeof buildRolePayloadFromDraft !== "function") return "";
    const payload = buildRolePayloadFromDraft(draft);
    const { displayName: _dn, note: _n, ...rest } = payload;
    return JSON.stringify(rest);
  }, [editorMode, draft, buildRolePayloadFromDraft]);

  // Auto-save effect: only re-runs when permissions change (not on text field edits)
  useEffect(() => {
    if (editorMode !== "edit") {
      lastNonTextSignatureRef.current = "";
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    if (!nonTextSignature) return;

    // First render in edit mode: initialize baseline, no save needed
    if (!lastNonTextSignatureRef.current) {
      lastNonTextSignatureRef.current = nonTextSignature;
      return;
    }
    if (nonTextSignature === lastNonTextSignatureRef.current) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    timerRef.current = setTimeout(() => executeSaveRef.current?.(), 300);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [editorMode, nonTextSignature]); // draft not in deps — effect only runs on permission changes

  // Called on blur of text fields (displayName, note)
  function saveNow() {
    executeSaveRef.current?.();
  }

  return {
    roleAutosaveBusy,
    roleAutosaveError,
    roleAutosaveInfo,
    saveNow,
  };
}
