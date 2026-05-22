import ResourcesDetailHeader from './ResourcesDetailHeader.jsx';
import ResourcesDetailHeroCard from './ResourcesDetailHeroCard.jsx';
import ResourcesDetailIndexationCard from './ResourcesDetailIndexationCard.jsx';
import ResourcesDetailGallery from './ResourcesDetailGallery.jsx';
import ResourcesDetailInfoCard from './ResourcesDetailInfoCard.jsx';
import ResourcesDetailVendorDescriptionCard from './ResourcesDetailVendorDescriptionCard.jsx';
import ResourcesDetailLightbox from './ResourcesDetailLightbox.jsx';
import ResourcesDeleteConfirmDialog from './ResourcesDeleteConfirmDialog.jsx';

export default function ResourcesDetailView({
  t,
  detailTitle = '',
  detailUid = '',
  detailItem = null,
  onBack,
  onOpenFab,
  deleteConfirmTriggerRef = null,
  onOpenDeleteConfirm,
  detailDeleteBusy = false,
  detailHasNav = false,
  onStepDetail,
  heroNavAvailable = false,
  onStepHero,
  detailHeroSrc = '',
  heroActiveIndex = -1,
  onOpenLightboxAt,
  onImageContextMenu,
  galleryItemsLength = 0,
  setHeroIndex,
  detailDraft,
  setDetailDraft,
  noneLabel = '',
  usageOptions = [],
  styleOptions = [],
  ambianceOptions = [],
  licenseOptions = [],
  detailBusy = false,
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
  galleryBlockItems = [],
  detailInfoLines = [],
  vendorDescription = '',
  lightboxOpen = false,
  lightboxItems = [],
  lightboxIndex = 0,
  onCloseLightbox,
  onStepLightbox,
  deleteConfirmOpen = false,
  onCloseDeleteConfirm,
  deleteConfirmOkRef = null,
}) {
  return (
    <div className="uu-page uu-page-compact resources-page">
      <ResourcesDetailHeader
        t={t}
        detailTitle={detailTitle}
        detailUid={detailItem?.uid ? String(detailItem.uid) : ''}
        hasListingUrl={!!detailItem?.listingUrl}
        onBack={onBack}
        onOpenFab={onOpenFab}
        deleteConfirmTriggerRef={deleteConfirmTriggerRef}
        onOpenDeleteConfirm={onOpenDeleteConfirm}
        detailDeleteBusy={detailDeleteBusy}
      />

      <div className="uu-section mt-16 uu-col uu-gap-16">
        <ResourcesDetailHeroCard
          t={t}
          detailHasNav={detailHasNav}
          onStepDetail={onStepDetail}
          heroNavAvailable={heroNavAvailable}
          onStepHero={onStepHero}
          detailHeroSrc={detailHeroSrc}
          detailTitle={detailTitle}
          heroActiveIndex={heroActiveIndex}
          onOpenLightboxAt={onOpenLightboxAt}
          onImageContextMenu={onImageContextMenu}
          galleryItemsLength={galleryItemsLength}
          setHeroIndex={setHeroIndex}
        />

        <ResourcesDetailIndexationCard
          t={t}
          detailDraft={detailDraft}
          setDetailDraft={setDetailDraft}
          noneLabel={noneLabel}
          usageOptions={usageOptions}
          styleOptions={styleOptions}
          ambianceOptions={ambianceOptions}
          licenseOptions={licenseOptions}
          detailBusy={detailBusy}
          detailUid={detailUid}
          setResourceFavoriteLocal={setResourceFavoriteLocal}
          detailNoteRef={detailNoteRef}
          detailNoteDirtyRef={detailNoteDirtyRef}
          detailNoteFocusedRef={detailNoteFocusedRef}
          tagInput={tagInput}
          setTagInput={setTagInput}
          detailTagsRef={detailTagsRef}
          handleTagInputKeyDown={handleTagInputKeyDown}
          addTagToDraft={addTagToDraft}
          detailTagsList={detailTagsList}
          removeTagFromDraft={removeTagFromDraft}
        />

        <ResourcesDetailGallery
          t={t}
          items={galleryBlockItems}
          detailTitle={detailTitle}
          onOpenLightboxAt={onOpenLightboxAt}
          onImageContextMenu={onImageContextMenu}
        />

        <ResourcesDetailInfoCard
          t={t}
          rows={detailInfoLines}
        />

        <ResourcesDetailVendorDescriptionCard
          t={t}
          text={vendorDescription}
        />
      </div>

      <ResourcesDetailLightbox
        open={lightboxOpen}
        items={lightboxItems}
        index={lightboxIndex}
        title={detailTitle}
        onClose={onCloseLightbox}
        onStep={onStepLightbox}
        onImageContextMenu={onImageContextMenu}
      />
      <ResourcesDeleteConfirmDialog
        t={t}
        open={deleteConfirmOpen}
        busy={detailDeleteBusy}
        detailTitle={detailTitle}
        detailUid={detailUid}
        onCancel={() => onCloseDeleteConfirm?.(false)}
        onConfirm={() => onCloseDeleteConfirm?.(true)}
        confirmRef={deleteConfirmOkRef}
        overlayZIndex={2200}
      />
    </div>
  );
}
