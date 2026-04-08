import { TaskEditorAutoConfigFields } from "./editor/TaskEditorAutoConfigFields";
import { TaskEditorFooter } from "./editor/TaskEditorFooter";
import { TaskEditorFormDataCard } from "./editor/TaskEditorFormDataCard";
import { TaskEditorTitleFields } from "./editor/TaskEditorTitleFields";

function TaskEditorPanel({
  t,
  isEditingTask = false,
  tasksLoading = false,
  title = "",
  description = "",
  onTitleChange = null,
  onDescriptionChange = null,
  onAutoSaveOnBlur = null,
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
  autoRenderFormFieldsLoading = false,
  autoRenderFormFieldsError = "",
  visibleAutoRenderFormFields = [],
  autoRenderFormValues = {},
  onUpdateAutoRenderFormValue = null,
  renderOutputDir = "",
  autoExpectedRenderName = "",
  formError = "",
  submitDisabled = false,
  submitLabel = "",
  onSubmit = null,
  onCancel = null,
}) {
  return (
    <div
      className="uu-card mt-12"
      onBlurCapture={(event) => {
        const tag = String(event?.target?.tagName || "").trim().toLowerCase();
        if (tag !== "input" && tag !== "textarea" && tag !== "select") return;
        if (typeof onAutoSaveOnBlur === "function") {
          void onAutoSaveOnBlur();
        }
      }}
    >
      <TaskEditorTitleFields
        t={t}
        isEditingTask={isEditingTask}
        tasksLoading={tasksLoading}
        title={title}
        description={description}
        onTitleChange={onTitleChange}
        onDescriptionChange={onDescriptionChange}
      />

      <TaskEditorAutoConfigFields
        t={t}
        tasksLoading={tasksLoading}
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
        isEditingTask={isEditingTask}
      />

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
        renderOutputDir={renderOutputDir}
        autoExpectedRenderName={autoExpectedRenderName}
        formError={formError}
        submitDisabled={submitDisabled}
        submitLabel={submitLabel}
        tasksLoading={tasksLoading}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    </div>
  );
}

export { TaskEditorPanel };
