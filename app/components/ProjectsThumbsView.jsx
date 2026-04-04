import { FixedSizeList as List } from 'react-window';
import { normalizeThumbnailPath } from '../utils/projects-helpers';

export default function ProjectsThumbsView({
  t,
  projects,
  versionEl,
  openDetails,
  activateOne,
  onToggleFavorite,
  startIntegration,
  stopIntegration,
  serverHost,
  serverRunning,
  integrationBusy,
  canManageUnrealProjects = true,
  showActivationControls = true,
}) {
  const THRESHOLD = 120;
  const COLS = 4;
  const ROW_HEIGHT = 300; // approx thumb + actions
  const usageModeLabel = (value) => {
    const v = String(value || '').trim();
    if (v === 'live') return t('projects.detail.usageMode.live');
    if (v === 'auto_render') return t('projects.detail.usageMode.auto_render');
    if (v === 'live_auto_render') return t('projects.detail.usageMode.live_auto_render');
    if (v === 'other') return t('projects.detail.usageMode.other');
    return '—';
  };

  const renderCard = (p, key, style = {}) => {
    const isActive = !!p.isActive;
    const isFav = p?.favorite === true;
    const showActiveState = showActivationControls && isActive;
    const activeStyle = showActiveState ? { border: '1px solid #2ecc71', background: '#132b1a' } : {};
    return (
      <div
        key={key}
        className={`uu-card ${showActiveState ? 'is-active' : ''}`}
        style={{ padding: '8px', gap: '8px', ...activeStyle, ...style }}
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
        <div className="uu-col mt-6" style={{ gap: '4px' }}>
          <div className="uu-row uu-gap-4 uu-align-center">
            <span className="uu-id-tag uu-muted">[{p.id || '----'}]</span>
            <span>{t('projects.detail.labels.engineVersionShort')} {versionEl(p.engineVersion)}</span>
          </div>
          <div className="uu-row uu-gap-4 uu-align-center uu-muted">
            <span>{t('projects.detail.labels.usageMode')}:</span>
            <span>{usageModeLabel(p.metaUsageMode)}</span>
          </div>
          <div className="uu-row uu-gap-4 mt-4">
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
            {canManageUnrealProjects && showActivationControls && isActive && serverHost ? (
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
            {canManageUnrealProjects && !showActivationControls && serverHost ? (
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
          </div>
        </div>
      </div>
    );
  };

  if (!projects || projects.length === 0) return null;

  if (projects.length > THRESHOLD) {
    const rows = Math.ceil(projects.length / COLS);
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
            if (itemIndex >= projects.length) break;
            const item = projects[itemIndex];
            rowItems.push(renderCard(item, item.id || item.name || `${index}-${c}`));
          }
          return (
            <div
              style={{
                ...style,
                display: 'grid',
                gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
                gap: '16px',
                padding: '8px 0',
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
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: '16px'
      }}
    >
      {projects.map((p, idx) => renderCard(p, p.id || p.name || idx))}
    </div>
  );
}
