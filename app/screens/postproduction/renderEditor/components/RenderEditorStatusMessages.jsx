import { safeT } from "../../shared/helpers";

function RenderEditorStatusMessages({
  t,
  tasksError = "",
  tasksLoading = false,
  showCreateForm = false,
}) {
  return (
    <>
      {tasksError ? <div className="uu-msg error mt-12">{tasksError}</div> : null}
      {tasksLoading && !showCreateForm ? (
        <div className="uu-muted mt-12">{safeT(t, "postprod.tasks.loading", "Chargement des taches...")}</div>
      ) : null}
    </>
  );
}

export { RenderEditorStatusMessages };
