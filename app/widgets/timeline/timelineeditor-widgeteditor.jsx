import { ButtonTimelineEditor } from './buttontimeline.jsx';
import { TextTimelineEditor } from './texttimeline.jsx';
import { SliderTimelineEditor } from './slidertimeline.jsx';
import { VectorTimelineEditor } from './vectortimeline.jsx';
import { ToggleTimelineEditor } from './toggletimeline.jsx';
import { ColorTimelineEditor } from './colortimeline.jsx';
import { DropdownTimelineEditor } from './dropdowntimeline.jsx';
import { EnumTimelineEditor } from './enumtimeline.jsx';
import { BrowseTimelineEditor } from './browsetimeline.jsx';
import { TransformTimelineEditor } from './transformtimeline.jsx';
import { JoystickTimelineEditor } from './joysticktimeline.jsx';

export function TimelineWidgetEditorPanel({
  selectedWidget,
  selectedTrack,
  presetData,
  updateSelectedBinding,
  updateSelectedWidget
}) {
  if (!selectedWidget) return null;

  const commonProps = {
    selected: selectedWidget,
    selectedTrack,
    presetData,
    updateBinding: updateSelectedBinding,
    updateSelected: updateSelectedWidget
  };

  if (selectedWidget.type === 'button') {
    return <ButtonTimelineEditor {...commonProps} />;
  }
  if (selectedWidget.type === 'text') {
    return <TextTimelineEditor {...commonProps} />;
  }
  if (selectedWidget.type === 'slider') {
    return <SliderTimelineEditor {...commonProps} />;
  }
  if (selectedWidget.type === 'vector') {
    return <VectorTimelineEditor {...commonProps} />;
  }
  if (selectedWidget.type === 'toggle') {
    return <ToggleTimelineEditor {...commonProps} />;
  }
  if (selectedWidget.type === 'color') {
    return <ColorTimelineEditor {...commonProps} />;
  }
  if (selectedWidget.type === 'dropdown') {
    return <DropdownTimelineEditor {...commonProps} />;
  }
  if (selectedWidget.type === 'enum') {
    return <EnumTimelineEditor {...commonProps} />;
  }
  if (selectedWidget.type === 'browse') {
    return <BrowseTimelineEditor {...commonProps} />;
  }
  if (selectedWidget.type === 'transform') {
    return <TransformTimelineEditor {...commonProps} />;
  }
  if (selectedWidget.type === 'joystick') {
    return <JoystickTimelineEditor {...commonProps} />;
  }

  return <div className="uu-muted">Type non gere.</div>;
}
