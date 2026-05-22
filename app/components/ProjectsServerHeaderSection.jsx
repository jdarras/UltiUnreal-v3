import React, { Suspense } from 'react';

const ProjectsHeaderBar = React.lazy(() => import('./ProjectsHeaderBar'));
const ProjectForm = React.lazy(() => import('./ProjectForm'));

export default function ProjectsServerHeaderSection({
  formVisible,
  fallback,
  t,
  sortMode,
  onSortChange,
  searchQuery,
  favoriteOnly,
  onToggleFavoriteFilter,
  onSearchChange,
  onSearchClear,
  canClear,
  onAdvanced,
  viewMode,
  onViewChange,
  onAdd,
  canAdd,
  form,
  setForm,
  formError,
  onSubmit,
  onCancel,
  editingIndex,
  noteRef,
  normalizePath,
  clearFormError,
  onBrowse,
}) {
  return (
    <div className="uu-section">
      {!formVisible && (
        <Suspense fallback={fallback}>
          <ProjectsHeaderBar
            t={t}
            sortMode={sortMode}
            onSortChange={(val) => onSortChange(val)}
            searchQuery={searchQuery}
            favoriteOnly={favoriteOnly}
            onToggleFavoriteFilter={onToggleFavoriteFilter}
            onSearchChange={onSearchChange}
            onSearchClear={onSearchClear}
            canClear={canClear}
            onAdvanced={onAdvanced}
            viewMode={viewMode}
            onViewChange={onViewChange}
            onAdd={onAdd}
            canAdd={canAdd}
          />
        </Suspense>
      )}

      {formVisible && (
        <Suspense fallback={fallback}>
          <ProjectForm
            t={t}
            form={form}
            setForm={setForm}
            formError={formError}
            onSubmit={onSubmit}
            onCancel={onCancel}
            editingIndex={editingIndex}
            noteRef={noteRef}
            normalizePath={normalizePath}
            clearFormError={clearFormError}
            onBrowse={onBrowse}
          />
        </Suspense>
      )}
    </div>
  );
}
