export default function HttpBindBlock({
  t,
  visible,
  httpBindEditing,
  httpBindDraft,
  setHttpBindDraft,
  httpBindDraftValid,
  httpBindBusy,
  httpBindDisplay,
  httpBindDisplayClass,
  httpBindInlineMsg,
  httpBindInlineClass,
  canEditHttpBind,
  startHttpBindEdit,
  cancelHttpBindEdit,
  saveHttpBindAddress,
}) {
  if (!visible) return null;
  return (
    <div className="uu-row wrap mt-12">
      <div className="uu-label w-160">{t('projects.detail.labels.httpBind')}</div>
      <div className="uu-value">
        <div className="uu-row uu-gap-8 uu-align-center uu-wrap">
          {httpBindEditing ? (
            <>
              <input
                className="uu-input"
                style={{ minWidth: '180px', flex: '0 1 240px' }}
                value={httpBindDraft}
                placeholder="0.0.0.0"
                onChange={(e) => {
                  setHttpBindDraft(e.target.value);
                }}
              />
              <button
                type="button"
                className="uu-btn"
                onClick={saveHttpBindAddress}
                disabled={httpBindBusy || !httpBindDraftValid}
              >
                {httpBindBusy ? '...' : t('projects.detail.httpBind.save')}
              </button>
              <button
                type="button"
                className="uu-btn"
                onClick={cancelHttpBindEdit}
                disabled={httpBindBusy}
              >
                {t('projects.detail.httpBind.cancel')}
              </button>
            </>
          ) : (
            <>
              <span className={httpBindDisplayClass}>{httpBindDisplay}</span>
              {canEditHttpBind ? (
                <button
                  type="button"
                  className="uu-btn"
                  onClick={startHttpBindEdit}
                  disabled={httpBindBusy}
                >
                  {httpBindBusy ? '...' : t('projects.detail.httpBind.modify')}
                </button>
              ) : null}
            </>
          )}
          {httpBindInlineMsg ? (
            <span className={httpBindInlineClass}>{httpBindInlineMsg}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
