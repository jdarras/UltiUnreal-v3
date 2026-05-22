const MARGIN_LEFT_AUTO_STYLE = { marginLeft: 'auto' };

export default function ResourcesDetailHeader({
  t,
  detailTitle = '',
  detailUid = '',
  hasListingUrl = false,
  onBack,
  onOpenFab,
  deleteConfirmTriggerRef = null,
  onOpenDeleteConfirm,
  detailDeleteBusy = false,
}) {
  return (
    <div className="uu-section">
      <div className="uu-row uu-align-center uu-gap-8">
        <button
          className="uu-btn"
          onClick={onBack}
        >
          {t('resources.detail.back')}
        </button>
        <div className="uu-resource-title">{detailTitle}</div>
        {detailUid ? (
          <span className="uu-id-tag uu-muted">[{detailUid}]</span>
        ) : null}
        <div style={MARGIN_LEFT_AUTO_STYLE} />
        {hasListingUrl ? (
          <button className="uu-btn" onClick={() => { void onOpenFab?.(); }}>
            {t('resources.openFab')}
          </button>
        ) : null}
        <button
          ref={deleteConfirmTriggerRef}
          className="uu-btn"
          onClick={onOpenDeleteConfirm}
          disabled={detailDeleteBusy}
        >
          {detailDeleteBusy
            ? t('common.loading')
            : t('common.delete')}
        </button>
      </div>
    </div>
  );
}
