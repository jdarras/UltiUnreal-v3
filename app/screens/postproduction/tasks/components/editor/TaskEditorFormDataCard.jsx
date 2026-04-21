import { safeT } from "../../../shared/helpers";
import { TaskFormFieldsPanel } from "../TaskFormFieldsPanel";

function TaskEditorFormDataCard({
  t,
  selectedAutoRenderForm = null,
  autoRenderFormFieldsLoading = false,
  autoRenderFormFieldsError = "",
  visibleAutoRenderFormFields = [],
  tasksLoading = false,
  autoRenderFormValues = {},
  onUpdateAutoRenderFormValue = null,
}) {
  if (!selectedAutoRenderForm) return null;
  return (
    <div className="uu-card mt-12">
      <h4 className="uu-h3 uu-block-title" style={{ margin: "0 0 8px 0" }}>
        {safeT(t, "postprod.tasks.form.autoRenderForm.live.simple", "Saisie formulaire")}
      </h4>
      {autoRenderFormFieldsLoading ? (
        <div className="uu-muted mt-8">{safeT(t, "common.loading", "Chargement…")}</div>
      ) : null}
      {!autoRenderFormFieldsLoading && autoRenderFormFieldsError ? (
        <div className="uu-msg warn mt-8">{autoRenderFormFieldsError}</div>
      ) : null}
      {!autoRenderFormFieldsLoading && !autoRenderFormFieldsError && visibleAutoRenderFormFields.length <= 0 ? (
        <div className="uu-muted mt-8">
          {safeT(t, "postprod.tasks.form.autoRenderForm.noFields", "Aucun champ visible dans ce formulaire.")}
        </div>
      ) : null}
      {!autoRenderFormFieldsLoading && !autoRenderFormFieldsError && visibleAutoRenderFormFields.length > 0 ? (
        <TaskFormFieldsPanel
          t={t}
          tasksLoading={tasksLoading}
          visibleAutoRenderFormFields={visibleAutoRenderFormFields}
          autoRenderFormValues={autoRenderFormValues}
          onUpdateFieldValue={onUpdateAutoRenderFormValue}
        />
      ) : null}
    </div>
  );
}

export { TaskEditorFormDataCard };
