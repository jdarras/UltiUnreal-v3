import React, { Suspense } from 'react';

const HttpBindBlock = React.lazy(() => import('./HttpBindBlock'));

const TITLE_ROW_STYLE = { marginBottom: '12px' };
const LABEL_CLICKABLE_STYLE = { cursor: 'pointer', userSelect: 'none' };

export default function ProjectsDetailWrcCard({
  t,
  lazyBlockFallback,
  httpBindVisible = false,
  httpBindEditing = false,
  httpBindDraft = '',
  setHttpBindDraft,
  httpBindDraftValid = false,
  httpBindBusy = false,
  httpBindDisplay = '',
  httpBindDisplayClass = 'uu-muted',
  httpBindInlineMsg = '',
  httpBindInlineClass = 'uu-muted',
  canEditHttpBind = false,
  startHttpBindEdit,
  cancelHttpBindEdit,
  saveHttpBindAddress,
  wrcPresetsList = [],
  detailWrcNames = [],
  canEditFields = false,
  onToggleWrcPreset,
}) {
  const hasWrcPresets = wrcPresetsList.length > 0;

  return (
    <div className="uu-card">
      <div className="uu-row uu-align-center uu-gap-8 uu-row-nowrap" style={TITLE_ROW_STYLE}>
        <strong className="uu-block-title">{t('projects.detail.blocks.wrc')}</strong>
      </div>
      <Suspense fallback={lazyBlockFallback}>
        <HttpBindBlock
          t={t}
          visible={httpBindVisible}
          httpBindEditing={httpBindEditing}
          httpBindDraft={httpBindDraft}
          setHttpBindDraft={setHttpBindDraft}
          httpBindDraftValid={httpBindDraftValid}
          httpBindBusy={httpBindBusy}
          httpBindDisplay={httpBindDisplay}
          httpBindDisplayClass={httpBindDisplayClass}
          httpBindInlineMsg={httpBindInlineMsg}
          httpBindInlineClass={httpBindInlineClass}
          canEditHttpBind={canEditHttpBind}
          startHttpBindEdit={startHttpBindEdit}
          cancelHttpBindEdit={cancelHttpBindEdit}
          saveHttpBindAddress={saveHttpBindAddress}
        />
      </Suspense>
      <div className="uu-row wrap mt-12">
        <div className="uu-label w-160">{t('projects.detail.wrcPresets.count')}</div>
        <div className="uu-value">{wrcPresetsList.length}</div>
      </div>
      {hasWrcPresets ? (
        <div className="uu-row wrap mt-4">
          <div className="uu-label w-160">{t('projects.detail.wrcPresets.active')}</div>
          <div className="uu-value">
            {wrcPresetsList.map((entry, idx) => {
              const assetPath = String(entry?.assetPath || '').trim();
              const relativePath = String(entry?.relativePath || '').trim();
              const name = String(entry?.name || '').trim();
              const key = assetPath || relativePath || `${name}-${idx}`;
              const isChecked = detailWrcNames.includes(name);
              return (
                <div key={`project-wrc-preset-${key}`} className="uu-row uu-align-center uu-gap-8 mt-4">
                  <input
                    type="checkbox"
                    id={`wrc-preset-${key}`}
                    checked={isChecked}
                    disabled={!canEditFields}
                    onChange={() => onToggleWrcPreset?.(name, isChecked)}
                  />
                  <label htmlFor={`wrc-preset-${key}`} className="uu-small" style={LABEL_CLICKABLE_STYLE}>
                    {assetPath || relativePath || name || '-'}
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="uu-row wrap mt-4">
          <div className="uu-label w-160" />
          <div className="uu-value uu-muted">{t('projects.detail.wrcPresets.noInfo')}</div>
        </div>
      )}
    </div>
  );
}
