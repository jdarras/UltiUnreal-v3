import { useEffect, useMemo, useState } from "react";
import {
  buildPermissionSummaryRows,
  countPermissionOverrides,
  createEmptyPermissionDraft,
  filterPermissionSummaryRows,
  normalizePermissionDraft,
} from "./projectPermissions/projectPermissionHelpers";
import { useUserProjectPermissionActions } from "./projectPermissions/useUserProjectPermissionActions";

function useUserProjectPermissions({
  t,
  canManageProjectPermissions = false,
  editorMode = "list",
  projectOptions = [],
  onLoadUserProjectPermissions = null,
  onUpdateUserProjectPermissions = null,
}) {
  const [projectPermissionsByRef, setProjectPermissionsByRef] = useState({});
  const [selectedPermissionProjectRef, setSelectedPermissionProjectRef] = useState("");
  const [permissionDraft, setPermissionDraft] = useState(() => createEmptyPermissionDraft());
  const [permissionLoading, setPermissionLoading] = useState(false);
  const [permissionSaving, setPermissionSaving] = useState(false);
  const [permissionError, setPermissionError] = useState("");
  const [permissionInfo, setPermissionInfo] = useState("");
  const [permissionTableSearch, setPermissionTableSearch] = useState("");
  const [permissionTableScope, setPermissionTableScope] = useState("all");

  useEffect(() => {
    if (editorMode !== "edit") return;
    if (!Array.isArray(projectOptions) || projectOptions.length === 0) {
      setSelectedPermissionProjectRef("");
      return;
    }
    const currentRef = String(selectedPermissionProjectRef || "").trim();
    if (currentRef && projectOptions.some((project) => project.ref === currentRef)) return;
    setSelectedPermissionProjectRef(String(projectOptions[0]?.ref || ""));
  }, [editorMode, projectOptions, selectedPermissionProjectRef]);

  useEffect(() => {
    if (editorMode !== "edit") return;
    const ref = String(selectedPermissionProjectRef || "").trim();
    if (!ref) {
      setPermissionDraft(createEmptyPermissionDraft());
      return;
    }
    const known = projectPermissionsByRef?.[ref] || null;
    setPermissionDraft(normalizePermissionDraft(known));
  }, [editorMode, selectedPermissionProjectRef, projectPermissionsByRef]);

  const selectedPermissionProject = useMemo(
    () => projectOptions.find((project) => project.ref === String(selectedPermissionProjectRef || "").trim()) || null,
    [projectOptions, selectedPermissionProjectRef]
  );

  const permissionSummaryRows = useMemo(
    () => buildPermissionSummaryRows(projectOptions, projectPermissionsByRef),
    [projectOptions, projectPermissionsByRef]
  );

  const permissionOverridesCount = useMemo(
    () => countPermissionOverrides(permissionSummaryRows),
    [permissionSummaryRows]
  );

  const filteredPermissionSummaryRows = useMemo(
    () => filterPermissionSummaryRows(permissionSummaryRows, permissionTableSearch, permissionTableScope),
    [permissionSummaryRows, permissionTableSearch, permissionTableScope]
  );

  const {
    resetPermissionState,
    loadUserProjectPermissions,
    submitProjectPermissions,
  } = useUserProjectPermissionActions({
    t,
    canManageProjectPermissions,
    projectOptions,
    selectedPermissionProjectRef,
    permissionDraft,
    onLoadUserProjectPermissions,
    onUpdateUserProjectPermissions,
    setProjectPermissionsByRef,
    setSelectedPermissionProjectRef,
    setPermissionDraft,
    setPermissionLoading,
    setPermissionSaving,
    setPermissionError,
    setPermissionInfo,
    setPermissionTableSearch,
    setPermissionTableScope,
  });

  return {
    projectPermissionsByRef,
    selectedPermissionProjectRef,
    setSelectedPermissionProjectRef,
    permissionDraft,
    setPermissionDraft,
    permissionLoading,
    permissionSaving,
    permissionError,
    setPermissionError,
    permissionInfo,
    setPermissionInfo,
    permissionTableSearch,
    setPermissionTableSearch,
    permissionTableScope,
    setPermissionTableScope,
    selectedPermissionProject,
    permissionSummaryRows,
    permissionOverridesCount,
    filteredPermissionSummaryRows,
    resetPermissionState,
    loadUserProjectPermissions,
    submitProjectPermissions,
  };
}

export { useUserProjectPermissions };
