import { TaskEditorPanel } from "./TaskEditorPanel";

function TasksEditorSection({
  t,
  showCreateForm = false,
  isEditingTask = false,
  editingTaskId = 0,
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
  onCancel = null,
}) {
  if (!showCreateForm) return null;
  return (
    <TaskEditorPanel
      t={t}
      isEditingTask={isEditingTask}
      editingTaskId={editingTaskId}
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
      autoRenderScheduledMode={autoRenderScheduledMode}
      onChangeAutoRenderScheduledMode={onChangeAutoRenderScheduledMode}
      autoRenderScheduledAt={autoRenderScheduledAt}
      onChangeAutoRenderScheduledAt={onChangeAutoRenderScheduledAt}
      autoRenderOffscreen={autoRenderOffscreen}
      onChangeAutoRenderOffscreen={onChangeAutoRenderOffscreen}
      autoRenderExportDestinationIds={autoRenderExportDestinationIds}
      onChangeAutoRenderExportDestinationIds={onChangeAutoRenderExportDestinationIds}
      renderExportDestinationOptions={renderExportDestinationOptions}
      taskSequenceName={taskSequenceName}
      onChangeAutoRenderSequence={onChangeAutoRenderSequence}
      projectCatalogSequenceOptions={projectCatalogSequenceOptions}
      autoRenderFormFieldsLoading={autoRenderFormFieldsLoading}
      autoRenderFormFieldsError={autoRenderFormFieldsError}
      visibleAutoRenderFormFields={visibleAutoRenderFormFields}
      autoRenderFormValues={autoRenderFormValues}
      onUpdateAutoRenderFormValue={onUpdateAutoRenderFormValue}
      renderOutputDir={renderOutputDir}
      reservedRenderId={reservedRenderId}
      autoExpectedRenderName={autoExpectedRenderName}
      autoOutputType={autoOutputType}
      formError={formError}
      submitDisabled={submitDisabled}
      submitLabel={submitLabel}
      onSubmit={onSubmit}
      onCancel={onCancel}
    />
  );
}

export { TasksEditorSection };
