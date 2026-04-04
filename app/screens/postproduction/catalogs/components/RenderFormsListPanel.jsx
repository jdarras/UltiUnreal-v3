import { safeT } from "../../shared/helpers";
import { RenderFormsAdvancedSearchPanel } from "./formsList/RenderFormsAdvancedSearchPanel";
import { RenderFormsTableView } from "./formsList/RenderFormsTableView";
import { RenderFormsThumbsView } from "./formsList/RenderFormsThumbsView";

function RenderFormsListPanel({
  t,
  formsSearchExpanded = false,
  onCloseAdvancedSearch = null,
  sortedForms = [],
  selectedProjectRef = "",
  normalizedProjectOptions = [],
  onSelectProjectRef = null,
  formsSearchAdvanced = null,
  onFormsSearchAdvancedChange = null,
  formsViewMode = "thumbs",
  onSortColumn = null,
  formsSortArrowFor = null,
  isFormFavorite = null,
  onToggleFormFavorite = null,
  formProjectLabel = null,
  onEditForm = null,
}) {
  return (
    <div className="uu-card mt-12">
      {formsSearchExpanded ? (
        <RenderFormsAdvancedSearchPanel
          t={t}
          sortedForms={sortedForms}
          selectedProjectRef={selectedProjectRef}
          normalizedProjectOptions={normalizedProjectOptions}
          onSelectProjectRef={onSelectProjectRef}
          formsSearchAdvanced={formsSearchAdvanced}
          onFormsSearchAdvancedChange={onFormsSearchAdvancedChange}
          onClose={onCloseAdvancedSearch}
        />
      ) : null}
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
          onEditForm={onEditForm}
        />
      ) : (
        <RenderFormsThumbsView
          t={t}
          sortedForms={sortedForms}
          isFormFavorite={isFormFavorite}
          onToggleFormFavorite={onToggleFormFavorite}
          formProjectLabel={formProjectLabel}
          onEditForm={onEditForm}
        />
      )}
    </div>
  );
}

export { RenderFormsListPanel };
