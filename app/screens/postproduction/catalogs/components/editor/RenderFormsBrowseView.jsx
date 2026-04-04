import { safeT } from "../../../shared/helpers";
import { RenderFormsListPanel } from "../RenderFormsListPanel";
import { RenderFormsListToolbar } from "../RenderFormsListToolbar";

function RenderFormsBrowseView({
  t,
  renderFormsLoading = false,
  renderFormsError = "",
  canManageRenderTemplates = false,
  handleStartCreate = null,
  clearListFilters = null,
  preferences = {},
  listController = {},
  selectedProjectRef = "",
  onSelectProjectRef = null,
  startEdit = null,
}) {
  const {
    formsSortMode = "name_asc",
    formsSortDir = "asc",
    formsSearchQuery = "",
    formsFavoriteOnly = false,
    formsViewMode = "thumbs",
    formsSearchExpanded = false,
    formsSearchAdvanced = {},
    setSortFromSelect = null,
    setFormsSearchQuery = null,
    setFormsSearchExpanded = null,
    setFormsFavoriteOnly = null,
    setFormsViewMode = null,
    setFormsSearchAdvanced = null,
  } = preferences || {};
  const {
    normalizedProjectOptions = [],
    sortedForms = [],
    canClearFormsFilters = false,
    handleFormsListSort = null,
    formsSortArrowFor = null,
    isFormFavorite = null,
    toggleFormFavorite = null,
    formProjectLabel = null,
  } = listController || {};

  return (
    <>
      <RenderFormsListToolbar
        t={t}
        canManageRenderTemplates={canManageRenderTemplates}
        onStartCreate={handleStartCreate}
        formsSortMode={formsSortMode}
        formsSortDir={formsSortDir}
        onSortSelect={setSortFromSelect}
        formsSearchQuery={formsSearchQuery}
        onSearchChange={setFormsSearchQuery}
        onClearFilters={clearListFilters}
        canClearFormsFilters={canClearFormsFilters}
        onOpenAdvancedSearch={() => setFormsSearchExpanded?.(true)}
        formsFavoriteOnly={formsFavoriteOnly}
        onToggleFavoriteOnly={() => setFormsFavoriteOnly?.((prev) => !prev)}
        formsViewMode={formsViewMode}
        onViewModeChange={setFormsViewMode}
      />

      {renderFormsLoading ? <div className="uu-muted mt-8">{safeT(t, "common.loading", "Chargement…")}</div> : null}
      {renderFormsError ? <div className="uu-msg warn mt-8">{renderFormsError}</div> : null}

      <RenderFormsListPanel
        t={t}
        formsSearchExpanded={formsSearchExpanded}
        onCloseAdvancedSearch={() => setFormsSearchExpanded?.(false)}
        sortedForms={sortedForms}
        selectedProjectRef={selectedProjectRef}
        normalizedProjectOptions={normalizedProjectOptions}
        onSelectProjectRef={onSelectProjectRef}
        formsSearchAdvanced={formsSearchAdvanced}
        onFormsSearchAdvancedChange={(patch) => {
          setFormsSearchAdvanced?.((prev) => ({ ...(prev || {}), ...(patch || {}) }));
        }}
        formsViewMode={formsViewMode}
        onSortColumn={handleFormsListSort}
        formsSortArrowFor={formsSortArrowFor}
        isFormFavorite={isFormFavorite}
        onToggleFormFavorite={toggleFormFavorite}
        formProjectLabel={formProjectLabel}
        onEditForm={startEdit}
      />
    </>
  );
}

export { RenderFormsBrowseView };
