const GRID_ONE_AUTO_STYLE = { gridTemplateColumns: '1fr auto' };
const PROXY_OPTIONS_ROW_STYLE = { alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' };
const PROXY_OPTION_FIELD_STYLE = { minWidth: '250px', maxWidth: '340px' };

export default function ConfigPostprodSection({
  t,
  SectionTitleComponent,
  renderOutputDir = '',
  onChangeRenderOutputDir,
  onBrowseRenderOutputDir,
  isPostprodMode = false,
  detectedScanBusy = false,
  canScanDetectedRenders = false,
  onScanDetectedRenders,
  proxyEnabled = false,
  onToggleProxyEnabled,
  proxyResolution = '50',
  onChangeProxyResolution,
  proxyCrf = '23',
  onChangeProxyCrf,
  proxyRegenBusy = false,
  onRegenerateAllProxies,
  proxyRegenResult = '',
}) {
  const titleNode = SectionTitleComponent
    ? (
        <SectionTitleComponent>
          {t('config.postprod.sectionTitle')}
        </SectionTitleComponent>
      )
    : (
        <h3 className="uu-h3 uu-block-title">
          {t('config.postprod.sectionTitle')}
        </h3>
      );

  return (
    <div className="uu-section mt-16">
      {titleNode}
      <div className="uu-grid-field uu-maxw-720 mt-12">
        <label className="uu-label">
          {t('config.renders.outputDir')}
        </label>
        <div className="uu-grid-2" style={GRID_ONE_AUTO_STYLE}>
          <input
            className="uu-input"
            value={renderOutputDir}
            onChange={(e) => onChangeRenderOutputDir?.(e.target.value)}
            placeholder={t('config.renders.outputDirPlaceholder')}
          />
          <button
            type="button"
            className="uu-btn"
            onClick={() => { void onBrowseRenderOutputDir?.(); }}
          >
            {t('common.browse')}
          </button>
        </div>
      </div>
      {isPostprodMode ? (
        <div className="uu-row mt-12">
          <button
            type="button"
            className="uu-btn-ghost"
            disabled={detectedScanBusy || !canScanDetectedRenders}
            onClick={() => { void onScanDetectedRenders?.(); }}
          >
            {detectedScanBusy
              ? t('common.loading')
              : t('postprod.renders.detectedScan.button')}
          </button>
        </div>
      ) : null}

      <div className="uu-grid-field uu-maxw-720 mt-16">
        <label className="uu-label">
          {t('config.postprod.proxy.title')}
        </label>

        <label className="uu-check mt-8">
          <input
            type="checkbox"
            checked={!!proxyEnabled}
            onChange={(e) => onToggleProxyEnabled?.(!!e.target.checked)}
          />
          {t('config.postprod.proxy.enabled')}
        </label>

        {proxyEnabled ? (
          <>
            <div className="uu-row mt-12" style={PROXY_OPTIONS_ROW_STYLE}>
              <div className="uu-grid-field" style={PROXY_OPTION_FIELD_STYLE}>
                <label className="uu-label">{t('config.postprod.proxy.resolution')}</label>
                <select
                  className="uu-select"
                  value={String(proxyResolution)}
                  onChange={(e) => onChangeProxyResolution?.(e.target.value)}
                >
                  <option value="75">{t('config.postprod.proxy.resolutionHigh')}</option>
                  <option value="50">{t('config.postprod.proxy.resolutionMedium')}</option>
                  <option value="25">{t('config.postprod.proxy.resolutionLow')}</option>
                </select>
              </div>

              <div className="uu-grid-field" style={PROXY_OPTION_FIELD_STYLE}>
                <label className="uu-label">{t('config.postprod.proxy.quality')}</label>
                <select
                  className="uu-select"
                  value={String(proxyCrf)}
                  onChange={(e) => onChangeProxyCrf?.(e.target.value)}
                >
                  <option value="18">{t('config.postprod.proxy.qualityHigh')}</option>
                  <option value="23">{t('config.postprod.proxy.qualityMedium')}</option>
                  <option value="28">{t('config.postprod.proxy.qualityLow')}</option>
                </select>
              </div>

              <div className="uu-grid-field">
                <button
                  type="button"
                  className="uu-btn"
                  disabled={proxyRegenBusy}
                  onClick={() => { void onRegenerateAllProxies?.(); }}
                >
                  {proxyRegenBusy
                    ? t('config.postprod.proxy.regenerating')
                    : t('config.postprod.proxy.regenerateAll')}
                </button>
              </div>
            </div>

            {proxyRegenResult ? <div className="uu-msg ok mt-8">{proxyRegenResult}</div> : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
