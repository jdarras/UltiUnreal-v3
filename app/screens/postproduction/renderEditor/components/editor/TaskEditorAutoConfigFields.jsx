import { safeT } from "../../../shared/helpers";
import { useEffect, useRef, useState } from "react";
import DateTimeConfirmPicker from "../../../../../components/DateTimeConfirmPicker";

const WARN_SOON_MS = 5 * 60 * 1000;

function resolveDatetimeBadge(scheduledAt) {
  if (!scheduledAt) return null;
  const d = new Date(scheduledAt);
  if (isNaN(d.getTime())) return null;
  const diff = d.getTime() - Date.now();
  if (diff <= 0) return "error";
  if (diff < WARN_SOON_MS) return "warn";
  return null;
}

// Calcule la valeur fusionnée à partir des deux states séparés
function getMergedMode(launchMode, scheduledMode) {
  if (launchMode === "now") return "now";
  if (launchMode === "scheduled") {
    if (scheduledMode === "any_station" || scheduledMode === "specific_station" || scheduledMode === "datetime") {
      return scheduledMode;
    }
  }
  return "";
}

function LaunchModeSection({
  t,
  tasksLoading = false,
  autoRenderLaunchMode = "",
  onChangeAutoRenderLaunchMode = null,
  autoRenderScheduledMode = "",
  onChangeAutoRenderScheduledMode = null,
  autoRenderScheduledAt = "",
  onChangeAutoRenderScheduledAt = null,
  autoRenderWorkerKey = "",
  onChangeAutoRenderWorker = null,
  dedupedRemoteStations = [],
  renderWorkersLoading = false,
  renderWorkersError = "",
  hasAvailableNowStation = true,
}) {
  const [badge, setBadge] = useState(() => resolveDatetimeBadge(autoRenderScheduledAt));
  const intervalRef = useRef(null);

  useEffect(() => {
    setBadge(resolveDatetimeBadge(autoRenderScheduledAt));
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (autoRenderLaunchMode === "scheduled" && autoRenderScheduledMode === "datetime" && autoRenderScheduledAt) {
      intervalRef.current = setInterval(() => {
        setBadge(resolveDatetimeBadge(autoRenderScheduledAt));
      }, 30000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRenderLaunchMode, autoRenderScheduledMode, autoRenderScheduledAt]);

  const mergedMode = getMergedMode(autoRenderLaunchMode, autoRenderScheduledMode);

  const handleMergedChange = (value) => {
    if (value === "now") {
      onChangeAutoRenderLaunchMode?.("now");
      onChangeAutoRenderScheduledMode?.("");
    } else if (value === "any_station" || value === "specific_station" || value === "datetime") {
      onChangeAutoRenderLaunchMode?.("scheduled");
      onChangeAutoRenderScheduledMode?.(value);
    } else {
      onChangeAutoRenderLaunchMode?.("");
      onChangeAutoRenderScheduledMode?.("");
    }
  };

  const showDatetimePicker = mergedMode === "datetime";
  const showStation = mergedMode !== "";
  const stationReadOnly = mergedMode === "any_station";
  const showAutoOption = mergedMode === "now" || mergedMode === "datetime" || mergedMode === "any_station";

  const stationField = showStation ? (
    <div className="uu-grid-field">
      <div className="uu-row uu-gap-8" style={{ alignItems: "center" }}>
        <label className="uu-label" style={{ width: "140px", marginBottom: 0 }}>
          {safeT(t, "postprod.tasks.form.autoRenderWorker", "Station de rendu")}
        </label>
        <div style={{ flex: 1, minWidth: 0 }}>
          <select
            className="uu-input"
            value={stationReadOnly ? "auto" : autoRenderWorkerKey}
            disabled={tasksLoading || stationReadOnly}
            onChange={(e) => onChangeAutoRenderWorker?.(String(e.target.value || "").trim())}
          >
            {showAutoOption ? (
              <option value="auto">{safeT(t, "postprod.tasks.form.autoRenderWorker.auto", "Auto (dispatcher)")}</option>
            ) : null}
            {dedupedRemoteStations.map((station) => {
              const avail = station.renderAvailability;
              const suffix = avail === 'busy'
                ? ` (${safeT(t, "renderAvailability.busy", "occupée")})`
                : !station.isOnline
                  ? ` (${safeT(t, "renderAvailability.offline", "hors ligne")})`
                  : "";
              return (
                <option key={`task-auto-render-worker-${station.key}`} value={station.key}>
                  {station.name}{suffix}
                </option>
              );
            })}
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
      {!renderWorkersLoading && !renderWorkersError && !showAutoOption && dedupedRemoteStations.length === 0 ? (
        <div className="uu-muted mt-8">
          {safeT(t, "postprod.tasks.form.autoRenderWorker.noRemote", "Aucune station distante disponible.")}
        </div>
      ) : null}
    </div>
  ) : <div />;

  return (
    <>
      <div className="uu-grid-2 mt-12">
        <div className="uu-grid-field">
          <div className="uu-row uu-gap-8" style={{ alignItems: "center" }}>
            <label className="uu-label" style={{ width: "140px", marginBottom: 0 }}>
              {safeT(t, "postprod.tasks.form.autoRenderLaunchMode", "Mode de lancement")}
            </label>
            <div style={{ flex: 1, minWidth: 0 }}>
              <select
                className="uu-input"
                value={mergedMode}
                disabled={tasksLoading}
                onChange={(e) => handleMergedChange(e.target.value)}
              >
                <option value="">
                  {safeT(t, "postprod.tasks.form.autoRenderLaunchMode.placeholder", "Sélectionner un mode de lancement")}
                </option>
                <option value="now" disabled={!hasAvailableNowStation}>
                  {safeT(t, "postprod.tasks.form.autoRenderLaunchMode.now", "Créer et lancer maintenant")}
                  {!hasAvailableNowStation ? ` (${safeT(t, "postprod.tasks.form.autoRenderLaunchMode.now.unavailable", "aucune station disponible")})` : ""}
                </option>
                <option value="any_station">
                  {safeT(t, "postprod.tasks.form.autoRenderMode.any_station", "Programmer — quand une station est disponible")}
                </option>
                <option value="specific_station">
                  {safeT(t, "postprod.tasks.form.autoRenderMode.specific_station", "Programmer — station spécifique")}
                </option>
                <option value="datetime">
                  {safeT(t, "postprod.tasks.form.autoRenderMode.datetime", "Programmer — à date et heure précise")}
                </option>
              </select>
            </div>
          </div>
        </div>
        {stationField}
      </div>

      {showDatetimePicker ? (
        <div className="uu-grid-2 mt-12">
          <div className="uu-grid-field">
            <div className="uu-row uu-gap-8" style={{ alignItems: "center" }}>
              <label className="uu-label" style={{ width: "140px", marginBottom: 0 }}>
                {safeT(t, "postprod.tasks.form.autoRenderScheduledAt", "Date de lancement")}
              </label>
              <div style={{ flex: 1, minWidth: 0 }}>
                <DateTimeConfirmPicker
                  value={autoRenderScheduledAt}
                  disabled={tasksLoading}
                  onChange={(nextValue) => onChangeAutoRenderScheduledAt?.(String(nextValue || ""))}
                  placeholder="jj/mm/aaaa hh:mm"
                  applyLabel={safeT(t, "postprod.renders.queue.jobs.save", "Valider")}
                  cancelLabel={safeT(t, "postprod.renders.queue.jobs.cancel", "Annuler")}
                  clearLabel={safeT(t, "renderReturnAt.clear", "Effacer")}
                  locale="fr-FR"
                />
              </div>
            </div>
            {!autoRenderScheduledAt ? (
              <div className="uu-msg error mt-8">
                {safeT(t, "postprod.tasks.form.autoRenderScheduledAt.errorEmpty", "Choisir une date de lancement.")}
              </div>
            ) : badge === "error" ? (
              <div className="uu-msg error mt-8">
                {safeT(t, "postprod.tasks.form.autoRenderScheduledAt.errorPast", "La date doit être dans le futur.")}
              </div>
            ) : badge === "warn" ? (
              <div className="uu-msg warn mt-8">
                {safeT(t, "postprod.tasks.form.autoRenderScheduledAt.warnSoon", "Lancement dans moins de 5 minutes.")}
              </div>
            ) : null}
          </div>
          <div />
        </div>
      ) : null}
    </>
  );
}

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
  autoRenderLaunchMode = "",
  onChangeAutoRenderLaunchMode = null,
  autoRenderScheduledMode = "",
  onChangeAutoRenderScheduledMode = null,
  autoRenderScheduledAt = "",
  onChangeAutoRenderScheduledAt = null,
  autoRenderOffscreen = false,
  onChangeAutoRenderOffscreen = null,
  taskSequenceName = "",
  onChangeAutoRenderSequence = null,
  projectCatalogSequenceOptions = [],
}) {
  // En mode "now" : uniquement les stations online + capable (availableNow)
  // En mode "scheduled" : toutes les stations capables (capable ou busy), online ou non
  const isNowMode = autoRenderLaunchMode === "now";
  const remoteStationOptions = Array.isArray(availableRenderWorkers)
    ? availableRenderWorkers
        .filter((worker) => !isNowMode || worker?.availableNow !== false)
        .map((worker) => {
          const key = String(worker?.workerKey || worker?.ip || "").trim();
          if (!key) return null;
          const name = String(worker?.displayName || worker?.name || key).trim() || key;
          const avail = worker?.renderAvailability;
          return { key, name, renderAvailability: avail || 'capable', isOnline: worker?.isOnline !== false };
        })
        .filter(Boolean)
    : [];

  const seenStationKeys = new Set();
  const dedupedRemoteStations = [];
  for (const entry of remoteStationOptions) {
    if (!entry || !entry.key || seenStationKeys.has(entry.key)) continue;
    seenStationKeys.add(entry.key);
    dedupedRemoteStations.push(entry);
  }

  const hasAvailableNowStation = Array.isArray(availableRenderWorkers)
    && availableRenderWorkers.some((w) => w?.availableNow !== false);

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
      {selectedAutoRenderForm && String(selectedAutoRenderForm?.note || "").trim() ? (
        <div className="uu-notice info mt-12" style={{ whiteSpace: "pre-wrap", display: "flex", width: "100%", fontSize: "14px", boxSizing: "border-box" }}>
          {String(selectedAutoRenderForm.note).trim()}
        </div>
      ) : null}
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
        <div style={{ display: "flex", alignItems: "center" }}>
          <label className="uu-check">
            <input
              type="checkbox"
              checked={!!autoRenderOffscreen}
              disabled={tasksLoading}
              onChange={(e) => onChangeAutoRenderOffscreen?.(!!e.target.checked)}
            />
            <span>
              {safeT(t, "postprod.tasks.form.autoRenderOffscreen", "Rendu sans preview")}
            </span>
          </label>
        </div>
      </div>
      <div className="uu-grid-2 mt-12">
        <div className="uu-grid-field">
          <div className="uu-row uu-gap-8" style={{ alignItems: "center" }}>
            <label className="uu-label" style={{ width: "140px", marginBottom: 0 }}>
              {safeT(t, "postprod.tasks.form.autoRenderSequence", "Level Sequence")}
            </label>
            <div style={{ flex: 1, minWidth: 0 }}>
              <select
                className="uu-input"
                value={taskSequenceName}
                disabled={tasksLoading || !autoRenderProjectRef || autoRenderProjectCatalogLoading || projectCatalogSequenceOptions.length === 0}
                onChange={(e) => onChangeAutoRenderSequence?.(String(e.target.value || ""))}
              >
                <option value="">
                  {safeT(t, "postprod.tasks.form.autoRenderSequence.none", "Aucune")}
                </option>
                {projectCatalogSequenceOptions.map((entry) => (
                  <option key={`task-auto-render-sequence-${entry.value}`} value={entry.value}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {autoRenderProjectCatalogLoading ? (
            <div className="uu-muted mt-8">
              {safeT(t, "postprod.tasks.form.autoRenderSequence.loading", "Chargement des séquences...")}
            </div>
          ) : !autoRenderProjectCatalogLoading && !autoRenderProjectCatalogError && !!autoRenderProjectRef && projectCatalogSequenceOptions.length === 0 ? (
            <div className="uu-muted mt-8">
              {safeT(t, "postprod.tasks.form.autoRenderSequence.noDetected", "Aucune séquence détectée.")}
            </div>
          ) : null}
        </div>
        <div />
      </div>
      <LaunchModeSection
        t={t}
        tasksLoading={tasksLoading}
        autoRenderLaunchMode={autoRenderLaunchMode}
        onChangeAutoRenderLaunchMode={onChangeAutoRenderLaunchMode}
        autoRenderScheduledMode={autoRenderScheduledMode}
        onChangeAutoRenderScheduledMode={onChangeAutoRenderScheduledMode}
        autoRenderScheduledAt={autoRenderScheduledAt}
        onChangeAutoRenderScheduledAt={onChangeAutoRenderScheduledAt}
        autoRenderWorkerKey={autoRenderWorkerKey}
        onChangeAutoRenderWorker={onChangeAutoRenderWorker}
        dedupedRemoteStations={dedupedRemoteStations}
        renderWorkersLoading={renderWorkersLoading}
        renderWorkersError={renderWorkersError}
        hasAvailableNowStation={hasAvailableNowStation}
      />
    </>
  );
}

export { TaskEditorAutoConfigFields };
