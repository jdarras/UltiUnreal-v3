function LogsToolbarSecondary({
  t,
  exportBusy,
  onPurge,
  onExportJson,
  onExportTxt,
}) {
  return (
    <div className="uu-toolbar-sub">
      <button
        className="uu-btn"
        onClick={onPurge}
        title={t('logs.toolbar.purgeTooltip')}
      >
        {t('logs.toolbar.purgeButton')}
      </button>
      <div className="uu-row uu-gap-8">
        <button
          className="uu-btn"
          disabled={exportBusy}
          onClick={onExportJson}
          title={t('logs.toolbar.exportTooltip')}
        >
          {exportBusy ? '...' : t('logs.toolbar.exportJson')}
        </button>
        <button
          className="uu-btn"
          disabled={exportBusy}
          onClick={onExportTxt}
          title={t('logs.toolbar.exportTooltip')}
        >
          {exportBusy ? '...' : t('logs.toolbar.exportTxt')}
        </button>
      </div>
    </div>
  );
}

export { LogsToolbarSecondary };
