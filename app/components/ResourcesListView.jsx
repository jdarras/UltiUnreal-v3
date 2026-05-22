import ResourceList from './ResourceList.jsx';
import ResourcesHeaderBar from './ResourcesHeaderBar.jsx';
import ResourcesAdvancedSearchPanel from './ResourcesAdvancedSearchPanel.jsx';
import ResourcesPaginationBar from './ResourcesPaginationBar.jsx';

const RESOURCE_SELECT_STYLE = { flex: '1 1 220px', minWidth: '200px', height: '36px' };

export default function ResourcesListView({
  t,
  query = '',
  setQuery,
  searchExpanded = false,
  setSearchExpanded,
  searchAdvanced,
  setSearchAdvanced,
  quickFilters,
  setQuickFilters,
  canClearSearch = false,
  compatDisabled = false,
  compatLabel = '',
  viewMode = 'thumbs',
  setViewMode,
  incompleteMsg = '',
  filteredResources = [],
  noneLabel = '',
  usageOptions = [],
  styleOptions = [],
  ambianceOptions = [],
  licenseOptions = [],
  typeOptions = [],
  distributionOptions = [],
  ueOptions = [],
  sellerOptions = [],
  epicAccountOptions = [],
  ratingValues = [],
  advancedInitial,
  setPage,
  totalPages = 1,
  currentPage = 0,
  canPrevPage = false,
  canNextPage = false,
  pageSize = 25,
  setPageSize,
  busy = false,
  visibleResources = [],
  onOpenDetail,
  onOpenExternal,
  onToggleFavorite,
  onTogglePurchased,
  onToggleTested,
  onAddKeyword,
  onSetUsage,
  onSetStyle,
  onSetAmbiance,
  onSetLicense,
  onSetQuality,
  onSetPerformance,
  usageValues = [],
  styleValues = [],
  ambianceValues = [],
  licenseValues = [],
  getThumbSrc,
  getThumbCandidates,
  toListString,
  normalizeValue,
  buildMetaLine,
  isUeIncompatible,
}) {
  return (
    <div className="uu-page uu-page-compact resources-page">
      <ResourcesHeaderBar
        t={t}
        query={query}
        onQueryChange={setQuery}
        onClear={() => {
          setQuery('');
          setSearchAdvanced(advancedInitial);
          setQuickFilters({ tested: false, favorite: false, compatibleOnly: false });
          setSearchExpanded(false);
        }}
        canClear={canClearSearch}
        onOpenAdvanced={() => setSearchExpanded(true)}
        quickFilters={quickFilters}
        onToggleTested={() => setQuickFilters((prev) => ({ ...prev, tested: !prev.tested }))}
        onToggleCompatibleOnly={() => setQuickFilters((prev) => ({ ...prev, compatibleOnly: !prev.compatibleOnly }))}
        onToggleFavorite={() => setQuickFilters((prev) => ({ ...prev, favorite: !prev.favorite }))}
        compatDisabled={compatDisabled}
        compatLabel={compatLabel}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        incompleteMsg={incompleteMsg}
      />

      {searchExpanded ? (
        <ResourcesAdvancedSearchPanel
          t={t}
          filteredCount={filteredResources.length}
          searchAdvanced={searchAdvanced}
          setSearchAdvanced={setSearchAdvanced}
          noneLabel={noneLabel}
          usageOptions={usageOptions}
          styleOptions={styleOptions}
          ambianceOptions={ambianceOptions}
          licenseOptions={licenseOptions}
          typeOptions={typeOptions}
          distributionOptions={distributionOptions}
          ueOptions={ueOptions}
          sellerOptions={sellerOptions}
          epicAccountOptions={epicAccountOptions}
          ratingValues={ratingValues}
          selectStyle={RESOURCE_SELECT_STYLE}
          onClose={() => {
            setSearchExpanded(false);
            setQuery('');
            setSearchAdvanced(advancedInitial);
          }}
        />
      ) : null}

      <div className={`uu-section mt-16 ${viewMode === 'thumbs' ? 'resources-thumbs-section' : ''}`}>
        {filteredResources.length > 0 ? (
          <ResourcesPaginationBar
            t={t}
            currentPage={currentPage}
            totalPages={totalPages}
            canPrevPage={canPrevPage}
            canNextPage={canNextPage}
            pageSize={pageSize}
            onPrev={() => setPage((prev) => Math.max(0, prev - 1))}
            onNext={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
            onPageSizeChange={setPageSize}
          />
        ) : null}
        {filteredResources.length === 0 ? (
          <div className="uu-muted mt-8">
            {busy ? t('common.loading') : t('resources.empty')}
          </div>
        ) : (
          <ResourceList
            items={visibleResources}
            viewMode={viewMode}
            onOpenDetail={onOpenDetail}
            onOpenExternal={onOpenExternal}
            onToggleFavorite={onToggleFavorite}
            onTogglePurchased={onTogglePurchased}
            onToggleTested={onToggleTested}
            onAddKeyword={onAddKeyword}
            onSetUsage={onSetUsage}
            onSetStyle={onSetStyle}
            onSetAmbiance={onSetAmbiance}
            onSetLicense={onSetLicense}
            onSetQuality={onSetQuality}
            onSetPerformance={onSetPerformance}
            usageOptions={usageValues}
            styleOptions={styleValues}
            ambianceOptions={ambianceValues}
            licenseOptions={licenseValues}
            getThumbSrc={getThumbSrc}
            getThumbCandidates={getThumbCandidates}
            toListString={toListString}
            normalizeValue={normalizeValue}
            buildMetaLine={buildMetaLine}
            isUeIncompatible={isUeIncompatible}
            t={t}
          />
        )}
      </div>
    </div>
  );
}
