import { useCallback, useState } from "react";

function useProductionWrcStatus({ defaultType = "error" } = {}) {
  const [wrcStatusMsg, setWrcStatusMsg] = useState("");
  const [wrcStatusType, setWrcStatusType] = useState("");

  const setWrcStatus = useCallback(
    (message, type = defaultType) => {
      const msg = String(message || "").trim();
      setWrcStatusMsg(msg);
      setWrcStatusType(msg ? type : "");
    },
    [defaultType]
  );

  return {
    wrcStatusMsg,
    wrcStatusType,
    setWrcStatus,
  };
}

export { useProductionWrcStatus };
