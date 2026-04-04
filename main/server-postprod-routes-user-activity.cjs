async function handlePostprodUserActivityRoutes({
  req,
  res,
  pathname = '',
  url,
  sendJSON,
  requireSession,
  requireManageUsers,
  normalizeManageableRolesInput,
  resolveRoleInput,
  rolesCache,
  stmts,
  parseActivityFilters,
  buildUserActivityPayload,
  activityMatchesActionType,
  activityMatchesProjectRefs,
  activityMatchesSearchQuery,
  summarizeUserActivity,
}) {
  const userActivityMatch = /^\/agent\/postprod\/users\/(\d+)\/activity$/.exec(pathname);
  if (!userActivityMatch) return false;

  if (req.method !== 'GET') {
    sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
    return true;
  }
  const auth = requireSession(req, res, sendJSON);
  if (!auth) return true;
  const managerPerms = requireManageUsers(auth, res, sendJSON);
  if (!managerPerms) return true;
  const actorId = Number(auth?.session?.user_id || 0);
  const allowedRolesSet = new Set(
    normalizeManageableRolesInput(managerPerms.manageableRoles)
      .map((r) => resolveRoleInput(r, rolesCache, ''))
      .filter(Boolean)
  );
  const userId = Number(userActivityMatch[1] || 0);
  if (!Number.isFinite(userId) || userId <= 0) {
    sendJSON(res, 400, { ok: false, error: 'invalid_user_id' });
    return true;
  }
  const targetUser = stmts.findUserById.get(userId);
  if (!targetUser) {
    sendJSON(res, 404, { ok: false, error: 'user_not_found' });
    return true;
  }
  const targetRole = resolveRoleInput(targetUser?.role, rolesCache, '');
  if (!allowedRolesSet.has(targetRole) && userId !== actorId) {
    sendJSON(res, 403, { ok: false, error: 'forbidden' });
    return true;
  }
  const activityFilters = parseActivityFilters(url?.searchParams || new URLSearchParams());
  if (!activityFilters?.ok) {
    sendJSON(res, 400, { ok: false, error: String(activityFilters?.error || 'invalid_activity_filters') });
    return true;
  }
  const rows = stmts.listAuditByActorUserId.all(
    userId,
    activityFilters.fromAt,
    activityFilters.fromAt,
    activityFilters.toAt,
    activityFilters.toAt,
    activityFilters.limit
  );
  const activities = rows
    .map(buildUserActivityPayload)
    .filter((entry) => activityMatchesActionType(entry, activityFilters.actionType))
    .filter((entry) => activityMatchesProjectRefs(entry, activityFilters.projectRefs))
    .filter((entry) => activityMatchesSearchQuery(entry, activityFilters.searchQuery));
  const summary = summarizeUserActivity(activities);
  sendJSON(res, 200, {
    ok: true,
    userId,
    activities,
    summary,
    filters: {
      limit: activityFilters.limit,
      fromAt: activityFilters.fromAt,
      toAt: activityFilters.toAt,
      actionType: activityFilters.actionType,
      projectRefs: activityFilters.projectRefs,
      searchQuery: activityFilters.searchQuery,
    },
  });
  return true;
}

module.exports = {
  handlePostprodUserActivityRoutes,
};
