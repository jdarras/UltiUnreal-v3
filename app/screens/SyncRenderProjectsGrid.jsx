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

function SyncRenderProjectsGrid({ renderProjects, copyState }) {
  if (!Array.isArray(renderProjects) || renderProjects.length === 0) return null;

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

  return (
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
  );
}

export default SyncRenderProjectsGrid;
