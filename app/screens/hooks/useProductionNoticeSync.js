import { useEffect } from "react";

function useProductionNoticeSync({
  showNotice = null,
  err = "",
  infoMsg = "",
  infoMsgType = "",
  presetReloadNeeded = false,
  wrcStatusMsg = "",
  wrcStatusType = "",
  t = null,
} = {}) {
  useEffect(() => {
    if (!showNotice) return;
    if (err) {
      showNotice(err, "error");
      return;
    }
    if (infoMsg) {
      showNotice(infoMsg, infoMsgType || "");
      return;
    }
    if (presetReloadNeeded) {
      showNotice(t?.("production.status.presetNeedsReload"), "warn", { sticky: true });
      return;
    }
    if (wrcStatusMsg) {
      showNotice(wrcStatusMsg, wrcStatusType || "error", { sticky: true });
      return;
    }
    // keep global notice untouched to preserve shared display behavior
  }, [
    err,
    infoMsg,
    infoMsgType,
    presetReloadNeeded,
    showNotice,
    t,
    wrcStatusMsg,
    wrcStatusType,
  ]);
}

export { useProductionNoticeSync };
