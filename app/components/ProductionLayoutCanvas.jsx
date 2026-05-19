import WidgetCard from '../widgets/widgetcard.jsx';

function buildProductionLayoutFreeStyle(layoutHeight) {
  return { minHeight: layoutHeight };
}

export default function ProductionLayoutCanvas({
  editMode,
  layoutHeight,
  layoutWidgets,
  widgets,
  presetData,
  dragState,
  setDragState,
  selectedId,
  setSelectedId,
  leftPanelMode,
  setLeftPanelMode,
  values,
  setValues,
  hosts,
  common,
  removeWidget,
  updateWidget,
  hasValidBinding,
  onDuplicateWidget,
  onDragStart,
  onDrop,
  onSizeChange,
  onZoneHeaderHeightChange,
  onLayoutMouseMove,
  onLayoutMouseUp,
  onLayoutMouseLeave,
  onLayoutDrop,
  t
}) {
  return (
    <div
      className="uu-card uu-card-prod-layout"
      onDragOver={(e) => e.preventDefault()}
    >
      <div
        className="prod-layout-free"
        style={buildProductionLayoutFreeStyle(layoutHeight)}
        onMouseMove={onLayoutMouseMove}
        onMouseUp={onLayoutMouseUp}
        onMouseLeave={onLayoutMouseLeave}
        onDrop={onLayoutDrop}
      >
        {widgets.length === 0 && (
          <div className="uu-muted">
            {t('production.msg.noWidget')}
          </div>
        )}
        {layoutWidgets
          .slice()
          .sort((a, b) => {
            // Les zones d'abord (fond), les autres ensuite
            if (a.type === 'zone' && b.type !== 'zone') return -1;
            if (a.type !== 'zone' && b.type === 'zone') return 1;
            return 0;
          })
          .map((w) => (
            <WidgetCard
              key={w.id}
              widget={w}
              presetData={presetData}
              editMode={editMode}
              selectedId={selectedId}
              setSelectedId={setSelectedId}
              leftPanelMode={leftPanelMode}
              setLeftPanelMode={setLeftPanelMode}
              values={values}
              setValues={setValues}
              hosts={hosts}
              common={common}
              removeWidget={removeWidget}
              updateWidget={updateWidget}
              hasValidBinding={hasValidBinding}
              onDuplicate={onDuplicateWidget}
              dragState={dragState}
              setDragState={setDragState}
              onDragStart={onDragStart}
              onDrop={onDrop}
              onSizeChange={onSizeChange}
              onZoneHeaderHeightChange={onZoneHeaderHeightChange}
            />
          ))}
      </div>
    </div>
  );
}
