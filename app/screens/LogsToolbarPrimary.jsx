function LogsToolbarPrimary({
  levels,
  levelFilter,
  limit,
  auto,
  busy,
  t,
  onToggleLevel,
  onLimitChange,
  onAutoChange,
  onRefresh,
}) {
  return (
    <div className="uu-toolbar">
      <div className="uu-row gap-8">
        <div className="uu-chip-group">
          {levels.map((level) => (
            <button
              key={level}
              className={`uu-chip ${levelFilter.has(level) ? 'chip-on' : 'chip-off'} lvl-${level}`}
              onClick={() => onToggleLevel(level)}
            >
              {level}
            </button>
          ))}
        </div>

        <input
          className="uu-input w-100"
          type="number"
          min={50}
          max={5000}
          value={limit}
          onChange={(e) => onLimitChange(e.target.value)}
          title={t('logs.toolbar.maxLinesTitle')}
        />

        <label className="uu-check">
          <input
            type="checkbox"
            checked={auto}
            onChange={(e) => onAutoChange(!!e.target.checked)}
          />
          {t('logs.toolbar.autoRefresh')}
        </label>

        {!auto ? (
          <button className="uu-btn" onClick={onRefresh} disabled={busy}>
            {busy ? '...' : t('logs.toolbar.refresh')}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export { LogsToolbarPrimary };
