import { colorClass } from '../utils/colors';
import { SetupMachineCardActionControls } from './SetupMachineCardActionControls';
import { SetupRenderReturnPicker } from './SetupRenderReturnPicker';

const DRAG_HANDLE_STYLE = { marginLeft: 'auto', cursor: 'grab', opacity: 0.6 };

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

      <SetupMachineCardActionControls
        t={t}
        machineIndex={machineIndex}
        segment={segment}
        isRenderMode={isRenderMode}
        paramsOpen={paramsOpen}
        renderAvailability={machine.renderAvailability}
        onToggleParams={onToggleParams}
        onSetRenderAvailability={onSetRenderAvailability}
        onRemoveMachine={onRemoveMachine}
      />

      {isRenderMode && machine.renderAvailability === 'busy' ? (
        <SetupRenderReturnPicker
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

export { MachineCardHeaderRow };
