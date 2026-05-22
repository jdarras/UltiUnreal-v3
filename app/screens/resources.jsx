// app/screens/resources.jsx
import React from 'react';
import { readIdentity } from '../utils/identity';
import { createT } from '../i18n';
import ResourcesDetailView from '../components/ResourcesDetailView.jsx';
import ResourcesListView from '../components/ResourcesListView.jsx';
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

export default function ResourcesScreen({ refreshKey = 0 } = {}) {
  const id = readIdentity();
  const lang = String(id?.lang || 'fr').trim();
  const t = React.useMemo(() => createT(lang), [lang]);

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

  const detailViewProps = {
    t,
    detailTitle,
    detailUid,
    detailItem,
    onBack: () => {
      triggerDetailSave();
      setDetailUid('');
    },
    onOpenFab: handleLaunchInUnreal,
    deleteConfirmTriggerRef,
    onOpenDeleteConfirm: () => {
      setDeleteConfirmOpen(true);
    },
    detailDeleteBusy,
    detailHasNav,
    onStepDetail: stepDetail,
    heroNavAvailable,
    onStepHero: stepHero,
    detailHeroSrc,
    heroActiveIndex,
    onOpenLightboxAt: openLightboxAt,
    onImageContextMenu: handleResourceImageContextMenu,
    galleryItemsLength: galleryBlockItems.length,
    setHeroIndex,
    detailDraft,
    setDetailDraft,
    noneLabel,
    usageOptions,
    styleOptions,
    ambianceOptions,
    licenseOptions,
    detailBusy,
    setResourceFavoriteLocal,
    detailNoteRef,
    detailNoteDirtyRef,
    detailNoteFocusedRef,
    tagInput,
    setTagInput,
    detailTagsRef,
    handleTagInputKeyDown,
    addTagToDraft,
    detailTagsList,
    removeTagFromDraft,
    galleryBlockItems,
    detailInfoLines,
    vendorDescription,
    lightboxOpen,
    lightboxItems,
    lightboxIndex,
    onCloseLightbox: closeLightbox,
    onStepLightbox: stepLightbox,
    deleteConfirmOpen,
    onCloseDeleteConfirm: closeDeleteConfirm,
    deleteConfirmOkRef,
  };

  const listViewProps = {
    t,
    query,
    setQuery,
    searchExpanded,
    setSearchExpanded,
    searchAdvanced,
    setSearchAdvanced,
    quickFilters,
    setQuickFilters,
    canClearSearch,
    compatDisabled,
    compatLabel,
    viewMode,
    setViewMode,
    incompleteMsg,
    filteredResources,
    noneLabel,
    usageOptions,
    styleOptions,
    ambianceOptions,
    licenseOptions,
    typeOptions,
    distributionOptions,
    ueOptions,
    sellerOptions,
    epicAccountOptions,
    ratingValues: RATING_VALUES,
    advancedInitial: ADVANCED_INITIAL,
    setPage,
    totalPages,
    currentPage,
    canPrevPage,
    canNextPage,
    pageSize,
    setPageSize,
    busy,
    visibleResources,
    onOpenDetail: openDetail,
    onOpenExternal: handleOpen,
    onToggleFavorite: toggleFavorite,
    onTogglePurchased: togglePurchased,
    onToggleTested: toggleTested,
    onAddKeyword: addKeywordQuick,
    onSetUsage: (item, val) => setUserSelect(item, 'usage', val, USAGE_VALUES),
    onSetStyle: (item, val) => setUserSelect(item, 'style', val, STYLE_VALUES),
    onSetAmbiance: (item, val) => setUserSelect(item, 'ambiance', val, AMBIANCE_VALUES),
    onSetLicense: (item, val) => setUserSelect(item, 'license', val, LICENSE_VALUES),
    onSetQuality: (item, val) => setUserRating(item, 'ratingQuality', val),
    onSetPerformance: (item, val) => setUserRating(item, 'ratingPerformance', val),
    usageValues: USAGE_VALUES,
    styleValues: STYLE_VALUES,
    ambianceValues: AMBIANCE_VALUES,
    licenseValues: LICENSE_VALUES,
    getThumbSrc,
    getThumbCandidates,
    toListString,
    normalizeValue,
    buildMetaLine: (item) => buildMetaLine(item, t),
    isUeIncompatible,
  };


  if (detailUid && detailItem) {
    return <ResourcesDetailView {...detailViewProps} />;
  }

  return <ResourcesListView {...listViewProps} />;
}

