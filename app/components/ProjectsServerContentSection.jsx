import React, { Suspense } from 'react';

const ProjectsAdvancedSearchPanel = React.lazy(() => import('./ProjectsAdvancedSearchPanel'));
const ProjectsPaginationBar = React.lazy(() => import('./ProjectsPaginationBar'));
const ProjectsContentView = React.lazy(() => import('./ProjectsContentView'));

export default function ProjectsServerContentSection({
  t,
  fallback,
  searchExpanded,
  filteredCount,
  searchAdvanced,
  setSearchAdvanced,
  noneLabel,
  engineVersionOptions,
  directorOptions,
  technicianOptions,
  operatorOptions,
  journalistOptions,
  onCloseAdvanced,
  projectsCount,
  currentPage,
  totalPages,
  canPrevPage,
  canNextPage,
  pageSize,
  onPrevPage,
  onNextPage,
  onPageSizeChange,
  projectsLoading,
  viewMode,
  projectViewCommonProps,
  integrationMsg,
  removeOne,
  sortMode,
  sortDir,
  onSort,
}) {
  return (
    <>
      {searchExpanded && (
        <Suspense fallback={fallback}>
          <ProjectsAdvancedSearchPanel
            t={t}
            filteredCount={filteredCount}
            searchAdvanced={searchAdvanced}
            setSearchAdvanced={setSearchAdvanced}
            noneLabel={noneLabel}
            engineVersionOptions={engineVersionOptions}
            directorOptions={directorOptions}
            technicianOptions={technicianOptions}
            operatorOptions={operatorOptions}
            journalistOptions={journalistOptions}
            onClose={onCloseAdvanced}
          />
        </Suspense>
      )}

      <div className=" ">
        {projectsCount > 0 && (
          <Suspense fallback={fallback}>
            <ProjectsPaginationBar
              t={t}
              currentPage={currentPage}
              totalPages={totalPages}
              canPrevPage={canPrevPage}
              canNextPage={canNextPage}
              pageSize={pageSize}
              onPrev={onPrevPage}
              onNext={onNextPage}
              onPageSizeChange={onPageSizeChange}
            />
          </Suspense>
        )}

        <Suspense fallback={fallback}>
          <ProjectsContentView
            t={t}
            projectsCount={projectsCount}
            projectsLoading={projectsLoading}
            viewMode={viewMode}
            fallback={fallback}
            projectViewCommonProps={projectViewCommonProps}
            integrationMsg={integrationMsg}
            removeOne={removeOne}
            sortMode={sortMode}
            sortDir={sortDir}
            onSort={onSort}
          />
        </Suspense>
      </div>
    </>
  );
}
