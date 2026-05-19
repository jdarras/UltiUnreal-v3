import { resolveTimelineInputFilePath } from './timelineBrowseFilePicker.js';

export function applyTimelinePickedPath(
  path,
  setKeyframeValueDraft,
  handleValueChange
) {
  if (!path) return false;
  setKeyframeValueDraft(path);
  handleValueChange(path);
  return true;
}

export function handleTimelineEnumChange(
  event,
  setKeyframeValueDraft,
  handleValueChange
) {
  const nextValue = event.target.value;
  setKeyframeValueDraft(nextValue);
  handleValueChange(nextValue);
}

export function handleTimelineBrowseTextChange(
  event,
  setKeyframeValueDraft,
  handleValueChange
) {
  const nextValue = event.target.value;
  setKeyframeValueDraft(nextValue);
  handleValueChange(nextValue);
}

export function handleTimelineBrowseTextBlur(event, handleValueChange) {
  handleValueChange(event.target.value);
}

export function handleTimelineBrowseInputChange(event, onPathSelected) {
  if (typeof onPathSelected !== 'function') return false;
  const file = event.target.files?.[0];
  if (!file) return false;
  const fullPath = resolveTimelineInputFilePath(file, event.target.value);
  return !!onPathSelected(fullPath);
}

export function handleTimelineBoolChange(event, handleValueChange) {
  handleValueChange(event.target.checked);
}

export function handleTimelineTextChange(
  event,
  isNumericValue,
  setKeyframeValueDraft,
  handleValueChange
) {
  const nextValue = event.target.value;
  setKeyframeValueDraft(nextValue);
  if (!isNumericValue) {
    handleValueChange(nextValue);
  }
}

export function handleTimelineTextBlur(event, commitKeyframeValueDraft) {
  commitKeyframeValueDraft(event.target.value);
}

export function handleTimelineTextKeyDown(event, commitKeyframeValueDraft) {
  if (event.key !== 'Enter') return false;
  event.preventDefault();
  commitKeyframeValueDraft(event.currentTarget.value);
  event.currentTarget.blur();
  return true;
}
