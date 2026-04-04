import { useEffect, useMemo, useState } from "react";
import { safeT } from "../shared/helpers";
import { RenderFormsEditorCard } from "./RenderFormsEditorCard";

function DatasCard({
  t,
  projects = [],
  projectsLoading = false,
  projectsError = "",
  renderForms = [],
  renderFormsLoading = false,
  renderFormsError = "",
  canManageRenderTemplates = false,
  onCreateRenderForm = null,
  onUpdateRenderForm = null,
  onDeleteRenderForm = null,
  onLoadProjectWrcFields = null,
  onLoadProjectUnrealCatalog = null,
  onLoadRenderFormFields = null,
  onReplaceRenderFormFields = null,
}) {
  const [selectedProjectRef, setSelectedProjectRef] = useState("");

  const normalizedProjects = useMemo(() => {
    const list = Array.isArray(projects) ? projects : [];
    return list
      .map((project) => ({
        ref: String(project?.id || project?.name || "").trim(),
        id: String(project?.id || "").trim(),
        name: String(project?.name || "").trim(),
        code: String(project?.code || "").trim(),
        usageMode: String(project?.usageMode || project?.metaUsageMode || "").trim(),
      }))
      .filter(
        (project) =>
          project.ref
          && (
            project.usageMode === "auto_render"
            || project.usageMode === "live_auto_render"
          )
      )
      .sort((a, b) => String(a?.name || a?.id || "").localeCompare(String(b?.name || b?.id || "")));
  }, [projects]);

  useEffect(() => {
    if (!Array.isArray(normalizedProjects) || normalizedProjects.length === 0) {
      setSelectedProjectRef("");
      return;
    }
    const hasCurrent = normalizedProjects.some((project) => project.ref === selectedProjectRef);
    if (hasCurrent) return;
    setSelectedProjectRef(String(normalizedProjects[0]?.ref || ""));
  }, [normalizedProjects, selectedProjectRef]);

  return (
    <section className="uu-section">
      <RenderFormsEditorCard
        t={t}
        selectedProjectRef={selectedProjectRef}
        projectOptions={normalizedProjects}
        onSelectProjectRef={(value) => setSelectedProjectRef(String(value || ""))}
        renderForms={renderForms}
        renderFormsLoading={renderFormsLoading}
        renderFormsError={renderFormsError}
        canManageRenderTemplates={canManageRenderTemplates}
        onCreateRenderForm={onCreateRenderForm}
        onUpdateRenderForm={onUpdateRenderForm}
        onDeleteRenderForm={onDeleteRenderForm}
        onLoadProjectWrcFields={onLoadProjectWrcFields}
        onLoadProjectUnrealCatalog={onLoadProjectUnrealCatalog}
        onLoadRenderFormFields={onLoadRenderFormFields}
        onReplaceRenderFormFields={onReplaceRenderFormFields}
      />

      {projectsLoading ? (
        <div className="uu-muted mt-12">{safeT(t, "postprod.projects.loading", "Chargement des projets...")}</div>
      ) : null}
      {!projectsLoading && projectsError ? <div className="uu-msg warn mt-12">{projectsError}</div> : null}
      {!projectsLoading && !projectsError && normalizedProjects.length === 0 ? (
        <div className="uu-muted mt-12">
          {safeT(
            t,
            "postprod.data.empty.autoRenderProjects",
            "Aucun projet en mode rendu automatique."
          )}
        </div>
      ) : null}
    </section>
  );
}

export { DatasCard };

