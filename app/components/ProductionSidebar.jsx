import React from 'react';
import BindingPicker from '../widgets/bindingpicker.jsx';
import { ButtonEditorLeft, ButtonLabelEditor } from '../widgets/buttonwidget.jsx';
import { ToggleEditorLeftExtras, ToggleEditorRight, ToggleLabelEditor } from '../widgets/togglewidget.jsx';
import { TextEditorRight, TextLabelEditor, TextEditorLeftExtras } from '../widgets/textwidget.jsx';
import { ColorEditorRight, ColorLabelEditor, ColorEditorLeftExtras } from '../widgets/colorwidget.jsx';
import { SliderEditorRight, SliderEditorLeftExtras, SliderLabelEditor } from '../widgets/sliderwidget.jsx';
import { DropdownEditorRight, DropdownLabelEditor, DropdownEditorLeftExtras } from '../widgets/dropdownwidget.jsx';
import { VectorEditorRight, VectorLabelEditor, VectorEditorLeftExtras } from '../widgets/vectorwidget.jsx';
import {
  JoystickEditLeft,
  JoystickLabelEditor,
  JoystickEditorRight
} from '../widgets/joystickwidget.jsx';
import { TransformWidgetEditorRight, TransformLabelEditor, TransformEditorLeftExtras } from '../widgets/transformwidget.jsx';
import { ZoneEditorRight, ZoneNoteEditor } from '../widgets/zonewidget.jsx';
import { EnumEditorRight, EnumLabelEditor, EnumEditorLeftExtras } from '../widgets/enumwidget.jsx';
import { BrowseEditorLeftExtras, BrowseLabelEditor, BrowseEditorRight } from '../widgets/browsewidget.jsx';
import { TimelineEditorRight } from '../widgets/timelinewidget.jsx';
import { colorClass } from '../utils/colors';
import {
  getButtonDefaultArgsTitlePluralLabel,
  getButtonDefaultArgsTitleSingularLabel,
  getLayoutColorLabel,
  getLayoutEditTitleLabel,
  getLayoutExportLabel,
  getLayoutImportLabel,
  getLayoutNameLabel,
  getLayoutUseAsStartLabel,
  getPaletteAddBrowseLabel,
  getPaletteAddTimelineLabel,
} from './componentI18n';

const PRODUCTION_LAYOUT_TITLE_ROW_STYLE = { flexWrap: 'wrap' };
const PRODUCTION_LAYOUT_CONTENT_ROW_STYLE = { alignItems: 'flex-start', flexWrap: 'wrap' };
const PRODUCTION_LAYOUT_FIELDS_COLUMN_STYLE = { flex: '1 1 260px', minWidth: '240px' };
const PRODUCTION_LAYOUT_LABEL_STYLE = { width: '60px' };
const PRODUCTION_LAYOUT_NAME_INPUT_STYLE = { width: '220px' };
const PRODUCTION_LAYOUT_ACTIONS_COLUMN_STYLE = { flex: '0 0 200px' };

export default function ProductionSidebar({
  editMode,
  leftPanelMode,
  setLeftPanelMode,
  addWidget,
  selected,
  updateSelected,
  updateBinding,
  updateWidget,
  hosts,
  presetData,
  setValues,
  common,
  t,
  layoutMeta,
  onLayoutMetaChange,
  onExportLayout,
  onImportLayout,
  startLayoutToggleBusy,
  exportImportBusy
}) {
  const [layoutNameDraft, setLayoutNameDraft] = React.useState(
    () => String(layoutMeta?.name || '')
  );
  const companionLayoutId = String(layoutMeta?.id || '').trim();
  const [layoutNameDirty, setLayoutNameDirty] = React.useState(false);
  const buttonDefaultArgsTitlePlural = getButtonDefaultArgsTitlePluralLabel(t);
  const buttonDefaultArgsTitleSingular = getButtonDefaultArgsTitleSingularLabel(t);
  const paletteAddBrowseLabel = getPaletteAddBrowseLabel(t);
  const paletteAddTimelineLabel = getPaletteAddTimelineLabel(t);
  const layoutEditTitle = getLayoutEditTitleLabel(t);
  const layoutNameLabel = getLayoutNameLabel(t);
  const layoutColorLabel = getLayoutColorLabel(t);
  const layoutUseAsStartLabel = getLayoutUseAsStartLabel(t);
  const layoutExportLabel = getLayoutExportLabel(t);
  const layoutImportLabel = getLayoutImportLabel(t);

  React.useEffect(() => {
    // Changement de layout actif: on réinitialise l'édition locale.
    setLayoutNameDraft(String(layoutMeta?.name || ''));
    setLayoutNameDirty(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- réinitialisation seulement au changement de layout actif
  }, [layoutMeta?.id]);

  React.useEffect(() => {
    // MAJ externe du nom (import, rename onglet, etc.) tant qu'on n'est pas en saisie locale.
    if (layoutNameDirty) return;
    setLayoutNameDraft(String(layoutMeta?.name || ''));
  }, [layoutMeta?.name, layoutNameDirty]);

  const commitLayoutName = React.useCallback(() => {
    const next = String(layoutNameDraft || '');
    const current = String(layoutMeta?.name || '');
    if (next === current) {
      setLayoutNameDirty(false);
      return;
    }
    onLayoutMetaChange?.({ name: next });
    setLayoutNameDirty(false);
  }, [layoutNameDraft, layoutMeta?.name, onLayoutMetaChange]);

  const buttonDefaultArgsHeader = React.useMemo(() => {
    if (selected?.type !== 'button') return '';
    const displayName = String(selected?.binding?.displayName || '').trim();
    const ownerName = String(selected?.binding?.ownerName || '').trim();
    const funcs = Array.isArray(presetData?.funcs) ? presetData.funcs : [];

    const selectedFunc = funcs.find((f) => {
      if (String(f?.displayName || '').trim() !== displayName) return false;
      if (!ownerName) return true;
      return String(f?.ownerName || '').trim() === ownerName;
    });

    const argCount = Array.isArray(selectedFunc?.parameters)
      ? selectedFunc.parameters.length
      : 0;

    return argCount > 1
      ? buttonDefaultArgsTitlePlural
      : buttonDefaultArgsTitleSingular;
  }, [
    buttonDefaultArgsTitlePlural,
    buttonDefaultArgsTitleSingular,
    presetData?.funcs,
    selected?.binding?.displayName,
    selected?.binding?.ownerName,
    selected?.type
  ]);

  if (!editMode) return null;

  return (
    <>
    <div className="uu-card mt-12">
      <div className="uu-row uu-gap-8">
        <button
          className={`uu-btn ${leftPanelMode === 'palette' ? 'prod-toggle-active' : ''}`}
          onClick={() => setLeftPanelMode('palette')}
        >
          {t('production.palette.tab')}
        </button>

        <button
          className={`uu-btn ${leftPanelMode === 'editor' ? 'prod-toggle-active' : ''}`}
          onClick={() => setLeftPanelMode('editor')}
        >
          {t('production.editor.tab')}
        </button>
      </div>

      {leftPanelMode === 'palette' && (
        <>
          <div className="uu-row mt-12">
            <button
              className="uu-btn"
              onClick={() => addWidget('button')}
              draggable
              onDragStart={(e) => {
                if (!editMode) return;
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('text/uu-widget-type', 'button');
              }}
            >
              {t('production.palette.addButton')}
            </button>

            <button
              className="uu-btn"
              onClick={() => addWidget('text')}
              draggable
              onDragStart={(e) => {
                if (!editMode) return;
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('text/uu-widget-type', 'text');
              }}
            >
              {t('production.palette.addText')}
            </button>

            <button
              className="uu-btn"
              onClick={() => addWidget('slider')}
              draggable
              onDragStart={(e) => {
                if (!editMode) return;
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('text/uu-widget-type', 'slider');
              }}
            >
              {t('production.palette.addSlider')}
            </button>

            <button
              className="uu-btn"
              onClick={() => addWidget('toggle')}
              draggable
              onDragStart={(e) => {
                if (!editMode) return;
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('text/uu-widget-type', 'toggle');
              }}
            >
              {t('production.palette.addToggle')}
            </button>

            <button
              className="uu-btn"
              onClick={() => addWidget('vector')}
              draggable
              onDragStart={(e) => {
                if (!editMode) return;
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('text/uu-widget-type', 'vector');
              }}
            >
              {t('production.palette.addVector')}
            </button>

            <button
              className="uu-btn"
              onClick={() => addWidget('transform')}
              draggable
              onDragStart={(e) => {
                if (!editMode) return;
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('text/uu-widget-type', 'transform');
              }}
            >
              {t('production.palette.addTransform')}
            </button>

            <button
              className="uu-btn"
              onClick={() => addWidget('joystick')}
              draggable
              onDragStart={(e) => {
                if (!editMode) return;
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('text/uu-widget-type', 'joystick');
              }}
            >
              {t('production.palette.addJoystick')}
            </button>

            <button
              className="uu-btn"
              onClick={() => addWidget('color')}
              draggable
              onDragStart={(e) => {
                if (!editMode) return;
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('text/uu-widget-type', 'color');
              }}
            >
              {t('production.palette.addColor')}
            </button>

            <button
              className="uu-btn"
              onClick={() => addWidget('dropdown')}
              draggable
              onDragStart={(e) => {
                if (!editMode) return;
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('text/uu-widget-type', 'dropdown');
              }}
            >
              {t('production.palette.addDropdown')}
            </button>

            <button
              className="uu-btn"
              onClick={() => addWidget('enum')}
              draggable
              onDragStart={(e) => {
                if (!editMode) return;
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('text/uu-widget-type', 'enum');
              }}
            >
              {t('production.palette.addEnum')}
            </button>

            <button
              className="uu-btn"
              onClick={() => addWidget('browse')}
              draggable
              onDragStart={(e) => {
                if (!editMode) return;
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('text/uu-widget-type', 'browse');
              }}
            >
              {paletteAddBrowseLabel}
            </button>

            <button
              className="uu-btn"
              onClick={() => addWidget('timeline')}
              draggable
              onDragStart={(e) => {
                if (!editMode) return;
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('text/uu-widget-type', 'timeline');
              }}
            >
              {paletteAddTimelineLabel}
            </button>

            <button
              className="uu-btn"
              onClick={() => addWidget('zone')}
              draggable
              onDragStart={(e) => {
                if (!editMode) return;
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('text/uu-widget-type', 'zone');
              }}
            >
              {t('production.palette.addZone')}
            </button>
          </div>
        </>
      )}

      {leftPanelMode === 'editor' && (
        <>
          {!selected && (
            <div className="uu-muted">
              {t('production.msg.selectWidget')}
            </div>
          )}

          {selected && (
            <div
              className={`prod-editor-grid${
                selected.type === 'timeline' ? ' is-timeline' : ''
              }`}
            >
              <div className="prod-editor-left uu-list">
                {selected.type === 'text' && (
                  <TextLabelEditor
                    selected={selected}
                    updateSelected={updateSelected}
                  />
                )}

                {selected.type === 'slider' && (
                  <SliderLabelEditor
                    selected={selected}
                    updateSelected={updateSelected}
                  />
                )}

                {selected.type === 'button' && (
                  <ButtonLabelEditor
                    selected={selected}
                    updateSelected={updateSelected}
                  />
                )}

                {selected.type === 'color' && (
                  <ColorLabelEditor
                    selected={selected}
                    updateSelected={updateSelected}
                  />
                )}

                {selected.type === 'dropdown' && (
                  <DropdownLabelEditor
                    selected={selected}
                    updateSelected={updateSelected}
                  />
                )}

                {selected.type === 'vector' && (
                  <VectorLabelEditor
                    selected={selected}
                    updateSelected={updateSelected}
                  />
                )}

                {selected.type === 'enum' && (
                  <EnumLabelEditor
                    selected={selected}
                    updateSelected={updateSelected}
                  />
                )}

                {selected.type === 'toggle' && (
                  <ToggleLabelEditor
                    selected={selected}
                    updateSelected={updateSelected}
                  />
                )}

                {selected.type === 'transform' && (
                  <TransformLabelEditor
                    selected={selected}
                    updateSelected={updateSelected}
                  />
                )}

                {selected.type === 'joystick' && (
                  <JoystickLabelEditor
                    selected={selected}
                    updateSelected={updateSelected}
                  />
                )}

                {selected.type === 'zone' && (
                  <ZoneEditorRight
                    selected={selected}
                    updateSelected={updateSelected}
                  />
                )}

                {selected.type === 'browse' && (
                  <BrowseLabelEditor
                    selected={selected}
                    updateSelected={updateSelected}
                  />
                )}

                    {selected.type !== 'zone' && selected.type !== 'timeline' && (
                  <div className="uu-row">
                    <div
                      className={`uu-label w-160 ${
                        !Object.values(selected.targets || {}).some(Boolean)
                          ? 'uu-label-error'
                          : ''
                      }`}
                    >
                      {t('production.targets.label')}
                    </div>
                    <div className="uu-col">
                      {hosts.length === 0 && (
                        <div className="uu-muted">
                          {t('production.targets.noHosts')}
                        </div>
                      )}
                      <div className="uu-list">
                        {hosts.map((m, idx) => {
                          const ip = String(m?.ip || '');
                          if (!ip) return null;
                          const checked = Boolean((selected.targets || {})[ip]);
                          const label = m?.name
                            ? `${m.name} \u2014 ${ip}`
                            : `${t('production.targets.defaultMachineName')} ${idx + 1} \u2014 ${ip}`;
                          return (
                            <label
                              key={ip}
                              className="uu-row uu-align-center uu-gap-8"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const t = {
                                    ...(selected.targets || {})
                                  };
                                  t[ip] = e.target.checked;
                                  updateSelected({ targets: t });
                                }}
                              />
                              <span
                                className={`uu-pastille ${colorClass(m.color)}`}
                              />
                              <span>{label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {selected.type === 'text' && (
                  <TextEditorLeftExtras
                    selected={selected}
                    updateSelected={updateSelected}
                    layoutId={companionLayoutId}
                  />
                )}

                {selected.type === 'joystick' && (
                  <JoystickEditLeft
                    widget={selected}
                    updateSelected={updateSelected}
                    layoutId={companionLayoutId}
                  />
                )}

                {selected.type === 'slider' && (
                  <SliderEditorLeftExtras
                    selected={selected}
                    updateSelected={updateSelected}
                    layoutId={companionLayoutId}
                  />
                )}

                {selected.type === 'color' && (
                  <ColorEditorLeftExtras
                    selected={selected}
                    updateSelected={updateSelected}
                    layoutId={companionLayoutId}
                  />
                )}

                {selected.type === 'button' && (
                  <ButtonEditorLeft
                    selected={selected}
                    updateSelected={updateSelected}
                    layoutId={companionLayoutId}
                  />
                )}

                {selected.type === 'toggle' && (
                  <ToggleEditorLeftExtras
                    selected={selected}
                    updateSelected={updateSelected}
                    updateBinding={updateBinding}
                    layoutId={companionLayoutId}
                  />
                )}

                {selected.type === 'dropdown' && (
                  <DropdownEditorLeftExtras
                    selected={selected}
                    updateSelected={updateSelected}
                    layoutId={companionLayoutId}
                  />
                )}

                {selected.type === 'vector' && (
                  <VectorEditorLeftExtras
                    selected={selected}
                    updateSelected={updateSelected}
                    layoutId={companionLayoutId}
                  />
                )}

                {selected.type === 'enum' && (
                  <EnumEditorLeftExtras
                    selected={selected}
                    updateSelected={updateSelected}
                    layoutId={companionLayoutId}
                  />
                )}

                {selected.type === 'transform' && (
                  <TransformEditorLeftExtras
                    selected={selected}
                    updateSelected={updateSelected}
                    layoutId={companionLayoutId}
                  />
                )}

                {selected.type === 'browse' && (
                  <BrowseEditorLeftExtras selected={selected} layoutId={companionLayoutId} />
                )}
              </div>

              <div
                className={
                  'prod-editor-right uu-list' +
                  (selected.type === 'toggle' ? ' prod-editor-right-toggle' : '') +
                  (selected.type === 'text' ? ' prod-editor-right-text' : '') +
                  (selected.type === 'transform' ? ' prod-editor-right-transform' : '') +
                  (selected.type === 'slider' ? ' prod-editor-right-slider' : '') +
                  (selected.type === 'vector' ? ' prod-editor-right-vector' : '') +
                  (selected.type === 'dropdown' ? ' prod-editor-right-dropdown' : '') +
                  (selected.type === 'joystick' ? ' prod-editor-right-joystick' : '') +
                  (selected.type === 'enum' ? ' prod-editor-right-enum' : '') +
                  (selected.type === 'browse' ? ' prod-editor-right-browse' : '') +
                  (selected.type === 'timeline' ? ' prod-editor-right-timeline' : '')
                }
              >
                {selected.type === 'text' ? (
                  <TextEditorRight
                    selected={selected}
                    presetData={presetData}
                    updateBinding={updateBinding}
                    updateSelected={updateSelected}
                    setValues={setValues}
                  />
                ) : selected.type === 'color' ? (
                  <ColorEditorRight
                    selected={selected}
                    presetData={presetData}
                    updateBinding={updateBinding}
                    updateSelected={updateSelected}
                    setValues={setValues}
                  />
                ) : selected.type === 'transform' ? (
                  <TransformWidgetEditorRight
                    selected={selected}
                    presetData={presetData}
                    updateBinding={updateBinding}
                    updateSelected={updateSelected}
                  />
                ) : selected.type === 'zone' ? (
                  <ZoneNoteEditor
                    selected={selected}
                    updateSelected={updateSelected}
                  />
                ) : selected.type === 'joystick' ? (
                  <JoystickEditorRight
                    selected={selected}
                    presetData={presetData}
                    updateBinding={updateBinding}
                    updateSelected={updateSelected}
                  />
                ) : selected.type === 'browse' ? (
                  <BrowseEditorRight
                    selected={selected}
                    presetData={presetData}
                    updateSelected={updateSelected}
                    updateBinding={updateBinding}
                  />
                ) : selected.type === 'timeline' ? (
                  <TimelineEditorRight
                    widget={selected}
                    hosts={hosts}
                    presetData={presetData}
                    updateWidget={updateWidget}
                    common={common}
                    layoutId={companionLayoutId}
                  />
                ) : (
                  <>
                    <BindingPicker
                      kind={
                        selected.type === 'button'
                          ? 'function'
                          : selected.type === 'toggle'
                          ? selected.binding?.kind || 'property'
                          : 'property'
                      }
                      presetData={presetData}
                      value={selected.binding}
                      onChange={updateBinding}
                      argsValueKey={
                        selected.type === 'button' ? 'argDefaults' : 'argValues'
                      }
                      argsHeaderLabel={
                        selected.type === 'button' ? buttonDefaultArgsHeader : ''
                      }
                      valueMode={
                        selected.type === 'slider'
                          ? 'slider'
                          : selected.type === 'vector'
                          ? 'vector'
                          : selected.type === 'transform'
                          ? 'transform'
                          : selected.type === 'color'
                          ? 'color'
                          : selected.type === 'toggle'
                          ? 'toggle'
                          : selected.type === 'dropdown'
                          ? 'dropdown'
                          : selected.type === 'enum'
                          ? 'enum'
                          : 'text'
                      }
                    />

                    {selected.type === 'slider' && (
                      <SliderEditorRight
                        selected={selected}
                        updateSelected={updateSelected}
                      />
                    )}

                    {selected.type === 'vector' && (
                      <VectorEditorRight
                        selected={selected}
                        updateSelected={updateSelected}
                      />
                    )}

                    {selected.type === 'toggle' && (
                      <ToggleEditorRight
                        selected={selected}
                        updateSelected={updateSelected}
                        updateBinding={updateBinding}
                        presetData={presetData}
                      />
                    )}

                    {selected.type === 'dropdown' && (
                      <DropdownEditorRight
                        selected={selected}
                        updateSelected={updateSelected}
                      />
                    )}

                    {selected.type === 'enum' && (
                      <EnumEditorRight
                        selected={selected}
                        updateSelected={updateSelected}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>

    <div className="uu-card mt-12">
      <div className="uu-row uu-align-center uu-gap-8" style={PRODUCTION_LAYOUT_TITLE_ROW_STYLE}>
        <strong className="uu-block-title">
          {layoutEditTitle}
        </strong>
      </div>
      <div className="uu-row uu-gap-12 mt-8" style={PRODUCTION_LAYOUT_CONTENT_ROW_STYLE}>
        <div className="uu-col uu-gap-8" style={PRODUCTION_LAYOUT_FIELDS_COLUMN_STYLE}>
          <div className="uu-row uu-align-center uu-gap-8">
            <span className="uu-label" style={PRODUCTION_LAYOUT_LABEL_STYLE}>{layoutNameLabel}</span>
            <input
              className="uu-input"
              style={PRODUCTION_LAYOUT_NAME_INPUT_STYLE}
              maxLength={24}
              value={layoutNameDraft}
              onChange={(e) => {
                setLayoutNameDraft(e.target.value);
                setLayoutNameDirty(true);
              }}
              onBlur={commitLayoutName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitLayoutName();
                  e.currentTarget.blur();
                  return;
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  setLayoutNameDraft(String(layoutMeta?.name || ''));
                  setLayoutNameDirty(false);
                  e.currentTarget.blur();
                }
              }}
            />
          </div>

          <div className="uu-row uu-align-center uu-gap-8">
            <span className="uu-label" style={PRODUCTION_LAYOUT_LABEL_STYLE}>{layoutColorLabel}</span>
            <input
              type="color"
              className="uu-input-color"
              value={layoutMeta?.color || '#1F2937'}
              onChange={(e) => onLayoutMetaChange?.({ color: e.target.value })}
            />
          </div>

          <label className="uu-check uu-row uu-gap-8 uu-align-center">
            <input
              type="checkbox"
              checked={!!layoutMeta?.isStart}
              onChange={(e) => onLayoutMetaChange?.({ isStart: !!e.target.checked })}
              disabled={!!startLayoutToggleBusy}
            />
            {layoutUseAsStartLabel}
          </label>
        </div>

        <div className="uu-col uu-gap-8" style={PRODUCTION_LAYOUT_ACTIONS_COLUMN_STYLE}>
          <button
            type="button"
            className="uu-btn"
            onClick={onExportLayout}
            disabled={!!exportImportBusy}
          >
            {layoutExportLabel}
          </button>
          <button
            type="button"
            className="uu-btn"
            onClick={onImportLayout}
            disabled={!!exportImportBusy}
          >
            {layoutImportLabel}
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
