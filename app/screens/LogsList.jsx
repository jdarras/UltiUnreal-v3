function LogsList({
  t,
  busy,
  visibleLogs,
  pageStart,
  expanded,
  onToggleExpand,
  formatTs,
}) {
  return (
    <div className="log-list">
      {visibleLogs.length === 0 ? (
        <div className="uu-muted mt-12">
          {busy ? t('logs.loading') : t('logs.empty')}
        </div>
      ) : null}

      {visibleLogs.map((item, index) => {
        const globalIndex = pageStart + index;
        return (
          <div key={globalIndex} className={`log-row lvl-${String(item.level || 'info')}`}>
            <div className="log-meta">
              <span className="log-ts">{item.tsLocal || formatTs(item.ts)}</span>
              {item.src ? <span className={`log-src src-${item.src}`}>{item.src}</span> : null}
              {item.host ? <span className="log-host">{item.host}</span> : null}
              {item.action ? <span className="log-action">{item.action}</span> : null}
            </div>
            <div className="log-msg">{item.message || ''}</div>

            {item.data && Object.keys(item.data).length > 0 ? (
              <>
                <button className="uu-btn" onClick={() => onToggleExpand(globalIndex)}>
                  {expanded[globalIndex]
                    ? t('logs.details.hide')
                    : t('logs.details.show')}
                </button>
                {expanded[globalIndex] ? (
                  <pre className="log-data">{JSON.stringify(item.data, null, 2)}</pre>
                ) : null}
              </>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export { LogsList };
