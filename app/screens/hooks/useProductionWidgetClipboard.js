import { useCallback, useEffect } from "react";

const PRODUCTION_WIDGET_CLIPBOARD_KEY = "__uu_production_widget_clipboard__";

function cloneClipboardData(value) {
  if (value === undefined) return undefined;
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(value);
    } catch {}
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function isTextEditingTarget(target) {
  if (!target || typeof Element === "undefined" || !(target instanceof Element)) {
    return false;
  }

  const el = target;
  const tag = String(el.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") {
    return true;
  }
  if (el.isContentEditable) return true;
  if (typeof el.closest === "function") {
    return !!el.closest(
      'input, textarea, select, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]'
    );
  }
  return false;
}

function readWidgetClipboard() {
  if (typeof window === "undefined") return null;
  const payload = window[PRODUCTION_WIDGET_CLIPBOARD_KEY];
  if (!payload || typeof payload !== "object") return null;
  return cloneClipboardData(payload);
}

function writeWidgetClipboard(payload) {
  if (typeof window === "undefined") return;
  if (!payload || typeof payload !== "object") {
    delete window[PRODUCTION_WIDGET_CLIPBOARD_KEY];
    return;
  }
  window[PRODUCTION_WIDGET_CLIPBOARD_KEY] = cloneClipboardData(payload);
}

function useProductionWidgetClipboard({
  editMode = false,
  selectedId = null,
  widgets = [],
  values = {},
  hosts = [],
  layoutWidgets = [],
  activeLayoutIsStart = false,
  createWidgetId = () => "",
  normalizeBrowseWidget = (value) => value,
  setWidgets = null,
  setValues = null,
  setSelectedId = null,
  setLeftPanelMode = null,
  showInfo = null,
  t = null,
} = {}) {
  const collectSelectionBundle = useCallback((widgetId, sourceWidgets = widgets) => {
    const source = (sourceWidgets || []).find((widget) => widget.id === widgetId);
    if (!source) return null;

    if (source.type === "zone") {
      const children = (sourceWidgets || []).filter((widget) => widget.zoneId === source.id);
      return {
        rootId: source.id,
        items: [source, ...children],
      };
    }

    return {
      rootId: source.id,
      items: [source],
    };
  }, [widgets]);

  const buildClipboardPayload = useCallback((widgetId, mode = "copy") => {
    const bundle = collectSelectionBundle(widgetId, widgets);
    if (!bundle?.items?.length) return null;

    const payloadValues = {};
    const payloadGlobalPos = {};
    bundle.items.forEach((item) => {
      if (!item?.id) return;
      if (values?.[item.id] !== undefined) {
        payloadValues[item.id] = values[item.id];
      }
      const display = (layoutWidgets || []).find((widget) => widget.id === item.id);
      if (display) {
        payloadGlobalPos[item.id] = {
          x: Number(display.x ?? item.x ?? 40),
          y: Number(display.y ?? item.y ?? 40),
        };
      }
    });

    return {
      version: 1,
      mode,
      rootId: bundle.rootId,
      items: cloneClipboardData(bundle.items),
      values: cloneClipboardData(payloadValues),
      globalPos: cloneClipboardData(payloadGlobalPos),
      createdAt: Date.now(),
    };
  }, [collectSelectionBundle, widgets, values, layoutWidgets]);

  const normalizeTargetsForPaste = useCallback((targetsMap, hostList = hosts) => {
    const hostIps = (hostList || [])
      .map((host) => String(host?.ip || "").trim())
      .filter(Boolean);
    if (!hostIps.length) return {};

    const src = targetsMap && typeof targetsMap === "object" ? targetsMap : {};
    const hasLegacyA = Object.prototype.hasOwnProperty.call(src, "A");
    const hasLegacyB = Object.prototype.hasOwnProperty.call(src, "B");

    const out = {};
    hostIps.forEach((ip, idx) => {
      let enabled = false;
      if (Object.prototype.hasOwnProperty.call(src, ip)) {
        enabled = !!src[ip];
      } else if (idx === 0 && hasLegacyA) {
        enabled = !!src.A;
      } else if (idx === 1 && hasLegacyB) {
        enabled = !!src.B;
      }
      out[ip] = enabled;
    });
    return out;
  }, [hosts]);

  const materializeClipboardPayload = useCallback((payload, options = {}) => {
    if (!payload || !Array.isArray(payload.items) || payload.items.length === 0) {
      return null;
    }
    const forceLiveOff = !!options.forceLiveOff;
    let liveDisabledCount = 0;

    const idMap = {};
    payload.items.forEach((item) => {
      const oldId = String(item?.id || "").trim();
      if (!oldId) return;
      if (!idMap[oldId]) idMap[oldId] = createWidgetId();
    });

    const payloadGlobalPos =
      payload.globalPos && typeof payload.globalPos === "object"
        ? payload.globalPos
        : {};

    const nextItems = payload.items
      .map((rawItem) => {
        if (!rawItem) return null;
        const oldId = String(rawItem.id || "").trim();
        const nextId = idMap[oldId] || createWidgetId();
        const oldZoneId = String(rawItem.zoneId || "").trim();
        const mappedZoneId = oldZoneId && idMap[oldZoneId] ? idMap[oldZoneId] : null;
        const sameLayoutZoneExists =
          !mappedZoneId &&
          oldZoneId &&
          (widgets || []).some((widget) => widget.id === oldZoneId && widget.type === "zone");
        const nextZoneId =
          rawItem.type === "zone"
            ? null
            : mappedZoneId || (sameLayoutZoneExists ? oldZoneId : null);

        let nextX = rawItem.x;
        let nextY = rawItem.y;
        if (rawItem.type !== "zone" && oldZoneId && !nextZoneId) {
          const globalPos = payloadGlobalPos[oldId];
          const gx = Number(globalPos?.x);
          const gy = Number(globalPos?.y);
          if (Number.isFinite(gx)) nextX = gx;
          if (Number.isFinite(gy)) nextY = gy;
        }

        const rawUi = rawItem.ui && typeof rawItem.ui === "object" ? rawItem.ui : null;
        if (forceLiveOff && rawUi?.live === true) {
          liveDisabledCount += 1;
        }
        const nextUi =
          forceLiveOff &&
          rawUi &&
          Object.prototype.hasOwnProperty.call(rawUi, "live")
            ? { ...rawUi, live: false }
            : rawUi || rawItem.ui;

        return normalizeBrowseWidget({
          ...rawItem,
          id: nextId,
          zoneId: nextZoneId,
          x: nextX,
          y: nextY,
          ui: nextUi,
          targets: normalizeTargetsForPaste(rawItem.targets, hosts),
        });
      })
      .filter(Boolean);

    if (!nextItems.length) return null;

    const payloadValues =
      payload.values && typeof payload.values === "object"
        ? payload.values
        : {};
    const nextValues = {};
    Object.entries(payloadValues).forEach(([oldId, val]) => {
      const mappedId = idMap[String(oldId || "").trim()];
      if (!mappedId) return;
      nextValues[mappedId] = cloneClipboardData(val);
    });

    return {
      items: nextItems,
      values: nextValues,
      selectedId: idMap[String(payload.rootId || "").trim()] || nextItems[0]?.id || null,
      liveDisabledCount,
    };
  }, [createWidgetId, normalizeBrowseWidget, normalizeTargetsForPaste, hosts, widgets]);

  const copySelectionToClipboard = useCallback(() => {
    if (!selectedId) return false;
    const payload = buildClipboardPayload(selectedId, "copy");
    if (!payload) return false;
    writeWidgetClipboard(payload);
    return true;
  }, [selectedId, buildClipboardPayload]);

  const cutSelectionToClipboard = useCallback(() => {
    if (!selectedId) return false;
    const payload = buildClipboardPayload(selectedId, "cut");
    if (!payload) return false;
    writeWidgetClipboard(payload);

    const removeIds = new Set(
      (payload.items || [])
        .map((item) => String(item?.id || "").trim())
        .filter(Boolean)
    );
    if (!removeIds.size) return false;

    if (typeof setWidgets === "function") {
      setWidgets((prev) => prev.filter((widget) => !removeIds.has(widget.id)));
    }
    if (typeof setValues === "function") {
      setValues((prev) => {
        const next = { ...(prev || {}) };
        removeIds.forEach((id) => {
          delete next[id];
        });
        return next;
      });
    }
    if (typeof setSelectedId === "function") {
      setSelectedId((prev) => (prev && removeIds.has(prev) ? null : prev));
    }
    if (editMode && typeof setLeftPanelMode === "function") {
      setLeftPanelMode("editor");
    }
    return true;
  }, [selectedId, buildClipboardPayload, setWidgets, setValues, setSelectedId, editMode, setLeftPanelMode]);

  const pasteFromClipboard = useCallback(() => {
    const payload = readWidgetClipboard();
    if (!payload) return false;

    const materialized = materializeClipboardPayload(payload, {
      forceLiveOff: !!activeLayoutIsStart,
    });
    if (!materialized || !Array.isArray(materialized.items) || materialized.items.length === 0) {
      return false;
    }

    if (typeof setWidgets === "function") {
      setWidgets((prev) => [...prev, ...materialized.items]);
    }
    if (typeof setValues === "function") {
      setValues((prev) => ({ ...(prev || {}), ...(materialized.values || {}) }));
    }
    if (typeof setSelectedId === "function") {
      setSelectedId(materialized.selectedId || null);
    }

    if (activeLayoutIsStart && Number(materialized.liveDisabledCount) > 0 && typeof showInfo === "function" && typeof t === "function") {
      showInfo(
        t("production.msg.pasteLiveDisabledStart", {
          count: Number(materialized.liveDisabledCount),
        }),
        "error"
      );
    }
    if (editMode && typeof setLeftPanelMode === "function") {
      setLeftPanelMode("editor");
    }

    if (String(payload.mode || "").toLowerCase() === "cut") {
      writeWidgetClipboard(null);
    }
    return true;
  }, [
    materializeClipboardPayload,
    activeLayoutIsStart,
    setWidgets,
    setValues,
    setSelectedId,
    showInfo,
    t,
    editMode,
    setLeftPanelMode,
  ]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (!editMode) return;
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
      if (isTextEditingTarget(e.target)) return;

      const key = String(e.key || "").toLowerCase();

      if (key === "c") {
        if (!copySelectionToClipboard()) return;
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (key === "x") {
        if (!cutSelectionToClipboard()) return;
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (key === "v") {
        if (!pasteFromClipboard()) return;
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editMode, copySelectionToClipboard, cutSelectionToClipboard, pasteFromClipboard]);

  return {
    copySelectionToClipboard,
    cutSelectionToClipboard,
    pasteFromClipboard,
  };
}

export { useProductionWidgetClipboard };
export default useProductionWidgetClipboard;
