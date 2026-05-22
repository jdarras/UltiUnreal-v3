const TITLE_ROW_STYLE = { marginBottom: '12px' };
const WIDTH_260_STYLE = { width: '260px' };
const WIDTH_110_LEFT_LABEL_STYLE = { width: '110px', textAlign: 'left', marginLeft: '8px' };
const WIDTH_90_LEFT_LABEL_STYLE = { width: '90px', textAlign: 'left', marginLeft: '8px' };
const WIDTH_180_STYLE = { width: '180px' };
const OVERFLOW_HIDDEN_STYLE = { overflow: 'hidden' };
const FLEX_1_AUTO_STYLE = { flex: '1 1 auto' };
const KEYWORDS_INPUT_STYLE = { minWidth: '220px', flex: '1 1 260px' };
const KEYWORDS_CHIPS_ROW_STYLE = { marginLeft: '160px' };
const CHIP_STYLE = { border: 'none', padding: '6px 10px', gap: '8px' };
const CHIP_TEXT_STYLE = { marginRight: '6px' };
const CHIP_REMOVE_STYLE = { padding: '2px 6px', minWidth: 'auto', height: '22px' };

export default function ProjectsDetailIndexationCard({
  t,
  meta,
  noneLabel,
  detailIsNew = false,
  detailLoading = false,
  projectVersion = '',
  projectVersionBusy = false,
  markProjectDropdownDirty,
  onUpdateDetailField,
  onProjectVersionChange,
  onProjectVersionBlur,
  onProjectVersionKeyDown,
  detailNoteRef,
  onDetailNoteChange,
  keywordsInput = '',
  onKeywordsInputChange,
  onKeywordsKeyDown,
  onKeywordsBlur,
  detailKeywordsList = [],
  onRemoveKeyword,
}) {
  return (
    <div className="uu-card">
      <div className="uu-row uu-align-center uu-gap-8" style={TITLE_ROW_STYLE}>
        <strong className="uu-block-title">{t('projects.detail.blocks.indexation')}</strong>
      </div>
      <div className="uu-col uu-gap-16">
        <div className="uu-row wrap uu-align-center uu-gap-8">
          <div className="uu-label w-160">{t('projects.detail.labels.status')}</div>
          <select
            className="uu-select"
            style={WIDTH_260_STYLE}
            value={meta.status || ''}
            onChange={(e) => {
              markProjectDropdownDirty?.();
              onUpdateDetailField?.('status', e.target.value);
            }}
          >
            <option value="">{noneLabel}</option>
            <option value="Test">{t('projects.detail.status.test')}</option>
            <option value="In progress">{t('projects.detail.status.in_progress')}</option>
            <option value="A modifier">{t('projects.detail.status.to_modify')}</option>
            <option value="PAD">{t('projects.detail.status.pas')}</option>
            <option value="Archive">{t('projects.detail.status.archive')}</option>
          </select>

          <div className="uu-label" style={WIDTH_110_LEFT_LABEL_STYLE}>
            {t('projects.detail.labels.usageMode')}
          </div>
          <select
            className="uu-select"
            style={WIDTH_260_STYLE}
            value={meta.usageMode || ''}
            onChange={(e) => {
              markProjectDropdownDirty?.();
              onUpdateDetailField?.('usageMode', e.target.value);
            }}
          >
            <option value="">{noneLabel}</option>
            <option value="live">{t('projects.detail.usageMode.live')}</option>
            <option value="auto_render">{t('projects.detail.usageMode.auto_render')}</option>
            <option value="live_auto_render">{t('projects.detail.usageMode.live_auto_render')}</option>
            <option value="other">{t('projects.detail.usageMode.other')}</option>
          </select>
        </div>

        <div className="uu-row wrap uu-align-center uu-gap-8">
          <div className="uu-label w-160">{t('projects.detail.labels.type')}</div>
          <select
            className="uu-select"
            style={WIDTH_260_STYLE}
            value={meta.type || ''}
            onChange={(e) => {
              markProjectDropdownDirty?.();
              onUpdateDetailField?.('type', e.target.value);
            }}
          >
            <option value="">{noneLabel}</option>
            <option value="Réalité augmentée">{t('projects.detail.type.ar')}</option>
            <option value="Green Screen">{t('projects.detail.type.green')}</option>
            <option value="NDisplay">{t('projects.detail.type.ndisplay')}</option>
            <option value="Motion Design">{t('projects.detail.type.motion')}</option>
            <option value="Blueprint">{t('projects.detail.type.blueprint')}</option>
            <option value="Plugin">{t('projects.detail.type.plugin')}</option>
            <option value="Scène Unreal">{t('projects.detail.type.scene')}</option>
            <option value="Movie Render Cue">{t('projects.detail.type.movie_render_cue')}</option>
          </select>

          {!detailIsNew && (
            <>
              <div className="uu-label" style={WIDTH_90_LEFT_LABEL_STYLE}>
                {t('projects.detail.labels.fileVersion')}
              </div>
              <input
                className="uu-input"
                style={WIDTH_180_STYLE}
                value={projectVersion ?? ''}
                disabled={detailLoading || projectVersionBusy}
                onChange={onProjectVersionChange}
                onBlur={onProjectVersionBlur}
                onKeyDown={onProjectVersionKeyDown}
              />
            </>
          )}
        </div>

        <div className="uu-row wrap">
          <div className="uu-label w-160">{t('projects.detail.labels.note')}</div>
          <div className="uu-value">
            <textarea
              ref={detailNoteRef}
              className="uu-input"
              rows={1}
              style={OVERFLOW_HIDDEN_STYLE}
              value={meta.note || ''}
              onChange={onDetailNoteChange}
            />
          </div>
        </div>

        <div className="uu-row wrap">
          <div className="uu-label w-160">{t('projects.detail.labels.keywords')}</div>
          <div className="uu-row" style={FLEX_1_AUTO_STYLE}>
            <input
              className="uu-input"
              style={KEYWORDS_INPUT_STYLE}
              placeholder=""
              value={keywordsInput}
              onChange={onKeywordsInputChange}
              onKeyDown={onKeywordsKeyDown}
              onBlur={onKeywordsBlur}
            />
          </div>
        </div>
        <div className="uu-row uu-gap-6 uu-wrap" style={KEYWORDS_CHIPS_ROW_STYLE}>
          {detailKeywordsList.map((kw) => (
            <span
              key={kw}
              className="uu-chip"
              style={CHIP_STYLE}
            >
              <span style={CHIP_TEXT_STYLE}>{kw}</span>
              <button
                type="button"
                className="uu-chip-remove"
                onClick={() => onRemoveKeyword?.(kw)}
                aria-label={t('common.delete')}
                style={CHIP_REMOVE_STYLE}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
