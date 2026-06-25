import { useEffect, useRef, useState } from "react";
import { safeT } from "../../shared/helpers";

function useUserAutosave({
  t,
  editorMode = "list",
  editingUserId = 0,
  usersLoading = false,
  editorInputFocused: _editorInputFocused = false,
  autosavePulse = 0,
  onUpdateUser = null,
  buildUserPayloadFromDraft,
  draft,
}) {
  const userAutosaveTimerRef = useRef(null);
  const userAutosaveLastSignatureRef = useRef("");
  const userAutosaveLastPulseRef = useRef(0);
  const userAutosaveQueueRef = useRef(Promise.resolve());
  const userAutosaveEntityRef = useRef(0);
  const [userAutosaveBusy, setUserAutosaveBusy] = useState(false);
  const [userAutosaveError, setUserAutosaveError] = useState("");
  const [userAutosaveInfo, setUserAutosaveInfo] = useState("");

  useEffect(() => {
    if (editorMode !== "edit") {
      userAutosaveEntityRef.current = 0;
      userAutosaveLastSignatureRef.current = "";
      userAutosaveLastPulseRef.current = 0;
      if (userAutosaveTimerRef.current) {
        clearTimeout(userAutosaveTimerRef.current);
        userAutosaveTimerRef.current = null;
      }
      setUserAutosaveBusy(false);
      setUserAutosaveError("");
      setUserAutosaveInfo("");
      return;
    }
    if (editingUserId <= 0 || usersLoading) {
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
    const pulse = Math.max(0, Math.trunc(Number(autosavePulse) || 0));
    if (userAutosaveEntityRef.current !== editingUserId) {
      userAutosaveEntityRef.current = editingUserId;
      userAutosaveLastSignatureRef.current = signature;
      userAutosaveLastPulseRef.current = pulse;
      return;
    }
    if (!userAutosaveLastSignatureRef.current) {
      userAutosaveLastSignatureRef.current = signature;
      userAutosaveLastPulseRef.current = pulse;
      return;
    }
    if (signature === userAutosaveLastSignatureRef.current) return;
    if (pulse <= userAutosaveLastPulseRef.current) return;

    if (userAutosaveTimerRef.current) {
      clearTimeout(userAutosaveTimerRef.current);
      userAutosaveTimerRef.current = null;
    }
    setUserAutosaveBusy(true);
    setUserAutosaveError("");
    setUserAutosaveInfo("");
    userAutosaveTimerRef.current = setTimeout(async () => {
      try {
        const operation = userAutosaveQueueRef.current
          .catch(() => undefined)
          .then(() => onUpdateUser(editingUserId, payload));
        userAutosaveQueueRef.current = operation.then(() => undefined, () => undefined);
        const ok = await operation;
        if (ok === false) {
          setUserAutosaveError(
            safeT(t, "postprod.users.form.autosaveFailed", "Enregistrement automatique impossible.")
          );
          return;
        }
        userAutosaveLastSignatureRef.current = signature;
        userAutosaveLastPulseRef.current = pulse;
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
  }, [
    editorMode,
    editingUserId,
    usersLoading,
    autosavePulse,
    onUpdateUser,
    buildUserPayloadFromDraft,
    draft,
    t,
  ]);

  return {
    userAutosaveBusy,
    userAutosaveError,
    userAutosaveInfo,
  };
}

export { useUserAutosave };
