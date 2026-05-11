import { useCallback, useEffect, useRef } from "react";

function useProductionPresetSync({
  loading = true,
  layoutReady = false,
  editMode = false,
  wrcReady = false,
  presetData = null,
  presetReloadNeeded = false,
  commonRefreshSec = 3,
  target = { ip: "", port: 0, preset: "" },
  activeId = "",
  activeName = "",
  t = null,
  showInfo = null,
  normalizePreset = (value) => value,
  reconcileWidgetsWithPreset = () => ({ changed: false, widgets: [], invalidatedCount: 0 }),
  isTargetUnrealRunning = async () => false,
  wrcGetPreset = async () => ({ ok: false }),
  savePresetSnapshot = async () => ({}),
  presetSnapshotRef = null,
  widgetsRef = null,
  aliveRef = null,
  setPresetData = null,
  setPresetReloadNeeded = null,
  setWrcReady = null,
  setWrcStatus = null,
  setErr = null,
  setWidgets = null,
} = {}) {
  const presetDataRef = useRef(null);
  const presetSignatureRef = useRef("");
  const loadPresetInFlightRef = useRef(false);
  const loadPresetInFlightSinceRef = useRef(0);
  const presetReloadNeededRef = useRef(false);

  useEffect(() => {
    presetDataRef.current = presetData;
    let sig = "";
    if (presetData && typeof presetData === "object") {
      try {
        sig = JSON.stringify(presetData);
      } catch {
        sig = "";
      }
    }
    presetSignatureRef.current = sig;
  }, [presetData]);

  useEffect(() => {
    presetReloadNeededRef.current = presetReloadNeeded;
  }, [presetReloadNeeded]);

  useEffect(() => {
    setWrcReady?.(false);
    setPresetReloadNeeded?.(false);
    presetReloadNeededRef.current = false;
  }, [target?.ip, target?.port, target?.preset, setWrcReady, setPresetReloadNeeded]);

  useEffect(() => {
    if (editMode && wrcReady) return;
    if (!presetReloadNeededRef.current) return;
    setPresetReloadNeeded?.(false);
    presetReloadNeededRef.current = false;
  }, [editMode, wrcReady, setPresetReloadNeeded]);

  const loadPreset = useCallback(async () => {
    const now = Date.now();
    if (loadPresetInFlightRef.current) {
      const since = Number(loadPresetInFlightSinceRef.current || 0);
      // If a previous run got stuck, unblock manual reload after 15s.
      if (!since || now - since < 15000) return;
      loadPresetInFlightRef.current = false;
    }

    if (!target?.ip || !target?.port || !target?.preset) {
      setWrcReady?.(false);
      setWrcStatus?.(t?.("production.error.missingWrcConfig"), "error");
      return;
    }

    loadPresetInFlightRef.current = true;
    loadPresetInFlightSinceRef.current = now;
    const previous = presetDataRef.current;

    try {
      setErr?.("");
      const r = await wrcGetPreset(target.ip, target.port, target.preset);
      if (aliveRef && !aliveRef.current) return;

      if (!r.ok) {
        const rawError = String(r.error || "");
        const lower = rawError.toLowerCase();
        const isTimeout =
          lower.includes("timeout") ||
          lower.includes("abort") ||
          lower.includes("network request failed") ||
          lower.includes("fetch failed") ||
          lower.includes("failed to fetch");
        const isUnreachable = lower.includes("econnrefused") || isTimeout;
        const isPresetNotFound =
          lower.includes("404") ||
          lower.includes("not found") ||
          lower.includes("preset");

        if (isUnreachable) {
          const running = await isTargetUnrealRunning();
          if (running) {
            setWrcStatus?.(t?.("production.error.noPresetFieldRunning"), "error");
            setPresetData?.(previous || null);
            setWrcReady?.(false);
            return;
          }
          const hasSnapshot = !!previous || !!presetSnapshotRef?.current?.exists;
          setWrcStatus?.(
            hasSnapshot
              ? t?.("production.error.wrcUnreachableUsingSnapshot")
              : t?.("production.error.wrcUnreachableNoSnapshot"),
            "error"
          );
          setPresetData?.(previous || null);
          setWrcReady?.(false);
          return;
        }

        if (isPresetNotFound) {
          const running = await isTargetUnrealRunning();
          setWrcStatus?.(
            running
              ? t?.("production.error.noPresetFieldRunning")
              : t?.("production.error.noPresetField"),
            "error"
          );
          setPresetData?.(previous || null);
          setWrcReady?.(false);
          return;
        }

        setErr?.(rawError || `HTTP ${r.status}`);
        setPresetData?.(previous || null);
        setWrcReady?.(false);
        return;
      }

      const payload =
        typeof r.data === "object" && r.data !== null
          ? r.data
          : JSON.parse(r.text || "{}");
      const preset = payload?.Preset || payload?.preset || null;
      if (!preset) {
        const running = await isTargetUnrealRunning();
        setWrcStatus?.(
          running
            ? t?.("production.error.noPresetFieldRunning")
            : t?.("production.error.noPresetField"),
          "error"
        );
        setPresetData?.(previous || null);
        setWrcReady?.(false);
        return;
      }

      const norm = normalizePreset(preset);
      setPresetData?.(norm);
      try {
        presetSignatureRef.current = JSON.stringify(norm);
      } catch {
        presetSignatureRef.current = "";
      }
      setPresetReloadNeeded?.(false);
      presetReloadNeededRef.current = false;

      const reconciliation = reconcileWidgetsWithPreset(
        widgetsRef?.current || [],
        norm
      );
      const effectiveReconciliation =
        reconciliation && typeof reconciliation === "object"
          ? reconciliation
          : { changed: false, widgets: [], invalidatedCount: 0 };
      if (effectiveReconciliation.changed) {
        setWidgets?.(effectiveReconciliation.widgets);
      }
      if (Number(effectiveReconciliation.invalidatedCount) > 0) {
        showInfo?.(
          t?.("production.msg.wrcBindingsInvalidated", {
            count: Number(effectiveReconciliation.invalidatedCount),
          }),
          "error"
        );
      }

      setWrcReady?.(true);

      const previousHash = String(presetSnapshotRef?.current?.hash || "").trim();
      let nextHash = "";
      const projectKey = String(activeId || activeName || "").trim();
      if (projectKey) {
        try {
          const res = await savePresetSnapshot(
            projectKey,
            target.ip,
            target.port,
            target.preset
          );
          nextHash = String(res?.presetHash || "").trim();
          if (presetSnapshotRef) {
            presetSnapshotRef.current = {
              exists: true,
              hash: nextHash || previousHash,
            };
          }
        } catch {
          if (presetSnapshotRef) {
            presetSnapshotRef.current = {
              exists: true,
              hash: previousHash,
            };
          }
        }
      }

      const updatedByHash = !!nextHash && nextHash !== previousHash;
      const updatedByValue =
        !previous || JSON.stringify(previous) !== JSON.stringify(norm);
      const updated = updatedByHash || (!nextHash && updatedByValue);

      setWrcStatus?.(
        updated
          ? t?.("production.status.presetFoundUpdated")
          : t?.("production.status.presetFound"),
        "ok"
      );
    } catch {
      if (aliveRef && !aliveRef.current) return;
      const running = await isTargetUnrealRunning();
      setWrcStatus?.(
        running
          ? t?.("production.error.noPresetFieldRunning")
          : t?.("production.error.noPresetField"),
        "error"
      );
      setPresetData?.(previous || null);
      setWrcReady?.(false);
    } finally {
      loadPresetInFlightRef.current = false;
      loadPresetInFlightSinceRef.current = 0;
    }
  }, [
    target,
    setWrcReady,
    setWrcStatus,
    t,
    setErr,
    wrcGetPreset,
    aliveRef,
    isTargetUnrealRunning,
    setPresetData,
    presetSnapshotRef,
    normalizePreset,
    setPresetReloadNeeded,
    reconcileWidgetsWithPreset,
    widgetsRef,
    setWidgets,
    showInfo,
    activeId,
    activeName,
    savePresetSnapshot,
  ]);

  useEffect(() => {
    if (loading || !layoutReady) return;
    loadPreset();
  }, [loading, layoutReady, loadPreset]);

  useEffect(() => {
    if (loading || !layoutReady) return undefined;
    if (wrcReady) return undefined;

    let cancelled = false;
    let timer = null;
    const retryMs = Math.max(1000, Number(commonRefreshSec || 3) * 1000);

    const schedule = () => {
      if (cancelled || (aliveRef && !aliveRef.current) || wrcReady) return;
      timer = setTimeout(async () => {
        if (cancelled || (aliveRef && !aliveRef.current) || wrcReady) return;
        await loadPreset();
        schedule();
      }, retryMs);
    };

    schedule();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [loading, layoutReady, wrcReady, loadPreset, commonRefreshSec, aliveRef]);

  useEffect(() => {
    if (loading || !layoutReady || !editMode || !wrcReady) return undefined;
    if (!target?.ip || !target?.port || !target?.preset) return undefined;

    let cancelled = false;
    let timer = null;
    const checkMs = Math.max(1000, Number(commonRefreshSec || 3) * 1000);

    const checkReloadNeeded = async () => {
      if (cancelled || (aliveRef && !aliveRef.current) || !editMode || !wrcReady) return;
      if (loadPresetInFlightRef.current) return;

      const localSig = String(presetSignatureRef.current || "").trim();
      if (!localSig) return;

      try {
        const r = await wrcGetPreset(target.ip, target.port, target.preset);
        if (cancelled || (aliveRef && !aliveRef.current) || !editMode || !wrcReady) return;
        if (!r?.ok) return;

        const payload =
          typeof r.data === "object" && r.data !== null
            ? r.data
            : JSON.parse(String(r.text || "{}"));
        const preset = payload?.Preset || payload?.preset || null;
        if (!preset) return;

        let remoteSig = "";
        try {
          remoteSig = JSON.stringify(normalizePreset(preset));
        } catch {
          remoteSig = "";
        }
        if (!remoteSig) return;

        const needsReload = remoteSig !== localSig;
        if (needsReload === presetReloadNeededRef.current) return;

        presetReloadNeededRef.current = needsReload;
        setPresetReloadNeeded?.(needsReload);
      } catch {
        // ignore reload-check errors
      }
    };

    const schedule = () => {
      if (cancelled || (aliveRef && !aliveRef.current)) return;
      timer = setTimeout(async () => {
        await checkReloadNeeded();
        schedule();
      }, checkMs);
    };

    checkReloadNeeded();
    schedule();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [
    loading,
    layoutReady,
    editMode,
    wrcReady,
    target,
    commonRefreshSec,
    aliveRef,
    wrcGetPreset,
    normalizePreset,
    setPresetReloadNeeded,
  ]);

  return {
    loadPreset,
  };
}

export { useProductionPresetSync };
export default useProductionPresetSync;
