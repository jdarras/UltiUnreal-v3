import { safeT } from "../../../shared/helpers";


const RENDER_DETAIL_HEADER_STYLE = { justifyContent: "space-between", alignItems: "flex-start" };
const RENDER_DETAIL_TITLE_WRAP_STYLE = { minWidth: 0 };
const RENDER_DETAIL_TITLE_STYLE = { margin: 0 };
const RENDER_DETAIL_PATH_STYLE = { wordBreak: "break-all" };

function RenderDetailHeader({
  t,
  render = null,
  renderOutputName = "-",
  onOpenOutputExternally = null,
  onClose = null,
} = {}) {
  const rawOutputPath = String(render?.outputPath || "").trim();
  const isTemplateToken = /^\s*\{\{[^{}]+\}\}\s*$/i.test(rawOutputPath);
  const outputPath = !rawOutputPath || isTemplateToken ? "-" : rawOutputPath;

  return (
    <div className="uu-row" style={RENDER_DETAIL_HEADER_STYLE}>
      <div style={RENDER_DETAIL_TITLE_WRAP_STYLE}>
        <h4 className="uu-h3 uu-block-title" style={RENDER_DETAIL_TITLE_STYLE}>{renderOutputName}</h4>
        <div className="uu-muted mt-8" style={RENDER_DETAIL_PATH_STYLE}>
          {outputPath}
        </div>
      </div>
      <div className="uu-row">
        <button
          className="uu-btn-ghost"
          type="button"
          disabled={outputPath === "-"}
          onClick={() => onOpenOutputExternally?.(render)}
        >
          {safeT(t, "postprod.renders.preview.openExternal", "Ouvrir en externe")}
        </button>
        <button className="uu-btn-ghost" type="button" onClick={() => onClose?.()}>
          {safeT(t, "common.close", "Fermer")}
        </button>
      </div>
    </div>
  );
}

export { RenderDetailHeader };
