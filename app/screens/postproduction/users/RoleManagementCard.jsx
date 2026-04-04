import { RoleEditorPanel } from "./role/RoleEditorPanel";
import { RoleListPanel } from "./role/RoleListPanel";
import { useRoleManagementCardController } from "./hooks/useRoleManagementCardController";

export function RoleManagementCard({
  t,
  roles = [],
  rolesLoading = false,
  rolesError = "",
  onCreateRole = null,
  onUpdateRole = null,
  users = [],
}) {
  const {
    inEditor,
    openCreate,
    roleEditorPanelProps,
    roleListPanelProps,
  } = useRoleManagementCardController({
    t,
    roles,
    rolesLoading,
    onCreateRole,
    onUpdateRole,
    users,
  });

  return (
    <section className="uu-section">
      <div className="uu-row" style={{ justifyContent: "flex-end", alignItems: "center", gap: "8px" }}>
        {!inEditor ? (
          <button
            className="uu-btn"
            type="button"
            onClick={() => openCreate()}
            disabled={rolesLoading}
          >
            + Ajouter un profil
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

