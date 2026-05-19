const TIMELINE_BROWSE_FILTERS = [
  { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'tga'] },
  { name: 'Videos', extensions: ['mp4', 'mov', 'hap'] }
];

export function resolveTimelineChosenFilePath(result) {
  if (!result) return '';
  if (typeof result === 'string') return result;
  if (typeof result !== 'object') return '';
  if (Array.isArray(result)) {
    const first = result[0];
    return typeof first === 'string' ? first : '';
  }
  return result.file || result.path || '';
}

export function resolveTimelineInputFilePath(file, inputValue = '') {
  if (!file) return '';
  return file.path || file.webkitRelativePath || inputValue || file.name || '';
}

export function triggerTimelineBrowseInput(browseFileInputRef) {
  const input = browseFileInputRef?.current;
  if (!input) return false;
  input.value = '';
  input.click();
  return true;
}

export async function pickTimelineBrowseFile({
  t,
  browseFileInputRef,
  onPathSelected
}) {
  if (typeof onPathSelected !== 'function') return false;

  if (typeof window.electron?.chooseFile === 'function') {
    try {
      const result = await window.electron.chooseFile({
        title: t?.('timeline.dialog.chooseMedia') || 'Choisir un media',
        filters: TIMELINE_BROWSE_FILTERS
      });
      const path = resolveTimelineChosenFilePath(result);
      if (path) {
        onPathSelected(path);
        return true;
      }
    } catch (error) {
      console.warn('chooseFile failed, fallback to input', error);
    }
  }

  triggerTimelineBrowseInput(browseFileInputRef);
  return false;
}
