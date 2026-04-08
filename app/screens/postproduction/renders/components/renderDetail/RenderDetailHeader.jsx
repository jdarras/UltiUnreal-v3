import { safeT } from "../../../shared/helpers";

function RenderDetailHeader({
  t,
  render = null,
  renderOutputName = "-",
  onOpenOutputExternally = null,
  onClose = null,
} = {}) {
  return (
    <div className="uu-row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
      <div style={{ minWidth: 0 }}>
        <h4 className="uu-h3 uu-block-title" style={{ margin: 0 }}>{renderOutputName}</h4>
        <div className="uu-muted mt-8" style={{ wordBreak: "break-all" }}>
          {String(render?.outputPath || "").trim() || "-"}
        </div>
      </div>
      <div className="uu-row">
        <button
          className="uu-btn-ghost"
          type="button"
          disabled={!String(render?.outputPath || "").trim()}
          onClick={() => onOpenOutputExternally?.(render)}
        >
          {safeT(t, "postprod.renders.preview.openExternal", "Ouvrir")}
        </button>
        <button className="uu-btn-ghost" type="button" onClick={() => onClose?.()}>
          {safeT(t, "common.close", "Fermer")}
        </button>
      </div>
    </div>
  );
}

export { RenderDetailHeader };
export default RenderDetailHeader;

