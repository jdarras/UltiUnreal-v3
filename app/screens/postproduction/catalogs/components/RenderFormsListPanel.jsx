import { safeT } from "../../shared/helpers";
import { RenderFormsAdvancedSearchPanel } from "./formsList/RenderFormsAdvancedSearchPanel";
import { RenderFormsTableView } from "./formsList/RenderFormsTableView";
import { RenderFormsThumbsView } from "./formsList/RenderFormsThumbsView";

function RenderFormsListPanel({
  t,
  formsSearchExpanded = false,
  onCloseAdvancedSearch = null,
  sortedForms = [],
  visibleForms = [],
  normalizedProjectOptions = [],
  formsSearchAdvanced = null,
  onFormsSearchAdvancedChange = null,
  formsViewMode = "thumbs",
  onSortColumn = null,
  formsSortArrowFor = null,
  isFormFavorite = null,
  onToggleFormFavorite = null,
  formProjectLabel = null,
  formProjectId = null,
  onEditForm = null,
  onDeleteForm = null,
  onNavigateToProject = null,
}) {
  return (
    <>
      {formsSearchExpanded ? (
        <div className="uu-card mt-12">
          <RenderFormsAdvancedSearchPanel
            t={t}
            sortedForms={sortedForms}
            visibleForms={visibleForms}
            normalizedProjectOptions={normalizedProjectOptions}
            formsSearchAdvanced={formsSearchAdvanced}
            onFormsSearchAdvancedChange={onFormsSearchAdvancedChange}
            onClose={onCloseAdvancedSearch}
          />
        </div>
      ) : null}
    <div className="uu-card mt-12">
      {sortedForms.length <= 0 ? (
        <div className="uu-muted">{safeT(t, "postprod.data.forms.empty", "Aucun formulaire pour ce projet.")}</div>
      ) : formsViewMode === "list" ? (
        <RenderFormsTableView
          t={t}
          sortedForms={sortedForms}
          onSortColumn={onSortColumn}
          formsSortArrowFor={formsSortArrowFor}
          isFormFavorite={isFormFavorite}
          onToggleFormFavorite={onToggleFormFavorite}
          formProjectLabel={formProjectLabel}
          formProjectId={formProjectId}
          onEditForm={onEditForm}
          onDeleteForm={onDeleteForm}
          onNavigateToProject={onNavigateToProject}
        />
      ) : (
        <RenderFormsThumbsView
          t={t}
          sortedForms={sortedForms}
          isFormFavorite={isFormFavorite}
          onToggleFormFavorite={onToggleFormFavorite}
          formProjectLabel={formProjectLabel}
          formProjectId={formProjectId}
          onEditForm={onEditForm}
          onDeleteForm={onDeleteForm}
          onNavigateToProject={onNavigateToProject}
        />
      )}
    </div>
    </>
  );
}

export { RenderFormsListPanel };
