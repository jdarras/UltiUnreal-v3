import { useCallback } from 'react';

export function useProjectsServerUiHandlers({
  createInitialAdvanced,
  formProjectPath,
  totalPages,
  setFavoriteOnly,
  setSearchQuery,
  setSearchAdvanced,
  setSearchExpanded,
  setForm,
  getUprojectDialogDefaultPath,
  normPath,
  setPage,
  setPageSize,
}) {
  const handleToggleFavoriteFilter = useCallback(() => {
    setFavoriteOnly((prev) => !prev);
  }, [setFavoriteOnly]);

  const handleSearchClear = useCallback(() => {
    setSearchQuery('');
    setFavoriteOnly(false);
    setSearchAdvanced(createInitialAdvanced());
    setSearchExpanded(false);
  }, [createInitialAdvanced, setFavoriteOnly, setSearchAdvanced, setSearchExpanded, setSearchQuery]);

  const handleOpenAdvancedSearch = useCallback(() => {
    setSearchExpanded(true);
  }, [setSearchExpanded]);

  const handleBrowseProjectPath = useCallback(async () => {
    let file = await window.electron?.chooseUproject?.({
      defaultPath: getUprojectDialogDefaultPath(formProjectPath),
    });
    if (file && typeof file === 'object') {
      file = file.file || file.path || (Array.isArray(file) ? file[0] : '');
    }
    if (file) {
      setForm((f) => ({ ...f, projectPath: normPath(file) }));
    }
  }, [formProjectPath, getUprojectDialogDefaultPath, normPath, setForm]);

  const handleCloseAdvancedSearch = useCallback(() => {
    setSearchExpanded(false);
    setSearchQuery('');
    setSearchAdvanced(createInitialAdvanced());
  }, [createInitialAdvanced, setSearchAdvanced, setSearchExpanded, setSearchQuery]);

  const handlePrevPage = useCallback(() => {
    setPage((p) => Math.max(0, p - 1));
  }, [setPage]);

  const handleNextPage = useCallback(() => {
    setPage((p) => Math.min(totalPages - 1, p + 1));
  }, [setPage, totalPages]);

  const handlePageSizeChange = useCallback((nextPageSize) => {
    setPageSize(nextPageSize);
  }, [setPageSize]);

  return {
    handleToggleFavoriteFilter,
    handleSearchClear,
    handleOpenAdvancedSearch,
    handleBrowseProjectPath,
    handleCloseAdvancedSearch,
    handlePrevPage,
    handleNextPage,
    handlePageSizeChange,
  };
}
