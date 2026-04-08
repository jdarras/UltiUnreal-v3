import { TaskEditorPanel } from "./TaskEditorPanel";

function TasksEditorSection({
  t,
  showCreateForm = false,
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
  if (!showCreateForm) return null;
  return (
    <TaskEditorPanel
      t={t}
      isEditingTask={isEditingTask}
      tasksLoading={tasksLoading}
      title={title}
      description={description}
      onTitleChange={onTitleChange}
      onDescriptionChange={onDescriptionChange}
      onAutoSaveOnBlur={onAutoSaveOnBlur}
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
      autoRenderFormFieldsLoading={autoRenderFormFieldsLoading}
      autoRenderFormFieldsError={autoRenderFormFieldsError}
      visibleAutoRenderFormFields={visibleAutoRenderFormFields}
      autoRenderFormValues={autoRenderFormValues}
      onUpdateAutoRenderFormValue={onUpdateAutoRenderFormValue}
      renderOutputDir={renderOutputDir}
      autoExpectedRenderName={autoExpectedRenderName}
      formError={formError}
      submitDisabled={submitDisabled}
      submitLabel={submitLabel}
      onSubmit={onSubmit}
      onCancel={onCancel}
    />
  );
}

export { TasksEditorSection };
