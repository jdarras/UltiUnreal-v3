'use strict';

function createPostprodAuthGuards(options = {}) {
  const {
    getAuthToken,
    nowIso,
    stmts,
    rolePermissions,
    getRolesCache = () => ({}),
    resolveRoleInput,
    DEFAULT_FALLBACK_ROLE,
    sanitizeProjectRef,
    resolveProjectForApi,
    sharedStore,
    buildProjectPermissionPayload,
    db,
    audit,
  } = options;

  function asCount(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.trunc(n));
  }

  function requireSession(req, res, sendJSON, { tokenFallback = '' } = {}) {
    const token = getAuthToken(req, tokenFallback);
    if (!token) {
      sendJSON(res, 401, { ok: false, error: 'missing_token' });
      return null;
    }
    const now = nowIso();
    const session = stmts.findActiveSessionByToken.get(token, now);
    if (!session) {
      sendJSON(res, 401, { ok: false, error: 'invalid_session' });
      return null;
    }
    stmts.touchSession.run(now, token);
    return { token, now, session };
  }

  function requireManageUsers(sessionWrap, res, sendJSON) {
    if (!sessionWrap || !sessionWrap.session) return false;
    const perms = rolePermissions(sessionWrap.session.role, getRolesCache());
    if (!perms.canManageUsers) {
      sendJSON(res, 403, { ok: false, error: 'forbidden' });
      return false;
    }
    return perms;
  }

  function requireBanUsers(sessionWrap, res, sendJSON) {
    if (!sessionWrap || !sessionWrap.session) return false;
    const perms = rolePermissions(sessionWrap.session.role, getRolesCache());
    if (perms.canBanUsers !== true) {
      sendJSON(res, 403, { ok: false, error: 'forbidden_ban_users' });
      return false;
    }
    return perms;
  }

  function requireManageProjectPermissions(sessionWrap, res, sendJSON) {
    if (!sessionWrap || !sessionWrap.session) return false;
    const perms = rolePermissions(sessionWrap.session.role, getRolesCache());
    if (perms.canManageProjectPermissions !== true) {
      sendJSON(res, 403, { ok: false, error: 'forbidden_project_permissions_manage' });
      return false;
    }
    return perms;
  }

  function requireManageRoles(sessionWrap, res, sendJSON) {
    if (!sessionWrap || !sessionWrap.session) return false;
    const perms = rolePermissions(sessionWrap.session.role, getRolesCache());
    if (!perms.canManageRoles) {
      sendJSON(res, 403, { ok: false, error: 'forbidden' });
      return false;
    }
    return perms;
  }

  function requireRenderTemplateManage(sessionWrap, res, sendJSON) {
    if (!sessionWrap || !sessionWrap.session) return false;
    const perms = rolePermissions(sessionWrap.session.role, getRolesCache());
    if (perms.canManageForms !== true) {
      sendJSON(res, 403, { ok: false, error: 'forbidden_template_manage' });
      return false;
    }
    return perms;
  }

  function requireRenderTemplateManageForProject(sessionWrap, res, sendJSON, rawProjectRef) {
    const perms = requireRenderTemplateManage(sessionWrap, res, sendJSON);
    if (!perms) return null;

    if (perms.canManageProjectPermissions === true) {
      return {
        perms,
        projectRef: sanitizeProjectRef(rawProjectRef),
        project: null,
        projectPermissions: null,
      };
    }

    if (perms.canLaunchRenders !== true) {
      sendJSON(res, 403, { ok: false, error: 'forbidden_template_manage_project' });
      return null;
    }

    const projectResolved = resolveProjectForApi(sharedStore, rawProjectRef, stmts);
    if (!projectResolved.ok) {
      sendJSON(res, 400, { ok: false, error: projectResolved.error || 'invalid_project_id' });
      return null;
    }
    const projectRef = sanitizeProjectRef(projectResolved.projectRef || rawProjectRef);
    if (!projectRef) {
      sendJSON(res, 400, { ok: false, error: 'invalid_project_id' });
      return null;
    }

    const actorUserId = Number(sessionWrap?.session?.user_id || 0);
    if (!Number.isFinite(actorUserId) || actorUserId <= 0) {
      sendJSON(res, 403, { ok: false, error: 'forbidden_template_manage_project' });
      return null;
    }
    const projectPerms = stmts.findProjectUserRole.get(actorUserId, projectRef);
    if (Number(projectPerms?.can_launch_render) !== 1) {
      sendJSON(res, 403, { ok: false, error: 'forbidden_template_manage_project' });
      return null;
    }

    return {
      perms,
      projectRef,
      project: projectResolved.project,
      projectPermissions: buildProjectPermissionPayload(projectPerms),
    };
  }

  function requireRenderLaunchForProject(
    sessionWrap,
    res,
    sendJSON,
    rawProjectRef,
    {
      forbiddenError = 'forbidden_project_render_launch',
    } = {}
  ) {
    if (!sessionWrap || !sessionWrap.session) return null;
    const projectRefInput = sanitizeProjectRef(rawProjectRef);
    if (!projectRefInput) {
      sendJSON(res, 400, { ok: false, error: 'invalid_project_id' });
      return null;
    }

    const rolesCache = getRolesCache();
    const roleKey =
      resolveRoleInput(sessionWrap?.session?.role, rolesCache, DEFAULT_FALLBACK_ROLE) || DEFAULT_FALLBACK_ROLE;
    const perms = rolePermissions(roleKey, rolesCache);
    if (perms.canLaunchRenders !== true) {
      sendJSON(res, 403, { ok: false, error: 'forbidden' });
      return null;
    }
    if (perms.canManageProjectPermissions === true) {
      return {
        perms,
        projectRef: projectRefInput,
        project: null,
        projectPermissions: null,
      };
    }

    const projectResolved = resolveProjectForApi(sharedStore, projectRefInput, stmts);
    if (!projectResolved.ok) {
      sendJSON(res, 400, { ok: false, error: projectResolved.error || 'invalid_project_id' });
      return null;
    }
    const projectRef = sanitizeProjectRef(projectResolved.projectRef || projectRefInput);
    if (!projectRef) {
      sendJSON(res, 400, { ok: false, error: 'invalid_project_id' });
      return null;
    }

    const actorUserId = Number(sessionWrap?.session?.user_id || 0);
    if (!Number.isFinite(actorUserId) || actorUserId <= 0) {
      sendJSON(res, 403, { ok: false, error: forbiddenError });
      return null;
    }

    const projectPerms = stmts.findProjectUserRole.get(actorUserId, projectRef);
    if (Number(projectPerms?.can_launch_render) !== 1) {
      sendJSON(res, 403, { ok: false, error: forbiddenError });
      return null;
    }

    return {
      perms,
      projectRef,
      project: projectResolved.project,
      projectPermissions: buildProjectPermissionPayload(projectPerms),
    };
  }

  function requireRenderDispatch(sessionWrap, res, sendJSON) {
    if (!sessionWrap || !sessionWrap.session) return false;
    const perms = rolePermissions(sessionWrap.session.role, getRolesCache());
    if (perms.canLaunchRenders !== true) {
      sendJSON(res, 403, { ok: false, error: 'forbidden_dispatch' });
      return false;
    }
    return perms;
  }

  function sweepStaleWorkersAndRequeue(now, cutoff, actorUserId = 0) {
    const staleRunning = stmts.listStaleRunningRenderJobs.all(cutoff);
    stmts.markStaleRenderWorkersOffline.run(now, cutoff);
    if (!Array.isArray(staleRunning) || staleRunning.length === 0) return 0;
    const safeActorUserId = Number.isFinite(Number(actorUserId))
      ? Math.trunc(Number(actorUserId))
      : 0;
    const requeued = db.transaction(() => {
      let count = 0;
      for (const row of staleRunning) {
        const renderId = Number(row?.id || 0);
        if (!Number.isFinite(renderId) || renderId <= 0) continue;
        const updated = stmts.requeueRenderJobForOfflineWorker.run(now, renderId);
        if (Number(updated?.changes || 0) <= 0) continue;
        stmts.clearRenderWorkerCurrentJobByRenderId.run(now, renderId);
        if (safeActorUserId > 0) {
          stmts.insertRenderJobEvent.run(
            renderId,
            'Running',
            'Queued',
            safeActorUserId,
            'worker_offline_requeue',
            now
          );
        }
        count += 1;
      }
      return count;
    })();
    if (requeued > 0 && safeActorUserId > 0) {
      audit(
        safeActorUserId,
        'renders_requeued_worker_offline',
        { count: requeued },
        'render',
        ''
      );
    }
    return requeued;
  }

  return {
    asCount,
    requireSession,
    requireManageUsers,
    requireBanUsers,
    requireManageProjectPermissions,
    requireManageRoles,
    requireRenderTemplateManage,
    requireRenderTemplateManageForProject,
    requireRenderLaunchForProject,
    requireRenderDispatch,
    sweepStaleWorkersAndRequeue,
  };
}

module.exports = {
  createPostprodAuthGuards,
};
