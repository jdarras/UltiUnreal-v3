import { FixedSizeList as List } from 'react-window';
import { getProjectUsageModeLabel, normalizeThumbnailPath } from '../utils/projects-helpers';
import { getFavoriteLabel } from './componentI18n';

const PROJECTS_THUMBS_CARD_BASE_STYLE = { padding: '8px', gap: '6px', display: 'flex', flexDirection: 'column' };
const PROJECTS_THUMBS_CARD_ACTIVE_STYLE = { border: '1px solid #2ecc71', background: '#132b1a' };
const PROJECTS_THUMBS_TITLE_STYLE = { textAlign: 'left', marginBottom: '6px' };
const PROJECTS_THUMBS_THUMB_BOX_STYLE = {
  width: '100%',
  height: '180px',
  background: '#1c1f24',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  borderRadius: '6px',
};
const PROJECTS_THUMBS_THUMB_IMAGE_STYLE = { width: '100%', height: '100%', objectFit: 'cover', display: 'block' };
const PROJECTS_THUMBS_THUMB_PLACEHOLDER_STYLE = { fontSize: '11px', textAlign: 'center', padding: '4px' };
const PROJECTS_THUMBS_CARD_COL_STYLE = { gap: '1px', flex: 1, minHeight: 0 };
const PROJECTS_THUMBS_ACTIONS_WRAP_STYLE = { marginTop: '4px', paddingTop: '0px' };
const PROJECTS_THUMBS_VIRTUAL_ROW_BASE_STYLE = { columnGap: '12px', alignItems: 'start', padding: '0 0 12px 0', boxSizing: 'border-box' };
const PROJECTS_THUMBS_GRID_STYLE = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(252px, 1fr))',
  columnGap: '12px',
  rowGap: '12px',
  alignItems: 'start',
};

function buildProjectsThumbCardStyle({ isActive = false, style = {} } = {}) {
  return {
    ...PROJECTS_THUMBS_CARD_BASE_STYLE,
    ...(isActive ? PROJECTS_THUMBS_CARD_ACTIVE_STYLE : {}),
    ...style,
  };
}

function buildProjectsThumbVirtualRowStyle(style, cols) {
  return {
    ...style,
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
    ...PROJECTS_THUMBS_VIRTUAL_ROW_BASE_STYLE,
  };
}

export default function ProjectsThumbsView({
  t,
  projects,
  versionEl,
  openDetails,
  activateOne,
  onToggleFavorite,
  onCreateTaskFromProject,
  startIntegration,
  stopIntegration,
  serverHost,
  serverRunning,
  integrationBusy,
  canManageUnrealProjects = true,
  canEditProjectFields = null,
  canCreateTasks = false,
  isAutoRenderUsage = null,
  showActivationControls = true,
}) {
  const favoriteLabel = getFavoriteLabel(t);
  const canEditFields = canEditProjectFields !== null
    ? canEditProjectFields === true
    : canManageUnrealProjects;
  const canOpenProjectDetails = canManageUnrealProjects || canEditFields;
  const THRESHOLD = 120;
  const COLS = 4;
  const ROW_HEIGHT = 308; // base card height (virtualized rows add bottom spacing)
  const projectList = Array.isArray(projects)
    ? projects.filter((entry) => entry && typeof entry === 'object')
    : [];
  const renderCard = (p, key, style = {}) => {
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
    const showStartButton = canManageUnrealProjects && !!serverHost;
    const showActiveState = showActivationControls && isActive;
    const activeStyle = showActiveState ? { border: '1px solid #2ecc71', background: '#132b1a' } : {};
    return (
      <div
        key={key}
        className={`uu-card ${showActiveState ? 'is-active' : ''}`}
        style={buildProjectsThumbCardStyle({ isActive: showActiveState, style: { ...activeStyle, ...style } })}
      >
        <div
          className="uu-item-title"
          title={p.name || ''}
          style={PROJECTS_THUMBS_TITLE_STYLE}
        >
          {p.name || '—'}
        </div>
        <div
          className="uu-thumb"
          style={PROJECTS_THUMBS_THUMB_BOX_STYLE}
        >
          {p.thumbnail ? (
            <img
              src={normalizeThumbnailPath(p.thumbnail)}
              alt=""
              loading="lazy"
              style={PROJECTS_THUMBS_THUMB_IMAGE_STYLE}
            />
          ) : (
            <span className="uu-muted" style={PROJECTS_THUMBS_THUMB_PLACEHOLDER_STYLE}>
              {t('projects.server.card.thumbnailPlaceholder')}
            </span>
          )}
        </div>
        <div className="uu-col" style={PROJECTS_THUMBS_CARD_COL_STYLE}>
          <div className="uu-row uu-gap-4 uu-align-center">
            <span className="uu-id-tag uu-muted">[{p.id || '----'}]</span>
            <span>{t('projects.detail.labels.engineVersionShort')} {versionEl(p.engineVersion)}</span>
          </div>
          <div className="uu-row uu-gap-4 uu-project-usage-line">
            <span>{getProjectUsageModeLabel(t, p.metaUsageMode, { preferThumbKeys: true })}</span>
          </div>
          <div className="uu-project-thumb-actions" style={PROJECTS_THUMBS_ACTIONS_WRAP_STYLE}>
            <div className="uu-project-thumb-actions-main">
              {canOpenProjectDetails ? (
                <>
                  <button
                    type="button"
                    className="uu-btn"
                    onClick={() => openDetails(p.id)}
                  >
                    {t('projects.actions.edit')}
                  </button>
                  {canManageUnrealProjects && showActivationControls ? (
                    <button
                      type="button"
                      className={`uu-btn ${isActive ? 'prod-toggle-active' : ''}`}
                      onClick={() => activateOne(p.id)}
                      disabled={isActive}
                    >
                      {isActive ? t('projects.server.card.active') : t('projects.server.card.setActive')}
                    </button>
                  ) : null}
                </>
              ) : null}
              {showStartButton && showActivationControls && isActive ? (
                <button
                  type="button"
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
              {showStartButton && !showActivationControls ? (
                <button
                  type="button"
                  className="uu-btn"
                  onClick={() => startIntegration?.(p.id)}
                  disabled={integrationBusy}
                  title={t('projects.integration.hint')}
                >
                  {integrationBusy ? '...' : t('launch.buttons.start')}
                </button>
              ) : null}
              {canCreateTask ? (
                <button
                  type="button"
                  className="uu-btn"
                  onClick={() => onCreateTaskFromProject?.(p.id)}
                >
                  {t('projects.actions.createTask')}
                </button>
              ) : null}
            </div>
            {typeof onToggleFavorite === 'function' ? (
              <button
                type="button"
                className={`uu-fav-btn ${isFav ? 'active' : ''}`}
                onClick={() => onToggleFavorite(p)}
                aria-pressed={isFav ? 'true' : 'false'}
                title={favoriteLabel}
              >
                ★
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  if (projectList.length === 0) return null;

  if (projectList.length > THRESHOLD) {
    const rows = Math.ceil(projectList.length / COLS);
    const listHeight = Math.min(900, rows * ROW_HEIGHT);
    const listWidth = typeof window !== 'undefined'
      ? Math.min(window.innerWidth - 32, 1800)
      : 1400;

    return (
      <List
        height={listHeight}
        itemCount={rows}
        itemSize={ROW_HEIGHT}
        width={listWidth}
      >
        {({ index, style }) => {
          const rowItems = [];
          for (let c = 0; c < COLS; c += 1) {
            const itemIndex = index * COLS + c;
            if (itemIndex >= projectList.length) break;
            const item = projectList[itemIndex];
            rowItems.push(renderCard(item, item.id || item.name || `${index}-${c}`));
          }
          return (
            <div
              style={buildProjectsThumbVirtualRowStyle(style, COLS)}
            >
              {rowItems}
            </div>
          );
        }}
      </List>
    );
  }

  return (
    <div
      className="uu-thumbs-grid"
      style={PROJECTS_THUMBS_GRID_STYLE}
    >
      {projectList.map((p, idx) => renderCard(p, p.id || p.name || idx))}
    </div>
  );
}
