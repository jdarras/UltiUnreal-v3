import { useMemo } from 'react';
import { getCompanionBaseUrl } from '../../utils/agent';
import { TimelineInspectorWidgetDetails } from './TimelineInspectorWidgetDetails.jsx';
import { TimelineInspectorKeyframeEditor } from './TimelineInspectorKeyframeEditor.jsx';
import {
  getTimelineMissingWidgetForTrackLabel,
  getTimelineNoWidgetSelectedLabel
} from './timelineInspectorI18n.js';

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
  const missingWidgetForTrackLabel = getTimelineMissingWidgetForTrackLabel(t);
  const noWidgetSelectedLabel = getTimelineNoWidgetSelectedLabel(t);

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

  return (
    <div className="uu-timeline-section">
      {missingSelectedWidget && (
        <div className="uu-alert uu-alert-error">
          {missingWidgetForTrackLabel}
        </div>
      )}

      {selectedWidget ? (
        <>
          <div className="uu-timeline-widget-block uu-timeline-value-block uu-list mt-8">
            <TimelineInspectorKeyframeEditor
              t={t}
              selectedMeta={selectedMeta}
              selectedWidget={selectedWidget}
              selectedKeyframe={selectedKeyframe}
              selectedKeyframeArgs={selectedKeyframeArgs}
              selectedKey={selectedKey}
              selectedChannelId={selectedChannelId}
              selectedChannelLabel={selectedChannelLabel}
              selectedBundle={selectedBundle}
              isLinkedSelected={isLinkedSelected}
              isNumericValue={isNumericValue}
              useTimecodeView={useTimecodeView}
              playheadFrame={playheadFrame}
              bundleFrameDraft={bundleFrameDraft}
              setBundleFrameDraft={setBundleFrameDraft}
              commitBundleFrameDraft={commitBundleFrameDraft}
              bundleValueDrafts={bundleValueDrafts}
              setBundleValueDrafts={setBundleValueDrafts}
              commitBundleValueDraft={commitBundleValueDraft}
              removeChannelKeyframeAt={removeChannelKeyframeAt}
              addChannelKeyframeAt={addChannelKeyframeAt}
              keyframeFrameDraft={keyframeFrameDraft}
              setKeyframeFrameDraft={setKeyframeFrameDraft}
              commitKeyframeFrameDraft={commitKeyframeFrameDraft}
              keyframeValueDraft={keyframeValueDraft}
              setKeyframeValueDraft={setKeyframeValueDraft}
              commitKeyframeValueDraft={commitKeyframeValueDraft}
              handleRemoveKeyframe={handleRemoveKeyframe}
              handleValueChange={handleValueChange}
              applyColorToBundle={applyColorToBundle}
              colorPickerState={colorPickerState}
              colorPickerOpen={colorPickerOpen}
              setColorPickerOpen={setColorPickerOpen}
              argColorPicker={argColorPicker}
              setArgColorPicker={setArgColorPicker}
              presetData={presetData}
              updateSelectedKeyframeArgs={updateSelectedKeyframeArgs}
              browseFileInputRef={browseFileInputRef}
            />
          </div>

          <TimelineInspectorWidgetDetails
            t={t}
            selectedWidget={selectedWidget}
            selectedTrack={selectedTrack}
            presetData={presetData}
            updateSelectedBinding={updateSelectedBinding}
            updateSelectedWidget={updateSelectedWidget}
            hosts={hosts}
            hasSelectedTargets={hasSelectedTargets}
            selectedTargets={selectedTargets}
            syncTimelineWidgetTargets={syncTimelineWidgetTargets}
            colorClass={colorClass}
            companionUrl={companionUrl}
            handleCopy={handleCopy}
          />
        </>
      ) : (
        !missingSelectedWidget && (
          <div className="uu-muted mt-8">
            {noWidgetSelectedLabel}
          </div>
        )
      )}
    </div>
  );
}
