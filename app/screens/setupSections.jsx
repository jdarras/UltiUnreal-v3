const GROUP_TITLE_STYLE = { marginBottom: '12px' };
const ROW_ALIGN_CENTER_STYLE = { alignItems: 'center' };

function MachineGroupSection({ title, emptyText, list, segment, renderCard }) {
  return (
    <div className="uu-section">
      <h3 className="uu-h3 uu-block-title" style={GROUP_TITLE_STYLE}>
        {title}
      </h3>
      {list.length === 0 ? (
        <div className="uu-muted">{emptyText}</div>
      ) : (
        list.map((machine, idx) => renderCard(machine, segment, idx))
      )}
    </div>
  );
}

function UnknownDetectedSection({ t, unknownDetected, addDetectedMachine }) {
  if (!unknownDetected.length) return null;
  return (
    <div className="uu-section">
      <h3 className="uu-h3 uu-block-title">{t('setup.server.detectedUnknown')}</h3>
      <div className="uu-list">
        {unknownDetected.map((detected) => (
          <div key={detected.ip} className="uu-card uu-row" style={ROW_ALIGN_CENTER_STYLE}>
            <div className="uu-col">
              <div className="uu-item-title">{detected.name || detected.ip}</div>
              <div className="uu-item-sub">{detected.ip}</div>
              {detected.ts ? (
                <div className="uu-item-sub">
                  {t('setup.server.detectedAt').replace('{ts}', detected.ts)}
                </div>
              ) : null}
            </div>
            <div className="uu-col uu-actions">
              <button className="uu-btn" onClick={() => addDetectedMachine(detected)}>
                {t('setup.server.addDetected')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export {
  MachineGroupSection,
  UnknownDetectedSection,
};
