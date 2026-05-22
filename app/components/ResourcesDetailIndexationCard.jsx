import RatingStars from './RatingStars.jsx';

const ROW_WRAP_STYLE = { flexWrap: 'wrap' };
const RESOURCE_SELECT_STYLE = { flex: '1 1 220px', minWidth: '200px', height: '36px' };
const DETAIL_FLAG_FLEX_STYLE = { flex: '1 1 auto' };
const NOTE_TEXTAREA_STYLE = { overflow: 'hidden' };
const FLEX_AUTO_STYLE = { flex: '1 1 auto' };
const TAG_INPUT_STYLE = { minWidth: '200px', flex: '1 1 260px' };
const TAG_CHIPS_ROW_STYLE = { marginLeft: '90px' };
const TAG_CHIP_STYLE = { border: 'none', padding: '6px 10px', gap: '8px' };
const TAG_TEXT_STYLE = { marginRight: '6px' };
const TAG_REMOVE_STYLE = { padding: '2px 6px', minWidth: 'auto', height: '22px' };

export default function ResourcesDetailIndexationCard({
  t,
  detailDraft,
  setDetailDraft,
  noneLabel = '',
  usageOptions = [],
  styleOptions = [],
  ambianceOptions = [],
  licenseOptions = [],
  detailBusy = false,
  detailUid = '',
  setResourceFavoriteLocal,
  detailNoteRef,
  detailNoteDirtyRef,
  detailNoteFocusedRef,
  tagInput = '',
  setTagInput,
  detailTagsRef,
  handleTagInputKeyDown,
  addTagToDraft,
  detailTagsList = [],
  removeTagFromDraft,
}) {
  return (
    <div className="uu-card uu-col uu-gap-12">
      <div className="uu-row uu-align-center uu-gap-12" style={ROW_WRAP_STYLE}>
        <strong className="uu-block-title">
          {t('resources.detail.indexation')}
        </strong>
      </div>

      <div className="uu-col uu-gap-12">
        <div className="uu-row uu-gap-16 uu-wrap">
          <div className="uu-row uu-align-center uu-gap-8 uu-flex-45-min-320">
            <label className="uu-label w-90">
              {t('resources.detail.labels.usage')}
            </label>
            <select
              className="uu-select"
              style={RESOURCE_SELECT_STYLE}
              value={detailDraft.usage}
              onChange={(event) => setDetailDraft((prev) => ({ ...prev, usage: event.target.value }))}
              onBlur={() => {}}
            >
              <option value="">{noneLabel}</option>
              {usageOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="uu-row uu-align-center uu-gap-8 uu-flex-45-min-320">
            <label className="uu-label w-90">
              {t('resources.detail.labels.style')}
            </label>
            <select
              className="uu-select"
              style={RESOURCE_SELECT_STYLE}
              value={detailDraft.style}
              onChange={(event) => setDetailDraft((prev) => ({ ...prev, style: event.target.value }))}
              onBlur={() => {}}
            >
              <option value="">{noneLabel}</option>
              {styleOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="uu-row uu-gap-16 uu-wrap">
          <div className="uu-row uu-align-center uu-gap-8 uu-flex-45-min-320">
            <label className="uu-label w-90">
              {t('resources.detail.labels.ambiance')}
            </label>
            <select
              className="uu-select"
              style={RESOURCE_SELECT_STYLE}
              value={detailDraft.ambiance}
              onChange={(event) => setDetailDraft((prev) => ({ ...prev, ambiance: event.target.value }))}
              onBlur={() => {}}
            >
              <option value="">{noneLabel}</option>
              {ambianceOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="uu-row uu-align-center uu-gap-8 uu-flex-45-min-320">
            <label className="uu-label w-90">
              {t('resources.detail.labels.license')}
            </label>
            <select
              className="uu-select"
              style={RESOURCE_SELECT_STYLE}
              value={detailDraft.license}
              onChange={(event) => setDetailDraft((prev) => ({ ...prev, license: event.target.value }))}
              onBlur={() => {}}
            >
              <option value="">{noneLabel}</option>
              {licenseOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="uu-detail-flags-row">
          <div className="uu-detail-flag">
            <label className="uu-label">{t('resources.detail.labels.purchased')}</label>
            <input
              type="checkbox"
              checked={!!detailDraft.purchased}
              onChange={(event) => setDetailDraft((prev) => ({ ...prev, purchased: !!event.target.checked }))}
              disabled={detailBusy}
            />
          </div>
          <div className="uu-detail-flag">
            <label className="uu-label" htmlFor="resource-tested">
              {t('resources.detail.labels.tested')}
            </label>
            <input
              id="resource-tested"
              type="checkbox"
              checked={!!detailDraft.tested}
              onChange={(event) => setDetailDraft((prev) => ({ ...prev, tested: !!event.target.checked }))}
            />
          </div>
          <div className="uu-detail-flag">
            <span className="uu-label">
              {t('resources.detail.labels.favorite')}
            </span>
            <button
              type="button"
              className={`uu-fav-btn ${detailDraft.favorite ? 'active' : ''}`}
              onClick={() => setResourceFavoriteLocal?.(detailUid, !detailDraft.favorite)}
              aria-pressed={detailDraft.favorite ? 'true' : 'false'}
              title={t('resources.detail.labels.favorite')}
            >
              ★
            </button>
          </div>
          <div className="uu-detail-flag">
            <label className="uu-label">
              {t('resources.detail.labels.quality')}
            </label>
            <RatingStars
              idPrefix="detail-quality"
              value={detailDraft.ratingQuality}
              onChange={(ratingQuality) => {
                setDetailDraft((prev) => ({ ...prev, ratingQuality }));
              }}
            />
          </div>
          <div className="uu-detail-flag" style={DETAIL_FLAG_FLEX_STYLE}>
            <label className="uu-label">
              {t('resources.detail.labels.performance')}
            </label>
            <RatingStars
              idPrefix="detail-performance"
              value={detailDraft.ratingPerformance}
              onChange={(ratingPerformance) => {
                setDetailDraft((prev) => ({ ...prev, ratingPerformance }));
              }}
            />
          </div>
        </div>

        <div className="uu-row wrap">
          <div className="uu-label w-90">{t('resources.detail.labels.note')}</div>
          <div className="uu-value">
            <textarea
              ref={detailNoteRef}
              className="uu-input"
              rows={1}
              style={NOTE_TEXTAREA_STYLE}
              value={detailDraft.note}
              onChange={(event) => {
                const el = event.target;
                el.style.height = '0px';
                el.style.height = `${el.scrollHeight}px`;
                detailNoteDirtyRef.current = true;
                setDetailDraft((prev) => ({ ...prev, note: el.value }));
              }}
              onFocus={() => {
                detailNoteFocusedRef.current = true;
              }}
              onBlur={() => {
                detailNoteFocusedRef.current = false;
              }}
            />
          </div>
        </div>

        <div className="uu-row wrap">
          <div className="uu-label w-90">{t('resources.detail.labels.tags')}</div>
          <div className="uu-row" style={FLEX_AUTO_STYLE}>
            <input
              ref={detailTagsRef}
              className="uu-input"
              style={TAG_INPUT_STYLE}
              value={tagInput}
              onChange={(event) => setTagInput?.(event.target.value)}
              onKeyDown={handleTagInputKeyDown}
              onBlur={() => addTagToDraft?.(tagInput)}
              placeholder={t('resources.search.placeholderTags')}
            />
          </div>
        </div>
        <div className="uu-row uu-gap-6 uu-wrap" style={TAG_CHIPS_ROW_STYLE}>
          {detailTagsList.map((tag) => (
            <span
              key={tag}
              className="uu-chip"
              style={TAG_CHIP_STYLE}
            >
              <span style={TAG_TEXT_STYLE}>{tag}</span>
              <button
                type="button"
                className="uu-chip-remove"
                onClick={() => removeTagFromDraft?.(tag)}
                aria-label={t('common.delete')}
                style={TAG_REMOVE_STYLE}
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
