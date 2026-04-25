import { FixedSizeList as List } from 'react-window';
import { normalizeThumbnailPath } from '../utils/projects-helpers';

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
  canCreateTasks = false,
  isAutoRenderUsage = null,
  showActivationControls = true,
}) {
  const THRESHOLD = 120;
  const COLS = 4;
  const ROW_HEIGHT = 308; // base card height (virtualized rows add bottom spacing)
  const projectList = Array.isArray(projects)
    ? projects.filter((entry) => entry && typeof entry === 'object')
    : [];
  const usageModeLabel = (value) => {
    const v = String(value || '').trim();
    if (v === 'live') return t('projects.thumb.usage.live', 'Live');
    if (v === 'auto_render') return t('projects.thumb.usage.auto_render', 'Rendu Auto');
    if (v === 'live_auto_render') return t('projects.thumb.usage.live_auto_render', 'Rendu Auto + Live');
    if (v === 'other') return t('projects.detail.usageMode.other');
    return '—';
  };

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
        style={{ padding: '8px', gap: '6px', display: 'flex', flexDirection: 'column', ...activeStyle, ...style }}
      >
        <div
          className="uu-item-title"
          title={p.name || ''}
          style={{ textAlign: 'left', marginBottom: '6px' }}
        >
          {p.name || '—'}
        </div>
        <div
          className="uu-thumb"
          style={{
            width: '100%',
            height: '180px',
            background: '#1c1f24',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            borderRadius: '6px'
          }}
        >
          {p.thumbnail ? (
            <img
              src={normalizeThumbnailPath(p.thumbnail)}
              alt=""
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <span className="uu-muted" style={{ fontSize: '11px', textAlign: 'center', padding: '4px' }}>
              {t('projects.server.card.thumbnailPlaceholder')}
            </span>
          )}
        </div>
        <div className="uu-col" style={{ gap: '1px', flex: 1, minHeight: 0 }}>
          <div className="uu-row uu-gap-4 uu-align-center">
            <span className="uu-id-tag uu-muted">[{p.id || '----'}]</span>
            <span>{t('projects.detail.labels.engineVersionShort')} {versionEl(p.engineVersion)}</span>
          </div>
          <div className="uu-row uu-gap-4 uu-project-usage-line">
            <span>{usageModeLabel(p.metaUsageMode)}</span>
          </div>
          <div className="uu-project-thumb-actions" style={{ marginTop: '4px', paddingTop: '0px' }}>
            <div className="uu-project-thumb-actions-main">
              {canManageUnrealProjects ? (
                <>
                  <button
                    type="button"
                    className="uu-btn"
                    onClick={() => openDetails(p.id)}
                  >
                    {t('projects.actions.edit')}
                  </button>
                  {showActivationControls ? (
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
                  {t('projects.actions.createTask', 'Rendu')}
                </button>
              ) : null}
            </div>
            {typeof onToggleFavorite === 'function' ? (
              <button
                type="button"
                className={`uu-fav-btn ${isFav ? 'active' : ''}`}
                onClick={() => onToggleFavorite(p)}
                aria-pressed={isFav ? 'true' : 'false'}
                title={t('resources.detail.labels.favorite') || 'Favoris'}
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
              style={{
                ...style,
                display: 'grid',
                gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
                columnGap: '12px',
                alignItems: 'start',
                padding: '0 0 12px 0',
                boxSizing: 'border-box',
              }}
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
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(252px, 1fr))',
        columnGap: '12px',
        rowGap: '12px',
        alignItems: 'start',
      }}
    >
      {projectList.map((p, idx) => renderCard(p, p.id || p.name || idx))}
    </div>
  );
}
