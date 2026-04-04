import { useMemo } from "react";
import { roleLabel } from "../roleHelpers";
import { isUsableAvatarSrc, resolveAvatarInitials } from "../userSharedHelpers";

function useUserEditorViewModel({
  t,
  roleOptions = [],
  draft = {},
  rolesByKey = new Map(),
}) {
  const canCreate = roleOptions.length > 0;
  const selectedRole = String(draft?.role || "").trim();
  const selectedProfile = selectedRole ? roleLabel(t, selectedRole, rolesByKey) : "-";
  const editorAvatarPath = String(draft?.avatarPath || "").trim();
  const editorAvatarSrc = isUsableAvatarSrc(editorAvatarPath) ? editorAvatarPath : "";
  const editorAvatarInitials = useMemo(
    () => resolveAvatarInitials(draft?.displayName, draft?.username),
    [draft?.displayName, draft?.username]
  );

  return {
    canCreate,
    selectedProfile,
    editorAvatarPath,
    editorAvatarSrc,
    editorAvatarInitials,
  };
}

export { useUserEditorViewModel };
