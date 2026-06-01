const CARD_ROW_ALIGN_CENTER_STYLE = { alignItems: 'center' };
const BASELINE_WRAP_ROW_STYLE = { alignItems: 'baseline', flexWrap: 'wrap' };

export default function ConfigResourcesSection({
  t,
  SectionTitleComponent,
  catalogStats,
  fabResourcesEnabled = false,
  onToggleFabResourcesEnabled,
  fabAuthConnected = false,
  fabAuthBusy = false,
  onFabLogin,
  onFabLogout,
  fabShowControls = false,
  fabRemoteImportBusy = false,
  fabImporting = false,
  fabSelectableCount = 0,
  fabAllSelected = false,
  onToggleAllPreviewSelection,
  onFabRemoteImport,
  fabSelectedCount = 0,
  fabCountLabel = '',
  fabShowImportProgress = false,
  fabRemainingCount = 0,
  fabRemainingLabel = '',
  onFabPreview,
  fabPreviewBusy = false,
  fabHasPreview = false,
  fabPreviewNewItems = [],
  fabPreviewUpdatedItems = [],
  fabSelection = {},
  onTogglePreviewSelection,
  normalizePreviewUid,
  fabRemoteImportMsg = '',
  fabRemoteImportMsgType = '',
}) {
  const titleNode = SectionTitleComponent
    ? (
        <SectionTitleComponent noMargin>
          {t('config.resources.title')}
        </SectionTitleComponent>
      )
    : (
        <h3 className="uu-h3 uu-block-title">
          {t('config.resources.title')}
        </h3>
      );

  const renderFabPreviewList = (list) => (
    <div className="uu-list mt-8">
      {list.map((item, idx) => {
        const uid = normalizePreviewUid?.(item?.uid) || '';
        const title = String(item?.title || item?.uid || '').trim() || '—';
        const seller = String(item?.seller || '').trim();
        const listingType = String(item?.listingType || '').trim();
        const metaParts = [seller, listingType].filter(Boolean);
        const meta = metaParts.join(' · ');
        return (
          <div key={uid || `fab-${idx}`} className="uu-card uu-row" style={CARD_ROW_ALIGN_CENTER_STYLE}>
            <input
              type="checkbox"
              checked={!!(uid && fabSelection[uid])}
              disabled={!uid || fabRemoteImportBusy || fabImporting}
              onChange={(e) => {
                onTogglePreviewSelection?.(uid, !!e.target.checked);
              }}
            />
            <div className="uu-row uu-row-gap4" style={BASELINE_WRAP_ROW_STYLE}>
              <div className="uu-item-title">{title}</div>
              {meta ? <div className="uu-muted">{meta}</div> : null}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="uu-section mt-16">
      <div className="uu-config-stack">
        {titleNode}
        <div className="uu-muted">
          {t('config.catalog.resourcesSummary', {
            count: catalogStats.resourcesCount,
            date: catalogStats.resourcesLastImport || '—',
          })}
        </div>

        <label className="uu-check">
          <input
            type="checkbox"
            checked={!!fabResourcesEnabled}
            onChange={(e) => onToggleFabResourcesEnabled?.(!!e.target.checked)}
          />
          {t('config.resources.enabled')}
        </label>

        <div className="uu-row">
          {!fabAuthConnected ? (
            <button
              type="button"
              className="uu-btn"
              onClick={() => onFabLogin?.()}
              disabled={fabAuthBusy}
            >
              {fabAuthBusy
                ? t('common.loading')
                : (t('config.resources.loginButton'))}
            </button>
          ) : null}
          <div className="uu-row uu-row-gap4">
            <span className={`uu-dot ${fabAuthConnected ? 'ok' : 'fail'}`} />
            <span className="uu-muted">
              {fabAuthConnected
                ? (t('config.resources.loginConnected'))
                : (t('config.resources.loginDisconnected'))}
            </span>
          </div>
          {fabAuthConnected ? (
            <button
              type="button"
              className="uu-btn"
              onClick={() => onFabLogout?.()}
              disabled={fabAuthBusy}
            >
              {t('config.resources.logoutButton')}
            </button>
          ) : null}
        </div>

        {fabShowControls ? (
          <div className="uu-row uu-row-nowrap">
            {!fabRemoteImportBusy && !fabImporting ? (
              <button
                type="button"
                className="uu-btn"
                disabled={fabSelectableCount === 0}
                onClick={() => onToggleAllPreviewSelection?.()}
              >
                {fabAllSelected
                  ? (t('resources.fabImport.unselectAll'))
                  : (t('resources.fabImport.selectAll'))}
              </button>
            ) : null}
            <button
              type="button"
              className="uu-btn"
              onClick={() => onFabRemoteImport?.()}
              disabled={fabRemoteImportBusy || fabImporting || !fabAuthConnected || fabSelectedCount === 0}
            >
              {fabRemoteImportBusy
                ? t('common.loading')
                : t('config.resources.remoteImportButton')}
            </button>
            <div className="uu-muted">
              {fabCountLabel}
              {fabShowImportProgress && fabRemainingCount > 0 ? (
                <span> · {fabRemainingLabel}</span>
              ) : null}
            </div>
          </div>
        ) : fabAuthConnected ? (
          <div className="uu-row">
            <button
              type="button"
              className="uu-btn"
              onClick={() => onFabPreview?.()}
              disabled={fabPreviewBusy || fabRemoteImportBusy}
            >
              {fabPreviewBusy
                ? t('common.loading')
                : t('resources.fabImport.previewButton')}
            </button>
          </div>
        ) : null}

        {fabHasPreview ? (
          <>
            {fabPreviewNewItems.length > 0 ? (
              <>
                <strong className="uu-block-title">
                  {t('resources.fabImport.newBlock')}
                </strong>
                {renderFabPreviewList(fabPreviewNewItems)}
              </>
            ) : null}
            {fabPreviewUpdatedItems.length > 0 ? (
              <>
                <strong className="uu-block-title">
                  {t('resources.fabImport.updatedBlock')}
                </strong>
                {renderFabPreviewList(fabPreviewUpdatedItems)}
              </>
            ) : null}
          </>
        ) : null}

        {fabRemoteImportMsg ? (
          <div className={`uu-msg ${fabRemoteImportMsgType || 'info'}`}>
            {fabRemoteImportMsg}
          </div>
        ) : null}
      </div>
    </div>
  );
}
