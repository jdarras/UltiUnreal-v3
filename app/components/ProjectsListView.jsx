import { FixedSizeList as List } from 'react-window';
import { formatDateTime } from '../utils/projects-helpers';

export default function ProjectsListView({
  t,
  projects,
  versionEl,
  openDetails,
  activateOne,
  onCreateTaskFromProject,
  startIntegration,
  stopIntegration,
  serverHost,
  serverRunning,
  integrationBusy,
  sortMode,
  sortDir,
  onSort,
  onToggleFavorite,
  canManageUnrealProjects = true,
  canEditProjectFields = null,
  canCreateTasks = false,
  isAutoRenderUsage = null,
  showActivationControls = true,
}) {
  const canEditFields = canEditProjectFields !== null
    ? canEditProjectFields === true
    : canManageUnrealProjects;
  const canOpenProjectDetails = canManageUnrealProjects || canEditFields;
  const usageModeLabel = (value) => {
    const v = String(value || '').trim();
    if (v === 'live') return t('projects.detail.usageMode.live');
    if (v === 'auto_render') return t('projects.detail.usageMode.auto_render');
    if (v === 'live_auto_render') return t('projects.detail.usageMode.live_auto_render');
    if (v === 'other') return t('projects.detail.usageMode.other');
    return '—';
  };

  const sortArrowFor = (col) =>
    sortMode === col ? (sortDir === 'asc' ? '▲' : '▼') : '';

  const renderRow = (p, key, style, asTable = false) => {
    const isActive = !!p.isActive;
    const isFav = p?.favorite === true;
    const canCreateTask = (
      canCreateTasks === true
      && typeof onCreateTaskFromProject === 'function'
      && (
        typeof isAutoRenderUsage === 'function'
          ? isAutoRenderUsage(p?.metaUsageMode || p?.usageMode, p?.metaStatus || p?.status)
          : String(p?.metaUsageMode || p?.usageMode || '').trim() === 'auto_render'
      )
    );
    const showStartStopToggle = canManageUnrealProjects && !!serverHost && showActivationControls && isActive;
    const showPerProjectStart = canManageUnrealProjects && !!serverHost && !showActivationControls;

    const actionButtons = (
      <div className="uu-row uu-gap-4">
        {canOpenProjectDetails ? (
          <>
            <button className="uu-btn" onClick={() => openDetails(p.id)}>
              {t('projects.actions.edit')}
            </button>
            {canManageUnrealProjects && showActivationControls ? (
              <button
                className={`uu-btn ${isActive ? 'prod-toggle-active' : ''}`}
                onClick={() => activateOne(p.id)}
                disabled={isActive}
              >
                {isActive ? t('projects.server.card.active') : t('projects.server.card.setActive')}
              </button>
            ) : null}
          </>
        ) : null}
        {showStartStopToggle ? (
          <button
            className={`uu-btn ${serverRunning ? 'uu-btn-danger' : 'prod-toggle-active'}`}
            onClick={serverRunning ? stopIntegration : startIntegration}
            disabled={integrationBusy}
            title={t('projects.integration.hint')}
          >
            {integrationBusy
              ? '...'
              : serverRunning
                ? t('launch.buttons.stop')
                : t('launch.buttons.start')}
          </button>
        ) : null}
        {showPerProjectStart ? (
          <button
            className="uu-btn"
            onClick={() => startIntegration?.(p.id)}
            disabled={integrationBusy}
            title={t('projects.integration.hint')}
          >
            {integrationBusy ? '...' : t('launch.buttons.start')}
          </button>
        ) : null}
        {canCreateTask ? (
          <button className="uu-btn" onClick={() => onCreateTaskFromProject?.(p.id)}>
            {t('projects.actions.createTask', 'Rendu')}
          </button>
        ) : null}
        {typeof onToggleFavorite === 'function' ? (
          <button
            className={`uu-fav-btn ${isFav ? 'active' : ''}`}
            onClick={() => onToggleFavorite(p)}
            aria-pressed={isFav ? 'true' : 'false'}
            title={t('resources.detail.labels.favorite') || 'Favoris'}
          >
            ★
          </button>
        ) : null}
      </div>
    );

    if (asTable) {
      return (
        <tr key={key}>
          <td>[{p.id || '----'}]</td>
          <td>
            <div className="uu-row uu-gap-4 uu-align-center">
              <span>{p.name || '—'}</span>
              {showActivationControls && isActive ? <span className="uu-badge">{t('projects.server.card.active')}</span> : null}
            </div>
          </td>
          <td>{versionEl(p.engineVersion)}</td>
          <td className="uu-muted">{p.metaStatus || '—'}</td>
          <td className="uu-muted">{usageModeLabel(p.metaUsageMode)}</td>
          <td>{formatDateTime(p.createdAt)}</td>
          <td>{formatDateTime(p.lastModified)}</td>
          <td>{actionButtons}</td>
        </tr>
      );
    }

    return (
      <div
        key={key}
        style={{ ...style, display: 'grid', gridTemplateColumns: '90px 1fr 130px 140px 180px 150px 150px 260px', gap: '8px', alignItems: 'center', padding: '6px 4px' }}
        className="uu-table-row-virtual"
      >
        <div>[{p.id || '----'}]</div>
        <div className="uu-row uu-gap-4 uu-align-center">
          <span>{p.name || '—'}</span>
          {showActivationControls && isActive ? <span className="uu-badge">{t('projects.server.card.active')}</span> : null}
        </div>
        <div>{versionEl(p.engineVersion)}</div>
        <div className="uu-muted">{p.metaStatus || '—'}</div>
        <div className="uu-muted">{usageModeLabel(p.metaUsageMode)}</div>
        <div>{formatDateTime(p.createdAt)}</div>
        <div>{formatDateTime(p.lastModified)}</div>
        <div>{actionButtons}</div>
      </div>
    );
  };

  if (!Array.isArray(projects) || projects.length === 0) {
    return (
      <div className="uu-muted" style={{ padding: '12px' }}>
        {t('projects.server.empty')}
      </div>
    );
  }

  if (projects.length > 80) {
    const ROW_HEIGHT = 88;
    const listHeight = Math.min(640, projects.length * ROW_HEIGHT);
    return (
      <div className="uu-table uu-table-virtual">
        <div className="uu-row uu-gap-8 uu-muted" style={{ padding: '6px 4px' }}>
          <span>{t('projects.table.id')}</span>
          <span>{t('projects.table.name')}</span>
          <span>{t('projects.table.engineVersion')}</span>
          <span>{t('projects.table.status')}</span>
          <span>{t('projects.table.usageMode')}</span>
          <span>{t('projects.table.createdUU')}</span>
          <span>{t('projects.table.lastModified')}</span>
          <span>{t('projects.table.actions')}</span>
        </div>
        <List
          height={listHeight}
          itemCount={projects.length}
          itemSize={ROW_HEIGHT}
          width="100%"
        >
          {({ index, style }) => renderRow(projects[index], projects[index]?.id || projects[index]?.name || index, style)}
        </List>
      </div>
    );
  }

  return (
    <table className="uu-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '8px 6px' }}>
      <thead>
        <tr>
          <th style={{ textAlign: 'left' }}>
            <button className="uu-link" type="button" onClick={() => onSort('id')}>
              {t('projects.table.id')} {sortArrowFor('id')}
            </button>
          </th>
          <th style={{ textAlign: 'left' }}>
            <button className="uu-link" type="button" onClick={() => onSort('name')}>
              {t('projects.table.name')} {sortArrowFor('name')}
            </button>
          </th>
          <th style={{ textAlign: 'left' }}>
            <button className="uu-link" type="button" onClick={() => onSort('engineVersion')}>
              {t('projects.table.engineVersion')} {sortArrowFor('engineVersion')}
            </button>
          </th>
          <th style={{ textAlign: 'left' }}>
            <button className="uu-link" type="button" onClick={() => onSort('status')}>
              {t('projects.table.status')} {sortArrowFor('status')}
            </button>
          </th>
          <th style={{ textAlign: 'left' }}>{t('projects.table.usageMode')}</th>
          <th style={{ textAlign: 'left' }}>
            <button className="uu-link" type="button" onClick={() => onSort('createdAt')}>
              {t('projects.table.createdUU')} {sortArrowFor('createdAt')}
            </button>
          </th>
          <th style={{ textAlign: 'left' }}>
            <button className="uu-link" type="button" onClick={() => onSort('lastModified')}>
              {t('projects.table.lastModified')} {sortArrowFor('lastModified')}
            </button>
          </th>
          <th style={{ textAlign: 'left' }}>{t('projects.table.actions')}</th>
        </tr>
      </thead>
      <tbody>
        {projects.map((p) => renderRow(p, p.id || p.name, null, true))}
      </tbody>
    </table>
  );
}
