import { useCallback } from 'react';
import {
  pickTimelineBrowseFile
} from './timelineBrowseFilePicker.js';
import {
  getTimelineBrowseLabel,
  getTimelineOnOffLabel
} from './timelineInspectorI18n.js';
import {
  INSPECTOR_WIDTH_100_STYLE,
  INSPECTOR_ROW_BROWSE_STYLE,
  INSPECTOR_TEXTAREA_BROWSE_STYLE,
  INSPECTOR_HIDDEN_INPUT_STYLE,
  INSPECTOR_BUTTON_AUTO_FLEX_STYLE,
  INSPECTOR_BOOL_ROW_STYLE
} from './timelineInspectorStyles.js';
import {
  buildTimelineInspectorEnumSelectProps,
  buildTimelineInspectorTextInputProps,
  resolveTimelineInspectorValueInputVariant
} from './timelineInspectorValueInputProps.js';
import {
  applyTimelinePickedPath,
  handleTimelineBoolChange,
  handleTimelineBrowseInputChange,
  handleTimelineBrowseTextBlur,
  handleTimelineBrowseTextChange,
  handleTimelineEnumChange,
  handleTimelineTextBlur,
  handleTimelineTextChange,
  handleTimelineTextKeyDown
} from './timelineInspectorValueInputHandlers.js';

export function TimelineInspectorValueInput({
  t,
  selectedMeta,
  selectedKeyframe,
  selectedWidget,
  isNumericValue,
  keyframeValueDraft,
  setKeyframeValueDraft,
  commitKeyframeValueDraft,
  handleValueChange,
  enumOptions,
  enumWidthPx,
  browseFileInputRef
}) {
  const handlePickedPath = useCallback((path) => {
    applyTimelinePickedPath(path, setKeyframeValueDraft, handleValueChange);
  }, [setKeyframeValueDraft, handleValueChange]);

  const pickBrowseFile = useCallback(async () => {
    await pickTimelineBrowseFile({
      t,
      browseFileInputRef,
      onPathSelected: handlePickedPath
    });
  }, [t, browseFileInputRef, handlePickedPath]);

  const variant = resolveTimelineInspectorValueInputVariant({
    selectedMeta,
    selectedWidget
  });
  if (variant === 'none') return null;

  const enumSelectProps = buildTimelineInspectorEnumSelectProps(enumWidthPx);
  const textInputProps = buildTimelineInspectorTextInputProps(isNumericValue);
  const browseLabel = getTimelineBrowseLabel(t);
  const onOffLabel = getTimelineOnOffLabel(t);

  return (
    <div className="uu-row mt-6 uu-align-center uu-gap-8">
      <label className="uu-label" style={INSPECTOR_WIDTH_100_STYLE}>
        {t('timeline.value')}
      </label>
      {variant === 'enum' ? (
        <select
          className="uu-input"
          value={keyframeValueDraft}
          onChange={(e) =>
            handleTimelineEnumChange(e, setKeyframeValueDraft, handleValueChange)
          }
          style={enumSelectProps.style}
        >
          {enumOptions.length === 0 && <option value="">-</option>}
          {enumOptions.map((opt) => (
            <option key={opt.key} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : variant === 'browse' ? (
        <div
          className="uu-row uu-align-center uu-row-gap4"
          style={INSPECTOR_ROW_BROWSE_STYLE}
        >
          <textarea
            className="uu-input uu-input-textarea"
            rows={2}
            style={INSPECTOR_TEXTAREA_BROWSE_STYLE}
            value={keyframeValueDraft}
            placeholder={t('timeline.chooseFile')}
            title={keyframeValueDraft || ''}
            onChange={(e) =>
              handleTimelineBrowseTextChange(
                e,
                setKeyframeValueDraft,
                handleValueChange
              )
            }
            onBlur={(e) => handleTimelineBrowseTextBlur(e, handleValueChange)}
          />
          <input
            ref={browseFileInputRef}
            type="file"
            style={INSPECTOR_HIDDEN_INPUT_STYLE}
            onChange={(e) => handleTimelineBrowseInputChange(e, handlePickedPath)}
          />
          <button
            type="button"
            className="uu-btn"
            style={INSPECTOR_BUTTON_AUTO_FLEX_STYLE}
            onClick={pickBrowseFile}
          >
            {browseLabel}
          </button>
        </div>
      ) : variant === 'bool' ? (
        <label className="uu-row uu-row-gap4 uu-align-center" style={INSPECTOR_BOOL_ROW_STYLE}>
          <input
            type="checkbox"
            checked={!!selectedKeyframe?.value}
            onChange={(e) => handleTimelineBoolChange(e, handleValueChange)}
          />
          <span className="uu-muted">{onOffLabel}</span>
        </label>
      ) : (
        <input
          className={textInputProps.className}
          type="text"
          inputMode={textInputProps.inputMode}
          value={keyframeValueDraft}
          onChange={(e) =>
            handleTimelineTextChange(
              e,
              isNumericValue,
              setKeyframeValueDraft,
              handleValueChange
            )
          }
          onBlur={(e) => handleTimelineTextBlur(e, commitKeyframeValueDraft)}
          onKeyDown={(e) => handleTimelineTextKeyDown(e, commitKeyframeValueDraft)}
          style={textInputProps.style}
        />
      )}
    </div>
  );
}
