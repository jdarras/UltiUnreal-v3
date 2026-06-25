const COMMON_COLUMNS_STYLE = { alignItems: 'flex-start', gap: '32px', flexWrap: 'wrap' };
const COMMON_COLUMN_LEFT_STYLE = { flex: '1 1 340px', minWidth: '300px' };
const COMMON_COLUMN_RIGHT_STYLE = { flex: '1 1 320px', minWidth: '280px' };

export default function ConfigCommonSection({
  t,
  SectionTitleComponent,
  cfg,
  onUpdateField,
  showAllowStartDesynced = true,
}) {
  const titleNode = SectionTitleComponent
    ? (
        <SectionTitleComponent>
          {t('config.commonTitle')}
        </SectionTitleComponent>
      )
    : (
        <h3 className="uu-h3 uu-block-title">
          {t('config.commonTitle')}
        </h3>
      );

  return (
    <div className="uu-section mt-16">
      {titleNode}

      <div className="uu-row" style={COMMON_COLUMNS_STYLE}>
        <div style={COMMON_COLUMN_LEFT_STYLE}>
          <div className="uu-grid-field uu-maxw-420">
            <label className="uu-label">
              {t('setup.server.refreshSec')}
            </label>
            <input
              type="number"
              className="uu-input w-100"
              value={cfg.refreshSec}
              onChange={(e) => onUpdateField?.('refreshSec', e.target.value)}
            />
          </div>

          <div className="uu-grid-field uu-maxw-420 mt-12">
            <label className="uu-label">
              {t('config.logs.warnLimit')}
            </label>
            <input
              type="number"
              min={100}
              className="uu-input w-160"
              value={cfg.logWarnLines}
              onChange={(e) => onUpdateField?.('logWarnLines', e.target.value)}
            />
          </div>

          <div className="uu-grid-field uu-maxw-420 mt-12">
            <label className="uu-label">
              {t('config.logs.hardLimit')}
            </label>
            <input
              type="number"
              min={200}
              className="uu-input w-160"
              value={cfg.logHardLimitLines}
              onChange={(e) => onUpdateField?.('logHardLimitLines', e.target.value)}
            />
          </div>

          <div className="uu-grid-field uu-maxw-420 mt-12">
            <label className="uu-label">
              {t('config.audit.warnLimit')}
            </label>
            <input
              type="number"
              min={100}
              className="uu-input w-160"
              value={cfg.auditWarnLines}
              onChange={(e) => onUpdateField?.('auditWarnLines', e.target.value)}
            />
          </div>

          <div className="uu-grid-field uu-maxw-420 mt-12">
            <label className="uu-label">
              {t('config.audit.hardLimit')}
            </label>
            <input
              type="number"
              min={200}
              className="uu-input w-160"
              value={cfg.auditHardLimitLines}
              onChange={(e) => onUpdateField?.('auditHardLimitLines', e.target.value)}
            />
          </div>

          <div className="uu-grid-field uu-maxw-420 mt-12">
            <label className="uu-label">
              {t('config.rcHttpPort')}
            </label>
            <input
              type="number"
              className="uu-input w-160"
              value={cfg.rcHttpPort}
              onChange={(e) => onUpdateField?.('rcHttpPort', e.target.value)}
            />
          </div>
        </div>

        <div style={COMMON_COLUMN_RIGHT_STYLE}>
          <div className="uu-grid-field uu-maxw-420">
            <label className="uu-label">
              {t('config.wrc.attempts')}
            </label>
            <input
              type="number"
              className="uu-input w-100"
              value={cfg.wrcMaxAttempts}
              onChange={(e) => onUpdateField?.('wrcMaxAttempts', e.target.value)}
            />
          </div>

          <div className="uu-grid-field uu-maxw-420 mt-12">
            <label className="uu-label">
              {t('config.wrc.retryDelay')}
            </label>
            <input
              type="number"
              className="uu-input w-100"
              value={cfg.wrcRetryDelaySec}
              onChange={(e) => onUpdateField?.('wrcRetryDelaySec', e.target.value)}
            />
          </div>

          <div className="uu-grid-field uu-maxw-420 mt-12">
            <label className="uu-label">
              {t('config.wrc.startLayoutDelay')}
            </label>
            <input
              type="number"
              className="uu-input w-100"
              value={cfg.startLayoutSendDelaySec}
              onChange={(e) => onUpdateField?.('startLayoutSendDelaySec', e.target.value)}
            />
          </div>

          {showAllowStartDesynced ? (
            <label className="uu-check mt-16">
              <input
                type="checkbox"
                checked={!!cfg.allowStartDesynced}
                onChange={(e) => onUpdateField?.('allowStartDesynced', !!e.target.checked)}
              />
              {t('config.unreal.allowStartDesynced')}
            </label>
          ) : null}
        </div>
      </div>
    </div>
  );
}
