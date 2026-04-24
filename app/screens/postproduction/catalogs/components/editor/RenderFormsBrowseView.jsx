import { useState } from "react";
import { safeT } from "../../../shared/helpers";
import { RenderFormsConfirmDialog } from "../RenderFormsConfirmDialog";
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
  selectedProjectRef: _selectedProjectRef = "",
  onSelectProjectRef: _onSelectProjectRef = null,
  startEdit = null,
  onDeleteRenderForm = null,
  onNavigateToProject = null,
}) {
  const [formToDelete, setFormToDelete] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
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
    visibleForms = [],
    sortedForms = [],
    canClearFormsFilters = false,
    handleFormsListSort = null,
    formsSortArrowFor = null,
    isFormFavorite = null,
    toggleFormFavorite = null,
    formProjectLabel = null,
    formProjectId = null,
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
        visibleForms={visibleForms}
        normalizedProjectOptions={normalizedProjectOptions}
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
        formProjectId={formProjectId}
        onEditForm={startEdit}
        onDeleteForm={canManageRenderTemplates ? setFormToDelete : null}
        onNavigateToProject={onNavigateToProject}
      />

      <RenderFormsConfirmDialog
        t={t}
        open={formToDelete !== null}
        title={safeT(t, "postprod.data.forms.deleteDialog.title", "Confirmation")}
        message={safeT(
          t,
          "postprod.data.forms.deleteDialog.message",
          "Supprimer ce formulaire ? Cette action est irreversible."
        )}
        busy={deleteBusy}
        cancelLabel={safeT(t, "common.cancel", "Annuler")}
        confirmLabel={deleteBusy ? safeT(t, "common.loading", "Chargement…") : safeT(t, "common.delete", "Supprimer")}
        onCancel={() => { if (!deleteBusy) setFormToDelete(null); }}
        onConfirm={async () => {
          if (!formToDelete || typeof onDeleteRenderForm !== "function") return;
          setDeleteBusy(true);
          try {
            await onDeleteRenderForm(Number(formToDelete.id));
          } finally {
            setDeleteBusy(false);
            setFormToDelete(null);
          }
        }}
      />
    </>
  );
}

export { RenderFormsBrowseView };
