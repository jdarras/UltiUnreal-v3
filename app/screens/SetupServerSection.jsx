import { MachineGroupSection, UnknownDetectedSection } from './setupSections';

function SetupServerSection({
  t,
  isRenderMode,
  addMachine,
  capableList,
  excludedList,
  renderCard,
  unknownDetected,
  addDetectedMachine,
}) {
  return (
    <div className="uu-page">
      <div className="uu-row-col">
        <div>
          <button onClick={addMachine} className="uu-btn">
            {t('setup.server.addMachine')}
          </button>
        </div>
      </div>

      <MachineGroupSection
        title={isRenderMode ? t('setup.server.machinesRenderEligible') : t('setup.server.machinesEligible')}
        emptyText={t('setup.server.noEligible')}
        list={capableList}
        segment="capable"
        renderCard={renderCard}
      />

      <MachineGroupSection
        title={isRenderMode ? t('setup.server.machinesRenderExcluded') : t('setup.server.machinesExcluded')}
        emptyText={isRenderMode ? t('setup.server.noRenderExcluded') : t('setup.server.noExcluded')}
        list={excludedList}
        segment="excluded"
        renderCard={renderCard}
      />

      <UnknownDetectedSection
        t={t}
        unknownDetected={unknownDetected}
        addDetectedMachine={addDetectedMachine}
      />
    </div>
  );
}

export { SetupServerSection };
