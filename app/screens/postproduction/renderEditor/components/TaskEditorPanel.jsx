import { TaskEditorAutoConfigFields } from "./editor/TaskEditorAutoConfigFields";
import { TaskEditorFooter } from "./editor/TaskEditorFooter";
import { TaskEditorFormDataCard } from "./editor/TaskEditorFormDataCard";
import { TaskEditorTitleFields } from "./editor/TaskEditorTitleFields";
import { formatDate, safeT } from "../../shared/helpers";

const TASK_EDITOR_REJECTION_CARD_STYLE = { marginBottom: "12px" };
const TASK_EDITOR_REJECTION_MSG_STYLE = { margin: 0 };
const TASK_EDITOR_REJECTION_TITLE_STYLE = { fontWeight: 700 };
const TASK_EDITOR_REJECTION_REASON_STYLE = { whiteSpace: "pre-wrap", wordBreak: "break-word" };

function TaskEditorPanel({
  t,
  isEditingTask = false,
  editingTaskVisualStatusKey = "planned",
  editingTaskRejectionInfo = null,
  editingTaskId = 0,
  tasksLoading = false,
  title = "",
  description = "",
  assigneeUserId = null,
  assigneeIsCurrentUser = true,
  assigneeOptions = [],
  assigneeUserIdLocked = false,
  onTitleChange = null,
  onDescriptionChange = null,
  onChangeAssigneeUserId = null,
  onAutoSaveOnBlur = null,
  normalizedProjectOptions = [],
  autoRenderProjectRef = "",
  onChangeAutoRenderProject = null,
  filteredAutoRenderForms = [],
  autoRenderFormId = "",
  onChangeAutoRenderForm = null,
  renderFormsLoading = false,
  renderFormsError = "",
  canCreateTasks = false,
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
  autoRenderExportDestinationIds = [],
  onChangeAutoRenderExportDestinationIds = null,
  renderExportDestinationOptions = [],
  taskSequenceName = "",
  onChangeAutoRenderSequence = null,
  projectCatalogSequenceOptions = [],
  autoRenderFormFieldsLoading = false,
  autoRenderFormFieldsError = "",
  visibleAutoRenderFormFields = [],
  autoRenderFormValues = {},
  onUpdateAutoRenderFormValue = null,
  renderOutputDir = "",
  reservedRenderId = 0,
  autoExpectedRenderName = "",
  autoOutputType = null,
  formError = "",
  submitDisabled = false,
  submitLabel = "",
  onSubmit = null,
  onRequestDeleteTask = null,
  onCancel = null,
}) {
  const rejectionInfo = editingTaskRejectionInfo && typeof editingTaskRejectionInfo === "object"
    ? editingTaskRejectionInfo
    : null;
  const rejectionBy = String(rejectionInfo?.rejectedByUsername || "").trim();
  const rejectionByIdRaw = Number(rejectionInfo?.rejectedByUserId || 0);
  const rejectionById = Number.isFinite(rejectionByIdRaw) && rejectionByIdRaw > 0 ? Math.trunc(rejectionByIdRaw) : 0;
  const rejectionByLabel = rejectionBy || (rejectionById > 0 ? `#${rejectionById}` : "-");
  const rejectionAtLabel = formatDate(rejectionInfo?.rejectedAt || "");
  const rejectionMeta = safeT(
    t,
    "postprod.tasks.rejection.banner.meta",
    "Rejeté par {user} le {at}",
    { user: rejectionByLabel, at: rejectionAtLabel || "-" }
  );
  const rejectionReason = String(rejectionInfo?.reason || "").trim();
  const rejectionReasonLabel = rejectionReason
    ? safeT(t, "postprod.tasks.rejection.banner.reason", "Motif : {reason}", { reason: rejectionReason })
    : safeT(t, "postprod.tasks.rejection.banner.reasonEmpty", "Aucun motif renseigné.");

  return (
    <div
      className="mt-12"
      onBlurCapture={(event) => {
        const tag = String(event?.target?.tagName || "").trim().toLowerCase();
        if (tag !== "input" && tag !== "textarea" && tag !== "select") return;
        if (typeof onAutoSaveOnBlur === "function") {
          void onAutoSaveOnBlur();
        }
      }}
    >
      {rejectionInfo ? (
        <div className="uu-card" style={TASK_EDITOR_REJECTION_CARD_STYLE}>
          <div className="uu-msg warn" style={TASK_EDITOR_REJECTION_MSG_STYLE}>
            <div style={TASK_EDITOR_REJECTION_TITLE_STYLE}>
              {safeT(t, "postprod.tasks.rejection.banner.title", "Rendu rejeté")}
            </div>
            <div>{rejectionMeta}</div>
            <div style={TASK_EDITOR_REJECTION_REASON_STYLE}>
              {rejectionReasonLabel}
            </div>
          </div>
        </div>
      ) : null}
      <div className="uu-card">
        <TaskEditorTitleFields
          t={t}
          isEditingTask={isEditingTask}
          editingTaskId={editingTaskId}
          tasksLoading={tasksLoading}
          title={title}
          description={description}
          assigneeUserId={assigneeUserId}
          assigneeOptions={assigneeOptions}
          assigneeUserIdLocked={assigneeUserIdLocked}
          onTitleChange={onTitleChange}
          onDescriptionChange={onDescriptionChange}
          onChangeAssigneeUserId={onChangeAssigneeUserId}
        />

        <TaskEditorAutoConfigFields
          t={t}
          tasksLoading={tasksLoading}
          showLaunchModeSection={assigneeIsCurrentUser}
          normalizedProjectOptions={normalizedProjectOptions}
          autoRenderProjectRef={autoRenderProjectRef}
          onChangeAutoRenderProject={onChangeAutoRenderProject}
          filteredAutoRenderForms={filteredAutoRenderForms}
          autoRenderFormId={autoRenderFormId}
          onChangeAutoRenderForm={onChangeAutoRenderForm}
          renderFormsLoading={renderFormsLoading}
          renderFormsError={renderFormsError}
          canManageRenderTemplates={canManageRenderTemplates}
          renderTemplatesForSelectedAutoForm={renderTemplatesForSelectedAutoForm}
          autoRenderTemplateId={autoRenderTemplateId}
          onChangeAutoRenderTemplate={onChangeAutoRenderTemplate}
          autoRenderProjectCatalogLoading={autoRenderProjectCatalogLoading}
          autoRenderProjectCatalogError={autoRenderProjectCatalogError}
          selectedAutoRenderForm={selectedAutoRenderForm}
          autoRenderWorkerKey={autoRenderWorkerKey}
          onChangeAutoRenderWorker={onChangeAutoRenderWorker}
          availableRenderWorkers={availableRenderWorkers}
          renderWorkersLoading={renderWorkersLoading}
          renderWorkersError={renderWorkersError}
          autoRenderLaunchMode={autoRenderLaunchMode}
          onChangeAutoRenderLaunchMode={onChangeAutoRenderLaunchMode}
          autoRenderScheduledMode={autoRenderScheduledMode}
          onChangeAutoRenderScheduledMode={onChangeAutoRenderScheduledMode}
          autoRenderScheduledAt={autoRenderScheduledAt}
          onChangeAutoRenderScheduledAt={onChangeAutoRenderScheduledAt}
          autoRenderOffscreen={autoRenderOffscreen}
          onChangeAutoRenderOffscreen={onChangeAutoRenderOffscreen}
          taskSequenceName={taskSequenceName}
          onChangeAutoRenderSequence={onChangeAutoRenderSequence}
          projectCatalogSequenceOptions={projectCatalogSequenceOptions}
        />
      </div>

      <TaskEditorFormDataCard
        t={t}
        selectedAutoRenderForm={selectedAutoRenderForm}
        autoRenderFormFieldsLoading={autoRenderFormFieldsLoading}
        autoRenderFormFieldsError={autoRenderFormFieldsError}
        visibleAutoRenderFormFields={visibleAutoRenderFormFields}
        tasksLoading={tasksLoading}
        autoRenderFormValues={autoRenderFormValues}
        onUpdateAutoRenderFormValue={onUpdateAutoRenderFormValue}
      />

      <TaskEditorFooter
        t={t}
        isEditingTask={isEditingTask}
        editingTaskId={editingTaskId}
        taskTitle={title}
        canDeleteTasks={canCreateTasks === true && assigneeUserIdLocked !== true}
        editingTaskVisualStatusKey={editingTaskVisualStatusKey}
        renderOutputDir={renderOutputDir}
        autoRenderProjectRef={autoRenderProjectRef}
        reservedRenderId={reservedRenderId}
        autoExpectedRenderName={autoExpectedRenderName}
        autoOutputType={autoOutputType}
        formError={formError}
        submitDisabled={submitDisabled}
        submitLabel={submitLabel}
        tasksLoading={tasksLoading}
        exportDestinationOptions={renderExportDestinationOptions}
        selectedExportDestinationIds={autoRenderExportDestinationIds}
        onChangeExportDestinationIds={onChangeAutoRenderExportDestinationIds}
        onSubmit={onSubmit}
        onRequestDeleteTask={onRequestDeleteTask}
        onCancel={onCancel}
      />
    </div>
  );
}

export { TaskEditorPanel };
