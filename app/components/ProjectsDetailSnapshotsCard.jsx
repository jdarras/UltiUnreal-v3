const TITLE_ROW_STYLE = { marginBottom: '12px' };
const TEXT_ELLIPSIS_STYLE = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const SNAPSHOT_GRID_STYLE = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
  gap: '12px',
};
const SNAPSHOT_TILE_STYLE = { padding: '6px', cursor: 'pointer' };
const SNAPSHOT_TILE_PREVIEW_STYLE = {
  width: '100%',
  aspectRatio: '16 / 9',
  background: '#1c1f24',
  borderRadius: '6px',
  overflow: 'hidden',
};
const SNAPSHOT_TILE_IMAGE_STYLE = { width: '100%', height: '100%', objectFit: 'cover' };
const SNAPSHOT_TILE_EMPTY_STYLE = { padding: '8px' };

export default function ProjectsDetailSnapshotsCard({
  t,
  snapshotsList = [],
  detailId = '',
  snapshotSrc,
  onOpenSnapshotViewer,
}) {
  if (!snapshotsList.length) return null;

  return (
    <div className="uu-card">
      <div className="uu-row uu-align-center uu-gap-8" style={TITLE_ROW_STYLE}>
        <strong className="uu-block-title">{t('projects.detail.blocks.snapshots')}</strong>
      </div>
      <div className="uu-row wrap">
        <div className="uu-label w-160" />
        <div className="uu-value">
          <div style={SNAPSHOT_GRID_STYLE}>
            {snapshotsList.map((it, idx) => {
              const rel = String(it?.rel || '').trim();
              const full = String(it?.path || '').trim();
              const relOrPath = rel || full;
              const mtime = String(it?.mtime || '').trim();
              const src = snapshotSrc?.(detailId, relOrPath, mtime);
              const fileName = relOrPath.split('/').filter(Boolean).slice(-1)[0] || relOrPath || `#${idx + 1}`;
              return (
                <div
                  key={relOrPath || idx}
                  className="uu-card"
                  style={SNAPSHOT_TILE_STYLE}
                  onClick={() => onOpenSnapshotViewer?.({ rel: relOrPath, path: full, mtime })}
                  title={relOrPath}
                >
                  <div style={SNAPSHOT_TILE_PREVIEW_STYLE}>
                    {src ? (
                      <img
                        src={src}
                        alt=""
                        style={SNAPSHOT_TILE_IMAGE_STYLE}
                      />
                    ) : (
                      <div className="uu-muted" style={SNAPSHOT_TILE_EMPTY_STYLE}>{t('common.none')}</div>
                    )}
                  </div>
                  <div className="uu-muted uu-small mt-4" style={TEXT_ELLIPSIS_STYLE}>
                    {fileName}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
