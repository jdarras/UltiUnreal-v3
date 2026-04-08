import { safeT } from "../../../shared/helpers";

function TaskEditorAutoConfigFields({
  t,
  tasksLoading = false,
  normalizedProjectOptions = [],
  autoRenderProjectRef = "",
  onChangeAutoRenderProject = null,
  filteredAutoRenderForms = [],
  autoRenderFormId = "",
  onChangeAutoRenderForm = null,
  renderFormsLoading = false,
  renderFormsError = "",
  canManageRenderTemplates = false,
  renderTemplatesForSelectedAutoForm = [],
  autoRenderTemplateId = "",
  onChangeAutoRenderTemplate = null,
  autoRenderProjectCatalogLoading = false,
  autoRenderProjectCatalogError = "",
  selectedAutoRenderForm = null,
  autoRenderWorkerKey = "",
  onChangeAutoRenderWorker = null,
  availableRenderWorkers = [],
  renderWorkersLoading = false,
  renderWorkersError = "",
  autoRenderLaunchMode = "scheduled",
  onChangeAutoRenderLaunchMode = null,
  isEditingTask = false,
}) {
  return (
    <>
      <div className="uu-grid-2 mt-12">
        <div className="uu-grid-field">
          <div className="uu-row uu-gap-8" style={{ alignItems: "center" }}>
            <label className="uu-label" style={{ width: "140px", marginBottom: 0 }}>
              {safeT(t, "postprod.tasks.form.autoRenderProjectSelect", "Projet")}
            </label>
            <div style={{ flex: 1, minWidth: 0 }}>
              <select
                className="uu-input"
                value={autoRenderProjectRef}
                disabled={tasksLoading || normalizedProjectOptions.length <= 0}
                onChange={(e) => onChangeAutoRenderProject?.(String(e.target.value || "").trim())}
              >
                <option value="">{safeT(t, "postprod.tasks.form.autoRenderProjectSelect.none", "Selectionner un projet")}</option>
                {normalizedProjectOptions.map((entry) => (
                  <option key={`task-auto-render-project-${entry.ref}`} value={entry.ref}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {!tasksLoading && normalizedProjectOptions.length <= 0 ? (
            <div className="uu-msg info mt-8">
              {safeT(
                t,
                "postprod.tasks.form.autoRenderProjectSelect.empty",
                "Aucun projet en mode rendu automatique. Active ce mode dans le detail projet."
              )}
            </div>
          ) : null}
        </div>
        <div className="uu-grid-field">
          <div className="uu-row uu-gap-8" style={{ alignItems: "center" }}>
            <label className="uu-label" style={{ width: "140px", marginBottom: 0 }}>
              {safeT(t, "postprod.tasks.form.autoRenderFormShort", "Formulaire")}
            </label>
            <div style={{ flex: 1, minWidth: 0 }}>
              <select
                className="uu-input"
                value={autoRenderFormId}
                disabled={tasksLoading || !autoRenderProjectRef || filteredAutoRenderForms.length <= 0}
                onChange={(e) => onChangeAutoRenderForm?.(String(e.target.value || "").trim())}
              >
                <option value="">{safeT(t, "postprod.tasks.form.autoRenderForm.none", "Selectionner un formulaire")}</option>
                {filteredAutoRenderForms.map((entry) => (
                  <option key={`task-auto-render-form-${Number(entry?.id || 0)}`} value={String(entry?.id || "")}>
                    {String(entry?.name || `#${Number(entry?.id || 0)}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {renderFormsLoading ? (
            <div className="uu-muted mt-8">{safeT(t, "postprod.tasks.form.autoRenderForm.loadingCatalog", "Chargement des formulaires...")}</div>
          ) : null}
          {!renderFormsLoading && renderFormsError ? (
            <div className="uu-msg warn mt-8">{renderFormsError}</div>
          ) : null}
          {!renderFormsLoading && !renderFormsError && !!autoRenderProjectRef && filteredAutoRenderForms.length <= 0 ? (
            <div className="uu-msg info mt-8">
              {canManageRenderTemplates
                ? safeT(
                    t,
                    "postprod.tasks.form.autoRenderForm.empty",
                    "Aucun formulaire pour ce projet. Cree un formulaire dans l'onglet Formulaire."
                  )
                : safeT(
                    t,
                    "postprod.tasks.form.autoRenderForm.emptyReadOnly",
                    "Aucun formulaire pour ce projet. Contacte un profil autorise pour le creer."
                  )}
            </div>
          ) : null}
        </div>
      </div>
      <div className="uu-grid-2 mt-12">
        <div className="uu-grid-field">
          <div className="uu-row uu-gap-8" style={{ alignItems: "center" }}>
            <label className="uu-label" style={{ width: "140px", marginBottom: 0 }}>
              {safeT(t, "postprod.tasks.form.renderPreset", "Preset de rendu")}
            </label>
            <div style={{ flex: 1, minWidth: 0 }}>
              <select
                className="uu-input"
                value={autoRenderTemplateId}
                disabled={tasksLoading || !autoRenderProjectRef || renderTemplatesForSelectedAutoForm.length <= 0}
                onChange={(e) => onChangeAutoRenderTemplate?.(String(e.target.value || "").trim())}
              >
                <option value="">{safeT(t, "postprod.tasks.form.renderMode.none", "Selectionner un mode de rendu")}</option>
                {renderTemplatesForSelectedAutoForm.map((entry) => (
                  <option key={`task-auto-render-template-${String(entry?.key || entry?.id || "")}`} value={String(entry?.key || "")}>
                    {String(entry.label || entry.templateName || entry.outputProfile || `#${entry.id}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {autoRenderProjectCatalogLoading ? (
            <div className="uu-muted mt-8">
              {safeT(t, "postprod.tasks.form.renderMode.loading", "Chargement des modes de rendu...")}
            </div>
          ) : null}
          {!autoRenderProjectCatalogLoading && autoRenderProjectCatalogError ? (
            <div className="uu-msg warn mt-8">{autoRenderProjectCatalogError}</div>
          ) : null}
          {selectedAutoRenderForm && !autoRenderProjectCatalogLoading && !autoRenderProjectCatalogError && renderTemplatesForSelectedAutoForm.length <= 0 ? (
            <div className="uu-msg info mt-8">
              {safeT(
                t,
                "postprod.tasks.form.renderMode.empty",
                "Aucun mode de rendu disponible pour ce projet. Cree un preset de rendu dans le projet."
              )}
            </div>
          ) : null}
        </div>
        <div className="uu-grid-field">
          <div className="uu-row uu-gap-8" style={{ alignItems: "center" }}>
            <label className="uu-label" style={{ width: "140px", marginBottom: 0 }}>
              {safeT(t, "postprod.tasks.form.autoRenderWorker", "Station de rendu")}
            </label>
            <div style={{ flex: 1, minWidth: 0 }}>
              <select
                className="uu-input"
                value={autoRenderWorkerKey}
                disabled={tasksLoading}
                onChange={(e) => onChangeAutoRenderWorker?.(String(e.target.value || "").trim())}
              >
                <option value="">{safeT(t, "postprod.tasks.form.autoRenderWorker.auto", "Auto (dispatcher)")}</option>
                {availableRenderWorkers.map((worker) => (
                  <option key={`task-auto-render-worker-${worker.workerKey}`} value={worker.workerKey}>
                    {worker.displayName || worker.workerKey}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {renderWorkersLoading ? (
            <div className="uu-muted mt-8">
              {safeT(t, "postprod.tasks.form.autoRenderWorker.loading", "Chargement des stations de rendu...")}
            </div>
          ) : null}
          {!renderWorkersLoading && renderWorkersError ? (
            <div className="uu-msg warn mt-8">{renderWorkersError}</div>
          ) : null}
        </div>
      </div>
      <div className="uu-grid-2 mt-12">
        <div className="uu-grid-field">
          <div className="uu-row uu-gap-8" style={{ alignItems: "center" }}>
            <label className="uu-label" style={{ width: "140px", marginBottom: 0 }}>
              {safeT(t, "postprod.tasks.form.autoRenderLaunchMode", "Mode de lancement")}
            </label>
            <div style={{ flex: 1, minWidth: 0 }}>
              <select
                className="uu-input"
                value={autoRenderLaunchMode}
                disabled={tasksLoading || isEditingTask}
                onChange={(e) => onChangeAutoRenderLaunchMode?.(String(e.target.value || "scheduled"))}
              >
                <option value="scheduled">
                  {safeT(t, "postprod.tasks.form.autoRenderLaunchMode.scheduled", "Programmer (lancer plus tard)")}
                </option>
                <option value="now" disabled={isEditingTask}>
                  {safeT(t, "postprod.tasks.form.autoRenderLaunchMode.now", "Créer et lancer maintenant")}
                </option>
              </select>
            </div>
          </div>
        </div>
        <div />
      </div>
    </>
  );
}

export { TaskEditorAutoConfigFields };
