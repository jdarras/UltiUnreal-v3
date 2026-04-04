import { useEffect, useRef } from "react";

function useUserExternalEditRequest({
  editUserIdRequest = null,
  orderedUsers = [],
  openEdit = null,
  onEditUserIdHandled = null,
}) {
  const lastHandledEditReqKey = useRef(null);

  useEffect(() => {
    const reqKey = editUserIdRequest?.reqKey;
    const userId = editUserIdRequest?.userId;
    if (!reqKey || !userId) return;
    if (lastHandledEditReqKey.current === reqKey) return;
    const id = Number(userId);
    if (!id) return;
    const entry = orderedUsers.find((u) => Number(u?.id || 0) === id);
    if (!entry) return;
    lastHandledEditReqKey.current = reqKey;
    openEdit?.(entry);
    onEditUserIdHandled?.(reqKey);
  }, [editUserIdRequest?.reqKey, editUserIdRequest?.userId, orderedUsers, openEdit, onEditUserIdHandled]);
}

export { useUserExternalEditRequest };
