import { safeT } from "../../shared/helpers";

const TASK_ROW_ACTIONS_STYLE = { flexWrap: "nowrap", whiteSpace: "nowrap" };

function TaskRowActions({
  t,
  task = null,
  disabledEdit = false,
  disabledDelete = false,
  onEdit = null,
  onDelete = null,
}) {
  return (
    <div className="uu-row uu-gap-4" style={TASK_ROW_ACTIONS_STYLE}>
      <button
        className="uu-btn-ghost"
        type="button"
        disabled={disabledEdit}
        onClick={() => onEdit?.(task)}
      >
        {safeT(t, "postprod.tasks.action.edit", "Éditer")}
      </button>
      <button
        className="uu-btn-ghost"
        type="button"
        disabled={disabledDelete}
        onClick={() => onDelete?.(task)}
      >
        {safeT(t, "postprod.tasks.action.delete", "Supprimer")}
      </button>
    </div>
  );
}

export { TaskRowActions };
