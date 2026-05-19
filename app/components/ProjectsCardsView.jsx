import { FixedSizeList as List } from 'react-window';
import { formatDateTime, getProjectUsageModeLabel, normalizeThumbnailPath } from '../utils/projects-helpers';
import { getFavoriteLabel } from './componentI18n';

const PROJECTS_CARDS_INFO_ROW_STYLE = { flex: '1 1 45%', minWidth: '240px' };

function buildProjectsCardsVirtualItemStyle(style) {
  return { ...style, padding: '6px 0' };
}

export default function ProjectsCardsView({
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
  integrationMsg,
  removeOne,
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
  const renderCard = (p, key, style) => {
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
    const maps = p.maps || {};
    const gameMap = maps.defaultGame || maps.gameDefaultMap || '';
    const editorMap = maps.defaultEditor || maps.editorStartupMap || '';
    const showActiveState = showActivationControls && isActive;
    return (
      <div
        key={key}
        className={`uu-card ${showActiveState ? 'is-active' : ''}`}
        style={style}
      >
        <div className="uu-project-card">
          <div className="uu-project-card-left">
            {p.thumbnail ? (
              <img
                src={normalizeThumbnailPath(p.thumbnail)}
                alt=""
                className="uu-project-thumb"
              />
            ) : (
              <div className="uu-project-thumb uu-project-thumb-placeholder">
                {t('projects.server.card.thumbnailPlaceholder')}
              </div>
            )}
          </div>

          <div className="uu-project-card-right">
            <div className="uu-row wrap">
              <div className="uu-label w-160">{t('projects.server.card.nameLabel')}</div>
              <div className="uu-value">
                <span className="uu-id-tag uu-muted">
                  [{p.id || '----'}]
                </span>
                {' - '}
                {p.name || '—'}
              </div>
            </div>

            <div className="uu-row wrap mt-8">
              <div className="uu-label w-160">{t('projects.server.card.engineVersionLabel')}</div>
              <div className="uu-value">
                {versionEl(p.engineVersion)}
              </div>
            </div>

            <div className="uu-row wrap mt-8">
              <div className="uu-label w-160">{t('projects.server.card.pathLabel')}</div>
              <div className="uu-value uu-muted">
                {p.uproject || '—'}
              </div>
            </div>

            <div className="uu-row wrap mt-8">
              <div className="uu-label w-160">{t('projects.server.card.wrcNameLabel')}</div>
              <div className="uu-value uu-muted">
                {Array.isArray(p.wrcNames) && p.wrcNames.length > 0
                  ? p.wrcNames.join(', ')
                  : '—'}
              </div>
            </div>

            <div className="uu-row wrap mt-8">
              <div className="uu-label w-160">{t('projects.detail.maps.defaultEditor')}</div>
              <div className="uu-value uu-muted">{editorMap || '—'}</div>
            </div>

            <div className="uu-row wrap mt-8">
              <div className="uu-label w-160">{t('projects.detail.maps.defaultGame')}</div>
              <div className="uu-value uu-muted">{gameMap || '—'}</div>
            </div>

            <div className="uu-row wrap mt-8 uu-gap-12">
              <div className="uu-row" style={PROJECTS_CARDS_INFO_ROW_STYLE}>
                <div className="uu-label w-160">{t('projects.server.card.statusLabel')}</div>
                <div className="uu-value uu-muted">
                  {p.metaStatus || '—'}
                </div>
              </div>
              <div className="uu-row" style={PROJECTS_CARDS_INFO_ROW_STYLE}>
                <div className="uu-label w-160">{t('projects.server.card.typeLabel')}</div>
                <div className="uu-value uu-muted">
                  {p.metaType || '—'}
                </div>
              </div>
            </div>

            <div className="uu-row wrap mt-8">
              <div className="uu-label w-160">{t('projects.server.card.usageModeLabel')}</div>
              <div className="uu-value uu-muted">
                {getProjectUsageModeLabel(t, p.metaUsageMode)}
              </div>
            </div>

            <div className="uu-row wrap mt-8">
              <div className="uu-label w-160">{t('projects.server.card.noteLabel')}</div>
              <div className="uu-value uu-muted uu-note-display">
                {p.note || '—'}
              </div>
            </div>

            <div className="uu-row wrap mt-8 uu-gap-12">
              <div className="uu-row" style={PROJECTS_CARDS_INFO_ROW_STYLE}>
                <div className="uu-label w-160">{t('projects.server.card.createdAtLabel')}</div>
                <div className="uu-value uu-muted">
                  {formatDateTime(p.createdAt)}
                </div>
              </div>
              <div className="uu-row" style={PROJECTS_CARDS_INFO_ROW_STYLE}>
                <div className="uu-label w-160">{t('projects.server.card.lastModifiedLabel')}</div>
                <div className="uu-value uu-muted">
                  {formatDateTime(p.lastModified)}
                </div>
              </div>
            </div>

            <div className="uu-row wrap mt-12 uu-gap-8">
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
                      {isActive
                        ? t('projects.server.card.active')
                        : t('projects.server.card.setActive')}
                    </button>
                  ) : null}
                </>
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

              {canCreateTask && showStartButton ? (
                <button
                  type="button"
                  className="uu-btn"
                  onClick={() => onCreateTaskFromProject?.(p.id)}
                >
                  {t('projects.actions.createTask')}
                </button>
              ) : null}

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

              {canCreateTask && !showStartButton ? (
                <button
                  type="button"
                  className="uu-btn"
                  onClick={() => onCreateTaskFromProject?.(p.id)}
                >
                  {t('projects.actions.createTask')}
                </button>
              ) : null}

              {canManageUnrealProjects ? (
                <button
                  type="button"
                  className="uu-btn"
                  onClick={() => removeOne(p.id)}
                >
                  {t('projects.server.card.delete')}
                </button>
              ) : null}
            </div>

            {isActive && integrationMsg ? (
              <div className="uu-msg error mt-8">
                {integrationMsg}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  if (!Array.isArray(projects) || projects.length === 0) {
    return null;
  }

  if (projects.length > 50) {
    const CARD_HEIGHT = 360;
    const listHeight = Math.min(900, projects.length * CARD_HEIGHT);
    return (
      <List
        height={listHeight}
        itemCount={projects.length}
        itemSize={CARD_HEIGHT}
        width="100%"
      >
        {({ index, style }) => (
          renderCard(
            projects[index],
            projects[index]?.id || projects[index]?.name || index,
            buildProjectsCardsVirtualItemStyle(style)
          )
        )}
      </List>
    );
  }

  return (
    <div className="uu-row-col">
      {projects.map((p, i) => renderCard(p, p.id || p.name || String(i)))}
    </div>
  );
}
