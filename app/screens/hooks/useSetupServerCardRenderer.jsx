import React from 'react';
import { MachineSetupCard } from '../SetupMachineSetupCard';

function useSetupServerCardRenderer({
  t,
  statusDot,
  isRenderMode,
  machineColorUsageCounts,
  presetOptions,
  onDragStart,
  onCardDragEnd,
  onDragOver,
  onDrop,
  toggleMachineParams,
  updateMachine,
  setRenderAvailability,
  removeMachine,
  handleIpBlur,
  updateMachineRenderReturnAt,
  updateMachineArgs,
}) {
  const renderCard = React.useCallback(
    (machine, segment, position) => (
      <MachineSetupCard
        key={`${segment}-${machine._idx}`}
        machine={machine}
        segment={segment}
        position={position}
        t={t}
        statusDot={statusDot}
        isRenderMode={isRenderMode}
        machineColorUsageCounts={machineColorUsageCounts}
        presetOptions={presetOptions}
        onDragStart={onDragStart}
        onDragEnd={onCardDragEnd}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onToggleParams={toggleMachineParams}
        onUpdateMachine={updateMachine}
        onSetRenderAvailability={setRenderAvailability}
        onRemoveMachine={removeMachine}
        onIpBlur={handleIpBlur}
        onRenderReturnAtChange={updateMachineRenderReturnAt}
        onUpdateMachineArgs={updateMachineArgs}
      />
    ),
    [
      handleIpBlur,
      isRenderMode,
      machineColorUsageCounts,
      onCardDragEnd,
      onDragOver,
      onDragStart,
      onDrop,
      presetOptions,
      removeMachine,
      setRenderAvailability,
      statusDot,
      t,
      toggleMachineParams,
      updateMachine,
      updateMachineArgs,
      updateMachineRenderReturnAt,
    ]
  );

  return {
    renderCard,
  };
}

export { useSetupServerCardRenderer };
