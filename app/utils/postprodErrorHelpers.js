function resolvePostprodAuthError(err, t) {
  const code = String(err?.code || '').trim().toLowerCase();
  const status = Number(err?.status || 0);
  const rawMessage = String(err?.message || '').trim().toLowerCase();
  if (code === 'missing_credentials') return t('postprod.auth.error.missingCredentials');
  if (code === 'invalid_credentials') return t('postprod.auth.error.invalidCredentials');
  if (code === 'account_locked') return t('postprod.auth.error.accountLocked');
  if (code === 'missing_token' || code === 'invalid_session') return t('postprod.auth.error.invalidSession');
  if (code === 'postprod_unavailable' || code === 'not_found' || code === 'method_not_allowed') {
    return t('postprod.auth.error.unavailable');
  }
  if (
    status === 0
    || rawMessage.includes('failed to fetch')
    || rawMessage.includes('network')
    || rawMessage.includes('econnrefused')
    || rawMessage.includes('connect')
    || rawMessage.includes('timeout')
  ) {
    return t('postprod.auth.error.unavailable');
  }
  return t('postprod.auth.error.generic');
}

function resolvePostprodUsersError(err, t) {
  const code = String(err?.code || '').trim().toLowerCase();
  if (code === 'forbidden') return t('postprod.users.error.forbidden');
  if (code === 'forbidden_ban_users') return t('postprod.users.error.forbiddenBanUsers');
  if (code === 'forbidden_project_permissions_manage') return t('postprod.users.error.forbiddenProjectPermissionsManage');
  if (code === 'invalid_user_id') return t('postprod.users.error.invalidUser');
  if (code === 'user_not_found') return t('postprod.users.error.userNotFound');
  if (code === 'forbidden_role_assignment') return t('postprod.users.error.forbiddenRoleAssignment');
  if (code === 'username_exists') return t('postprod.users.error.usernameExists');
  if (code === 'display_name_exists') return t('postprod.users.error.displayNameExists');
  if (code === 'username_read_only') return t('postprod.users.error.usernameReadOnly');
  if (code === 'missing_display_name') return t('postprod.users.error.missingDisplayName');
  if (code === 'missing_username' || code === 'invalid_username') return t('postprod.users.error.invalidUsername');
  if (code === 'invalid_password') return t('postprod.users.error.invalidPassword');
  if (code === 'invalid_email') return t('postprod.users.error.invalidEmail');
  if (code === 'invalid_avatar_path') return t('postprod.users.error.invalidAvatarPath');
  if (code === 'invalid_failed_login_count') return t('postprod.users.error.invalidFailedLoginCount');
  if (code === 'invalid_locked_until') return t('postprod.users.error.invalidLockedUntil');
  if (code === 'invalid_role') return t('postprod.users.error.invalidRole');
  if (code === 'no_changes') return t('postprod.users.error.noChanges');
  if (code === 'cannot_disable_self') return t('postprod.users.error.cannotDisableSelf');
  if (code === 'cannot_delete_self') return t('postprod.users.error.cannotDeleteSelf');
  if (code === 'last_manage_roles_user_forbidden') return t('postprod.users.error.lastManageRolesUserForbidden');
  if (code === 'user_has_linked_data') return t('postprod.users.error.userHasLinkedData');
  if (code === 'missing_token' || code === 'invalid_session') return t('postprod.auth.error.invalidSession');
  return t('postprod.users.error.generic');
}

function resolvePostprodActivityError(err, t) {
  const code = String(err?.code || '').trim().toLowerCase();
  if (code === 'missing_token' || code === 'invalid_session') return t('postprod.auth.error.invalidSession');
  if (code === 'invalid_from_at') return t('postprod.activity.error.invalidFromAt');
  if (code === 'invalid_to_at') return t('postprod.activity.error.invalidToAt');
  if (code === 'invalid_activity_range') return t('postprod.activity.error.invalidRange');
  if (code === 'invalid_activity_action_type') return t('postprod.activity.error.invalidActionType');
  return t('postprod.profile.activity.error.generic');
}

function resolvePostprodAuditError(err, t) {
  const code = String(err?.code || '').trim().toLowerCase();
  if (code === 'missing_token' || code === 'invalid_session') return t('postprod.auth.error.invalidSession');
  return t('postprod.audit.error.generic');
}

function resolvePostprodRolesError(err, t) {
  const code = String(err?.code || '').trim().toLowerCase();
  if (code === 'forbidden') return t('postprod.roles.error.forbidden');
  if (code === 'role_exists') return t('postprod.roles.error.roleExists');
  if (code === 'invalid_role_key') return t('postprod.roles.error.invalidRoleKey');
  if (code === 'invalid_manageable_roles') return t('postprod.roles.error.invalidManageableRoles');
  if (code === 'invalid_mode_access') return t('postprod.roles.error.invalidModeAccess');
  if (code === 'last_manage_roles_forbidden') return t('postprod.roles.error.lastManageRolesForbidden');
  if (code === 'role_not_found') return t('postprod.roles.error.roleNotFound');
  if (code === 'missing_token' || code === 'invalid_session') return t('postprod.auth.error.invalidSession');
  return t('postprod.roles.error.generic');
}

function resolvePostprodTasksError(err, t) {
  const code = String(err?.code || '').trim().toLowerCase();
  const status = Number(err?.status || 0);
  if (code === 'method_not_allowed' || status === 405) return t('postprod.tasks.error.methodNotAllowed');
  if (code === 'forbidden' || status === 403) return t('postprod.tasks.error.forbidden');
  if (code === 'missing_task_title') return t('postprod.tasks.error.missingTitle');
  if (code === 'invalid_task_id') return t('postprod.tasks.error.invalidTask');
  if (code === 'task_not_found') return t('postprod.tasks.error.taskNotFound');
  if (code === 'no_changes') return t('postprod.tasks.error.noChanges');
  if (code === 'invalid_status') return t('postprod.tasks.error.invalidStatus');
  if (code === 'forbidden_validation') return t('postprod.tasks.error.forbiddenValidation');
  if (code === 'invalid_due_at') return t('postprod.tasks.error.invalidDueAt');
  if (code === 'invalid_assignee') return t('postprod.tasks.error.invalidAssignee');
  if (code === 'invalid_request_type') return t('postprod.tasks.error.invalidRequestType');
  if (code === 'assignee_required_for_in_progress') return t('postprod.tasks.error.assigneeRequiredForInProgress');
  if (code === 'auto_render_project_required') return t('postprod.tasks.error.autoRenderProjectRequired');
  if (code === 'project_not_render_enabled') return t('postprod.tasks.error.projectNotAutoRenderable');
  if (code === 'missing_task_auto_render_template') return t('postprod.tasks.error.missingAutoRenderTemplate');
  if (code === 'invalid_task_auto_render_config') return t('postprod.tasks.error.invalidAutoRenderConfig');
  if (code === 'invalid_task_auto_render_payload') return t('postprod.tasks.error.invalidAutoRenderPayload');
  if (code === 'task_auto_render_config_too_large') return t('postprod.tasks.error.autoRenderConfigTooLarge');
  if (code === 'invalid_project_refs') return t('postprod.tasks.error.invalidProjectRefs');
  if (code === 'invalid_resource_refs') return t('postprod.tasks.error.invalidResourceRefs');
  if (code === 'missing_token' || code === 'invalid_session') return t('postprod.auth.error.invalidSession');
  return t('postprod.tasks.error.generic');
}

function resolvePostprodRendersError(err, t) {
  const code = String(err?.code || '').trim().toLowerCase();
  if (code === 'missing_render_template_name') return t('postprod.renders.error.missingTemplateName');
  if (code === 'missing_render_template_preset_name') return t('postprod.renders.error.missingPresetName');
  if (code === 'render_template_name_exists') return t('postprod.renders.error.presetNameExists');
  if (code === 'invalid_render_template_id') return t('postprod.renders.error.invalidRender');
  if (code === 'render_template_not_found') return t('postprod.renders.error.renderNotFound');
  if (code === 'unknown_project') return t('postprod.renders.error.unknownProject');
  if (code === 'project_not_render_enabled') return t('postprod.renders.error.projectNotAutoRenderable');
  if (code === 'invalid_render_id') return t('postprod.renders.error.invalidRender');
  if (code === 'missing_linked_task' || code === 'task_not_found') return t('postprod.tasks.error.taskNotFound');
  if (code === 'invalid_worker_key') return t('postprod.renders.error.invalidWorker');
  if (code === 'invalid_worker_capabilities') return t('postprod.renders.error.invalidPayload');
  if (code === 'worker_capabilities_too_large') return t('postprod.renders.error.payloadTooLarge');
  if (code === 'invalid_render_template_execution') return t('postprod.renders.error.invalidExecution');
  if (code === 'render_template_payload_too_large') return t('postprod.renders.error.payloadTooLarge');
  if (code === 'render_not_found') return t('postprod.renders.error.renderNotFound');
  if (code === 'render_not_running') return t('postprod.renders.error.invalidStatus');
  if (code === 'render_running_cannot_delete') return t('postprod.renders.error.invalidStatus');
  if (code === 'invalid_render_status') return t('postprod.renders.error.invalidStatus');
  if (code === 'forbidden_worker_assignment') return t('postprod.renders.error.forbiddenTransition');
  if (code === 'forbidden_dispatch') return t('postprod.renders.error.forbiddenDispatch');
  if (code === 'forbidden_template_manage') return t('postprod.renders.error.forbiddenTemplateManage');
  if (code === 'forbidden_template_manage_project') return t('postprod.renders.error.forbiddenTemplateManage');
  if (code === 'forbidden_project_render_launch') return t('postprod.renders.error.forbiddenTransition');
  if (code === 'forbidden_project_render_transition') return t('postprod.renders.error.forbiddenTransition');
  if (code === 'forbidden_project_render_worker_complete') return t('postprod.renders.error.forbiddenTransition');
  if (code === 'forbidden_render_review_role') return t('postprod.renders.error.forbiddenReviewRole');
  if (code === 'forbidden_render_transition' || code === 'forbidden') return t('postprod.renders.error.forbiddenTransition');
  if (code === 'render_validation_not_required') return t('postprod.renders.error.validationNotRequired');
  if (code === 'render_already_validated') return t('postprod.renders.error.alreadyValidated');
  if (code === 'render_validation_requires_done') return t('postprod.renders.error.validationRequiresDone');
  if (code === 'invalid_render_payload') return t('postprod.renders.error.invalidPayload');
  if (code === 'render_payload_too_large') return t('postprod.renders.error.payloadTooLarge');
  if (code === 'no_changes') return t('postprod.renders.error.noChanges');
  if (code === 'missing_token' || code === 'invalid_session') return t('postprod.auth.error.invalidSession');
  return t('postprod.renders.error.generic');
}

function resolvePostprodResourcesError(err, t) {
  const code = String(err?.code || '').trim().toLowerCase();
  if (code === 'invalid_resource_id') return t('postprod.resources.error.invalidResource');
  if (code === 'resource_not_found') return t('postprod.resources.error.notFound');
  if (code === 'forbidden_dispatch') return t('postprod.resources.error.forbiddenReindex');
  if (code === 'resources_reindex_failed' || code === 'library_unavailable') return t('postprod.resources.error.reindexFailed');
  if (code === 'missing_token' || code === 'invalid_session') return t('postprod.auth.error.invalidSession');
  return t('postprod.resources.error.generic');
}

function resolvePostprodProjectsError(err, t) {
  const code = String(err?.code || '').trim().toLowerCase();
  if (code === 'invalid_project_id') return 'Projet invalide.';
  if (code === 'unknown_project') return 'Projet introuvable.';
  if (code === 'missing_project_uproject_path') return 'Chemin .uproject manquant pour ce projet.';
  if (code === 'missing_wrc_file') return 'Fichier WRC manquant.';
  if (code === 'missing_preset_name') return 'Preset WRC manquant.';
  if (code === 'wrc_preset_unreachable_no_snapshot') return t('production.error.wrcUnreachableNoSnapshot');
  if (code === 'wrc_preset_unreachable') return 'Preset WRC inaccessible (verifie Unreal ouvert + Web Remote Control actif).';
  if (code === 'wrc_fetch_failed') return 'Preset WRC inaccessible (connexion refusee). Verifie Unreal ouvert + Web Remote Control actif.';
  if (code === 'wrc_timeout') return 'Preset WRC inaccessible (timeout). Verifie le port RC HTTP et l\'accessibilite de la station.';
  if (code === 'invalid_wrc_payload') return 'Reponse WRC invalide.';
  if (code.startsWith('wrc_http_')) {
    const httpCode = code.slice('wrc_http_'.length) || 'erreur';
    return `Preset WRC inaccessible (HTTP ${httpCode}).`;
  }
  if (code === 'forbidden_sync' || code === 'forbidden_project_sync_not_referent') {
    return 'Synchronisation projet non autorisee.';
  }
  if (code === 'missing_token' || code === 'invalid_session') return t('postprod.auth.error.invalidSession');
  const message = String(err?.message || '').toLowerCase();
  if (message.includes('fetch failed')) {
    return 'Preset WRC inaccessible (connexion refusee). Verifie Unreal ouvert + Web Remote Control actif.';
  }
  return t('postprod.projects.error');
}

function resolvePostprodDataError(err, t) {
  const code = String(err?.code || '').trim().toLowerCase();
  if (code === 'invalid_project_id') return 'Projet invalide.';
  if (code === 'invalid_data_table_id') return 'Table de donnees invalide.';
  if (code === 'data_table_not_found') return 'Table de donnees introuvable.';
  if (code === 'missing_data_table_schema') return 'Schema de table manquant.';
  if (code === 'invalid_data_table_schema') return 'Schema de table invalide.';
  if (code === 'data_table_schema_too_large') return 'Schema de table trop volumineux.';
  if (code === 'invalid_data_row_key') return 'Cle de ligne invalide.';
  if (code === 'invalid_data_row_payload') return 'Payload de ligne invalide.';
  if (code === 'missing_token' || code === 'invalid_session') return t('postprod.auth.error.invalidSession');
  return 'Erreur datas post-production.';
}

export {
  resolvePostprodAuthError,
  resolvePostprodUsersError,
  resolvePostprodActivityError,
  resolvePostprodAuditError,
  resolvePostprodRolesError,
  resolvePostprodTasksError,
  resolvePostprodRendersError,
  resolvePostprodResourcesError,
  resolvePostprodProjectsError,
  resolvePostprodDataError,
};
