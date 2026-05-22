const SNAPSHOT_OVERLAY_STYLE = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.75)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  zIndex: 9999,
};

const SNAPSHOT_MODAL_STYLE = {
  width: 'min(1200px, 95vw)',
  maxHeight: '90vh',
  overflow: 'auto',
  padding: '12px',
};

const SNAPSHOT_VIEWER_IMAGE_ROW_STYLE = {
  marginTop: '12px',
  display: 'flex',
  justifyContent: 'center',
};

const SNAPSHOT_VIEWER_IMAGE_STYLE = {
  maxWidth: '100%',
  maxHeight: '70vh',
  objectFit: 'contain',
  borderRadius: '8px',
};

const MARGIN_LEFT_AUTO_STYLE = { marginLeft: 'auto' };
const TEXT_ELLIPSIS_STYLE = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

export default function ProjectsSnapshotLightbox({
  t,
  snapshotOpen,
  detailId,
  snapshotBusy,
  snapshotSrc,
  onClose,
  onSetAsThumbnail,
}) {
  if (!snapshotOpen) return null;

  return (
    <div style={SNAPSHOT_OVERLAY_STYLE} onClick={onClose}>
      <div
        className="uu-card"
        style={SNAPSHOT_MODAL_STYLE}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="uu-row uu-align-center uu-gap-8 uu-wrap">
          <strong className="uu-block-title">{t('projects.snapshots.title')}</strong>
          <span className="uu-muted" style={TEXT_ELLIPSIS_STYLE}>
            {snapshotOpen.rel || ''}
          </span>
          <button
            type="button"
            className="uu-btn"
            style={MARGIN_LEFT_AUTO_STYLE}
            onClick={onClose}
            disabled={snapshotBusy}
          >
            {t('common.close')}
          </button>
        </div>

        <div style={SNAPSHOT_VIEWER_IMAGE_ROW_STYLE}>
          <img
            src={snapshotSrc(detailId, snapshotOpen.rel, snapshotOpen.mtime)}
            alt=""
            style={SNAPSHOT_VIEWER_IMAGE_STYLE}
          />
        </div>

        <div className="uu-row uu-gap-8 mt-12">
          <button
            type="button"
            className="uu-btn"
            onClick={() => { if (snapshotOpen.path) window.electron?.openPath?.(snapshotOpen.path); }}
            disabled={!snapshotOpen.path}
          >
            {t('projects.snapshots.openInExplorer')}
          </button>
          <button
            type="button"
            className="uu-btn"
            onClick={() => onSetAsThumbnail(snapshotOpen.rel || snapshotOpen.path, snapshotOpen.mtime)}
            disabled={snapshotBusy || !(snapshotOpen.rel || snapshotOpen.path)}
          >
            {t('projects.snapshots.setAsThumbnail')}
          </button>
        </div>
      </div>
    </div>
  );
}
