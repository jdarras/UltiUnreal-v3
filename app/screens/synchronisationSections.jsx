import React from 'react';
import { colorClass } from '../utils/colors';
import {
  safeStr,
  buildSyncDestinationInfo,
  getSyncStatusLabel,
  getSyncStatusToneClass,
  getRenderProjectStatusLabel,
  getRenderProjectStatusClass,
  getRenderCopyStatusLabel,
  getRenderCopyStatusClass,
} from './synchronisationHelpers';

const SYNC_WARN_MSG_STYLE = { margin: 0 };
const SYNC_SECTION_TITLE_STYLE = { marginBottom: '12px' };
const SYNC_DEST_COL_STYLE = { flex: '1 1 260px' };
const SYNC_LAST_COPY_HINT_STYLE = { marginBottom: '8px' };
const SYNC_RENDER_PROJECT_GRID_STYLE = {
  display: 'grid',
  gridTemplateColumns:
    'minmax(180px,1.4fr) minmax(120px,0.9fr) minmax(90px,0.8fr) minmax(120px,1fr) 56px 56px 56px minmax(220px,1.8fr)',
  columnGap: '10px',
  rowGap: '8px',
  alignItems: 'center',
};
const SYNC_DIFF_TYPES = ['added', 'modified', 'removed'];
const SYNC_DIFF_LABEL_KEYS = {
  added: 'sync.diff.added',
  modified: 'sync.diff.modified',
  removed: 'sync.diff.removed',
};

function SyncHostHeader({ host, index, t }) {
  const name = safeStr(host?.name, `${t('sync.server.hostDefaultName')} ${index + 1}`);
  const ip = safeStr(host?.ip || host?.address, `#${index + 1}`);
  return (
    <div className="uu-host-row">
      <span className={`uu-host-dot ${colorClass(host?.color)}`} />
      <div className="uu-host-main">
        <span className="uu-host-name">{name}</span>
        <span className="uu-host-ip uu-hint"> - {ip}</span>
      </div>
    </div>
  );
}

function SyncWarnCard({ host, index, messageText, t }) {
  return (
    <div className="uu-card launch-host-invalid">
      <div className="uu-row uu-row-gap12 uu-wrap uu-align-center">
        <div className="uu-col">
          <SyncHostHeader host={host} index={index} t={t} />
        </div>
        <div className="uu-col">
          <div className="uu-msg error" style={SYNC_WARN_MSG_STYLE}>
            {messageText}
          </div>
        </div>
      </div>
    </div>
  );
}

function SyncDiffSection({
  ip,
  type,
  items,
  isOpen,
  isRenderMode,
  isBusy,
  isChecked,
  onToggleSection,
  onBulkSelect,
  onToggleFileSelection,
  t,
}) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return null;
  const labelKey = SYNC_DIFF_LABEL_KEYS[type];
  if (!labelKey) return null;

  return (
    <div className="uu-sync-diff-block">
      <div className="uu-sync-diff-title">
        <button
          type="button"
          className="uu-sync-diff-toggle"
          onClick={() => onToggleSection(ip, type)}
        >
          {isOpen(type) ? 'v' : '>'}
        </button>
        <span className="uu-sync-diff-label">
          {t(labelKey, { count: list.length })}
        </span>
        {!isRenderMode && (
          <>
            <button
              type="button"
              className="uu-sync-diff-bulk"
              onClick={() => onBulkSelect(ip, type, true)}
              disabled={isBusy}
            >
              Tout
            </button>
            <button
              type="button"
              className="uu-sync-diff-bulk"
              onClick={() => onBulkSelect(ip, type, false)}
              disabled={isBusy}
            >
              Aucun
            </button>
          </>
        )}
      </div>
      {isOpen(type) && (
        <div className="uu-sync-diff-list">
          {list.map((rel) => (
            <label key={rel} className="uu-sync-diff-item">
              {!isRenderMode ? (
                <input
                  type="checkbox"
                  checked={isChecked(type, rel)}
                  disabled={isBusy}
                  onChange={() => onToggleFileSelection(ip, type, rel)}
                />
              ) : null}{' '}
              <span className="uu-sync-diff-path">{rel}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function SyncClientPanel({
  t,
  localHostClient,
  hasHosts,
  localHostName,
  localHostIp,
  clientRoot,
  onClientRootChange,
  onBrowseClient,
  onTestClient,
  message,
  confirmDialogNode,
}) {
  return (
    <div className="uu-page uu-page-compact">
      <p className="uu-page-title">{t('sync.client.title')}</p>
      <p className="uu-page-subtitle">{t('sync.client.subtitle')}</p>

      <div className="uu-card">
        <div className="uu-field">
          <label className="uu-label">{t('sync.client.machineLabel')}</label>
          {!hasHosts && <p className="uu-hint">{t('sync.client.noHostsHint')}</p>}
          {hasHosts && localHostClient && (
            <div className="uu-host-row">
              <span className={`uu-host-dot ${colorClass(localHostClient.color)}`} />
              <div className="uu-host-main">
                <span className="uu-host-name">{localHostName}</span>
                <span className="uu-host-ip uu-hint"> - {localHostIp}</span>
              </div>
            </div>
          )}
        </div>

        <div className="uu-field">
          <label className="uu-label">{t('sync.client.rootLabel')}</label>
          <div className="uu-input-row">
            <input
              className="uu-input"
              type="text"
              value={clientRoot}
              onChange={(event) => onClientRootChange(event.target.value)}
              placeholder={t('sync.client.rootPlaceholder')}
            />
            <button type="button" className="uu-btn" onClick={onBrowseClient}>
              {t('sync.client.browse')}
            </button>
          </div>
        </div>

        <div className="uu-buttons-row">
          <button type="button" className="uu-btn" onClick={onTestClient}>
            {t('sync.client.test')}
          </button>
        </div>

        {message && <div className={`uu-msg ${message.type || ''}`}>{message.text}</div>}
        {confirmDialogNode}
      </div>
    </div>
  );
}

function SyncServerHeaderCard({
  t,
  isRenderMode,
  projectsData,
  displayProjectName,
  sourceDir,
  hostsLoading,
  hostsError,
  hasClientHosts,
  onEditActiveProject,
  children,
}) {
  return (
    <>
      {!isRenderMode && (
        <div className="uu-section">
          <div className="uu-kv">
            {projectsData?.activeId ? (
              <button className="uu-btn" onClick={onEditActiveProject}>
                {t('projects.actions.edit')}
              </button>
            ) : null}
            <span className="uu-k">{t('sync.server.activeProjectLabel')}</span>
            <span className="uu-v">
              {displayProjectName ? (
                <>
                  {displayProjectName}{' '}
                  {projectsData?.activeId ? (
                    <span className="uu-id-tag uu-muted">[{projectsData.activeId}]</span>
                  ) : null}
                </>
              ) : (
                t('sync.server.activeProjectUnknown')
              )}
            </span>
          </div>
        </div>
      )}

      <div className="uu-card">
        {!isRenderMode && (
          <p>
            <strong>{t('sync.server.sourceDirLabel')}&nbsp;</strong>{' '}
            {sourceDir ? <code>{sourceDir}</code> : <span>{t('sync.server.sourceDirUnknown')}</span>}
          </p>
        )}

        {hostsLoading && <p className="uu-hint">{t('sync.server.loadingHosts')}</p>}

        {!hostsLoading && hostsError && <div className="uu-msg error">{hostsError}</div>}

        {!hostsLoading && !hostsError && !hasClientHosts && (
          <p className="uu-hint">{t('sync.server.noClientHosts')}</p>
        )}

        {children}
      </div>
    </>
  );
}

function SyncServerHostCard({
  host,
  index,
  t,
  isRenderMode,
  displayProjectName,
  sourceProjectName,
  syncStatus,
  syncDetails,
  syncDiffs,
  syncCopyProjects,
  syncSelection,
  diffFoldState,
  onCheckHost,
  onCopyHost,
  onToggleSection,
  onBulkSelect,
  onToggleFileSelection,
}) {
  const ip = safeStr(host?.ip || host?.address, `#${index + 1}`);
  const syncRoot = typeof host?.syncRoot === 'string' ? host.syncRoot : '';
  const uproject = typeof host?.uproject === 'string' ? host.uproject : '';
  const destInfo = buildSyncDestinationInfo({
    isRenderMode,
    syncRoot,
    uproject,
    displayProjectName,
    sourceProjectName,
    t,
  });

  const status = syncStatus[ip] || 'unknown';
  const statusLabel = getSyncStatusLabel(status, t);
  const statusLine = syncDetails[ip] ? `${statusLabel} - ${syncDetails[ip]}` : statusLabel;
  const statusToneClass = getSyncStatusToneClass(status);

  const canCopy = !!syncRoot && status !== 'checking' && status !== 'copying';
  const isBusy = status === 'copying' || status === 'checking';

  const diffs = syncDiffs[ip] || {};
  const added = Array.isArray(diffs.added) ? diffs.added : [];
  const modified = Array.isArray(diffs.modified) ? diffs.modified : [];
  const removed = Array.isArray(diffs.removed) ? diffs.removed : [];
  const renderProjects = Array.isArray(diffs.renderProjects) ? diffs.renderProjects : [];

  const copyState =
    syncCopyProjects[ip] && typeof syncCopyProjects[ip] === 'object'
      ? syncCopyProjects[ip]
      : null;
  const renderCopyRows = Array.isArray(copyState?.rows) ? copyState.rows : [];
  const copyRowsByProjectId = new Map();
  const copyRowsByProjectName = new Map();
  renderCopyRows.forEach((item) => {
    const projectIdKey = String(item?.projectId || '').trim();
    if (projectIdKey && !copyRowsByProjectId.has(projectIdKey)) {
      copyRowsByProjectId.set(projectIdKey, item);
    }
    const projectNameKey = String(item?.projectName || '').trim().toLowerCase();
    if (projectNameKey && !copyRowsByProjectName.has(projectNameKey)) {
      copyRowsByProjectName.set(projectNameKey, item);
    }
  });

  const hasAnyDiffs = !isRenderMode && (added.length > 0 || modified.length > 0 || removed.length > 0);

  const selection = syncSelection[ip] || {};
  const selectedAdded = selection.added || {};
  const selectedModified = selection.modified || {};
  const selectedRemoved = selection.removed || {};

  const fold = diffFoldState[ip] || {};
  const isOpen = (type) => (fold[type] === undefined ? true : !!fold[type]);
  const isChecked = (type, rel) => {
    if (type === 'added') return selectedAdded[rel] !== false;
    if (type === 'modified') return selectedModified[rel] !== false;
    if (type === 'removed') return selectedRemoved[rel] !== false;
    return true;
  };

  return (
    <div className="uu-card">
      <div className="uu-row uu-row-gap12 uu-wrap uu-align-center">
        <div className="uu-col">
          <SyncHostHeader host={host} index={index} t={t} />
        </div>
        <div className="uu-col" style={SYNC_DEST_COL_STYLE}>
          <div>{destInfo}</div>
        </div>
        <div className="uu-col uu-actions">
          <div className="uu-buttons-row">
            <button
              type="button"
              className="uu-btn"
              onClick={() => onCheckHost(ip)}
              disabled={status === 'checking' || status === 'copying'}
            >
              {t('sync.server.btn.check')}
            </button>
            <button
              type="button"
              className="uu-btn"
              onClick={() => onCopyHost(ip)}
              disabled={!canCopy}
            >
              {t('sync.server.btn.copy')}
            </button>
          </div>
        </div>
      </div>

      <div className={`uu-sync-status-line ${statusToneClass}`}>{statusLine}</div>

      {isRenderMode && renderProjects.length > 0 && (
        <div className="uu-sync-diffs mt-8">
          <div className="uu-sync-diff-block">
            {copyState?.at ? (
              <div className="uu-hint" style={SYNC_LAST_COPY_HINT_STYLE}>
                Derniere synchro: {new Date(copyState.at).toLocaleString('fr-FR')}
              </div>
            ) : null}
            <div className="uu-sync-diff-list" style={SYNC_RENDER_PROJECT_GRID_STYLE}>
              <strong>Projet</strong>
              <strong>Source</strong>
              <strong>Statut</strong>
              <strong>Derniere synchro</strong>
              <strong>+</strong>
              <strong>~</strong>
              <strong>-</strong>
              <strong>Dossier cible</strong>
              {renderProjects.map((row, rowIndex) => {
                const key = `${row.projectId || row.projectName || 'p'}-${rowIndex}`;
                const sourceText = row.sourceHostName || row.sourceHostIp || '-';
                const projectText = `${row.projectName}${row.projectId ? ` [${row.projectId}]` : ''}`;
                const statusText = getRenderProjectStatusLabel(row.status);
                const rowProjectId = String(row.projectId || '').trim();
                const rowProjectName = String(row.projectName || '').trim().toLowerCase();
                const copyRow =
                  (rowProjectId ? copyRowsByProjectId.get(rowProjectId) : null) ||
                  (rowProjectName ? copyRowsByProjectName.get(rowProjectName) : null) ||
                  null;
                const copyStatusText = copyRow ? getRenderCopyStatusLabel(copyRow.status) : '-';
                return (
                  <React.Fragment key={key}>
                    <span>{projectText}</span>
                    <span className="uu-hint">{sourceText}</span>
                    <span className={getRenderProjectStatusClass(row.status)}>{statusText}</span>
                    <span
                      className={copyRow ? getRenderCopyStatusClass(copyRow.status) : 'uu-hint'}
                      title={copyRow?.message || ''}
                    >
                      {copyStatusText}
                    </span>
                    <span>{Number(row.addedCount || 0)}</span>
                    <span>{Number(row.modifiedCount || 0)}</span>
                    <span>{Number(row.removedCount || 0)}</span>
                    <span className="uu-hint" title={row.message || row.destDir || ''}>
                      {row.message || row.destDir || '-'}
                    </span>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {hasAnyDiffs && (
        <div className="uu-sync-diffs mt-8">
          {SYNC_DIFF_TYPES.map((diffType) => (
            <SyncDiffSection
              key={diffType}
              ip={ip}
              type={diffType}
              items={diffType === 'added' ? added : diffType === 'modified' ? modified : removed}
              isOpen={isOpen}
              isRenderMode={isRenderMode}
              isBusy={isBusy}
              isChecked={isChecked}
              onToggleSection={onToggleSection}
              onBulkSelect={onBulkSelect}
              onToggleFileSelection={onToggleFileSelection}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SyncServerGroups({
  t,
  isRenderMode,
  syncHosts,
  localProjectHosts,
  excludedHosts,
  displayProjectName,
  sourceProjectName,
  syncStatus,
  syncDetails,
  syncDiffs,
  syncCopyProjects,
  syncSelection,
  diffFoldState,
  onCheckHost,
  onCopyHost,
  onToggleSection,
  onBulkSelect,
  onToggleFileSelection,
}) {
  return (
    <>
      {syncHosts.length > 0 && (
        <div className="uu-section">
          <h3 className="uu-h3 uu-block-title" style={SYNC_SECTION_TITLE_STYLE}>
            {t('sync.server.section.syncHosts')}
          </h3>
          <div className="uu-list">
            {syncHosts.map((host, index) => (
              <SyncServerHostCard
                key={`${safeStr(host?.ip || host?.address, index)}-${index}`}
                host={host}
                index={index}
                t={t}
                isRenderMode={isRenderMode}
                displayProjectName={displayProjectName}
                sourceProjectName={sourceProjectName}
                syncStatus={syncStatus}
                syncDetails={syncDetails}
                syncDiffs={syncDiffs}
                syncCopyProjects={syncCopyProjects}
                syncSelection={syncSelection}
                diffFoldState={diffFoldState}
                onCheckHost={onCheckHost}
                onCopyHost={onCopyHost}
                onToggleSection={onToggleSection}
                onBulkSelect={onBulkSelect}
                onToggleFileSelection={onToggleFileSelection}
              />
            ))}
          </div>
        </div>
      )}

      {localProjectHosts.length > 0 && (
        <div className="uu-section">
          <h3 className="uu-h3 uu-block-title" style={SYNC_SECTION_TITLE_STYLE}>
            {isRenderMode
              ? t('sync.server.render.localProjectTitle', 'Stations non configurees pour la synchronisation')
              : t('sync.server.section.localProject')}
          </h3>
          <div className="uu-list">
            {localProjectHosts.map((host, index) => (
              <SyncWarnCard
                key={`${safeStr(host?.ip || host?.address, index)}-${index}`}
                host={host}
                index={index}
                t={t}
                messageText={
                  isRenderMode
                    ? t(
                        'sync.server.render.localProjectMessage',
                        'Synchronisation desactivee sur cette station. Active-la pour comparer et copier les projets rendu.'
                      )
                    : t('sync.server.msg.localProjectMode')
                }
              />
            ))}
          </div>
        </div>
      )}

      {excludedHosts.length > 0 && (
        <div className="uu-section">
          <h3 className="uu-h3 uu-block-title" style={SYNC_SECTION_TITLE_STYLE}>
            {isRenderMode
              ? t('sync.server.render.excludedTitle', 'Stations exclues de la synchronisation')
              : t('sync.server.section.excluded')}
          </h3>
          <div className="uu-list">
            {excludedHosts.map((host, index) => (
              <SyncWarnCard
                key={`${safeStr(host?.ip || host?.address, index)}-${index}`}
                host={host}
                index={index}
                t={t}
                messageText={
                  isRenderMode
                    ? t('sync.server.render.excludedMessage', 'Cette station est exclue du rendu/synchronisation.')
                    : t('sync.server.msg.excluded')
                }
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function SyncServerScreen({
  t,
  isRenderMode,
  projectsData,
  displayProjectName,
  sourceDir,
  hostsLoading,
  hostsError,
  hasClientHosts,
  onEditActiveProject,
  groupedHosts,
  sourceProjectName,
  syncStatus,
  syncDetails,
  syncDiffs,
  syncCopyProjects,
  syncSelection,
  diffFoldState,
  onCheckHost,
  onCopyHost,
  onToggleSection,
  onBulkSelect,
  onToggleFileSelection,
  message,
  confirmDialogNode,
}) {
  const syncHosts = Array.isArray(groupedHosts?.syncHosts) ? groupedHosts.syncHosts : [];
  const localProjectHosts = Array.isArray(groupedHosts?.localProjectHosts)
    ? groupedHosts.localProjectHosts
    : [];
  const excludedHosts = Array.isArray(groupedHosts?.excludedHosts) ? groupedHosts.excludedHosts : [];

  return (
    <div className="uu-page uu-page-compact">
      <SyncServerHeaderCard
        t={t}
        isRenderMode={isRenderMode}
        projectsData={projectsData}
        displayProjectName={displayProjectName}
        sourceDir={sourceDir}
        hostsLoading={hostsLoading}
        hostsError={hostsError}
        hasClientHosts={hasClientHosts}
        onEditActiveProject={onEditActiveProject}
      >
        {!hostsLoading && !hostsError && hasClientHosts && (
          <SyncServerGroups
            t={t}
            isRenderMode={isRenderMode}
            syncHosts={syncHosts}
            localProjectHosts={localProjectHosts}
            excludedHosts={excludedHosts}
            displayProjectName={displayProjectName}
            sourceProjectName={sourceProjectName}
            syncStatus={syncStatus}
            syncDetails={syncDetails}
            syncDiffs={syncDiffs}
            syncCopyProjects={syncCopyProjects}
            syncSelection={syncSelection}
            diffFoldState={diffFoldState}
            onCheckHost={onCheckHost}
            onCopyHost={onCopyHost}
            onToggleSection={onToggleSection}
            onBulkSelect={onBulkSelect}
            onToggleFileSelection={onToggleFileSelection}
          />
        )}

        {message && <div className={`uu-msg ${message.type || ''}`}>{message.text}</div>}
        {confirmDialogNode}
      </SyncServerHeaderCard>
    </div>
  );
}

export {
  SyncClientPanel,
  SyncServerScreen,
  SyncServerHeaderCard,
  SyncHostHeader,
  SyncWarnCard,
  SyncDiffSection,
  SyncServerHostCard,
  SyncServerGroups,
};
