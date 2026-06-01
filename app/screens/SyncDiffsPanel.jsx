const SYNC_DIFF_TYPES = ['added', 'modified', 'removed'];
const SYNC_DIFF_LABEL_KEYS = {
  added: 'sync.diff.added',
  modified: 'sync.diff.modified',
  removed: 'sync.diff.removed',
};

function SyncDiffSection({
  ip,
  type,
  items,
  isOpen,
  isRenderMode,
  isBusy,
  isChecked,
  onToggleSection,
  onBulkSelect,
  onToggleFileSelection,
  t,
}) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return null;
  const labelKey = SYNC_DIFF_LABEL_KEYS[type];
  if (!labelKey) return null;

  return (
    <div className="uu-sync-diff-block">
      <div className="uu-sync-diff-title">
        <button
          type="button"
          className="uu-sync-diff-toggle"
          onClick={() => onToggleSection(ip, type)}
        >
          {isOpen(type) ? 'v' : '>'}
        </button>
        <span className="uu-sync-diff-label">
          {t(labelKey, { count: list.length })}
        </span>
        {!isRenderMode && (
          <>
            <button
              type="button"
              className="uu-sync-diff-bulk"
              onClick={() => onBulkSelect(ip, type, true)}
              disabled={isBusy}
            >
              Tout
            </button>
            <button
              type="button"
              className="uu-sync-diff-bulk"
              onClick={() => onBulkSelect(ip, type, false)}
              disabled={isBusy}
            >
              Aucun
            </button>
          </>
        )}
      </div>
      {isOpen(type) && (
        <div className="uu-sync-diff-list">
          {list.map((rel) => (
            <label key={rel} className="uu-sync-diff-item">
              {!isRenderMode ? (
                <input
                  type="checkbox"
                  checked={isChecked(type, rel)}
                  disabled={isBusy}
                  onChange={() => onToggleFileSelection(ip, type, rel)}
                />
              ) : null}{' '}
              <span className="uu-sync-diff-path">{rel}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function SyncDiffsPanel({
  ip,
  isRenderMode,
  isBusy,
  added,
  modified,
  removed,
  selection,
  fold,
  onToggleSection,
  onBulkSelect,
  onToggleFileSelection,
  t,
}) {
  const hasAnyDiffs = !isRenderMode && (added.length > 0 || modified.length > 0 || removed.length > 0);
  if (!hasAnyDiffs) return null;

  const selectedAdded = selection?.added || {};
  const selectedModified = selection?.modified || {};
  const selectedRemoved = selection?.removed || {};
  const isOpen = (type) => (fold?.[type] === undefined ? true : !!fold[type]);
  const isChecked = (type, rel) => {
    if (type === 'added') return selectedAdded[rel] !== false;
    if (type === 'modified') return selectedModified[rel] !== false;
    if (type === 'removed') return selectedRemoved[rel] !== false;
    return true;
  };

  return (
    <div className="uu-sync-diffs mt-8">
      {SYNC_DIFF_TYPES.map((diffType) => (
        <SyncDiffSection
          key={diffType}
          ip={ip}
          type={diffType}
          items={diffType === 'added' ? added : diffType === 'modified' ? modified : removed}
          isOpen={isOpen}
          isRenderMode={isRenderMode}
          isBusy={isBusy}
          isChecked={isChecked}
          onToggleSection={onToggleSection}
          onBulkSelect={onBulkSelect}
          onToggleFileSelection={onToggleFileSelection}
          t={t}
        />
      ))}
    </div>
  );
}

export default SyncDiffsPanel;
