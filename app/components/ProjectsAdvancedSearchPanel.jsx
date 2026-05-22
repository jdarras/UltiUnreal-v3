import React, { Suspense } from 'react';

const MultiSelectDropdown = React.lazy(() => import('./MultiSelectDropdown'));

const SEARCH_PANEL_MARGIN_BOTTOM_STYLE = { marginBottom: '16px' };
const ADV_WIDTH_500_STYLE = { width: '500px', minWidth: '500px', maxWidth: '500px' };
const ADV_WIDTH_520_STYLE = { width: '520px', minWidth: '520px', maxWidth: '520px' };
const ADV_WIDTH_500_INPUT_STYLE = { width: '500px', minWidth: '500px', maxWidth: '500px', height: '36px' };
const ADV_WIDTH_520_INPUT_STYLE = { width: '520px', minWidth: '520px', maxWidth: '520px', height: '36px' };

export default function ProjectsAdvancedSearchPanel({
  t,
  filteredCount,
  searchAdvanced,
  setSearchAdvanced,
  noneLabel,
  engineVersionOptions,
  directorOptions,
  technicianOptions,
  operatorOptions,
  journalistOptions,
  onClose,
}) {
  const lazyInlineFallback = <span className="uu-muted">{t('projects.detail.loading')}</span>;
  const updateAdvanced = (field, value) => {
    setSearchAdvanced((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="uu-card uu-col uu-gap-12" style={SEARCH_PANEL_MARGIN_BOTTOM_STYLE}>
      <div className="uu-row uu-align-center uu-gap-8 uu-wrap">
        <strong className="uu-block-title">{t('projects.search.advancedTitle')}</strong>
        <div className="uu-muted">
          {filteredCount ? `(${filteredCount} ${t('projects.search.resultsLabel')})` : ''}
        </div>
      </div>

      <div className="uu-col uu-gap-12">
        <div className="uu-row uu-gap-16 uu-wrap">
          <div className="uu-row uu-align-center uu-gap-8 uu-flex-45-min-320">
            <label className="uu-label w-90">{t('projects.detail.labels.status')}</label>
            <Suspense fallback={lazyInlineFallback}>
              <MultiSelectDropdown
                options={[
                  { value: 'Test', label: t('projects.detail.status.test') },
                  { value: 'In progress', label: t('projects.detail.status.in_progress') },
                  { value: 'A modifier', label: t('projects.detail.status.to_modify') },
                  { value: 'PAD', label: t('projects.detail.status.pas') },
                  { value: 'Archive', label: t('projects.detail.status.archive') },
                ]}
                values={searchAdvanced.status}
                onChange={(vals) => updateAdvanced('status', vals)}
                placeholder={noneLabel}
                noneLabel={noneLabel}
                style={ADV_WIDTH_500_STYLE}
              />
            </Suspense>
          </div>
          <div className="uu-row uu-align-center uu-gap-8 uu-flex-45-min-320">
            <label className="uu-label w-90">{t('projects.detail.labels.type')}</label>
            <Suspense fallback={lazyInlineFallback}>
              <MultiSelectDropdown
                options={[
                  { value: 'Réalité augmentée', label: t('projects.detail.type.ar') },
                  { value: 'Green Screen', label: t('projects.detail.type.green') },
                  { value: 'NDisplay', label: t('projects.detail.type.ndisplay') },
                  { value: 'Motion Design', label: t('projects.detail.type.motion') },
                  { value: 'Blueprint', label: t('projects.detail.type.blueprint') },
                  { value: 'Plugin', label: t('projects.detail.type.plugin') },
                  { value: 'Scène Unreal', label: t('projects.detail.type.scene') },
                  { value: 'Movie Render Cue', label: t('projects.detail.type.movie_render_cue') },
                ]}
                values={searchAdvanced.type}
                onChange={(vals) => updateAdvanced('type', vals)}
                placeholder={noneLabel}
                noneLabel={noneLabel}
                style={ADV_WIDTH_520_STYLE}
              />
            </Suspense>
          </div>
        </div>

        <div className="uu-row uu-gap-16 uu-wrap">
          <div className="uu-row uu-align-center uu-gap-8 uu-flex-45-min-320">
            <label className="uu-label w-90">{t('projects.detail.labels.usageMode')}</label>
            <Suspense fallback={lazyInlineFallback}>
              <MultiSelectDropdown
                options={[
                  { value: 'live', label: t('projects.detail.usageMode.live') },
                  { value: 'auto_render', label: t('projects.detail.usageMode.auto_render') },
                  { value: 'live_auto_render', label: t('projects.detail.usageMode.live_auto_render') },
                  { value: 'other', label: t('projects.detail.usageMode.other') },
                ]}
                values={searchAdvanced.usageMode}
                onChange={(vals) => updateAdvanced('usageMode', vals)}
                placeholder={noneLabel}
                noneLabel={noneLabel}
                style={ADV_WIDTH_500_STYLE}
              />
            </Suspense>
          </div>
          <div className="uu-row uu-align-center uu-gap-8 uu-flex-45-min-320">
            <label className="uu-label w-90">{t('projects.table.engineVersion')}</label>
            <Suspense fallback={lazyInlineFallback}>
              <MultiSelectDropdown
                options={engineVersionOptions}
                values={searchAdvanced.engineVersion}
                onChange={(vals) => updateAdvanced('engineVersion', vals)}
                placeholder={noneLabel}
                noneLabel={noneLabel}
                style={ADV_WIDTH_520_STYLE}
              />
            </Suspense>
          </div>
        </div>

        <div className="uu-row uu-gap-16 uu-wrap">
          <div className="uu-row uu-align-center uu-gap-8 uu-flex-45-min-320">
            <label className="uu-label w-90">{t('projects.detail.labels.director')}</label>
            <select
              className="uu-select"
              style={ADV_WIDTH_500_INPUT_STYLE}
              value={searchAdvanced.director}
              onChange={(e) => updateAdvanced('director', e.target.value)}
            >
              <option value="">{noneLabel}</option>
              {directorOptions.map((val) => (
                <option key={val} value={val}>{val}</option>
              ))}
            </select>
          </div>
          <div className="uu-row uu-align-center uu-gap-8 uu-flex-45-min-320">
            <label className="uu-label w-90">{t('projects.detail.labels.technician')}</label>
            <select
              className="uu-select"
              style={ADV_WIDTH_520_INPUT_STYLE}
              value={searchAdvanced.technician}
              onChange={(e) => updateAdvanced('technician', e.target.value)}
            >
              <option value="">{noneLabel}</option>
              {technicianOptions.map((val) => (
                <option key={val} value={val}>{val}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="uu-row uu-gap-16 uu-wrap">
          <div className="uu-row uu-align-center uu-gap-8 uu-flex-45-min-320">
            <label className="uu-label w-90">{t('projects.detail.labels.operator')}</label>
            <select
              className="uu-select"
              style={ADV_WIDTH_500_INPUT_STYLE}
              value={searchAdvanced.operator}
              onChange={(e) => updateAdvanced('operator', e.target.value)}
            >
              <option value="">{noneLabel}</option>
              {operatorOptions.map((val) => (
                <option key={val} value={val}>{val}</option>
              ))}
            </select>
          </div>
          <div className="uu-row uu-align-center uu-gap-8 uu-flex-45-min-320">
            <label className="uu-label w-90">{t('projects.detail.labels.journalist')}</label>
            <select
              className="uu-select"
              style={ADV_WIDTH_520_INPUT_STYLE}
              value={searchAdvanced.journalist}
              onChange={(e) => updateAdvanced('journalist', e.target.value)}
            >
              <option value="">{noneLabel}</option>
              {journalistOptions.map((val) => (
                <option key={val} value={val}>{val}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="uu-row uu-gap-16 uu-wrap">
          <div className="uu-row uu-align-center uu-gap-8 uu-flex-45-min-320">
            <label className="uu-label w-90">{t('projects.detail.labels.keywords')}</label>
            <input
              className="uu-input"
              style={ADV_WIDTH_500_STYLE}
              value={searchAdvanced.tags}
              onChange={(e) => updateAdvanced('tags', e.target.value)}
              placeholder={t('projects.search.placeholderTags')}
            />
          </div>
        </div>
      </div>

      <div className="uu-row uu-align-center uu-gap-8">
        <button
          type="button"
          className="uu-btn"
          onClick={onClose}
        >
          {t('projects.search.close')}
        </button>
      </div>
    </div>
  );
}
