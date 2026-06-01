import DateTimeConfirmPicker from '../components/DateTimeConfirmPicker';
import {
  getPostprodQueueCancelLabel,
  getPostprodQueueSaveLabel,
  getRenderReturnClearLabel,
} from './screenI18n';

const RETURN_PICKER_ROW_STYLE = { gap: 4, flexWrap: 'wrap', alignItems: 'center' };
const RETURN_PICKER_LABEL_STYLE = {
  fontSize: '0.82em',
  color: 'var(--uu-text-muted, #888)',
  whiteSpace: 'nowrap',
};
const RETURN_PICKER_INPUT_WRAP_STYLE = { minWidth: 220, maxWidth: 280, flex: '1 1 220px' };
const RETURN_PICKER_PRESET_BUTTON_STYLE = { fontSize: '0.8em', padding: '2px 6px' };
const RETURN_PRESETS_MIN = [30, 60, 120, 240, 480];

function isoToLocalDateTime(iso) {
  if (!iso) return '';
  try {
    const dateValue = new Date(iso);
    if (!Number.isFinite(dateValue.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${dateValue.getFullYear()}-${pad(dateValue.getMonth() + 1)}-${pad(dateValue.getDate())}T${pad(dateValue.getHours())}:${pad(dateValue.getMinutes())}`;
  } catch {
    return '';
  }
}

function localDateTimeToIso(localDateTime) {
  if (!localDateTime) return null;
  try {
    const dateValue = new Date(localDateTime);
    if (!Number.isFinite(dateValue.getTime())) return null;
    return dateValue.toISOString();
  } catch {
    return null;
  }
}

function SetupRenderReturnPicker({ value, onChange, t }) {
  const queueSaveLabel = getPostprodQueueSaveLabel(t);
  const queueCancelLabel = getPostprodQueueCancelLabel(t);
  const returnClearLabel = getRenderReturnClearLabel(t);

  const applyPreset = (minutes) => {
    const nextIso = new Date(Date.now() + minutes * 60000).toISOString();
    onChange(nextIso);
  };

  return (
    <div className="uu-row" style={RETURN_PICKER_ROW_STYLE}>
      <span style={RETURN_PICKER_LABEL_STYLE}>
        {t('renderReturnAt.label')}
      </span>
      <div style={RETURN_PICKER_INPUT_WRAP_STYLE}>
        <DateTimeConfirmPicker
          value={isoToLocalDateTime(value)}
          onChange={(nextValue) => onChange(localDateTimeToIso(nextValue))}
          placeholder="jj/mm/aaaa hh:mm"
          applyLabel={queueSaveLabel}
          cancelLabel={queueCancelLabel}
          clearLabel={returnClearLabel}
          locale="fr-FR"
        />
      </div>
      {RETURN_PRESETS_MIN.map((minutes) => (
        <button
          key={minutes}
          className="uu-btn"
          style={RETURN_PICKER_PRESET_BUTTON_STYLE}
          onClick={() => applyPreset(minutes)}
          title={t('renderReturnAt.presetTitle', { m: minutes >= 60 ? `${minutes / 60}h` : `${minutes}m` })}
        >
          {minutes >= 60 ? `${minutes / 60}h` : `${minutes}m`}
        </button>
      ))}
    </div>
  );
}

export { SetupRenderReturnPicker };
