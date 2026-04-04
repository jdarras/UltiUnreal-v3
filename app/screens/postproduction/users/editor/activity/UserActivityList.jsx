import {
  formatDate,
  safeT,
  activityActionLabel,
} from "../../../shared/helpers";

function UserActivityList({
  t,
  filteredEditingActivities = [],
}) {
  if (filteredEditingActivities.length === 0) {
    return (
      <div className="uu-muted">
        {safeT(t, "postprod.users.activity.empty", "Aucune action recente.")}
      </div>
    );
  }

  return filteredEditingActivities.map((activity) => (
    <div key={`activity-${Number(activity?.id || 0)}`} className="uu-muted">
      {formatDate(activity?.createdAt)} - {activityActionLabel(activity)}
      {String(activity?.toStatus || "").trim()
        ? ` (${String(activity?.toStatus || "").trim()})`
        : ""}
      {Array.isArray(activity?.projectRefs) && activity.projectRefs.length > 0
        ? ` - ${safeT(t, "postprod.users.activity.item.projects", "Projets: {value}", {
          value: activity.projectRefs.join(", "),
        })}`
        : ""}
    </div>
  ));
}

export { UserActivityList };
