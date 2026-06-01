import { MACHINE_COLORS } from './setupHelpers';
import { MachineArgsPanel } from './SetupMachineArgsPanel';
import { MachineCardHeaderRow } from './SetupMachineCardHeaderRow';

const CARD_MARGIN_BOTTOM_STYLE = { marginBottom: '12px' };

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

export { MachineSetupCard };
