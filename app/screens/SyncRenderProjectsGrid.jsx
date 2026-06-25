import React from 'react';
import {
  getRenderProjectStatusLabel,
  getRenderProjectStatusClass,
  getRenderCopyStatusLabel,
  getRenderCopyStatusClass,
} from './synchronisationHelpers';

const SYNC_LAST_COPY_HINT_STYLE = { marginBottom: '8px' };
const SYNC_RENDER_PROJECT_GRID_STYLE = {
  display: 'grid',
  gridTemplateColumns:
    'minmax(180px,1.4fr) minmax(120px,0.9fr) minmax(90px,0.8fr) minmax(120px,1fr) 56px 56px 56px minmax(220px,1.8fr)',
  columnGap: '10px',
  rowGap: '8px',
  alignItems: 'center',
};

function SyncRenderProjectsGrid({ renderProjects, copyState, targetIp, onSourceChange, t }) {
  const copyRows = Array.isArray(copyState?.rows) ? copyState.rows : null;

  const { copyRowsByProjectId, copyRowsByProjectName } = React.useMemo(() => {
    const byId = new Map();
    const byName = new Map();
    (copyRows || []).forEach((item) => {
      const projectIdKey = String(item?.projectId || '').trim();
      if (projectIdKey && !byId.has(projectIdKey)) {
        byId.set(projectIdKey, item);
      }
      const projectNameKey = String(item?.projectName || '').trim().toLowerCase();
      if (projectNameKey && !byName.has(projectNameKey)) {
        byName.set(projectNameKey, item);
      }
    });
    return { copyRowsByProjectId: byId, copyRowsByProjectName: byName };
  }, [copyRows]);

  if (!Array.isArray(renderProjects) || renderProjects.length === 0) return null;

  return (
    <div className="uu-sync-diffs mt-8">
      <div className="uu-sync-diff-block">
        {copyState?.at ? (
          <div className="uu-hint" style={SYNC_LAST_COPY_HINT_STYLE}>
            {t('sync.render.grid.lastSyncAt', {
              date: new Date(copyState.at).toLocaleString(t('common.locale')),
            })}
          </div>
        ) : null}
        <div className="uu-sync-diff-list" style={SYNC_RENDER_PROJECT_GRID_STYLE}>
          <strong>{t('sync.render.grid.project')}</strong>
          <strong>{t('sync.render.grid.source')}</strong>
          <strong>{t('sync.render.grid.status')}</strong>
          <strong>{t('sync.render.grid.lastSync')}</strong>
          <strong>+</strong>
          <strong>~</strong>
          <strong>-</strong>
          <strong>{t('sync.render.grid.targetFolder')}</strong>
          {renderProjects.map((row, rowIndex) => {
            const key = `${row.projectId || row.projectName || 'p'}-${rowIndex}`;
            const sourceText = row.sourceHostName || row.sourceHostIp || '-';
            const sourceOptions = Array.isArray(row.availableSources) ? row.availableSources : [];
            const projectText = `${row.projectName}${row.projectId ? ` [${row.projectId}]` : ''}`;
            const statusText = getRenderProjectStatusLabel(row.status, t);
            const rowProjectId = String(row.projectId || '').trim();
            const rowProjectName = String(row.projectName || '').trim().toLowerCase();
            const copyRow =
              (rowProjectId ? copyRowsByProjectId.get(rowProjectId) : null) ||
              (rowProjectName ? copyRowsByProjectName.get(rowProjectName) : null) ||
              null;
            const copyStatusText = copyRow ? getRenderCopyStatusLabel(copyRow.status, t) : '-';
            return (
              <React.Fragment key={key}>
                <span>{projectText}</span>
                <span className="uu-hint">
                  {sourceOptions.length > 0 ? (
                    <select
                      className="uu-select"
                      value={row.sourceHostIp || ''}
                      onChange={(event) => onSourceChange?.(targetIp, row.projectId, event.target.value)}
                      aria-label={t('sync.render.grid.sourceForProject', { project: row.projectName })}
                    >
                      {!row.sourceHostIp ? <option value="">{t('sync.render.grid.choose')}</option> : null}
                      {sourceOptions.map((source) => (
                        <option key={source.ip} value={source.ip}>
                          {source.name || source.ip}
                        </option>
                      ))}
                    </select>
                  ) : sourceText}
                </span>
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
  );
}

export default SyncRenderProjectsGrid;
