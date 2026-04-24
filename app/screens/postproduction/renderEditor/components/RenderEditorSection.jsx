import { TaskEditorPanel } from "./TaskEditorPanel";

function RenderEditorSection({
  t,
  showCreateForm = false,
  isEditingTask = false,
  editingTaskVisualStatusKey = "planned",
  editingTaskId = 0,
  tasksLoading = false,
  title = "",
  description = "",
  assigneeUserId = null,
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
      editingTaskVisualStatusKey={editingTaskVisualStatusKey}
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

export { RenderEditorSection };
