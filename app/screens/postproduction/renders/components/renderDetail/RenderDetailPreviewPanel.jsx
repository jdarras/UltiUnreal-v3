import { safeT } from "../../../shared/helpers";

function RenderDetailPreviewPanel({
  t,
  renderId = 0,
  renderOutputName = "",
  previewKind = "none",
  previewSource = "",
  previewError = "",
  previewCandidatesCount = 0,
  onAdvancePreviewCandidate = null,
} = {}) {
  return (
    <div className="uu-card">
      <div style={{ fontWeight: 600, marginBottom: "8px" }}>
        {safeT(t, "postprod.renders.preview.title", "Apercu rendu")}
      </div>
      {previewKind === "video" ? (
        <video
          src={previewSource}
          controls
          preload="metadata"
          style={{
            width: "100%",
            maxHeight: "540px",
            borderRadius: "8px",
            background: "#000",
          }}
          onError={() => {
            onAdvancePreviewCandidate?.(renderId, previewCandidatesCount);
          }}
        />
      ) : previewKind === "image" ? (
        <img
          src={previewSource}
          alt={renderOutputName}
          style={{
            width: "100%",
            maxHeight: "540px",
            objectFit: "contain",
            borderRadius: "8px",
            background: "var(--uu-bg2, #141923)",
          }}
          onError={() => {
            onAdvancePreviewCandidate?.(renderId, previewCandidatesCount);
          }}
        />
      ) : (
        <div className="uu-msg warn">
          {safeT(
            t,
            "postprod.renders.preview.unsupported",
            "Lecture interne indisponible pour ce format. Ouvre le fichier en externe."
          )}
        </div>
      )}
      {previewError ? <div className="uu-msg warn mt-8">{previewError}</div> : null}
    </div>
  );
}

export { RenderDetailPreviewPanel };
export default RenderDetailPreviewPanel;
