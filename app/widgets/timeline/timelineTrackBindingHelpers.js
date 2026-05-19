function isEmptyTextValue(value) {
  return !String(value || '').trim();
}

function hasMissingBinding(widget) {
  if (!widget || typeof widget !== 'object') return false;
  const type = String(widget.type || '').toLowerCase();
  const binding =
    widget.binding && typeof widget.binding === 'object' ? widget.binding : {};
  const kind = String(binding.kind || '').toLowerCase();

  if (type === 'button' || kind === 'function') {
    const hasPath = !isEmptyTextValue(binding.path);
    const hasName = !isEmptyTextValue(binding.displayName);
    const isBrowse = type === 'browse';
    const hasBrowseArg = !isEmptyTextValue(binding.browseArgName);
    if (isBrowse) return !(hasPath || hasName) || !hasBrowseArg;
    return !(hasPath || hasName);
  }

  if (type === 'joystick') {
    const linkType = String(widget.ui?.linkType || 'vector2d').toLowerCase();
    if (linkType === 'manual') {
      const bx = widget.joystickBindings?.x || {};
      const by = widget.joystickBindings?.y || {};
      return isEmptyTextValue(bx.path) || isEmptyTextValue(by.path);
    }
    return isEmptyTextValue(binding.path);
  }

  if (kind === 'property' || !kind) {
    return isEmptyTextValue(binding.path);
  }

  return false;
}

export { isEmptyTextValue, hasMissingBinding };
