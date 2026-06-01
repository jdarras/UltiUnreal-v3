function SyncServerHostCardHeader({
  headerNode,
  destinationNode,
  isBusy,
  canCopy,
  statusLine,
  statusToneClass,
  onCheck,
  onCopy,
  t,
}) {
  return (
    <>
      <div className="uu-row uu-row-gap12 uu-wrap uu-align-center">
        <div className="uu-col">{headerNode}</div>
        <div className="uu-col" style={{ flex: '1 1 260px' }}>
          <div>{destinationNode}</div>
        </div>
        <div className="uu-col uu-actions">
          <div className="uu-buttons-row">
            <button type="button" className="uu-btn" onClick={onCheck} disabled={isBusy}>
              {t('sync.server.btn.check')}
            </button>
            <button type="button" className="uu-btn" onClick={onCopy} disabled={!canCopy}>
              {t('sync.server.btn.copy')}
            </button>
          </div>
        </div>
      </div>

      <div className={`uu-sync-status-line ${statusToneClass}`}>{statusLine}</div>
    </>
  );
}

export default SyncServerHostCardHeader;
