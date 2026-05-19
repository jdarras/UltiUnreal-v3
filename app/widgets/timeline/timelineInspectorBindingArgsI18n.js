import { safeT } from '../../utils/i18nSafe.js';

const TIMELINE_BINDING_NO_ARGS_FALLBACK = 'Aucun argument.';
const TIMELINE_BINDING_UNNAMED_ARG_FALLBACK = 'Argument';

export function getTimelineBindingNoArgsLabel(t) {
  return safeT(t, 'timeline.binding.noArgs', TIMELINE_BINDING_NO_ARGS_FALLBACK);
}

export function resolveTimelineBindingArgLabel(t, name) {
  const normalized = String(name || '').trim();
  if (normalized) return normalized;
  return safeT(
    t,
    'timeline.binding.unnamedArg',
    TIMELINE_BINDING_UNNAMED_ARG_FALLBACK
  );
}
