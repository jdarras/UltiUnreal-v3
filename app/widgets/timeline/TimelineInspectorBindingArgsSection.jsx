import { TimelineInspectorBindingArgsEditor } from './TimelineInspectorBindingArgsEditor.jsx';
import {
  buildTimelineInspectorBindingArgsSectionProps,
  shouldRenderTimelineInspectorBindingArgsSection
} from './timelineInspectorBindingArgsSectionHelpers.js';

export function TimelineInspectorBindingArgsSection({
  t,
  selectedWidget,
  selectedKeyframeArgs,
  presetData,
  updateSelectedKeyframeArgs,
  argColorPicker,
  setArgColorPicker,
  setColorPickerOpen
}) {
  if (!shouldRenderTimelineInspectorBindingArgsSection(selectedWidget)) return null;

  const editorProps = buildTimelineInspectorBindingArgsSectionProps({
    t,
    selectedWidget,
    selectedKeyframeArgs,
    presetData,
    updateSelectedKeyframeArgs,
    argColorPicker,
    setArgColorPicker,
    setColorPickerOpen
  });

  return <TimelineInspectorBindingArgsEditor {...editorProps} />;
}
