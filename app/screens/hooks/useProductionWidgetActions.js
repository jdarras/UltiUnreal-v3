import { useCallback } from "react";

function useProductionWidgetActions({
  hosts = [],
  widgets = [],
  values = {},
  t = null,
  editMode = false,
  snap = (value) => value,
  setWidgets = null,
  setValues = null,
  setSelectedId = null,
  setLeftPanelMode = null,
} = {}) {
  const createWidgetId = useCallback(() => {
    return (
      (crypto?.randomUUID && crypto.randomUUID()) ||
      String(Date.now()) + Math.random().toString(16).slice(2)
    );
  }, []);

  const addWidget = useCallback(
    (type, initialPos) => {
      const id = createWidgetId();

      const baseTargets = {};
      (hosts || []).forEach((machine) => {
        if (machine?.ip) baseTargets[machine.ip] = false;
      });

      const defaults = {
        button: {
          label: t("production.widgets.buttonLabel"),
          binding: {
            kind: "function",
            displayName: "",
            argValues: {},
            argDefaults: {},
          },
          ui: {
            showArguments: false,
          },
        },
        text: {
          label: t("production.widgets.textLabel"),
          binding: { kind: "property", path: "", valueType: "text" },
          defaultValue: "",
        },
        slider: {
          label: t("production.widgets.sliderLabel"),
          binding: { kind: "property", path: "", valueType: "float" },
          ui: { min: -10, max: 10, step: 0.1 },
        },
        vector: {
          label: t("production.widgets.vectorLabel"),
          binding: { kind: "property", path: "", valueType: "vector" },
          ui: {},
        },
        transform: {
          label: t("production.widgets.transformLabel"),
          binding: { kind: "property", path: "", valueType: "transform" },
          ui: {},
        },
        joystick: {
          label: t("production.widgets.joystickLabel"),
          binding: { kind: "property", path: "", valueType: "vector" },
          ui: {
            linkType: "vector2d",
            minX: -10,
            maxX: 10,
            minY: -10,
            maxY: 10,
          },
          joystickBindings: {
            x: { kind: "property", path: "", valueType: "float" },
            y: { kind: "property", path: "", valueType: "float" },
          },
        },

        toggle: {
          label: t("production.widgets.toggleLabel"),
          binding: { kind: "property", path: "", valueType: "bool" },
          defaultValue: false,
        },
        color: {
          label: t("production.widgets.colorLabel"),
          binding: { kind: "property", path: "", valueType: "color" },
          defaultValue: "#ff0000|1.000",
        },
        dropdown: {
          label: t("production.widgets.dropdownLabel"),
          binding: { kind: "property", path: "", valueType: "text" },
          ui: {
            options: [
              { label: "Option 1", value: "Option 1" },
              { label: "Option 2", value: "Option 2" },
            ],
          },
        },
        enum: {
          label: t("production.widgets.enumLabel"),
          binding: { kind: "property", path: "", valueType: "text" },
          ui: {
            options: [
              { label: "Option 1", value: "Option1" },
              { label: "Option 2", value: "Option2" },
            ],
          },
        },
        browse: {
          label: t("production.widgets.browseLabel"),
          binding: { kind: "property", path: "", valueType: "text" },
          mediaPath: "",
          mediaType: "",
          browseLastDir: "",
          browsePreferType: "",
          defaultValue: "",
        },
        timeline: {
          label: t("production.widgets.timelineLabel"),
          ui: {
            timeline: {
              mode: "single",
              tracks: [],
            },
          },
        },
        zone: {
          label: t("production.widgets.zoneLabel"),
          note: "",
          ui: {
            color: "#1F2937",
          },
        },
      };

      const base = {
        id,
        type,
        zoneId: null,
        targets: baseTargets,
        x: snap(initialPos?.x ?? 40),
        y: snap(initialPos?.y ?? 40),
        w: 260,
        h: 160,
        ...(defaults[type] || defaults.text),
      };

      if (type === "timeline") {
        base.w = 320;
        base.h = 140;
      }

      setWidgets?.((prev) => [...prev, base]);
      setSelectedId?.(id);
      if (editMode) setLeftPanelMode?.("editor");
    },
    [
      createWidgetId,
      hosts,
      t,
      snap,
      setWidgets,
      setSelectedId,
      editMode,
      setLeftPanelMode,
    ]
  );

  const duplicateWidget = useCallback(
    (widgetId) => {
      const source = (widgets || []).find((widget) => widget.id === widgetId);
      if (!source) return;

      const offset = 20;
      const nextWidgets = (widgets || []).slice();
      const nextValues = { ...(values || {}) };

      if (source.type === "zone") {
        const newZoneId = createWidgetId();
        const zoneX = Number(source.x ?? 40);
        const zoneY = Number(source.y ?? 40);
        const zoneClone = {
          ...source,
          id: newZoneId,
          zoneId: null,
          x: snap(zoneX + offset),
          y: snap(zoneY + offset),
        };
        nextWidgets.push(zoneClone);
        if (values?.[source.id] !== undefined) {
          nextValues[newZoneId] = values[source.id];
        }

        const children = (widgets || []).filter(
          (widget) => widget.zoneId === source.id
        );
        children.forEach((child) => {
          const newChildId = createWidgetId();
          const childClone = {
            ...child,
            id: newChildId,
            zoneId: newZoneId,
          };
          nextWidgets.push(childClone);
          if (values?.[child.id] !== undefined) {
            nextValues[newChildId] = values[child.id];
          }
        });

        setWidgets?.(nextWidgets);
        setValues?.(nextValues);
        setSelectedId?.(newZoneId);
        if (editMode) setLeftPanelMode?.("editor");
        return;
      }

      const newId = createWidgetId();
      const inZone = Boolean(source.zoneId);
      const baseX = Number(source.x ?? 40);
      const baseY = Number(source.y ?? 40);
      const nextX = inZone
        ? Math.max(0, snap(baseX + offset))
        : snap(baseX + offset);
      const nextY = inZone
        ? Math.max(0, snap(baseY + offset))
        : snap(baseY + offset);
      const clone = {
        ...source,
        id: newId,
        x: nextX,
        y: nextY,
      };
      nextWidgets.push(clone);
      if (values?.[source.id] !== undefined) {
        nextValues[newId] = values[source.id];
      }

      setWidgets?.(nextWidgets);
      setValues?.(nextValues);
      setSelectedId?.(newId);
      if (editMode) setLeftPanelMode?.("editor");
    },
    [
      widgets,
      values,
      createWidgetId,
      snap,
      setWidgets,
      setValues,
      setSelectedId,
      editMode,
      setLeftPanelMode,
    ]
  );

  return {
    createWidgetId,
    addWidget,
    duplicateWidget,
  };
}

export { useProductionWidgetActions };
