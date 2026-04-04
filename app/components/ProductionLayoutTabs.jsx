export default function ProductionLayoutTabs({
  layouts,
  activeLayoutId,
  editingLayoutId,
  layoutNameDraft,
  editMode,
  maxLayoutNameLen,
  layoutDragRef,
  layoutNameInputRef,
  onSelectLayout,
  onBeginLayoutRename,
  onCommitLayoutRename,
  onCancelLayoutRename,
  onLayoutNameDraftChange,
  onDuplicateLayout,
  onDeleteLayout,
  onReorderLayouts,
  onAddLayout,
  t
}) {
  return (
    <div className="prod-layout-tabs">
      <div className="prod-layout-tabs-list">
        {(layouts || []).map((layout, idx) => {
          const isActive = layout.id === activeLayoutId;
          const isEditing = editingLayoutId === layout.id;
          const customColor = layout?.color ? String(layout.color) : '';
          const activeColor = customColor || 'var(--uu-color-green)';
          const style = isActive
            ? { backgroundColor: activeColor, borderColor: activeColor, color: '#fff' }
            : customColor
              ? { backgroundColor: customColor, borderColor: customColor, color: '#fff' }
              : {};
          return (
            <div
              key={layout.id}
              className={`prod-layout-tab${isActive ? ' active' : ''}${editMode ? ' is-editable' : ''}`}
              style={style}
              draggable={editMode && !isEditing}
              onDragStart={(e) => {
                if (!editMode || isEditing) return;
                layoutDragRef.current = { idx, id: layout.id };
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/uu-layout-id', layout.id);
              }}
              onDragOver={(e) => {
                if (!editMode) return;
                e.preventDefault();
              }}
              onDrop={(e) => {
                if (!editMode) return;
                e.preventDefault();
                const info = layoutDragRef.current;
                layoutDragRef.current = null;
                if (!info || info.idx === idx) return;
                onReorderLayouts(info.idx, idx);
              }}
              onDragEnd={() => {
                layoutDragRef.current = null;
              }}
              onClick={() => onSelectLayout(layout.id)}
              onDoubleClick={(e) => {
                if (!editMode) return;
                e.preventDefault();
                e.stopPropagation();
                onBeginLayoutRename(layout);
              }}
            >
              {isEditing ? (
                <input
                  ref={layoutNameInputRef}
                  className="uu-input prod-layout-tab-input"
                  value={layoutNameDraft}
                  maxLength={maxLayoutNameLen}
                  onChange={(e) => onLayoutNameDraftChange(e.target.value)}
                  onBlur={() => onCommitLayoutRename(layout.id, layoutNameDraft)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      e.currentTarget.blur();
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      onCancelLayoutRename();
                    }
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onDoubleClick={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="prod-layout-tab-name">
                  {layout.isStart ? (
                    <span
                      className="prod-layout-start-pill"
                      aria-label={t('production.layout.useAsStart') || 'Start Layout'}
                      title={t('production.layout.useAsStart') || 'Start Layout'}
                      style={{ color: '#fff' }}
                    >
                      {'\u25B6'}
                    </span>
                  ) : null}
                  {layout.name}
                </span>
              )}

              {editMode && !isEditing ? (
                <div
                  className="prod-layout-tab-actions"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="uu-btn uu-btn-square"
                    title={t('production.layouts.duplicate')}
                    onClick={() => onDuplicateLayout(layout.id)}
                  >
                    D
                  </button>
                  <button
                    className="uu-btn uu-btn-square"
                    title={t('production.layouts.delete')}
                    onClick={() => onDeleteLayout(layout.id)}
                  >
                    {'\u00d7'}
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {editMode ? (
        <div className="prod-layout-tabs-actions">
          <button className="uu-btn" onClick={onAddLayout}>
            {t('production.layouts.add')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
