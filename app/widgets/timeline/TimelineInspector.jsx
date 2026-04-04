import React from 'react';
import { TimelineWidgetEditorPanel } from './timelineeditor-widgeteditor.jsx';
import { ColorWheelPopover } from '../colorwidget.jsx';
import { formatInputNumber } from './timelinewidget-shared.js';
import { hexToRgb, rgbToHex } from './colorUtils';
import { computeEnumWidth } from './uiDisplayUtils';
import { useMemo } from 'react';
import { getCompanionBaseUrl } from '../../utils/agent';

export function TimelineInspector({
  t,
  timelineWidgetId,
  layoutId,
  missingSelectedWidget,
  selectedWidget,
  selectedTrack,
  selectedMeta,
  selectedKeyframe,
  selectedKeyframeArgs,
  selectedKey,
  selectedChannelId,
  selectedChannelLabel,
  selectedBundle,
  isLinkedSelected,
  isNumericValue,
  useTimecodeView,
  playheadFrame,
  bundleFrameDraft,
  setBundleFrameDraft,
  commitBundleFrameDraft,
  bundleValueDrafts,
  setBundleValueDrafts,
  commitBundleValueDraft,
  removeChannelKeyframeAt,
  addChannelKeyframeAt,
  keyframeFrameDraft,
  setKeyframeFrameDraft,
  commitKeyframeFrameDraft,
  keyframeValueDraft,
  setKeyframeValueDraft,
  commitKeyframeValueDraft,
  handleRemoveKeyframe,
  handleValueChange,
  applyColorToBundle,
  colorPickerState,
  colorPickerOpen,
  setColorPickerOpen,
  argColorPicker,
  setArgColorPicker,
  presetData,
  updateSelectedBinding,
  updateSelectedWidget,
  updateSelectedKeyframeArgs,
  hosts,
  hasSelectedTargets,
  selectedTargets,
  syncTimelineWidgetTargets,
  colorClass,
  browseFileInputRef
}) {
  const enumOptions = useMemo(() => {
    return Array.isArray(selectedMeta?.options)
      ? selectedMeta.options.map((opt, idx) => {
          if (opt && typeof opt === 'object') {
            const value = opt.value ?? opt.id ?? opt.label ?? '';
            const label = opt.label ?? opt.value ?? opt.id ?? '';
            return {
              value: String(value ?? ''),
              label: String(label ?? ''),
              key: `${idx}-${String(value ?? '')}`
            };
          }
          const value = String(opt ?? '');
          return { value, label: value, key: `${idx}-${value}` };
        })
      : [];
  }, [selectedMeta?.options]);

  const enumWidthPx = useMemo(() => computeEnumWidth(enumOptions), [enumOptions]);

  const companionUrl = useMemo(() => {
    const wid = String(timelineWidgetId || '').trim();
    if (!wid) return '';
    try {
      const base = getCompanionBaseUrl();
      const query = layoutId
        ? `?layoutId=${encodeURIComponent(String(layoutId).trim())}`
        : '';
      return `${base}/agent/ui/widgets/${encodeURIComponent(wid)}/press${query}`;
    } catch (e) {
      console.warn('TimelineInspector companion URL', e);
      return '';
    }
  }, [timelineWidgetId, layoutId]);

  const handleCopy = (text) => {
    if (!text) return;
    try {
      navigator.clipboard?.writeText?.(text);
    } catch (e) {
      console.warn('Copy failed', e);
    }
  };

  const pickBrowseFile = async () => {
    // Essaye l’API Electron pour récupérer le vrai chemin complet
    if (typeof window.electron?.chooseFile === 'function') {
      try {
        const res = await window.electron.chooseFile({
          title: t('timeline.dialog.chooseMedia') || 'Choisir un média',
          filters: [
            { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'tga'] },
            { name: 'Vidéos', extensions: ['mp4', 'mov', 'hap'] }
          ]
        });
        const p =
          (res && typeof res === 'object'
            ? res.file || res.path || (Array.isArray(res) ? res[0] : '')
            : '') || (typeof res === 'string' ? res : '');
        if (p) {
          setKeyframeValueDraft(p);
          handleValueChange(p);
          return;
        }
      } catch (err) {
        console.warn('chooseFile failed, fallback to input', err);
      }
    }
    // Fallback input file
    if (browseFileInputRef.current) {
      browseFileInputRef.current.value = '';
      browseFileInputRef.current.click();
    }
  };

  return (
    <div className="uu-timeline-section">
        {missingSelectedWidget && (
          <div className="uu-alert uu-alert-error">
            Widget introuvable pour cette piste.
          </div>
        )}

        {selectedWidget ? (
          <>
            <div className="uu-timeline-widget-block uu-timeline-value-block uu-list mt-8">
              {selectedKeyframe && (
                <>
                  {isLinkedSelected ? (
                    <>
                      <div className="uu-row mt-4 uu-align-center uu-gap-8">
                        <label className="uu-label w-80">
                          {useTimecodeView ? t('timeline.timecode') : t('timeline.frame')}
                        </label>
                        <input
                          className="uu-input uu-input-arg"
                          value={bundleFrameDraft}
                          onChange={(e) => setBundleFrameDraft(e.target.value)}
                          onBlur={(e) => commitBundleFrameDraft(e.target.value)}
                          style={{ width: '140px' }}
                          onKeyDown={(e) => {
                            if (e.key !== 'Enter') return;
                            e.preventDefault();
                            commitBundleFrameDraft(e.currentTarget.value);
                            e.currentTarget.blur();
                          }}
                        />
                        {selectedWidget?.type === 'button' && (
                          <button
                            type="button"
                            className="uu-kf-btn is-delete"
                            title={t('widgets.common.deleteKeyframe')}
                            onClick={() => handleRemoveKeyframe()}
                          >
                            X
                          </button>
                        )}
                      </div>

                      {selectedMeta?.shape === 'color' ? (
                        <div className="uu-row mt-6 uu-align-center uu-gap-8">
                          <label className="uu-label" style={{ width: '100px' }}>
                            Color
                          </label>
                          <button
                            type="button"
                            className="uu-color-swatch"
                            style={{ background: colorPickerState.hex }}
                            onClick={() => {
                              setArgColorPicker({ open: false, name: '', hex: '#ffffff', alpha: 1 });
                              setColorPickerOpen(true);
                            }}
                            title={t('widgets.common.pickColor')}
                          />
                          <span className="uu-muted">Alpha {formatInputNumber(colorPickerState.alpha, 'float')}</span>
                        </div>
                      ) : null}

                      <div className="uu-col mt-10" style={{ gap: 12 }}>
                        {selectedMeta?.shape === 'transform'
                          ? ([
                              { label: 'Location', ids: ['tx', 'ty', 'tz'] },
                              { label: 'Rotation', ids: ['rroll', 'rpitch', 'ryaw'] },
                              { label: 'Scale', ids: ['sx', 'sy', 'sz'] }
                            ]).map((group) => (
                              <div
                                key={`grp-${group.label}`}
                                className="uu-row uu-align-center uu-gap-12 uu-wrap"
                                style={{ minWidth: '520px' }}
                              >
                                <label className="uu-label" style={{ width: '100px' }}>
                                  {group.label}
                                </label>
                                {group.ids.map((cid, axisIdx) => {
                                  const item =
                                    (selectedBundle?.items || []).find(
                                      (it) => it.channel?.id === cid
                                    ) || {};
                                  const hasKey =
                                    item.idx !== null && item.idx >= 0 && item.keyframe;
                                  const channelFrame =
                                    selectedBundle?.frame ?? playheadFrame;
                                  const axisLabel = ['X', 'Y', 'Z'][axisIdx] || (cid || '').toUpperCase();
                                  return (
                                    <div
                                      key={`bundle-${cid}`}
                                      className="uu-row uu-align-center uu-gap-6"
                                      style={{ flex: '0 0 auto', minWidth: '200px' }}
                                    >
                                      <span className="uu-muted">{axisLabel}</span>
                                      <input
                                        className="uu-input uu-input-arg"
                                        type="text"
                                        inputMode="decimal"
                                        disabled={!hasKey}
                                        placeholder={hasKey ? '' : 'Aucun keyframe'}
                                        value={bundleValueDrafts[cid] ?? ''}
                                        onChange={(e) =>
                                          setBundleValueDrafts((prev) => ({
                                            ...prev,
                                            [cid]: e.target.value
                                          }))
                                        }
                                        onBlur={(e) =>
                                          hasKey && commitBundleValueDraft(cid, e.target.value)
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key !== 'Enter') return;
                                          e.preventDefault();
                                          if (hasKey) {
                                            commitBundleValueDraft(cid, e.currentTarget.value);
                                          }
                                          e.currentTarget.blur();
                                        }}
                                        style={{ width: '140px' }}
                                      />
                                      <button
                                        type="button"
                                        className={`uu-kf-btn ${hasKey ? 'is-delete' : 'is-add'}`}
                                        title={
                                          hasKey
                                            ? t('widgets.common.deleteKeyframe')
                                            : t('widgets.common.addKeyframe')
                                        }
                                        onClick={() => {
                                          if (hasKey) {
                                            removeChannelKeyframeAt(cid, item.idx);
                                          } else {
                                            addChannelKeyframeAt(cid, channelFrame);
                                          }
                                        }}
                                      >
                                        {hasKey ? 'X' : '●'}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            ))
                          : selectedMeta?.shape === 'color'
                          ? (
                            <div className="uu-row uu-align-center uu-gap-6 uu-wrap" style={{ gap: 16 }}>
                              {['r', 'g', 'b', 'a'].map((channelId) => {
                                const item =
                                  (selectedBundle?.items || []).find(
                                    (it) => it.channel?.id === channelId
                                  ) || {};
                                const hasKey =
                                  item.idx !== null && item.idx >= 0 && item.keyframe;
                                const channelFrame = selectedBundle?.frame ?? playheadFrame;
                                const label = (item.channel?.label || channelId || '').toUpperCase();
                                return (
                                  <div
                                    key={`bundle-${channelId}`}
                                    className="uu-row uu-align-center uu-gap-6"
                                    style={{ flex: '0 0 auto', minWidth: '150px' }}
                                  >
                                    <span className="uu-axis-inline">{label}</span>
                                    <input
                                      className="uu-input uu-input-arg"
                                      type="text"
                                      inputMode="decimal"
                                      disabled={!hasKey}
                                      placeholder={hasKey ? '' : 'Aucun keyframe'}
                                      value={bundleValueDrafts[channelId] ?? ''}
                                      onChange={(e) =>
                                        setBundleValueDrafts((prev) => ({
                                          ...prev,
                                          [channelId]: e.target.value
                                        }))
                                      }
                                      onBlur={(e) =>
                                        hasKey && commitBundleValueDraft(channelId, e.target.value)
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key !== 'Enter') return;
                                        e.preventDefault();
                                        if (hasKey) {
                                          commitBundleValueDraft(
                                            channelId,
                                            e.currentTarget.value
                                          );
                                        }
                                        e.currentTarget.blur();
                                      }}
                                      style={{ width: '120px' }}
                                    />
                                    <button
                                      type="button"
                                      className={`uu-kf-btn ${hasKey ? 'is-delete' : 'is-add'}`}
                                      title={
                                        hasKey
                                          ? t('widgets.common.deleteKeyframe') || 'Supprimer le keyframe'
                                          : t('widgets.common.addKeyframe')
                                      }
                                      onClick={() => {
                                        if (hasKey) {
                                          removeChannelKeyframeAt(channelId, item.idx);
                                        } else {
                                          addChannelKeyframeAt(channelId, channelFrame);
                                        }
                                      }}
                                    >
                                      {hasKey ? 'X' : '●'}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="uu-row uu-align-center uu-gap-6 uu-wrap" style={{ gap: 16 }}>
                              {(selectedBundle?.items || []).map((item) => {
                                const channelId = item.channel?.id || '';
                                const label = item.channel?.label || channelId || '-';
                                const hasKey = item.idx !== null && item.idx >= 0 && item.keyframe;
                                const channelFrame = selectedBundle?.frame ?? playheadFrame;
                                return (
                                  <div
                                    key={`bundle-${channelId}`}
                                    className="uu-row uu-align-center uu-gap-6"
                                    style={{ flex: '0 0 auto', minWidth: '180px' }}
                                  >
                                    <span className="uu-axis-inline">{label}</span>
                                    <input
                                      className="uu-input uu-input-arg"
                                      type="text"
                                      inputMode="decimal"
                                      disabled={!hasKey}
                                      placeholder={hasKey ? '' : 'Aucun keyframe'}
                                      value={bundleValueDrafts[channelId] ?? ''}
                                      onChange={(e) =>
                                        setBundleValueDrafts((prev) => ({
                                          ...prev,
                                          [channelId]: e.target.value
                                        }))
                                      }
                                      onBlur={(e) =>
                                        hasKey && commitBundleValueDraft(channelId, e.target.value)
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key !== 'Enter') return;
                                        e.preventDefault();
                                        if (hasKey) {
                                          commitBundleValueDraft(
                                            channelId,
                                            e.currentTarget.value
                                          );
                                        }
                                        e.currentTarget.blur();
                                      }}
                                      style={{ width: '120px' }}
                                    />
                                    <button
                                      type="button"
                                      className={`uu-kf-btn ${hasKey ? 'is-delete' : 'is-add'}`}
                                      title={
                                        hasKey
                                          ? t('widgets.common.deleteKeyframe')
                                          : t('widgets.common.addKeyframe')
                                      }
                                      onClick={() => {
                                        if (hasKey) {
                                          removeChannelKeyframeAt(channelId, item.idx);
                                        } else {
                                          addChannelKeyframeAt(channelId, channelFrame);
                                        }
                                      }}
                                    >
                                      {hasKey ? 'X' : '●'}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                      </div>

                      {selectedMeta?.shape === 'color' && colorPickerOpen && !argColorPicker.open ? (
                        <div className="uu-color-popover">
                          <ColorWheelPopover
                            hex={colorPickerState.hex}
                            alpha={colorPickerState.alpha}
                            onChange={(nextHex, nextAlpha) => {
                              applyColorToBundle(nextHex, nextAlpha);
                            }}
                            onClose={() => setColorPickerOpen(false)}
                          />
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <>
                      {selectedMeta?.kind === 'multi' && (
                        <div className="uu-row mt-4 uu-align-center uu-gap-8">
                          <label className="uu-label" style={{ width: '100px' }}>
                            {useTimecodeView ? t('timeline.timecode') : t('timeline.frame')}
                          </label>
                          <input
                            className="uu-input uu-input-arg"
                            value={keyframeFrameDraft}
                            onChange={(e) => setKeyframeFrameDraft(e.target.value)}
                            onBlur={(e) => commitKeyframeFrameDraft(e.target.value)}
                            style={{ width: '140px' }}
                            onKeyDown={(e) => {
                              if (e.key !== 'Enter') return;
                              e.preventDefault();
                              commitKeyframeFrameDraft(e.currentTarget.value);
                              e.currentTarget.blur();
                            }}
                          />
                        </div>
                      )}

                      {selectedMeta?.kind === 'multi' ? (
                        <div className="uu-row mt-6 uu-align-center uu-gap-8">
                          <label className="uu-label" style={{ width: '100px' }}>
                            {`Canal ${selectedChannelLabel || ''} :`}
                          </label>
                          <input
                            className={`uu-input${isNumericValue ? ' uu-input-arg' : ''}`}
                            type="text"
                            inputMode={isNumericValue ? 'decimal' : undefined}
                            value={keyframeValueDraft}
                            onChange={(e) => setKeyframeValueDraft(e.target.value)}
                            onBlur={(e) => commitKeyframeValueDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key !== 'Enter') return;
                              e.preventDefault();
                              commitKeyframeValueDraft(e.currentTarget.value);
                              e.currentTarget.blur();
                            }}
                            style={{ width: '180px' }}
                          />
                          <button
                            type="button"
                            className="uu-kf-btn is-delete"
                            title={t('widgets.common.deleteKeyframe')}
                            onClick={() =>
                              removeChannelKeyframeAt(selectedChannelId, selectedKey?.idx ?? -1)
                            }
                          >
                            X
                          </button>
                        </div>
                      ) : (
                        <></>
                      )}

                      {selectedMeta?.kind !== 'multi' && (
                        <>
                          <div className="uu-row mt-6 uu-align-center uu-gap-8">
                            <label className="uu-label" style={{ width: '100px' }}>
                              {useTimecodeView ? t('timeline.timecode') : t('timeline.frame')}
                            </label>
                            <input
                              className="uu-input uu-input-arg"
                              value={keyframeFrameDraft}
                              onChange={(e) => setKeyframeFrameDraft(e.target.value)}
                              onBlur={(e) => commitKeyframeFrameDraft(e.target.value)}
                              style={{ width: '140px' }}
                              onKeyDown={(e) => {
                                if (e.key !== 'Enter') return;
                                e.preventDefault();
                                commitKeyframeFrameDraft(e.currentTarget.value);
                                e.currentTarget.blur();
                              }}
                            />
                            <button
                              type="button"
                              className="uu-kf-btn is-delete"
                              title={t('widgets.common.deleteKeyframe')}
                              onClick={() => handleRemoveKeyframe()}
                            >
                              X
                            </button>
                          </div>

                          {selectedWidget?.type !== 'button' && (
                            <div className="uu-row mt-6 uu-align-center uu-gap-8">
                              <label className="uu-label" style={{ width: '100px' }}>
                                {t('timeline.value')}
                              </label>
                              {selectedMeta?.kind === 'enum' ? (
                                <select
                                  className="uu-input"
                                  value={keyframeValueDraft}
                                  onChange={(e) => {
                                    setKeyframeValueDraft(e.target.value);
                                    handleValueChange(e.target.value);
                                  }}
                                  style={{ width: 'auto', minWidth: `${enumWidthPx}px` }}
                                >
                                  {enumOptions.length === 0 && <option value="">-</option>}
                                  {enumOptions.map((opt) => (
                                    <option key={opt.key} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              ) : selectedWidget?.type === 'browse' ? (
                                <div
                                  className="uu-row uu-align-center uu-row-gap4"
                                  style={{ flex: '1 1 auto', gap: 8, flexWrap: 'nowrap' }}
                                >
                                  <textarea
                                    className="uu-input uu-input-textarea"
                                    rows={2}
                                    style={{
                                      flex: '1 1 auto',
                                      minWidth: 0,
                                      resize: 'vertical',
                                      fontFamily: 'monospace',
                                      lineHeight: '1.2',
                                      overflowWrap: 'anywhere'
                                    }}
                                    value={keyframeValueDraft}
                                    placeholder={t('timeline.chooseFile')}
                                    title={keyframeValueDraft || ''}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      setKeyframeValueDraft(v);
                                      handleValueChange(v);
                                    }}
                                    onBlur={(e) => handleValueChange(e.target.value)}
                                  />
                                  <input
                                    ref={browseFileInputRef}
                                    type="file"
                                    style={{ display: 'none' }}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      const fullPath =
                                        file.path ||
                                        file.webkitRelativePath ||
                                        e.target.value ||
                                        file.name ||
                                        '';
                                      setKeyframeValueDraft(fullPath);
                                      handleValueChange(fullPath);
                                    }}
                                  />
                                  <button
                                    type="button"
                                    className="uu-btn"
                                    style={{ flex: '0 0 auto' }}
                                    onClick={pickBrowseFile}
                                  >
                                    Parcourir
                                  </button>
                                </div>
                              ) : selectedMeta?.kind === 'bool' ? (
                                <label className="uu-row uu-row-gap4 uu-align-center" style={{ flex: '1 1 auto' }}>
                                  <input
                                    type="checkbox"
                                    checked={!!selectedKeyframe?.value}
                                    onChange={(e) => handleValueChange(e.target.checked)}
                                  />
                                  <span className="uu-muted">On/Off</span>
                                </label>
                              ) : (
                                <input
                                  className={`uu-input${isNumericValue ? ' uu-input-arg' : ''}`}
                                  type="text"
                                  inputMode={isNumericValue ? 'decimal' : undefined}
                                  value={keyframeValueDraft}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setKeyframeValueDraft(v);
                                    if (!isNumericValue) {
                                      handleValueChange(v);
                                    }
                                  }}
                                  onBlur={(e) => commitKeyframeValueDraft(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key !== 'Enter') return;
                                    e.preventDefault();
                                    commitKeyframeValueDraft(e.currentTarget.value);
                                    e.currentTarget.blur();
                                  }}
                                  style={{ width: isNumericValue ? '180px' : '220px' }}
                                />
                              )}
                            </div>
                          )}

                          {selectedWidget?.binding?.displayName ? (
                            <div className="uu-col mt-8" style={{ gap: 10 }}>
                              {(() => {
                                const funcs = presetData?.funcs || [];
                                const func = funcs.find(
                                  (f) => f.displayName === selectedWidget.binding.displayName
                                );
                                const argValues =
                                  selectedKeyframeArgs && typeof selectedKeyframeArgs === 'object'
                                    ? selectedKeyframeArgs
                                    : selectedWidget.binding.argValues || {};
                                if (!func || !Array.isArray(func.parameters) || func.parameters.length === 0) {
                                  return <div className="uu-muted">Aucun argument.</div>;
                                }

                                const setArgValue = (name, val) => {
                                  updateSelectedKeyframeArgs((prev = {}) => ({
                                    ...prev,
                                    [name]: val
                                  }));
                                };

                                const renderTextArea = (name, label, current) => (
                                  <div className="uu-row uu-binding-row" key={name}>
                                    <label className="uu-label w-160">{label}</label>
                                    <textarea
                                      className="uu-input uu-input-textarea"
                                      rows={1}
                                      value={current ?? ''}
                                      ref={(el) => {
                                        if (!el) return;
                                        el.style.height = 'auto';
                                        el.style.height = `${el.scrollHeight}px`;
                                      }}
                                      onChange={(e) => setArgValue(name, e.target.value)}
                                      onInput={(e) => {
                                        const el = e.target;
                                        el.style.height = 'auto';
                                        el.style.height = `${el.scrollHeight}px`;
                                      }}
                                    />
                                  </div>
                                );

                                const renderNumber = (name, label, current, extra = {}) => {
                                  const w = 200;
                                  return (
                                  <div className="uu-row uu-binding-row" key={name}>
                                    <label className="uu-label w-160">{label}</label>
                                    <input
                                      className="uu-input uu-input-arg"
                                      type="number"
                                      value={current ?? ''}
                                      min={extra.min}
                                      max={extra.max}
                                      style={{ width: w, maxWidth: 800, flex: '0 0 auto' }}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        setArgValue(name, v === '' ? '' : Number(v));
                                      }}
                                    />
                                  </div>
                                  );
                                };

                                const renderEnumArg = (name, label, current, param) => {
                                  let opts = param?.EnumValues || param?.enumValues;
                                  if (!opts && param?.Metadata) {
                                    opts = param.Metadata.EnumValues || param.Metadata.enumvalues;
                                  }
                                  if (typeof opts === 'string') {
                                    opts = opts.split(',').map((s) => s.trim()).filter(Boolean);
                                  }
                                  if (Array.isArray(opts) && opts.length) {
                                    const longest = opts.reduce((m, v) => Math.max(m, String(v).length), 0);
                                    const px = Math.min(Math.max(longest * 9 + 40, 160), 420);
                                    return (
                                      <div className="uu-row uu-binding-row" key={name}>
                                        <label className="uu-label w-160">{label}</label>
                                        <select
                                          className="uu-input"
                                          value={current ?? ''}
                                          onChange={(e) => setArgValue(name, e.target.value)}
                                          style={{ minWidth: `${px}px`, width: 'auto' }}
                                        >
                                          {opts.map((opt, i) => (
                                            <option key={`${name}-opt-${i}`} value={opt}>
                                              {opt}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    );
                                  }
                                  return null;
                                };

                                const renderVector3 = (name, label, current = {}) => {
                                  const cur = typeof current === 'object' ? current : {};
                                  return (
                                    <div className="uu-row uu-row-nowrap" key={name} style={{ gap: 10 }}>
                                      <label className="uu-label w-160">{label}</label>
                                      {['X', 'Y', 'Z'].map((axis) => (
                                        <React.Fragment key={`${name}-${axis}`}>
                                          <span className="uu-muted">{axis}</span>
                                          <input
                                            className="uu-input uu-input-arg"
                                            type="number"
                                            placeholder={axis}
                                            style={{ width: 90 }}
                                            value={cur[axis] ?? ''}
                                            onChange={(e) =>
                                              setArgValue(name, {
                                                ...cur,
                                                [axis]:
                                                  e.target.value === '' ? '' : Number(e.target.value)
                                              })
                                            }
                                          />
                                        </React.Fragment>
                                      ))}
                                    </div>
                                  );
                                };

                                const renderRotator = (name, label, current = {}) => {
                                  const cur = typeof current === 'object' ? current : {};
                                  const axes = [
                                    { lbl: 'X', prop: 'Pitch' },
                                    { lbl: 'Y', prop: 'Yaw' },
                                    { lbl: 'Z', prop: 'Roll' }
                                  ];
                                  return (
                                    <div className="uu-row uu-row-nowrap" key={name} style={{ gap: 10 }}>
                                      <label className="uu-label w-160">{label}</label>
                                      {axes.map(({ lbl, prop }) => (
                                        <React.Fragment key={`${name}-${prop}`}>
                                          <span className="uu-muted">{lbl}</span>
                                          <input
                                            className="uu-input uu-input-arg"
                                            type="number"
                                            placeholder={lbl}
                                            style={{ width: 90 }}
                                            value={cur[prop] ?? ''}
                                            onChange={(e) =>
                                              setArgValue(name, {
                                                ...cur,
                                                [prop]: e.target.value === '' ? '' : Number(e.target.value)
                                              })
                                            }
                                          />
                                        </React.Fragment>
                                      ))}
                                    </div>
                                  );
                                };

                                const renderTransform = (name, label, current = {}) => {
                                  const cur = typeof current === 'object' ? current : {};
                                  const t = cur.Translation || {};
                                  const r = cur.Rotation || {};
                                  const s = cur.Scale3D || {};
                                  const update = (part, axis, val) => {
                                    const next = {
                                      Translation: { ...t },
                                      Rotation: { ...r },
                                      Scale3D: { ...s }
                                    };
                                    next[part][axis] = val;
                                    setArgValue(name, next);
                                  };
                                  const block = (title, part, axes, labels) => (
                                    <div className="uu-row uu-row-nowrap" key={`${name}-${part}`} style={{ gap: 10 }}>
                                      <label className="uu-label w-160">{title}</label>
                                      {axes.map((axis, idx) => (
                                        <React.Fragment key={`${name}-${part}-${axis}`}>
                                          <span className="uu-muted">{labels[idx]}</span>
                                          <input
                                            className="uu-input uu-input-arg"
                                            type="number"
                                            placeholder={labels[idx]}
                                            style={{ width: 140 }}
                                            value={
                                              part === 'Translation'
                                                ? t[axis] ?? ''
                                                : part === 'Rotation'
                                                ? r[axis] ?? ''
                                                : s[axis] ?? ''
                                            }
                                            onChange={(e) =>
                                              update(part, axis, e.target.value === '' ? '' : Number(e.target.value))
                                            }
                                          />
                                        </React.Fragment>
                                      ))}
                                    </div>
                                  );
                                  return (
                                    <div className="uu-col" key={name} style={{ gap: 6 }}>
                                      <div className="uu-label" style={{ marginLeft: '8px' }}>{label}</div>
                                      {block('Location', 'Translation', ['X', 'Y', 'Z'], ['X', 'Y', 'Z'])}
                                      {block('Rotation', 'Rotation', ['Roll', 'Pitch', 'Yaw'], ['X', 'Y', 'Z'])}
                                      {block('Scale', 'Scale3D', ['X', 'Y', 'Z'], ['X', 'Y', 'Z'])}
                                    </div>
                                  );
                                };

                                const renderColor = (name, label, current = {}) => {
                                  const cur = typeof current === 'object' ? current : {};
                                  const r = Number(cur.R ?? cur.r ?? 1);
                                  const g = Number(cur.G ?? cur.g ?? 1);
                                  const b = Number(cur.B ?? cur.b ?? 1);
                                  const a = Number(cur.A ?? cur.a ?? 1);
                                  const hex = rgbToHex(
                                    Math.round((Number.isFinite(r) ? r : 1) * 255),
                                    Math.round((Number.isFinite(g) ? g : 1) * 255),
                                    Math.round((Number.isFinite(b) ? b : 1) * 255)
                                  );
                                  const showPicker = argColorPicker.open && argColorPicker.name === name;
                                  return (
                                    <div className="uu-row uu-row-nowrap" key={name} style={{ alignItems: 'center', gap: 8, position: 'relative' }}>
                                      <label className="uu-label w-160">{label}</label>
                                      <button
                                        type="button"
                                        className="uu-color-swatch"
                                        style={{ background: hex }}
                                        onClick={() => {
                                          setColorPickerOpen(false);
                                          setArgColorPicker({
                                            open: true,
                                            name,
                                            hex,
                                            alpha: Number.isFinite(a) ? a : 1
                                          });
                                        }}
                                        title={t('widgets.common.pickColor')}
                                      />
                                      <span className="uu-muted">Alpha</span>
                                      <input
                                        className="uu-input uu-input-arg"
                                        type="number"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        placeholder="A"
                                        value={Number.isFinite(a) ? a : ''}
                                        style={{ width: '80px' }}
                                        onChange={(e) => {
                                          const val = e.target.value === '' ? '' : Number(e.target.value);
                                          const next = {
                                            ...cur,
                                            A: val === '' ? '' : val
                                          };
                                          setArgValue(name, next);
                                          setArgColorPicker((prev) =>
                                            prev.name === name ? { ...prev, alpha: val === '' ? 1 : val } : prev
                                          );
                                        }}
                                      />
                                      {showPicker ? (
                                        <div className="uu-color-popover" style={{ top: 30, left: 180, zIndex: 60 }}>
                                          <ColorWheelPopover
                                            hex={argColorPicker.hex}
                                            alpha={argColorPicker.alpha}
                                            onChange={(nextHex, nextAlpha) => {
                                              const { r, g, b } = hexToRgb(nextHex);
                                              setArgValue(name, {
                                                R: r / 255,
                                                G: g / 255,
                                                B: b / 255,
                                                A: nextAlpha
                                              });
                                              setArgColorPicker((prev) => ({
                                                ...prev,
                                                hex: nextHex,
                                                alpha: nextAlpha
                                              }));
                                            }}
                                            onClose={() => {
                                              setArgColorPicker({
                                                open: false,
                                                name: '',
                                                hex: '#ffffff',
                                                alpha: 1
                                              });
                                              setColorPickerOpen(false);
                                            }}
                                          />
                                        </div>
                                      ) : null}
                                    </div>
                                  );
                                };

                                return func.parameters.map((p, idx) => {
                                  const name =
                                    p.Name || p.ParameterName || p.name || `Param${idx + 1}`;
                                  const typeStr = String(
                                    p.Type || p.ParameterType || p.InnerType || p.type || ''
                                  ).toLowerCase();
                                  const current = argValues[name];
                                  if (typeStr.includes('enum')) {
                                    const rendered = renderEnumArg(name, name, current, p);
                                    if (rendered) return rendered;
                                  }
                                  if (typeStr.includes('vector')) {
                                    return renderVector3(name, name, current);
                                  }
                                  if (typeStr.includes('rotator')) {
                                    return renderRotator(name, name, current);
                                  }
                                  if (typeStr.includes('transform')) {
                                    return renderTransform(name, name, current);
                                  }
                                  if (typeStr.includes('linearcolor') || typeStr === 'flinearcolor' || typeStr === 'fcolor') {
                                    return renderColor(name, name, current);
                                  }
                                  if (typeStr.includes('bool')) {
                                    return (
                                      <div className="uu-row uu-binding-row" key={name}>
                                        <label className="uu-label w-160">{name}</label>
                                        <input
                                          type="checkbox"
                                          checked={!!current}
                                          onChange={(e) => setArgValue(name, e.target.checked)}
                                        />
                                      </div>
                                    );
                                  }
                                  if (typeStr.includes('byte') || typeStr.includes('uint8')) {
                                    return renderNumber(name, name, current, { min: 0, max: 255 });
                                  }
                                  if (typeStr.includes('int64')) {
                                    return renderNumber(name, name, current, {});
                                  }
                                  if (typeStr.includes('int')) {
                                    return renderNumber(name, name, current, {});
                                  }
                                  if (typeStr.includes('float') || typeStr.includes('double')) {
                                    return renderNumber(name, name, current, {});
                                  }
                                  if (
                                    typeStr.includes('fname') ||
                                    typeStr.includes('fstring') ||
                                    typeStr.includes('ftext') ||
                                    typeStr === 'name' ||
                                    typeStr === 'string' ||
                                    typeStr === 'text'
                                  ) {
                                    return renderTextArea(name, name, current);
                                  }
                                  return (
                                    <div className="uu-row uu-binding-row" key={name}>
                                      <label className="uu-label w-160">{name}</label>
                                      <input
                                        className="uu-input"
                                        type="text"
                                        value={current ?? ''}
                                        onChange={(e) => setArgValue(name, e.target.value)}
                                      />
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          ) : null}
                        </>
                      )}

                    </>
                  )}
                </>
              )}
            </div>

            <div className="uu-timeline-widget-block uu-timeline-desc-block">
              <div className="uu-timeline-widget-grid">
                <div className="uu-timeline-widget-left uu-list">
                  <div className="uu-row">
                    <label className="uu-label w-160">{t('widgets.common.label')}</label>
                    <input
                      className="uu-input uu-input-label"
                      value={selectedWidget.label ?? ''}
                      onChange={(e) => updateSelectedWidget({ label: e.target.value })}
                    />
                  </div>

                  <div className="uu-row mt-8">
                    <div
                      className={`uu-label w-160 ${
                        hasSelectedTargets ? '' : 'uu-label-error'
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
                        {hosts.map((host, idx) => {
                          const ip = String(host?.ip || '');
                          if (!ip) return null;
                          const checked = Boolean(selectedTargets[ip]);
                          const label = host?.name
                            ? `${host.name} - ${ip}`
                            : `${t('production.targets.defaultMachineName')} ${idx + 1} - ${ip}`;
                          return (
                            <label
                              key={ip}
                              className="uu-row uu-align-center uu-gap-8"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  updateSelectedWidget({
                                    targets: {
                                      ...syncTimelineWidgetTargets(selectedWidget, hosts).targets,
                                      [ip]: e.target.checked
                                    }
                                  });
                                }}
                              />
                              <span
                                className={`uu-pastille ${colorClass(host.color)}`}
                              />
                              <span>{label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="uu-timeline-widget-right uu-list">
                  <TimelineWidgetEditorPanel
                    selectedWidget={selectedWidget}
                    selectedTrack={selectedTrack}
                    presetData={presetData}
                    updateSelectedBinding={updateSelectedBinding}
                    updateSelectedWidget={updateSelectedWidget}
                  />
                </div>
              </div>
            </div>

            {selectedWidget?.id && (
              <div className="uu-timeline-widget-block uu-timeline-desc-block uu-list mt-8">
                <div className="uu-row">
                  <label className="uu-label w-160">{t('widgets.companion.urlLabel') || 'URL'}</label>
                  <div className="uu-value uu-buttons-row">
                    <button
                      type="button"
                      className="uu-btn-secondary"
                      onClick={() => handleCopy(companionUrl)}
                      title={companionUrl}
                    >
                      {t('widgets.companion.copy') || 'Copier'}
                    </button>
                  </div>
                </div>
                <div className="uu-row">
                  <label className="uu-label w-160">{t('widgets.companion.bodyLabel') || 'Body'}</label>
                  <div className="uu-value uu-buttons-row" style={{ gap: 8 }}>
                    {['cue', 'play', 'pause', 'resume'].map((action) => (
                      <button
                        key={action}
                        type="button"
                        className="uu-btn-secondary"
                        onClick={() => handleCopy(JSON.stringify({ action }))}
                        title={JSON.stringify({ action })}
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          !missingSelectedWidget && (
            <div className="uu-muted mt-8">
              {t('timeline.noWidgetSelected') || 'Sélectionnez un widget dans la timeline.'}
            </div>
          )
        )}
    </div>
  );
}

