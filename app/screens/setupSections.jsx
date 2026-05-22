import { colorClass } from '../utils/colors';
import DateTimeConfirmPicker from '../components/DateTimeConfirmPicker';
import { MACHINE_COLORS, RENDER_AVAILABILITY_VALUES } from './setupHelpers';
import {
  getPostprodQueueCancelLabel,
  getPostprodQueueSaveLabel,
  getRenderReturnClearLabel,
} from './screenI18n';

const GROUP_TITLE_STYLE = { marginBottom: '12px' };
const ROW_ALIGN_CENTER_STYLE = { alignItems: 'center' };
const DRAG_HANDLE_STYLE = { marginLeft: 'auto', cursor: 'grab', opacity: 0.6 };
const RETURN_PICKER_ROW_STYLE = { gap: 4, flexWrap: 'wrap', alignItems: 'center' };
const RETURN_PICKER_LABEL_STYLE = {
  fontSize: '0.82em',
  color: 'var(--uu-text-muted, #888)',
  whiteSpace: 'nowrap',
};
const RETURN_PICKER_INPUT_WRAP_STYLE = { minWidth: 220, maxWidth: 280, flex: '1 1 220px' };
const RETURN_PICKER_PRESET_BUTTON_STYLE = { fontSize: '0.8em', padding: '2px 6px' };
const MACHINE_ARGS_TOP_GRID_STYLE = { columnGap: '24px', gridTemplateColumns: '260px 260px 260px' };
const MACHINE_ARGS_SECOND_GRID_STYLE = {
  columnGap: '24px',
  alignItems: 'center',
  gridTemplateColumns: '260px 200px 200px 220px',
};
const CHECK_ALIGN_CENTER_STYLE = { alignItems: 'center' };
const MACHINE_ARGS_BOTTOM_GRID_STYLE = { gridTemplateColumns: '0.3fr 0.7fr' };
const RENDER_AVAILABILITY_SELECT_STYLE = { width: 110, minWidth: 0, flexShrink: 0 };
const CARD_MARGIN_BOTTOM_STYLE = { marginBottom: '12px' };

const FRAME_RATE_OPTIONS = ['23.98', '24', '25', '29.97', '30', '47.95', '48', '50', '59.94', '60'];
const RETURN_PRESETS_MIN = [30, 60, 120, 240, 480];

function ReturnAtPicker({ value, onChange, t }) {
  const queueSaveLabel = getPostprodQueueSaveLabel(t);
  const queueCancelLabel = getPostprodQueueCancelLabel(t);
  const returnClearLabel = getRenderReturnClearLabel(t);
  // value: ISO string | null
  // Convertit ISO -> valeur pour datetime-local (YYYY-MM-DDTHH:mm)
  const isoToLocal = (iso) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      if (!Number.isFinite(d.getTime())) return '';
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch { return ''; }
  };

  const localToIso = (local) => {
    if (!local) return null;
    try {
      const d = new Date(local);
      if (!Number.isFinite(d.getTime())) return null;
      return d.toISOString();
    } catch { return null; }
  };

  const applyPreset = (minutes) => {
    const iso = new Date(Date.now() + minutes * 60000).toISOString();
    onChange(iso);
  };

  return (
    <div className="uu-row" style={RETURN_PICKER_ROW_STYLE}>
      <span style={RETURN_PICKER_LABEL_STYLE}>
        {t('renderReturnAt.label')}
      </span>
      <div style={RETURN_PICKER_INPUT_WRAP_STYLE}>
        <DateTimeConfirmPicker
          value={isoToLocal(value)}
          onChange={(nextValue) => onChange(localToIso(nextValue))}
          placeholder="jj/mm/aaaa hh:mm"
          applyLabel={queueSaveLabel}
          cancelLabel={queueCancelLabel}
          clearLabel={returnClearLabel}
          locale="fr-FR"
        />
      </div>
      {RETURN_PRESETS_MIN.map((m) => (
        <button
          key={m}
          className="uu-btn"
          style={RETURN_PICKER_PRESET_BUTTON_STYLE}
          onClick={() => applyPreset(m)}
          title={t('renderReturnAt.presetTitle', { m: m >= 60 ? `${m / 60}h` : `${m}m` })}
        >
          {m >= 60 ? `${m / 60}h` : `${m}m`}
        </button>
      ))}
    </div>
  );
}

function MachineArgsPanel({ machine, args, t, presetOptions, updateMachineArgs }) {
  return (
    <div className="uu-args">
      <div className="uu-args-title">{t('setup.server.argsTitle')}</div>
      <div
        className="uu-grid-3"
        style={MACHINE_ARGS_TOP_GRID_STYLE}
      >
        <div className="uu-grid-field">
          <label className="uu-label w-160">{t('setup.server.resPresetLabel')}</label>
          <select
            className="uu-input"
            value={args.resPreset || 'manual'}
            onChange={(e) => {
              const val = e.target.value || 'manual';
              const preset = presetOptions.find((p) => p.k === val);
              if (preset && preset.x && preset.y) {
                updateMachineArgs(machine._idx, {
                  resPreset: val,
                  resx: preset.x,
                  resy: preset.y,
                });
              } else {
                updateMachineArgs(machine._idx, { resPreset: 'manual' });
              }
            }}
          >
            {presetOptions.map((p) => (
              <option key={p.k} value={p.k}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div className="uu-grid-field">
          <label className="uu-label w-160">{t('setup.server.resx')}</label>
          <input
            type="number"
            className="uu-input"
            value={args.resx ?? ''}
            disabled={args.resPreset && args.resPreset !== 'manual'}
            onChange={(e) =>
              updateMachineArgs(machine._idx, { resx: e.target.value, resPreset: 'manual' })
            }
          />
        </div>
        <div className="uu-grid-field">
          <label className="uu-label w-160">{t('setup.server.resy')}</label>
          <input
            type="number"
            className="uu-input"
            value={args.resy ?? ''}
            disabled={args.resPreset && args.resPreset !== 'manual'}
            onChange={(e) =>
              updateMachineArgs(machine._idx, { resy: e.target.value, resPreset: 'manual' })
            }
          />
        </div>
        <div
          className="uu-grid-3 mt-12"
          style={MACHINE_ARGS_SECOND_GRID_STYLE}
        >
          <div className="uu-grid-field">
            <label className="uu-label w-160">{t('setup.server.frameRateLimit')}</label>
            <select
              className="uu-input"
              value={args.frameRateLimit ?? ''}
              onChange={(e) =>
                updateMachineArgs(machine._idx, { frameRateLimit: e.target.value })
              }
            >
              <option value="">{'—'}</option>
              {FRAME_RATE_OPTIONS.map((fps) => (
                <option key={fps} value={fps}>
                  {fps} fps
                </option>
              ))}
            </select>
          </div>
          <div className="uu-grid-field">
            <label className="uu-check" style={CHECK_ALIGN_CENTER_STYLE}>
              <input
                type="checkbox"
                checked={!!args.renderOffscreen}
                onChange={(e) =>
                  updateMachineArgs(machine._idx, { renderOffscreen: !!e.target.checked })
                }
              />
              {t('setup.server.renderOffscreen')}
            </label>
          </div>
          <div className="uu-grid-field">
            <label className="uu-check" style={CHECK_ALIGN_CENTER_STYLE}>
              <input
                type="checkbox"
                checked={!!args.noScreenMessages}
                onChange={(e) =>
                  updateMachineArgs(machine._idx, { noScreenMessages: !!e.target.checked })
                }
              />
              {t('setup.server.noScreenMessages')}
            </label>
          </div>
        </div>
      </div>
      <div
        className="uu-grid-2 mt-12"
        style={MACHINE_ARGS_BOTTOM_GRID_STYLE}
      >
        <div className="uu-grid-field">
          <label className="uu-label w-160">{t('setup.server.videoCard')}</label>
          <select
            className="uu-input"
            value={args.videoCard || ''}
            onChange={(e) =>
              updateMachineArgs(machine._idx, { videoCard: e.target.value })
            }
          >
            <option value="">{t('setup.server.videoCard.none')}</option>
            <option value="AJA">{t('setup.server.videoCard.aja')}</option>
            <option value="BlackMagic">{t('setup.server.videoCard.blackmagic')}</option>
          </select>
        </div>
        <div className="uu-grid-field">
          <label>{t('setup.server.execCmds')}</label>
          <input
            className="uu-input"
            value={args.execCmds || ''}
            onChange={(e) =>
              updateMachineArgs(machine._idx, { execCmds: e.target.value })
            }
          />
        </div>
      </div>
    </div>
  );
}

function MachineCardHeaderRow({
  machine,
  machineIndex,
  t,
  statusDot,
  availableColors,
  isRenderMode,
  paramsOpen,
  onToggleParams,
  segment,
  updateMachine,
  onSetRenderAvailability,
  onRemoveMachine,
  onIpBlur,
  onRenderReturnAtChange,
}) {
  return (
    <div className="uu-row">
      <span className={`uu-pastille ${colorClass(machine.color)}`} />
      <input
        className="uu-input w-160"
        value={machine.name || ''}
        onChange={(e) => updateMachine(machineIndex, { name: e.target.value })}
      />
      <select
        className="uu-input w-160"
        value={machine.color || ''}
        onChange={(e) => updateMachine(machineIndex, { color: e.target.value })}
      >
        <option value="">(sans couleur)</option>
        {availableColors.map((color) => (
          <option key={color.value} value={color.value}>
            {color.label}
          </option>
        ))}
      </select>

      {statusDot(machine.status)}
      <input
        className="uu-input w-160"
        value={machine.ip}
        onChange={(e) => updateMachine(machineIndex, { ip: e.target.value })}
        onBlur={() => onIpBlur(machineIndex)}
      />

      {!isRenderMode ? (
        <button onClick={() => onToggleParams(machineIndex, !paramsOpen)} className="uu-btn">
          {paramsOpen
            ? t('setup.server.toggleParams.hide')
            : t('setup.server.toggleParams.show')}
        </button>
      ) : null}

      {isRenderMode ? (
        <select
          className="uu-input"
          style={RENDER_AVAILABILITY_SELECT_STYLE}
          value={machine.renderAvailability || 'capable'}
          onChange={(e) => onSetRenderAvailability(machineIndex, e.target.value)}
        >
          {RENDER_AVAILABILITY_VALUES.map((value) => (
            <option key={value} value={value}>
              {t(`renderAvailability.${value}`)}
            </option>
          ))}
        </select>
      ) : (
        segment === 'capable' ? (
          <button onClick={() => onSetRenderAvailability(machineIndex, 'excluded')} className="uu-btn">
            {t('setup.launchControl.exclude')}
          </button>
        ) : (
          <button onClick={() => onSetRenderAvailability(machineIndex, 'capable')} className="uu-btn">
            {t('setup.launchControl.reinclude')}
          </button>
        )
      )}

      <button onClick={() => onRemoveMachine(machineIndex)} className="uu-btn">{t('common.delete')}</button>

      {isRenderMode && machine.renderAvailability === 'busy' ? (
        <ReturnAtPicker
          value={machine.renderReturnAt || null}
          onChange={(iso) => onRenderReturnAtChange(machineIndex, iso)}
          t={t}
        />
      ) : null}

      <span
        style={DRAG_HANDLE_STYLE}
        title={t('setup.launchControl.dragToReorder')}
      >⋯</span>
    </div>
  );
}

function MachineSetupCard({
  machine,
  segment,
  position,
  t,
  statusDot,
  isRenderMode,
  machineColorUsageCounts,
  presetOptions,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onToggleParams,
  onUpdateMachine,
  onSetRenderAvailability,
  onRemoveMachine,
  onIpBlur,
  onRenderReturnAtChange,
  onUpdateMachineArgs,
}) {
  const args = machine.args || {};
  const paramsOpen = !isRenderMode && !!(machine.showEditor || machine.showArgs);

  const currentColor = String(machine.color || '').trim();
  const availableColors = MACHINE_COLORS.filter(
    (color) => color.value === currentColor || !machineColorUsageCounts.has(color.value)
  );

  const statusIsFail = machine.status === 'fail';
  const statusIsWarn = machine.status === 'warn';
  const cardStateClass = statusIsFail
    ? 'launch-host-invalid'
    : (statusIsWarn ? 'launch-host-warn' : '');

  return (
    <div
      className={`uu-card ${cardStateClass}`}
      draggable
      onDragStart={() => onDragStart(segment, position)}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(segment, position);
      }}
      style={CARD_MARGIN_BOTTOM_STYLE}
    >
      <MachineCardHeaderRow
        machine={machine}
        machineIndex={machine._idx}
        t={t}
        statusDot={statusDot}
        availableColors={availableColors}
        isRenderMode={isRenderMode}
        paramsOpen={paramsOpen}
        onToggleParams={onToggleParams}
        segment={segment}
        updateMachine={onUpdateMachine}
        onSetRenderAvailability={onSetRenderAvailability}
        onRemoveMachine={onRemoveMachine}
        onIpBlur={onIpBlur}
        onRenderReturnAtChange={onRenderReturnAtChange}
      />

      {paramsOpen ? (
        <MachineArgsPanel
          machine={machine}
          args={args}
          t={t}
          presetOptions={presetOptions}
          updateMachineArgs={onUpdateMachineArgs}
        />
      ) : null}

      {machine?.lastMsg ? (
        <div className={`uu-msg ${machine.lastMsgType || ''} mt-8`}>
          {machine.lastMsg}
        </div>
      ) : null}
    </div>
  );
}

function MachineGroupSection({ title, emptyText, list, segment, renderCard }) {
  return (
    <div className="uu-section">
      <h3 className="uu-h3 uu-block-title" style={GROUP_TITLE_STYLE}>
        {title}
      </h3>
      {list.length === 0 ? (
        <div className="uu-muted">{emptyText}</div>
      ) : (
        list.map((machine, idx) => renderCard(machine, segment, idx))
      )}
    </div>
  );
}

function UnknownDetectedSection({ t, unknownDetected, addDetectedMachine }) {
  if (!unknownDetected.length) return null;
  return (
    <div className="uu-section">
      <h3 className="uu-h3 uu-block-title">{t('setup.server.detectedUnknown')}</h3>
      <div className="uu-list">
        {unknownDetected.map((detected) => (
          <div key={detected.ip} className="uu-card uu-row" style={ROW_ALIGN_CENTER_STYLE}>
            <div className="uu-col">
              <div className="uu-item-title">{detected.name || detected.ip}</div>
              <div className="uu-item-sub">{detected.ip}</div>
              {detected.ts ? (
                <div className="uu-item-sub">
                  {t('setup.server.detectedAt').replace('{ts}', detected.ts)}
                </div>
              ) : null}
            </div>
            <div className="uu-col uu-actions">
              <button className="uu-btn" onClick={() => addDetectedMachine(detected)}>
                {t('setup.server.addDetected')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export {
  MachineArgsPanel,
  MachineCardHeaderRow,
  MachineSetupCard,
  MachineGroupSection,
  UnknownDetectedSection,
};
