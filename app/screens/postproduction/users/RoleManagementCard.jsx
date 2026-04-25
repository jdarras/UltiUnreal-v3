import { useEffect } from "react";
import { safeT } from "../shared/helpers";
import { RoleEditorPanel } from "./role/RoleEditorPanel";
import { RoleListPanel } from "./role/RoleListPanel";
import { useRoleManagementCardController } from "./hooks/useRoleManagementCardController";

export function RoleManagementCard({
  t,
  tabKey = "",
  roles = [],
  rolesLoading = false,
  rolesError = "",
  onCreateRole = null,
  onUpdateRole = null,
  onDeleteRole = null,
  onOpenUser = null,
  users = [],
}) {
  const {
    inEditor,
    openCreate,
    closeEditor,
    roleEditorPanelProps,
    roleListPanelProps,
  } = useRoleManagementCardController({
    t,
    roles,
    rolesLoading,
    onCreateRole,
    onUpdateRole,
    onDeleteRole,
    onOpenUser,
    users,
  });

  useEffect(() => {
    if (inEditor) closeEditor();
  }, [tabKey]);

  return (
    <section className="uu-section">
      <div className="uu-row" style={{ justifyContent: "flex-start", alignItems: "center", gap: "8px" }}>
        {!inEditor ? (
          <button
            className="uu-btn"
            type="button"
            onClick={() => openCreate()}
            disabled={rolesLoading}
          >
            {safeT(t, "postprod.roles.add", "+ Ajouter un profil")}
          </button>
        ) : null}
      </div>

      {rolesError ? <div className="uu-msg error mt-12">{rolesError}</div> : null}

      {inEditor ? (
        <RoleEditorPanel {...roleEditorPanelProps} />
      ) : (
        <RoleListPanel {...roleListPanelProps} />
      )}
    </section>
  );
}
