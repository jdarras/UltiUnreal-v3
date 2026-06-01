import { RENDER_AVAILABILITY_VALUES } from './setupHelpers';

const RENDER_AVAILABILITY_SELECT_STYLE = { width: 110, minWidth: 0, flexShrink: 0 };

function SetupMachineCardActionControls({
  t,
  machineIndex,
  segment,
  isRenderMode,
  paramsOpen,
  renderAvailability,
  onToggleParams,
  onSetRenderAvailability,
  onRemoveMachine,
}) {
  return (
    <>
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
          value={renderAvailability || 'capable'}
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

      <button onClick={() => onRemoveMachine(machineIndex)} className="uu-btn">
        {t('common.delete')}
      </button>
    </>
  );
}

export { SetupMachineCardActionControls };
