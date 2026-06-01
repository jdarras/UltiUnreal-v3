import ProjectsSnapshotLightbox from './ProjectsSnapshotLightbox';
import ProjectsDetailActionsBar from './ProjectsDetailActionsBar';
import ProjectsDetailHeaderBar from './ProjectsDetailHeaderBar';
import ProjectsDetailIndexationCard from './ProjectsDetailIndexationCard';
import ProjectsDetailPathCard from './ProjectsDetailPathCard';
import ProjectsDetailRenderBridgeCard from './ProjectsDetailRenderBridgeCard';
import ProjectsDetailMapsCard from './ProjectsDetailMapsCard';
import ProjectsDetailSequencesCard from './ProjectsDetailSequencesCard';
import ProjectsDetailRenderPresetsCard from './ProjectsDetailRenderPresetsCard';
import ProjectsDetailWrcCard from './ProjectsDetailWrcCard';
import ProjectsDetailSetupVideoProductionCard from './ProjectsDetailSetupVideoProductionCard';
import ProjectsDetailSnapshotsCard from './ProjectsDetailSnapshotsCard';
import ProjectsDetailPluginsCard from './ProjectsDetailPluginsCard';
import ProjectsDetailIntervenantsCard from './ProjectsDetailIntervenantsCard';
import ProjectsDetailSetupUnrealCard from './ProjectsDetailSetupUnrealCard';

const PROJECT_DETAIL_FIELDSET_STYLE = {
  border: 'none',
  padding: 0,
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

export default function ProjectsDetailView({
  t,
  detailId,
  projects,
  detailMeta,
  detailInsights,
  detailMapsView,
  activeId,
  isPostprodMode,
  isRenderBridgeUsage,
  renderBridgeStatus,
  detailName,
  onDetailNameChange,
  onToggleDetailFavorite,
  versionEl,
  detailIsNew,
  onCreateProject,
  onBack,
  detailLoading,
  canEditFields,
  detailPath,
  onDetailPathChange,
  onDetailPathBlur,
  onBrowseDetailPath,
  onViewDetailPath,
  noneLabel,
  projectVersion,
  projectVersionBusy,
  markProjectDropdownDirty,
  onUpdateDetailField,
  onProjectVersionChange,
  onProjectVersionBlur,
  onProjectVersionKeyDown,
  detailNoteRef,
  onDetailNoteChange,
  keywordsInput,
  onKeywordsInputChange,
  onKeywordsKeyDown,
  onKeywordsBlur,
  detailKeywordsList,
  onRemoveKeyword,
  renderBridgeBusy,
  onRefreshRenderBridgeStatus,
  onInstallOrUpdateRenderBridge,
  mapsBusy,
  onSelectDefaultGame,
  onSelectDefaultEditor,
  lazyBlockFallback,
  httpBindVisible,
  httpBindEditing,
  httpBindDraft,
  setHttpBindDraft,
  httpBindDraftValid,
  httpBindBusy,
  httpBindDisplay,
  httpBindDisplayClass,
  httpBindInlineMsg,
  httpBindInlineClass,
  canEditHttpBind,
  onStartHttpBindEdit,
  onCancelHttpBindEdit,
  onSaveHttpBindAddress,
  detailWrcNames,
  onToggleWrcPreset,
  vpDraft,
  setVpDraft,
  scheduleVpSave,
  vpBusy,
  snapshotSrc,
  onOpenSnapshotViewer,
  onIntervenantChange,
  canManageUnrealProjects,
  showProjectActivation,
  isAutoRenderUsage,
  canCreateTaskFromProject,
  onActivateProject,
  onStartIntegration,
  onCreateTaskFromProject,
  onDeleteProject,
  snapshotOpen,
  snapshotBusy,
  onCloseSnapshotViewer,
  onSetAsThumbnail,
  confirmDialogNode,
}) {
  const proj = projects.find((p) => String(p.id || '').trim() === String(detailId));
  const meta = detailMeta || { status: '', type: '', usageMode: '', category: '', fileVersion: '', referents: {}, keywords: [], note: '' };
  const refs = meta.referents || {};
  const isActiveDetail = String(activeId || '').trim() === String(detailId || '').trim();
  const pluginsList = (Array.isArray(detailInsights?.plugins) ? detailInsights.plugins : [])
    .filter((pl) => pl && pl.enabled !== false);
  const {
    hasMaps,
    options: mapOptions,
    selectedGame,
    selectedEditor,
    listDisplay: mapListDisplay,
  } = detailMapsView;
  const sequencesList = Array.isArray(detailInsights?.sequences?.list)
    ? detailInsights.sequences.list
    : [];
  const renderPresetsList = Array.isArray(detailInsights?.renderPresets?.list)
    ? detailInsights.renderPresets.list
    : [];
  const wrcPresetsList = Array.isArray(detailInsights?.wrcPresets?.list)
    ? detailInsights.wrcPresets.list
    : [];
  const renderBridgeEligible = isPostprodMode && isRenderBridgeUsage(meta?.usageMode);
  const renderBridgeInstalled = renderBridgeStatus?.installedInProject === true;
  const renderBridgeEnabled = renderBridgeStatus?.enabledInProject === true;
  const renderBridgeReady = renderBridgeStatus?.ready === true;
  const renderBridgePackageAvailable = renderBridgeStatus?.packageAvailable === true;
  const renderBridgeStateLabel = renderBridgeReady
    ? t('projects.detail.renderBridge.state.ready')
    : (
        renderBridgeInstalled
          ? (renderBridgeEnabled
            ? t('projects.detail.renderBridge.state.ready')
            : t('projects.detail.renderBridge.state.notEnabled'))
          : t('projects.detail.renderBridge.state.notInstalled')
      );

  const setupUnreal = (detailInsights && typeof detailInsights === 'object') ? detailInsights.setupUnreal : null;
  const suRenderer = Array.isArray(setupUnreal?.renderer) ? setupUnreal.renderer : [];
  const suPlatform = setupUnreal && typeof setupUnreal.platform === 'object' ? setupUnreal.platform : {};
  const suWin = Array.isArray(suPlatform?.windows) ? suPlatform.windows : [];
  const suLinux = Array.isArray(suPlatform?.linux) ? suPlatform.linux : [];
  const suMac = Array.isArray(suPlatform?.mac) ? suPlatform.mac : [];
  const suHw = Array.isArray(suPlatform?.hardware) ? suPlatform.hardware : [];

  const setupVP = (detailInsights && typeof detailInsights === 'object') ? detailInsights.setupVideoProduction : null;
  const vpCadence = setupVP && typeof setupVP.cadence === 'object' ? setupVP.cadence : {};
  const vpTimecode = setupVP && typeof setupVP.timecode === 'object' ? setupVP.timecode : {};
  const vpAnim = setupVP && typeof setupVP.animation === 'object' ? setupVP.animation : {};
  const vpSeq = setupVP && typeof setupVP.levelSequence === 'object' ? setupVP.levelSequence : {};
  const hasSetupVP = !!(
    setupVP &&
    (Object.values(vpCadence).some(Boolean)
      || Object.values(vpTimecode).some(Boolean)
      || Object.values(vpAnim).some(Boolean)
      || Object.values(vpSeq).some(Boolean))
  );
  const snapshotsList = Array.isArray(detailInsights?.snapshots?.items)
    ? detailInsights.snapshots.items
    : [];

  return (
    <div className="uu-page uu-page-compact">
      <ProjectsDetailHeaderBar
        t={t}
        detailId={detailId}
        detailName={detailName}
        onDetailNameChange={onDetailNameChange}
        isFavorite={detailMeta?.favorite === true}
        onToggleFavorite={onToggleDetailFavorite}
        engineVersionElement={versionEl(proj?.engineVersion)}
        detailIsNew={detailIsNew}
        onCreateProject={onCreateProject}
        onBack={onBack}
      />

      <div className="uu-section uu-col uu-gap-16">
        {detailLoading ? (
          <div className="uu-muted">{t('projects.detail.loading')}</div>
        ) : (
          <fieldset
            className="uu-project-detail-stack"
            disabled={!canEditFields}
            style={PROJECT_DETAIL_FIELDSET_STYLE}
          >
            <ProjectsDetailPathCard
              t={t}
              detailPath={detailPath}
              onPathChange={onDetailPathChange}
              onPathBlur={onDetailPathBlur}
              onBrowse={onBrowseDetailPath}
              onView={onViewDetailPath}
            />

            <ProjectsDetailIndexationCard
              t={t}
              meta={meta}
              noneLabel={noneLabel}
              detailIsNew={detailIsNew}
              detailLoading={detailLoading}
              projectVersion={projectVersion}
              projectVersionBusy={projectVersionBusy}
              markProjectDropdownDirty={markProjectDropdownDirty}
              onUpdateDetailField={onUpdateDetailField}
              onProjectVersionChange={onProjectVersionChange}
              onProjectVersionBlur={onProjectVersionBlur}
              onProjectVersionKeyDown={onProjectVersionKeyDown}
              detailNoteRef={detailNoteRef}
              onDetailNoteChange={onDetailNoteChange}
              keywordsInput={keywordsInput}
              onKeywordsInputChange={onKeywordsInputChange}
              onKeywordsKeyDown={onKeywordsKeyDown}
              onKeywordsBlur={onKeywordsBlur}
              detailKeywordsList={detailKeywordsList}
              onRemoveKeyword={onRemoveKeyword}
            />

            {!detailIsNew && renderBridgeEligible ? (
              <ProjectsDetailRenderBridgeCard
                t={t}
                renderBridgeReady={renderBridgeReady}
                renderBridgeStateLabel={renderBridgeStateLabel}
                renderBridgePackageAvailable={renderBridgePackageAvailable}
                renderBridgeStatus={renderBridgeStatus}
                renderBridgeBusy={renderBridgeBusy}
                renderBridgeInstalled={renderBridgeInstalled}
                onRefresh={onRefreshRenderBridgeStatus}
                onInstallOrUpdate={onInstallOrUpdateRenderBridge}
              />
            ) : null}

            {hasMaps ? (
              <ProjectsDetailMapsCard
                t={t}
                selectedGame={selectedGame}
                selectedEditor={selectedEditor}
                mapOptions={mapOptions}
                mapListDisplay={mapListDisplay}
                mapsBusy={mapsBusy}
                detailLoading={detailLoading}
                onSelectGame={onSelectDefaultGame}
                onSelectEditor={onSelectDefaultEditor}
              />
            ) : null}

            <ProjectsDetailSequencesCard
              t={t}
              sequencesList={sequencesList}
            />

            <ProjectsDetailRenderPresetsCard
              t={t}
              renderPresetsList={renderPresetsList}
            />

            <ProjectsDetailWrcCard
              t={t}
              lazyBlockFallback={lazyBlockFallback}
              httpBindVisible={httpBindVisible}
              httpBindEditing={httpBindEditing}
              httpBindDraft={httpBindDraft}
              setHttpBindDraft={setHttpBindDraft}
              httpBindDraftValid={httpBindDraftValid}
              httpBindBusy={httpBindBusy}
              httpBindDisplay={httpBindDisplay}
              httpBindDisplayClass={httpBindDisplayClass}
              httpBindInlineMsg={httpBindInlineMsg}
              httpBindInlineClass={httpBindInlineClass}
              canEditHttpBind={canEditHttpBind}
              startHttpBindEdit={onStartHttpBindEdit}
              cancelHttpBindEdit={onCancelHttpBindEdit}
              saveHttpBindAddress={onSaveHttpBindAddress}
              wrcPresetsList={wrcPresetsList}
              detailWrcNames={detailWrcNames}
              canEditFields={canEditFields}
              onToggleWrcPreset={onToggleWrcPreset}
            />

            <ProjectsDetailSetupVideoProductionCard
              t={t}
              hasSetupVP={hasSetupVP}
              vpDraft={vpDraft}
              setVpDraft={setVpDraft}
              scheduleVpSave={scheduleVpSave}
              vpBusy={vpBusy}
              vpTimecode={vpTimecode}
              vpAnim={vpAnim}
              vpSeq={vpSeq}
            />

            <ProjectsDetailSnapshotsCard
              t={t}
              snapshotsList={snapshotsList}
              detailId={detailId}
              snapshotSrc={snapshotSrc}
              onOpenSnapshotViewer={onOpenSnapshotViewer}
            />

            <ProjectsDetailPluginsCard
              t={t}
              pluginsList={pluginsList}
            />

            <ProjectsDetailIntervenantsCard
              t={t}
              refs={refs}
              onReferentChange={onIntervenantChange}
            />

            <ProjectsDetailSetupUnrealCard
              t={t}
              suRenderer={suRenderer}
              suWin={suWin}
              suLinux={suLinux}
              suMac={suMac}
              suHw={suHw}
            />
          </fieldset>
        )}
      </div>

      <ProjectsDetailActionsBar
        t={t}
        detailIsNew={detailIsNew}
        canManageUnrealProjects={canManageUnrealProjects}
        showProjectActivation={showProjectActivation}
        isActiveDetail={isActiveDetail}
        canCreateTaskFromProject={canCreateTaskFromProject}
        detailMeta={detailMeta}
        isAutoRenderUsage={isAutoRenderUsage}
        onCreateProject={onCreateProject}
        onActivateProject={onActivateProject}
        onStartIntegration={onStartIntegration}
        onCreateTaskFromProject={onCreateTaskFromProject}
        onDeleteProject={onDeleteProject}
      />

      <ProjectsSnapshotLightbox
        t={t}
        snapshotOpen={snapshotOpen}
        detailId={detailId}
        snapshotBusy={snapshotBusy}
        snapshotSrc={snapshotSrc}
        onClose={onCloseSnapshotViewer}
        onSetAsThumbnail={onSetAsThumbnail}
      />
      {confirmDialogNode}
    </div>
  );
}
