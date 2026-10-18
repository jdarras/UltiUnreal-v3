import { useEffect } from "react";

function useProductionBootstrap({
  getCommon = async () => ({}),
  getHosts = async () => [],
  getProjects = async () => ({}),
  getLayout = async () => ({}),
  sortHosts = (hosts) => hosts,
  lang = "fr",
  maxLayoutNameLen = 24,
  applyLayout = () => ({}),
  buildLayoutWithValues = () => [],
  hosts = [],
  effectivePresetName = "",
  normalizePreset = (value) => value,
  presetSnapshotRef = null,
  lastSavedLayoutRef = null,
  setCommon = null,
  setHosts = null,
  setActiveName = null,
  setActiveId = null,
  setProjectsList = null,
  setLayouts = null,
  setActiveLayoutId = null,
  setPresetData = null,
  setErr = null,
  setLayoutReady = null,
  setLoading = null,
} = {}) {
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [c, h, p] = await Promise.all([
          getCommon(),
          getHosts(),
          getProjects({ light: true }),
        ]);
        if (!alive) return;
        setCommon?.(c || {});
        setHosts?.(Array.isArray(h) ? sortHosts(h, lang) : []);
        const projName = String(p?.activeName || "").trim();
        const projId = String(p?.activeId || "").trim();
        const projectKey = projId || projName;
        setActiveName?.(projName);
        setActiveId?.(projId);
        setProjectsList?.(Array.isArray(p?.projects) ? p.projects : []);
        if (presetSnapshotRef) {
          presetSnapshotRef.current = { exists: false, hash: "" };
        }

        if (projectKey) {
          try {
            const data = await getLayout(projectKey);
            if (!alive) return;
            const rawLayouts = Array.isArray(data?.layouts) ? data.layouts : [];
            let normalizedLayouts = rawLayouts.map((layout, idx) => {
              const id = String(layout?.id || "").trim() || `layout-${idx + 1}`;
              const name =
                String(layout?.name || "")
                  .trim()
                  .slice(0, maxLayoutNameLen) || `Layout ${idx + 1}`;
              const layoutArr = Array.isArray(layout?.layout) ? layout.layout : [];
              const color = String(layout?.color || "#1F2937").trim() || "#1F2937";
              const isStart = !!layout?.isStart;
              return { id, name, layout: layoutArr, color, isStart };
            });

            if (normalizedLayouts.length === 0) {
              const fallback = Array.isArray(data?.layout) ? data.layout : [];
              normalizedLayouts = [
                {
                  id: "layout-1",
                  name: "Layout 1",
                  layout: fallback,
                  color: "#1F2937",
                  isStart: false,
                },
              ];
            }

            let nextActiveLayoutId = String(
              data?.activeLayoutId || data?.layoutId || ""
            ).trim();
            if (
              !nextActiveLayoutId ||
              !normalizedLayouts.some((layout) => layout.id === nextActiveLayoutId)
            ) {
              nextActiveLayoutId = normalizedLayouts[0]?.id || "";
            }

            const activeLayout =
              normalizedLayouts.find((layout) => layout.id === nextActiveLayoutId) ||
              normalizedLayouts[0];
            const arr = Array.isArray(activeLayout?.layout) ? activeLayout.layout : [];

            setLayouts?.(normalizedLayouts);
            setActiveLayoutId?.(nextActiveLayoutId);

            const initialValues = applyLayout(arr);

            if (projectKey && nextActiveLayoutId && lastSavedLayoutRef?.current) {
              const serialized = JSON.stringify(
                buildLayoutWithValues(arr, initialValues, hosts)
              );
              lastSavedLayoutRef.current[`${projectKey}::${nextActiveLayoutId}`] = serialized;
            }

            const presetsMap =
              data?.presets && typeof data.presets === "object" ? data.presets : null;
            const savedPreset =
              presetsMap && effectivePresetName && presetsMap[effectivePresetName]
                ? presetsMap[effectivePresetName]
                : data?.preset && typeof data.preset === "object"
                  ? data.preset
                  : null;
            if (presetSnapshotRef) {
              presetSnapshotRef.current = {
                exists: !!savedPreset,
                hash: String(savedPreset?.presetHash || "").trim(),
              };
            }

            if (savedPreset?.data) {
              try {
                const snapPreset = savedPreset.data.Preset || savedPreset.data.preset || null;
                if (snapPreset) {
                  setPresetData?.(normalizePreset(snapPreset));
                }
              } catch {
                // ignore snapshot error
              }
            }
          } catch {
            // no layout yet
          }
        }
      } catch (error) {
        if (!alive) return;
        setErr?.(error?.message || String(error));
      } finally {
        if (!alive) return;
        setLayoutReady?.(true);
        setLoading?.(false);
      }
    })();

    return () => {
      alive = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- chargement initial, une seule fois au montage
  }, []);
}

export { useProductionBootstrap };
