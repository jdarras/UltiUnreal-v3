import { safeT } from "../shared/helpers";
import { UserThumbCard } from "./UserThumbCard";

const USER_THUMB_GROUP_HEADER_STYLE = { justifyContent: "space-between", alignItems: "center" };
const USER_THUMB_GROUP_TITLE_STYLE = { margin: 0 };
const USER_THUMB_GROUP_GRID_STYLE = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "12px" };

function UserThumbGroups({
  t,
  groupedUsersByProfile = [],
  openEdit,
  usersLoading = false,
  manageableSet = new Set(),
}) {
  if (!Array.isArray(groupedUsersByProfile) || groupedUsersByProfile.length === 0) {
    return <div className="uu-muted">{safeT(t, "postprod.users.empty", "Aucun utilisateur.")}</div>;
  }

  return (
    <div className="uu-col">
      {groupedUsersByProfile.map((group) => (
        <div key={`users-profile-group-${group.key}`} className="uu-card">
          <div className="uu-row" style={USER_THUMB_GROUP_HEADER_STYLE}>
            <div className="uu-block-title" style={USER_THUMB_GROUP_TITLE_STYLE}>{String(group?.label || "-")}</div>
            <div className="uu-muted">
              {safeT(t, "postprod.users.group.count", "{count} utilisateur(s)", {
                count: Array.isArray(group?.items) ? group.items.length : 0,
              })}
            </div>
          </div>
          <div className="mt-12">
            <div style={USER_THUMB_GROUP_GRID_STYLE}>
              {(Array.isArray(group?.items) ? group.items : []).map((entry) => (
                <UserThumbCard
                  key={`user-thumb-${Number(entry?.id || 0)}-${String(entry?.username || "").trim()}`}
                  t={t}
                  entry={entry}
                  openEdit={openEdit}
                  usersLoading={usersLoading}
                  manageableSet={manageableSet}
                />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export { UserThumbGroups };
