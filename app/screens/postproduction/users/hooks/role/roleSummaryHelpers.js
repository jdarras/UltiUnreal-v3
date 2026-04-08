import { safeT } from "../../../shared/helpers";

export function rolePermissionsSummary(t, role) {
  const lines = [];
  if (role?.canUseLiveMode !== false) {
    lines.push(safeT(t, "postprod.roles.form.canUseLiveMode", "Peut utiliser le mode Live"));
  }
  if (role?.canUsePostprodMode !== false) {
    lines.push(safeT(t, "postprod.roles.form.canUsePostprodMode", "Peut utiliser le mode rendu"));
  }
  if (role?.canValidate) lines.push(safeT(t, "postprod.roles.form.canValidate", "Peut valider"));
  if (role?.canSyncScenes) lines.push(safeT(t, "postprod.roles.form.canSyncScenes", "Peut synchroniser"));
  if (role?.canManageUsers) lines.push(safeT(t, "postprod.roles.form.canManageUsers", "Peut gerer utilisateurs"));
  if (role?.canManageRoles) lines.push(safeT(t, "postprod.roles.form.canManageRoles", "Peut gerer profils"));
  if (role?.canManageForms) lines.push(safeT(t, "postprod.roles.form.canManageForms", "Peut creer des formulaires"));
  if (role?.canManageMachines) lines.push(safeT(t, "postprod.roles.form.canManageMachines", "Peut gerer machines post-production"));
  if (role?.canViewResources) lines.push(safeT(t, "postprod.roles.form.canViewResources", "Peut voir les ressources"));
  if (role?.canCreateTasks) lines.push(safeT(t, "postprod.roles.form.canCreateTasks", "Peut creer des taches"));
  if (role?.canEditProjects) lines.push(safeT(t, "postprod.roles.form.canEditLiveProjects", "Peut editer les projets"));
  if (role?.canManageLayouts) lines.push(safeT(t, "postprod.roles.form.canManageLayouts", "Peut creer/modifier des Layouts"));
  if (role?.canBanUsers) lines.push(safeT(t, "postprod.roles.form.canBanUsers", "Peut bannir utilisateur"));
  if (role?.canManageProjectPermissions) {
    lines.push(
      safeT(t, "postprod.roles.form.canManageProjectPermissions", "Peut editer droits projet post-production")
    );
  }
  if (role?.canLaunchProjects !== false) {
    lines.push(
      safeT(t, "postprod.roles.form.canLaunchProjects", "Peut lancer/modifier/supprimer projet Unreal")
    );
  }
  if (role?.canLaunchRenders !== false) lines.push(safeT(t, "postprod.roles.form.canLaunchRenders", "Peut lancer rendus"));
  if (lines.length === 0) return "-";
  return lines.join(" - ");
}

export default {
  rolePermissionsSummary,
};
