import { useEffect, useMemo } from "react";
import { safeT } from "../../../shared/helpers";
import { renderIsLocal, renderStationIpKey, renderStationLabel } from "./renderListUtils";

export function useRenderStationFilterOptions({
  t,
  renders = [],
  stationFilter = "all",
  setStationFilter = null,
} = {}) {
  const stationFilterOptions = useMemo(() => {
    const list = Array.isArray(renders) ? renders : [];
    const remoteMap = new Map();
    let hasLocal = false;

    for (const render of list) {
      if (renderIsLocal(render)) {
        hasLocal = true;
        continue;
      }
      const ipKey = renderStationIpKey(render);
      if (!ipKey) continue;
      if (!remoteMap.has(ipKey)) {
        remoteMap.set(ipKey, renderStationLabel(render));
      }
    }

    const options = [
      {
        key: "all",
        label: safeT(t, "postprod.renders.filter.allStations", "Toutes les machines"),
      },
    ];

    if (hasLocal) {
      options.push({
        key: "local",
        label: safeT(t, "postprod.renders.filter.localOnly", "Machine locale"),
      });
    }

    const remoteEntries = [...remoteMap.entries()]
      .sort((a, b) => String(a[1] || "").localeCompare(String(b[1] || ""), undefined, { sensitivity: "base" }))
      .map(([key, label]) => ({
        key,
        label,
      }));

    return [...options, ...remoteEntries];
  }, [renders, t]);

  useEffect(() => {
    const selected = String(stationFilter || "all").trim().toLowerCase();
    if (!selected || selected === "all") return;
    const exists = stationFilterOptions.some((entry) => String(entry?.key || "").trim().toLowerCase() === selected);
    if (!exists && typeof setStationFilter === "function") {
      setStationFilter("all");
    }
  }, [stationFilter, stationFilterOptions, setStationFilter]);

  return { stationFilterOptions };
}

export default useRenderStationFilterOptions;
