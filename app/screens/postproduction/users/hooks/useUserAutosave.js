import { useEffect, useRef, useState } from "react";
import { safeT } from "../../shared/helpers";

function useUserAutosave({
  t,
  editorMode = "list",
  editingUserId = 0,
  usersLoading = false,
  editorInputFocused = false,
  onUpdateUser = null,
  buildUserPayloadFromDraft,
  draft,
}) {
  const userAutosaveTimerRef = useRef(null);
  const userAutosaveLastSignatureRef = useRef("");
  const [userAutosaveBusy, setUserAutosaveBusy] = useState(false);
  const [userAutosaveError, setUserAutosaveError] = useState("");
  const [userAutosaveInfo, setUserAutosaveInfo] = useState("");

  useEffect(() => {
    if (editorMode !== "edit") {
      userAutosaveLastSignatureRef.current = "";
      if (userAutosaveTimerRef.current) {
        clearTimeout(userAutosaveTimerRef.current);
        userAutosaveTimerRef.current = null;
      }
      setUserAutosaveBusy(false);
      setUserAutosaveError("");
      setUserAutosaveInfo("");
      return;
    }
    if (editingUserId <= 0 || usersLoading || editorInputFocused) {
      if (userAutosaveTimerRef.current) {
        clearTimeout(userAutosaveTimerRef.current);
        userAutosaveTimerRef.current = null;
      }
      setUserAutosaveBusy(false);
      return;
    }
    if (typeof onUpdateUser !== "function") return;
    if (typeof buildUserPayloadFromDraft !== "function") return;

    const payload = buildUserPayloadFromDraft(draft, { includeIsActive: true });
    const signature = JSON.stringify(payload);
    if (!userAutosaveLastSignatureRef.current) {
      userAutosaveLastSignatureRef.current = signature;
      return;
    }
    if (signature === userAutosaveLastSignatureRef.current) return;

    if (userAutosaveTimerRef.current) {
      clearTimeout(userAutosaveTimerRef.current);
      userAutosaveTimerRef.current = null;
    }
    setUserAutosaveBusy(true);
    setUserAutosaveError("");
    setUserAutosaveInfo("");
    userAutosaveTimerRef.current = setTimeout(async () => {
      try {
        const ok = await onUpdateUser(editingUserId, payload);
        if (ok === false) {
          setUserAutosaveError(
            safeT(t, "postprod.users.form.autosaveFailed", "Enregistrement automatique impossible.")
          );
          return;
        }
        userAutosaveLastSignatureRef.current = signature;
        setUserAutosaveInfo(
          safeT(t, "postprod.users.form.autosaveOk", "Modifications enregistrées automatiquement.")
        );
      } catch (e) {
        setUserAutosaveError(
          String(
            e?.message
            || safeT(t, "postprod.users.form.autosaveFailed", "Enregistrement automatique impossible.")
          )
        );
      } finally {
        setUserAutosaveBusy(false);
      }
    }, 500);

    return () => {
      if (userAutosaveTimerRef.current) {
        clearTimeout(userAutosaveTimerRef.current);
        userAutosaveTimerRef.current = null;
      }
    };
  }, [editorMode, editingUserId, usersLoading, editorInputFocused, onUpdateUser, buildUserPayloadFromDraft, draft, t]);

  return {
    userAutosaveBusy,
    userAutosaveError,
    userAutosaveInfo,
  };
}

export { useUserAutosave };
