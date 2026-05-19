const STATUS_DOT_STYLE = { marginLeft: '6px' };
const START_LAYOUT_LABEL_STYLE = { marginRight: '12px' };
const UE_SECTION_STYLE = { marginTop: '12px' };
const UE_HEADER_STYLE = { marginBottom: '8px' };
const UE_VERSION_BUTTON_STYLE = { minWidth: '140px', padding: '10px 16px' };

function LaunchHostCard({
  row,
  t,
  activeProjectEngineVersion,
  pathOrND,
  renderColorDot,
  renderStatusDot,
  onStart,
  onStop,
  busy,
}) {
  const {
    host,
    online,
    ue,
    uproj,
    canStart,
    canStop,
    agentStatus,
    projectStatus,
    exeStatus,
    hostInvalid,
    hostWarn,
  } = row;

  return (
    <div
      className={`uu-card ${hostInvalid ? 'launch-host-invalid' : hostWarn ? 'launch-host-warn' : ''}`}
    >
      <div className="uu-row uu-row-launch-host">
        <div className="uu-col">
          <div className="uu-item-title">
            {renderColorDot(host.color, host.name || host.ip)}
            {host.name || host.ip}
          </div>
          <div
            className="uu-item-sub"
            title={
              online
                ? t('launch.status.agentOnline')
                : t('launch.status.agentOffline')
            }
          >
            {host.ip}
            {renderStatusDot(agentStatus.cls, agentStatus.title)}
          </div>
        </div>

        <div className="uu-col">
          <div className="uu-kv">
            <span className="uu-k">
              {activeProjectEngineVersion
                ? t('launch.labels.unrealExeVersion', { version: activeProjectEngineVersion })
                : t('launch.labels.unrealExe')}
            </span>
            <span className="uu-v uu-row uu-row-gap4 uu-align-center">
              {pathOrND(ue)}
              {renderStatusDot(exeStatus.cls, exeStatus.title)}
            </span>
          </div>
          <div className="uu-kv">
            <span className="uu-k">
              {host.syncEnabled && host.syncRoot
                ? t('launch.labels.projectPathSync')
                : t('launch.labels.projectPath')}
            </span>
            <span className="uu-v uu-row uu-row-gap4 uu-align-center">
              {pathOrND(uproj)}
              {renderStatusDot(projectStatus.cls, projectStatus.title)}
              {projectStatus.cls === 'warn' ? (
                <span className="uu-text-warn">
                  {t('launch.labels.desynced')}
                </span>
              ) : null}
              {projectStatus.rawDiffCount > 0 ? (
                <span className="uu-text-warn">
                  {t('launch.labels.diffFilesWarning', {
                    count: projectStatus.rawDiffCount,
                  })}
                </span>
              ) : null}
            </span>
          </div>
        </div>

        <div className="uu-col uu-actions">
          <button
            className={`uu-btn ${canStart ? 'prod-toggle-active' : ''}`}
            disabled={!canStart}
            onClick={() => onStart(host.ip)}
          >
            {busy[host.ip]
              ? t('launch.buttons.starting')
              : t('launch.buttons.start')}
          </button>
          <button
            className={`uu-btn ${canStop ? 'uu-btn-danger' : ''}`}
            disabled={!canStop}
            onClick={() => onStop(host.ip)}
          >
            {t('launch.buttons.stop')}
          </button>
        </div>
      </div>
    </div>
  );
}

function LaunchEditorVersionsSection({
  t,
  serverHost,
  ueVersions,
  resolveEditorPath,
  onlineMap,
  onLaunchEditor,
}) {
  if (!serverHost || !Array.isArray(ueVersions) || ueVersions.length === 0) return null;
  return (
    <div className="uu-section" style={UE_SECTION_STYLE}>
      <div className="uu-row uu-align-center uu-gap-12 uu-wrap" style={UE_HEADER_STYLE}>
        <strong className="uu-block-title">
          {t('launch.unrealEditor.title')}
        </strong>
        <span className="uu-muted">{serverHost.name || serverHost.ip}</span>
      </div>
      <div className="uu-row uu-gap-12 uu-wrap">
        {ueVersions.map((ver, idx) => {
          const path = resolveEditorPath(serverHost, ver);
          const disabled = !path || !onlineMap[serverHost.ip]?.online;
          return (
            <button
              key={`${ver}-${idx}`}
              className={`uu-btn ${!disabled ? 'prod-toggle-active' : ''}`}
              style={UE_VERSION_BUTTON_STYLE}
              disabled={disabled}
              onClick={() => onLaunchEditor(ver)}
              title={path || t('launch.labels.unrealExe')}
            >
              {t('launch.buttons.startVersion', { ver })}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LaunchActiveProjectSummary({
  canOpenProjectDetail,
  activeProjectId,
  activeLabel,
  onEditProject,
  t,
}) {
  return (
    <div className="uu-kv">
      {canOpenProjectDetail && activeProjectId ? (
        <button className="uu-btn" onClick={onEditProject}>
          {t('projects.actions.edit')}
        </button>
      ) : null}
      <span className="uu-k">{t('launch.activeProject.label')}</span>
      <span className="uu-v">
        {activeLabel}{' '}
        {activeProjectId ? (
          <span className="uu-id-tag uu-muted">[{activeProjectId}]</span>
        ) : null}
      </span>
    </div>
  );
}

function LaunchToolbarActions({
  t,
  launchMode,
  hasStartLayout,
  useStartLayout,
  onToggleUseStartLayout,
  onChangeLaunchMode,
  canUseEditorLaunch,
  canStartAnyHost,
  canStopAnyHost,
  onStartAll,
  onStopAll,
}) {
  return (
    <div className="uu-toolbar-actions">
      {launchMode !== 'integration' && hasStartLayout ? (
        <label className="uu-check uu-row uu-align-center uu-gap-8" style={START_LAYOUT_LABEL_STYLE}>
          {t('launch.useStartLayout')}
          <input
            type="checkbox"
            checked={!!useStartLayout}
            onChange={onToggleUseStartLayout}
          />
        </label>
      ) : null}
      <select
        className="uu-select uu-launch-mode-select"
        value={launchMode}
        onChange={onChangeLaunchMode}
      >
        <option value="production">{t('launch.mode.production')}</option>
        {canUseEditorLaunch ? (
          <option value="integration">{t('launch.mode.integration')}</option>
        ) : null}
      </select>
      <button
        className={`uu-btn ${
          launchMode === 'integration'
            ? ''
            : (canStartAnyHost ? 'prod-toggle-active' : '')
        }`}
        onClick={onStartAll}
        disabled={launchMode === 'integration' || !canStartAnyHost}
      >
        {t('launch.buttons.startAll')}
      </button>
      <button
        className={`uu-btn ${canStopAnyHost ? 'uu-btn-danger' : ''}`}
        onClick={onStopAll}
        disabled={!canStopAnyHost}
      >
        {t('launch.buttons.stopAll')}
      </button>
    </div>
  );
}

function renderStatusDot(cls, title = '') {
  return (
    <span
      className={`uu-dot ${cls}`}
      title={title}
      aria-label={title || cls}
      style={STATUS_DOT_STYLE}
    />
  );
}

export {
  LaunchHostCard,
  LaunchEditorVersionsSection,
  LaunchActiveProjectSummary,
  LaunchToolbarActions,
  renderStatusDot,
};
