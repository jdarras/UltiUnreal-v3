// app/screens/resources.jsx
import React from 'react';
import { readIdentity } from '../utils/identity';
import { createT } from '../i18n';
import ResourceList from '../components/ResourceList.jsx';
import MultiSelectDropdown from '../components/MultiSelectDropdown.jsx';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { resolveConfirmDialogLabels } from '../components/confirmDialogLabels';
import { safeT } from '../utils/i18nSafe.js';
import { useResourcesList } from './hooks/useResourcesList';
import { useResourceDetail } from './hooks/useResourceDetail';
import {
  USAGE_VALUES,
  STYLE_VALUES,
  AMBIANCE_VALUES,
  LICENSE_VALUES,
  RATING_VALUES,
  ADVANCED_INITIAL,
  getThumbSrc,
  getThumbCandidates,
  toListString,
  normalizeValue,
  buildMetaLine,
} from '../utils/resources-helpers';

const MARGIN_LEFT_AUTO_STYLE = { marginLeft: 'auto' };
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
const TOPBAR_ROW_STYLE = { flexWrap: 'nowrap', alignItems: 'center' };
const TOPBAR_GROUP_STYLE = { flex: '0 0 auto' };
const TOPBAR_SEARCH_INPUT_STYLE = { width: '280px', maxWidth: '320px', height: '36px', lineHeight: '36px' };
const TOPBAR_CLEAR_BUTTON_STYLE = {
  width: '36px',
  minWidth: '36px',
  height: '36px',
  padding: '0 6px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
const TOPBAR_ADVANCED_BUTTON_STYLE = { height: '36px', minHeight: '36px', display: 'flex', alignItems: 'center' };
const TOPBAR_FILTERS_GROUP_STYLE = { flex: '0 0 auto', marginLeft: '12px', gap: '32px' };
const COMPAT_FILTER_DISABLED_STYLE = { opacity: 0.5 };
const COMPAT_FILTER_ENABLED_STYLE = { opacity: 1 };
const ADVANCED_FIXED_WIDTH_STYLE = { width: '480px', minWidth: '480px', maxWidth: '480px' };
const PAGINATION_ROW_STYLE = { marginBottom: '8px' };
const PAGE_SIZE_STYLE = { width: '80px' };

export default function ResourcesScreen({ refreshKey = 0 } = {}) {
  const id = readIdentity();
  const lang = String(id?.lang || 'fr').trim();
  const t = React.useMemo(() => createT(lang), [lang]);
  const {
    title: confirmTitle,
    cancelLabel: confirmCancelLabel,
  } = resolveConfirmDialogLabels(t, {
    cancelAltKey: 'app.quit.confirm.cancel',
  });

  const usageOptions = React.useMemo(() => (
    USAGE_VALUES
      .map((value) => ({
        value,
        label: safeT(t, `resources.detail.usage.${value}`, value),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, lang === 'en' ? 'en' : 'fr', { sensitivity: 'base' }))
  ), [t, lang]);
  const styleOptions = React.useMemo(() => (
    STYLE_VALUES.map((value) => ({
      value,
      label: safeT(t, `resources.detail.style.${value}`, value),
    }))
  ), [t]);
  const ambianceOptions = React.useMemo(() => (
    AMBIANCE_VALUES.map((value) => ({
      value,
      label: safeT(t, `resources.detail.ambiance.${value}`, value),
    }))
  ), [t]);
  const licenseOptions = React.useMemo(() => (
    LICENSE_VALUES.map((value) => ({
      value,
      label: safeT(t, `resources.detail.license.${value}`, value),
    }))
  ), [t]);
  const noneLabel = React.useMemo(() => {
    const raw = t('common.none');
    const stripped = raw ? raw.replace(/[()]/g, '').trim() : '';
    if (!stripped) return 'Aucun';
    return stripped.charAt(0).toUpperCase() + stripped.slice(1);
  }, [t]);

  const {
    items,
    setItems,
    query,
    setQuery,
    searchExpanded,
    setSearchExpanded,
    searchAdvanced,
    setSearchAdvanced,
    resourceFavoritesRef,
    setResourceFavorites,
    quickFilters,
    setQuickFilters,
    busy,
    setPage,
    pageSize,
    setPageSize,
    viewMode,
    setViewMode,
    unrealLauncherPath,
    refreshUserVersions,
    filteredResources,
    totalPages,
    currentPage,
    canPrevPage,
    canNextPage,
    visibleResources,
    compatLabel,
    compatDisabled,
    incompleteMsg,
    canClearSearch,
    sellerOptions,
    epicAccountOptions,
    typeOptions,
    distributionOptions,
    ueOptions,
    userUeVersionSet,
    isUeIncompatible,
  } = useResourcesList({ t, id, refreshKey });

  const {
    detailUid,
    setDetailUid,
    detailDraft,
    setDetailDraft,
    detailBusy,
    detailDeleteBusy,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    tagInput,
    setTagInput,
    lightboxIndex,
    lightboxItems,
    lightboxOpen,
    detailNoteRef,
    detailNoteDirtyRef,
    detailNoteFocusedRef,
    detailTagsRef,
    deleteConfirmTriggerRef,
    deleteConfirmOkRef,
    detailItem,
    detailTitle,
    detailHasNav,
    detailHeroSrc,
    heroActiveIndex,
    heroNavAvailable,
    galleryBlockItems,
    setHeroIndex,
    detailInfoLines,
    vendorDescription,
    detailTagsList,
    triggerDetailSave,
    closeDeleteConfirm,
    addTagToDraft,
    removeTagFromDraft,
    handleTagInputKeyDown,
    openDetail,
    stepDetail,
    stepHero,
    stepLightbox,
    openLightboxAt,
    closeLightbox,
    handleOpen,
    handleLaunchInUnreal,
    handleResourceImageContextMenu,
    setResourceFavoriteLocal,
    toggleFavorite,
    togglePurchased,
    toggleTested,
    setUserSelect,
    setUserRating,
    addKeywordQuick,
  } = useResourceDetail({
    t,
    lang,
    items,
    setItems,
    busy,
    resourceFavoritesRef,
    setResourceFavorites,
    filteredResources,
    userUeVersionSet,
    unrealLauncherPath,
    refreshUserVersions,
  });


  if (detailUid && detailItem) {
    return (
      <div className="uu-page uu-page-compact resources-page">
        <div className="uu-section">
          <div className="uu-row uu-align-center uu-gap-8">
            <button
              className="uu-btn"
              onClick={() => {
                triggerDetailSave();
                setDetailUid('');
              }}
            >
              {t('resources.detail.back')}
            </button>
            <div className="uu-resource-title">{detailTitle}</div>
            {detailItem?.uid ? (
              <span className="uu-id-tag uu-muted">[{detailItem.uid}]</span>
            ) : null}
            <div style={MARGIN_LEFT_AUTO_STYLE} />
            {detailItem?.listingUrl ? (
              <button className="uu-btn" onClick={() => { void handleLaunchInUnreal(); }}>
                {t('resources.openFab')}
              </button>
            ) : null}
            <button
              ref={deleteConfirmTriggerRef}
              className="uu-btn"
              onClick={() => {
                setDeleteConfirmOpen(true);
              }}
              disabled={detailDeleteBusy}
            >
              {detailDeleteBusy
                ? t('common.loading')
                : t('common.delete')}
            </button>
          </div>
        </div>

        <div className="uu-section mt-16 uu-col uu-gap-16">
          <div className="uu-card uu-col uu-gap-12">
            <div className="uu-resource-detail-hero">
              {detailHasNav ? (
                <button
                  type="button"
                  className="uu-resource-hero-nav left"
                  onClick={() => stepDetail(-1)}
                  disabled={!detailHasNav}
                  title={t('common.prev')}
                >
                  ‹
                </button>
              ) : null}
            {heroNavAvailable ? (
              <button
                type="button"
                className="uu-resource-hero-inline-nav left"
                onClick={() => stepHero(-1)}
                title={t('common.prev')}
                aria-label={t('common.prev')}
              >
                ‹
              </button>
            ) : null}
              {detailHeroSrc ? (
                <button
                  type="button"
                  className="uu-resource-hero-btn"
                  onClick={() => openLightboxAt(heroActiveIndex >= 0 ? heroActiveIndex : 0)}
                  onContextMenu={(event) => {
                    handleResourceImageContextMenu(event, detailHeroSrc);
                  }}
                >
                  <img
                    className="uu-resource-detail-thumb-hero"
                    src={detailHeroSrc}
                    alt={detailTitle}
                    loading="lazy"
                    decoding="async"
                    onError={() => {
                      if (galleryBlockItems.length <= 1) return;
                      setHeroIndex((prev) => {
                        const next = prev + 1;
                        if (next >= galleryBlockItems.length) return prev;
                        return next;
                      });
                    }}
                  />
                </button>
              ) : (
                <div className="uu-resource-detail-thumb-hero placeholder">
                  {t('resources.noThumbnail')}
                </div>
              )}
            {heroNavAvailable ? (
              <button
                type="button"
                className="uu-resource-hero-inline-nav right"
                onClick={() => stepHero(1)}
                title={t('common.next')}
                aria-label={t('common.next')}
              >
                ›
              </button>
            ) : null}
              {detailHasNav ? (
                <button
                  type="button"
                  className="uu-resource-hero-nav right"
                  onClick={() => stepDetail(1)}
                  disabled={!detailHasNav}
                  title={t('common.next')}
                >
                  ›
                </button>
              ) : null}
            </div>
          </div>

          <div className="uu-card uu-col uu-gap-12">
            <div className="uu-row uu-align-center uu-gap-12" style={ROW_WRAP_STYLE}>
              <strong className="uu-block-title">
                {t('resources.detail.indexation')}
              </strong>
              {/* inline messages désactivés sur la page détail ressource */}
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
                    onChange={(e) => setDetailDraft((prev) => ({ ...prev, usage: e.target.value }))}
                    onBlur={() => { /* save only on close */ }}
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
                    onChange={(e) => setDetailDraft((prev) => ({ ...prev, style: e.target.value }))}
                    onBlur={() => { /* save only on close */ }}
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
                    onChange={(e) => setDetailDraft((prev) => ({ ...prev, ambiance: e.target.value }))}
                    onBlur={() => { /* save only on close */ }}
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
                    onChange={(e) => setDetailDraft((prev) => ({ ...prev, license: e.target.value }))}
                    onBlur={() => { /* save only on close */ }}
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
                  onChange={(e) => setDetailDraft((prev) => ({ ...prev, purchased: !!e.target.checked }))}
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
                  onChange={(e) => setDetailDraft((prev) => ({ ...prev, tested: !!e.target.checked }))}
                />
              </div>
              <div className="uu-detail-flag">
                <span className="uu-label">
                  {t('resources.detail.labels.favorite')}
                </span>
                <button
                  type="button"
                  className={`uu-fav-btn ${detailDraft.favorite ? 'active' : ''}`}
                  onClick={() => setResourceFavoriteLocal(detailUid, !detailDraft.favorite)}
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
                <div className="uu-rating">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                        key={`quality-${n}`}
                        type="button"
                        className={`uu-rating-btn ${detailDraft.ratingQuality >= n ? 'active' : ''}`}
                        onClick={() => setDetailDraft((prev) => ({
                          ...prev,
                          ratingQuality: prev.ratingQuality === n ? 0 : n,
                        }))}
                        aria-pressed={detailDraft.ratingQuality >= n ? 'true' : 'false'}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
              <div className="uu-detail-flag" style={DETAIL_FLAG_FLEX_STYLE}>
                <label className="uu-label">
                  {t('resources.detail.labels.performance')}
                </label>
                <div className="uu-rating">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                        key={`perf-${n}`}
                        type="button"
                        className={`uu-rating-btn ${detailDraft.ratingPerformance >= n ? 'active' : ''}`}
                        onClick={() => setDetailDraft((prev) => ({
                          ...prev,
                          ratingPerformance: prev.ratingPerformance === n ? 0 : n,
                        }))}
                        aria-pressed={detailDraft.ratingPerformance >= n ? 'true' : 'false'}
                      >
                        ★
                      </button>
                    ))}
                  </div>
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
                    onChange={(e) => {
                      const el = e.target;
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
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagInputKeyDown}
                    onBlur={() => addTagToDraft(tagInput)}
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
                      onClick={() => removeTagFromDraft(tag)}
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

          <div className="uu-card uu-col uu-gap-12">
            <strong className="uu-block-title">
              {t('resources.detail.gallery')}
            </strong>
            {galleryBlockItems.length ? (
              <div className="uu-resource-gallery">
                {galleryBlockItems.map((src, idx) => (
                  <button
                    key={`img-${idx}`}
                    type="button"
                    className="uu-resource-gallery-btn"
                    onClick={() => openLightboxAt(idx)}
                    onContextMenu={(event) => {
                      handleResourceImageContextMenu(event, src);
                    }}
                  >
                    <img
                      className="uu-resource-gallery-img"
                      src={src}
                      alt={detailTitle}
                      loading="lazy"
                      decoding="async"
                    />
                  </button>
                ))}
              </div>
            ) : (
              <div className="uu-muted">{t('resources.noThumbnail')}</div>
            )}
          </div>

          <div className="uu-card uu-col uu-gap-12">
            <strong className="uu-block-title">
              {t('resources.detail.infoTitle')}
            </strong>
            <div className="uu-col uu-gap-8">
              {detailInfoLines.map((row, idx) => (
                <div key={`${row.label}-${idx}`} className="uu-row uu-gap-8">
                  <div className="uu-label w-160">{row.label}</div>
                  <div className="uu-value uu-muted">{row.value}</div>
                </div>
              ))}
            </div>
          </div>

          {vendorDescription ? (
            <div className="uu-card uu-col uu-gap-12">
              <strong className="uu-block-title">
                {t('resources.detail.vendorDescription')}
              </strong>
              <div className="uu-resource-detail-text">{vendorDescription}</div>
            </div>
          ) : null}
        </div>

        {lightboxOpen && lightboxItems.length ? (
          <div className="uu-lightbox" onClick={closeLightbox}>
            <div className="uu-lightbox-inner" onClick={(e) => e.stopPropagation()}>
              <button className="uu-lightbox-close" type="button" onClick={closeLightbox}>
                ×
              </button>
              <button
                className="uu-lightbox-nav left"
                type="button"
                onClick={() => stepLightbox(-1)}
                disabled={lightboxItems.length < 2}
              >
                ‹
              </button>
              <img
                className="uu-lightbox-img"
                src={lightboxItems[lightboxIndex]}
                alt={detailTitle}
                onContextMenu={(event) => {
                  handleResourceImageContextMenu(event, lightboxItems[lightboxIndex]);
                }}
              />
              <button
                className="uu-lightbox-nav right"
                type="button"
                onClick={() => stepLightbox(1)}
                disabled={lightboxItems.length < 2}
              >
                ›
              </button>
            </div>
          </div>
        ) : null}
        <ConfirmDialog
          open={deleteConfirmOpen}
          busy={detailDeleteBusy}
          title={confirmTitle}
          message={t('resources.detail.confirmDelete', {
            name: detailTitle || detailUid || '-',
          })}
          cancelLabel={confirmCancelLabel}
          confirmLabel={detailDeleteBusy ? t('common.loading') : t('common.delete')}
          onCancel={() => closeDeleteConfirm(false)}
          onConfirm={() => closeDeleteConfirm(true)}
          confirmRef={deleteConfirmOkRef}
          overlayZIndex={2200}
        />
      </div>
    );
  }

  return (
    <div className="uu-page uu-page-compact resources-page">
      <div className="uu-section">
        <div className="uu-row uu-align-center uu-gap-8" style={TOPBAR_ROW_STYLE}>
          <div className="uu-row uu-gap-4 uu-align-center" style={TOPBAR_GROUP_STYLE}>
            <input
              className="uu-input"
              style={TOPBAR_SEARCH_INPUT_STYLE}
              placeholder={t('resources.searchPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              type="button"
              className="uu-btn uu-btn-icon"
              onClick={() => {
                setQuery('');
                setSearchAdvanced(ADVANCED_INITIAL);
                setQuickFilters({ tested: false, favorite: false, compatibleOnly: false });
                setSearchExpanded(false);
              }}
              disabled={!canClearSearch}
              title={t('resources.search.clear')}
              style={TOPBAR_CLEAR_BUTTON_STYLE}
            >
              ✕
            </button>
            <button
              type="button"
              className="uu-btn"
              onClick={() => setSearchExpanded(true)}
              style={TOPBAR_ADVANCED_BUTTON_STYLE}
            >
              {t('resources.search.advancedButton')}
            </button>
          </div>

          <div className="uu-row uu-align-center" style={TOPBAR_FILTERS_GROUP_STYLE}>
            <label className="uu-check">
              <input
                type="checkbox"
                checked={!!quickFilters.tested}
                onChange={() => setQuickFilters((prev) => ({ ...prev, tested: !prev.tested }))}
              />
              {t('resources.detail.labels.tested')}
            </label>
            <label className="uu-check" style={compatDisabled ? COMPAT_FILTER_DISABLED_STYLE : COMPAT_FILTER_ENABLED_STYLE}>
              <input
                type="checkbox"
                disabled={compatDisabled}
                checked={!!quickFilters.compatibleOnly}
                onChange={() => setQuickFilters((prev) => ({ ...prev, compatibleOnly: !prev.compatibleOnly }))}
              />
              {compatLabel}
            </label>
            <div className="uu-row uu-gap-6 uu-align-center">
              <button
                type="button"
                className={`uu-fav-filter ${quickFilters.favorite ? 'active' : ''}`}
                onClick={() => setQuickFilters((prev) => ({ ...prev, favorite: !prev.favorite }))}
                aria-pressed={quickFilters.favorite ? 'true' : 'false'}
                title={t('resources.detail.labels.favorite')}
              >
                ★
              </button>
              <span>{t('resources.detail.labels.favorite')}</span>
            </div>
          </div>
          <div className="uu-row uu-gap-4" style={MARGIN_LEFT_AUTO_STYLE}>
            <button
              type="button"
              className={`uu-btn ${viewMode === 'thumbs' ? 'prod-toggle-active' : ''}`}
              onClick={() => setViewMode('thumbs')}
            >
              {t('resources.view.thumbs')}
            </button>
            <button
              type="button"
              className={`uu-btn ${viewMode === 'cards' ? 'prod-toggle-active' : ''}`}
              onClick={() => setViewMode('cards')}
            >
              {t('resources.view.cards')}
            </button>
          </div>
        </div>
        {incompleteMsg ? (
          <div className="uu-msg error mt-8">
            {incompleteMsg}
          </div>
        ) : null}
      </div>

      {searchExpanded ? (
        <div className="uu-section">
          <div className="uu-card uu-col uu-gap-12">
            <div className="uu-row uu-align-center uu-gap-8 uu-wrap">
              <strong className="uu-block-title">{t('resources.search.advancedTitle')}</strong>
              <div className="uu-muted">
                {filteredResources.length ? `(${filteredResources.length} ${t('resources.search.resultsLabel')})` : ''}
              </div>
            </div>

            <div className="uu-col uu-gap-12">
                <div className="uu-row uu-gap-16 uu-wrap">
                  <div className="uu-row uu-align-center uu-gap-8 uu-flex-45-min-320">
                  <label className="uu-label w-90">{t('resources.detail.labels.usage')}</label>
                  <MultiSelectDropdown
                    options={usageOptions}
                    values={searchAdvanced.usage}
                    onChange={(vals) => setSearchAdvanced((prev) => ({ ...prev, usage: vals }))}
                    noneLabel={noneLabel}
                    style={ADVANCED_FIXED_WIDTH_STYLE}
                  />
                </div>
                <div className="uu-row uu-align-center uu-gap-8 uu-flex-45-min-320">
                  <label className="uu-label w-90">{t('resources.detail.labels.style')}</label>
                  <MultiSelectDropdown
                    options={styleOptions}
                    values={searchAdvanced.style}
                    onChange={(vals) => setSearchAdvanced((prev) => ({ ...prev, style: vals }))}
                    noneLabel={noneLabel}
                  />
                </div>
              </div>

              <div className="uu-row uu-gap-16 uu-wrap">
                  <div className="uu-row uu-align-center uu-gap-8 uu-flex-45-min-320">
                  <label className="uu-label w-90">{t('resources.detail.labels.ambiance')}</label>
                  <MultiSelectDropdown
                    options={ambianceOptions}
                    values={searchAdvanced.ambiance}
                    onChange={(vals) => setSearchAdvanced((prev) => ({ ...prev, ambiance: vals }))}
                    noneLabel={noneLabel}
                    style={ADVANCED_FIXED_WIDTH_STYLE}
                  />
                </div>
                <div className="uu-row uu-align-center uu-gap-8 uu-flex-45-min-320">
                  <label className="uu-label w-90">{t('resources.detail.labels.license')}</label>
                  <MultiSelectDropdown
                    options={licenseOptions}
                    values={searchAdvanced.license}
                    onChange={(vals) => setSearchAdvanced((prev) => ({ ...prev, license: vals }))}
                    noneLabel={noneLabel}
                  />
                </div>
              </div>

              <div className="uu-row uu-gap-16 uu-wrap">
                <div className="uu-row uu-align-center uu-gap-8 uu-flex-45-min-320">
                  <label className="uu-label w-90">{t('resources.type')}</label>
                  <MultiSelectDropdown
                    options={typeOptions.map((val) => ({ value: val, label: val }))}
                    values={searchAdvanced.type}
                    onChange={(vals) => setSearchAdvanced((prev) => ({ ...prev, type: vals }))}
                    noneLabel={noneLabel}
                    style={ADVANCED_FIXED_WIDTH_STYLE}
                  />
                </div>
                <div className="uu-row uu-align-center uu-gap-8 uu-flex-45-min-320">
                  <label className="uu-label w-90">{t('resources.detail.distribution')}</label>
                  <MultiSelectDropdown
                    options={distributionOptions.map((val) => ({ value: val, label: val }))}
                    values={searchAdvanced.distribution}
                    onChange={(vals) => setSearchAdvanced((prev) => ({ ...prev, distribution: vals }))}
                    noneLabel={noneLabel}
                  />
                </div>
              </div>

                <div className="uu-row uu-gap-16 uu-wrap">
                  <div className="uu-row uu-align-center uu-gap-8 uu-flex-45-min-320">
                  <label className="uu-label w-90">{t('resources.ueVersions')}</label>
                  <MultiSelectDropdown
                    options={ueOptions.map((val) => ({ value: val, label: val }))}
                    values={searchAdvanced.ueVersion}
                    onChange={(vals) => setSearchAdvanced((prev) => ({ ...prev, ueVersion: vals }))}
                    noneLabel={noneLabel}
                    style={ADVANCED_FIXED_WIDTH_STYLE}
                  />
                  </div>
                  <div className="uu-row uu-align-center uu-gap-8 uu-flex-45-min-320">
                    <label className="uu-label w-90">{t('resources.seller')}</label>
                  <select
                    className="uu-select"
                    style={RESOURCE_SELECT_STYLE}
                    value={searchAdvanced.seller}
                    onChange={(e) => setSearchAdvanced((prev) => ({ ...prev, seller: e.target.value }))}
                  >
                    <option value="">{noneLabel}</option>
                    {sellerOptions.map((val) => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="uu-row uu-gap-16 uu-wrap">
                <div className="uu-row uu-align-center uu-gap-8 uu-flex-45-min-320">
                  <label className="uu-label w-90">{t('resources.detail.labels.quality')}</label>
                  <div className="uu-row uu-align-center uu-gap-8">
                    <div className="uu-rating">
                      {RATING_VALUES.map((n) => (
                        <button
                          key={`adv-quality-${n}`}
                          type="button"
                          className={`uu-rating-btn ${searchAdvanced.quality >= n ? 'active' : ''}`}
                          onClick={() => setSearchAdvanced((prev) => ({
                            ...prev,
                            quality: prev.quality === n ? 0 : n,
                          }))}
                          aria-pressed={searchAdvanced.quality >= n ? 'true' : 'false'}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="uu-reset-btn uu-reset-neutral"
                      onClick={() => setSearchAdvanced((prev) => ({ ...prev, quality: 0 }))}
                      title={noneLabel}
                      aria-label={noneLabel}
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div className="uu-row uu-align-center uu-gap-8 uu-flex-45-min-320">
                  <label className="uu-label w-90">{t('resources.detail.labels.performance')}</label>
                  <div className="uu-row uu-align-center uu-gap-8">
                    <div className="uu-rating">
                      {RATING_VALUES.map((n) => (
                        <button
                          key={`adv-performance-${n}`}
                          type="button"
                          className={`uu-rating-btn ${searchAdvanced.performance >= n ? 'active' : ''}`}
                          onClick={() => setSearchAdvanced((prev) => ({
                            ...prev,
                            performance: prev.performance === n ? 0 : n,
                          }))}
                          aria-pressed={searchAdvanced.performance >= n ? 'true' : 'false'}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="uu-reset-btn uu-reset-neutral"
                      onClick={() => setSearchAdvanced((prev) => ({ ...prev, performance: 0 }))}
                      title={noneLabel}
                      aria-label={noneLabel}
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>

                <div className="uu-row uu-gap-16 uu-wrap">
                  <div className="uu-row uu-align-center uu-gap-8 uu-flex-45-min-320">
                  <label className="uu-label w-90">{t('resources.detail.labels.tags')}</label>
                  <input
                    className="uu-input"
                    style={ADVANCED_FIXED_WIDTH_STYLE}
                    value={searchAdvanced.tags}
                    onChange={(e) => setSearchAdvanced((prev) => ({ ...prev, tags: e.target.value }))}
                    placeholder={t('resources.search.placeholderTags')}
                  />
                </div>
                <div className="uu-row uu-align-center uu-gap-8 uu-flex-45-min-320">
                  <label className="uu-label w-90">
                    {t('resources.detail.labels.epicAccount')}
                  </label>
                  <select
                    className="uu-select"
                    style={RESOURCE_SELECT_STYLE}
                    value={searchAdvanced.epicAccount}
                    onChange={(e) => setSearchAdvanced((prev) => ({ ...prev, epicAccount: e.target.value }))}
                  >
                    <option value="">{noneLabel}</option>
                    {epicAccountOptions.map((val) => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="uu-row uu-align-center uu-gap-8">
              <button
                type="button"
                className="uu-btn"
                onClick={() => { setSearchExpanded(false); setQuery(''); setSearchAdvanced(ADVANCED_INITIAL); }}
              >
                {t('resources.search.close')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className={`uu-section mt-16 ${viewMode === 'thumbs' ? 'resources-thumbs-section' : ''}`}>
        {filteredResources.length > 0 ? (
          <div className="uu-row uu-gap-12 uu-align-center" style={PAGINATION_ROW_STYLE}>
            <div className="uu-row uu-gap-6 uu-align-center">
              {canPrevPage ? (
                <button
                  type="button"
                  className="uu-btn"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  aria-label={t('projects.pagination.prevAria')}
                >
                  ‹
                </button>
              ) : null}
              <span className="uu-muted">
                {`Page ${currentPage + 1}/${totalPages}`}
              </span>
              {canNextPage ? (
                <button
                  type="button"
                  className="uu-btn"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  aria-label={t('projects.pagination.nextAria')}
                >
                  ›
                </button>
              ) : null}
              <select
                className="uu-select"
                value={pageSize}
                onChange={(e) => setPageSize(Math.max(10, Number(e.target.value) || 25))}
                style={PAGE_SIZE_STYLE}
                aria-label={t('projects.pagination.pageSizeAria')}
              >
                {[25, 50, 100, 200].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>
        ) : null}
        {filteredResources.length === 0 ? (
          <div className="uu-muted mt-8">
            {busy ? t('common.loading') : t('resources.empty')}
          </div>
        ) : (
          <ResourceList
            items={visibleResources}
            viewMode={viewMode}
            onOpenDetail={openDetail}
            onOpenExternal={handleOpen}
            onToggleFavorite={toggleFavorite}
            onTogglePurchased={togglePurchased}
            onToggleTested={toggleTested}
            onAddKeyword={addKeywordQuick}
            onSetUsage={(item, val) => setUserSelect(item, 'usage', val, USAGE_VALUES)}
            onSetStyle={(item, val) => setUserSelect(item, 'style', val, STYLE_VALUES)}
            onSetAmbiance={(item, val) => setUserSelect(item, 'ambiance', val, AMBIANCE_VALUES)}
            onSetLicense={(item, val) => setUserSelect(item, 'license', val, LICENSE_VALUES)}
            onSetQuality={(item, val) => setUserRating(item, 'ratingQuality', val)}
            onSetPerformance={(item, val) => setUserRating(item, 'ratingPerformance', val)}
            usageOptions={USAGE_VALUES}
            styleOptions={STYLE_VALUES}
            ambianceOptions={AMBIANCE_VALUES}
            licenseOptions={LICENSE_VALUES}
            getThumbSrc={getThumbSrc}
            getThumbCandidates={getThumbCandidates}
            toListString={toListString}
            normalizeValue={normalizeValue}
            buildMetaLine={(item) => buildMetaLine(item, t)}
            isUeIncompatible={isUeIncompatible}
            t={t}
          />
        )}
      </div>
    </div>
  );
}

