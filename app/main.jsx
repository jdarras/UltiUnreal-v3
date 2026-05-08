// app/main.jsx
import React, { useEffect, useState, Suspense, lazy, useCallback, useMemo, useRef } from "react";
import { createRoot } from "react-dom/client";

import Welcome from "./screens/welcome.jsx";
import SetupScreen from "./screens/setup.jsx";
import AuthGateScreen from "./screens/authgate.jsx";
// Chargement différé des écrans lourds
const ProjectsScreen = lazy(() => import("./screens/projects.jsx"));
const ResourcesScreen = lazy(() => import("./screens/resources.jsx"));
const LogsScreen = lazy(() => import("./screens/logs.jsx"));
const LaunchControlScreen = lazy(() => import("./screens/launchcontrol.jsx"));
const ProductionScreen = lazy(() => import("./screens/production.jsx"));
const SynchronisationScreen = lazy(() => import("./screens/synchronisation.jsx"));
const ConfigurationScreen = lazy(() => import("./screens/configuration.jsx"));
const LicenseScreen = lazy(() => import("./screens/license.jsx"));
const PostProductionScreen = lazy(() => import("./screens/postproduction.jsx"));
const preloaders = {
  Projets: () => import("./screens/projects.jsx"),
  Ressources: () => import("./screens/resources.jsx"),
  Synchronisation: () => import("./screens/synchronisation.jsx"),
  "Launch Control": () => import("./screens/launchcontrol.jsx"),
  Production: () => import("./screens/production.jsx"),
  Logs: () => import("./screens/logs.jsx"),
  Configuration: () => import("./screens/configuration.jsx"),
  License: () => import("./screens/license.jsx"),
  Utilisateurs: () => import("./screens/postproduction.jsx"),
  Dashboard: () => import("./screens/postproduction.jsx"),
  Rendus: () => import("./screens/postproduction.jsx"),
  RendusCreate: () => import("./screens/postproduction.jsx"),
  Datas: () => import("./screens/postproduction.jsx"),
  Profils: () => import("./screens/postproduction.jsx"),
};
import {
  getCommon,
  getHosts,
  getProjects,
  getLibraryMeta,
  getLogsStorage,
  postCommon,
  postLaunch,
  postPresence,
  postprodAuthLogin,
  postprodAuthMe,
  postprodUpdateMe,
  postprodAuthLogout,
  postprodListUsers,
  postprodCreateUser,
  postprodUpdateUser,
  postprodDeleteUser,
  postprodListUserProjectPermissions,
  postprodUpdateUserProjectPermissions,
  postprodListUserActivity,
  postprodPurgeUserActivity,
  postprodListMyActivity,
  postprodListAudit,
  postprodPurgeAudit,
  postprodGetRenderHealthAuditMaintenance,
  postprodPurgeRenderHealthAudit,
  postprodExportAuditCsv,
  postprodExportAuditJson,
  postprodExportAuditNdjson,
  postprodListRoles,
  postprodCreateRole,
  postprodUpdateRole,
  postprodDeleteRole,
  postprodListTasks,
  postprodListProjects,
  postprodListProjectRenderTemplates,
  postprodGetProjectUnrealCatalog,
  postprodGetProjectWrcFields,
  postprodSyncProject,
  postprodListProjectDataTables,
  postprodUpdateDataTable,
  postprodUpsertDataTableRow,
  postprodListResources,
  postprodReindexResources,
  postprodGetResource,
  postprodCreateTask,
  postprodUpdateTask,
  postprodDeleteTask,
  postprodTransitionTask,
  postprodListRenders,
  postprodListUserAlerts,
  postprodListRemoteJobsByStation,
  postprodGetRenderJob,
  postprodListRenderTemplates,
  postprodCreateRenderTemplate,
  postprodUpdateRenderTemplate,
  postprodDeleteRenderTemplate,
  postprodListRenderForms,
  postprodCreateRenderForm,
  postprodUpdateRenderForm,
  postprodDeleteRenderForm,
  postprodListRenderFormFields,
  postprodReplaceRenderFormFields,
  postprodGetHealth,
  postprodCreateRender,
  postprodReserveRenderId,
  postprodScheduleRenderJob,
  postprodUpdateRenderExportDestinations,
  postprodDeleteRenderJob,
  postprodReorderRenderJobs,
  postprodTransitionRender,
  postprodDispatchRenders,
  postprodSaveDispatchPolicy,
  postprodListRenderWorkers,
  postprodUpsertRenderWorker,
  postprodCompleteRenderWorkerJob,
  postprodPatchRenderWorkerAptitude,
  postprodListRenderTransitions,
  postprodRegenerateAllProxies,
  setAgentRenderAvailability,
  spawnDetachedRender,
  checkPidAlive,
  checkFileExists,
  findRenderOutputs,
  readRenderPid,
  deleteRenderPid,
  getOnlineMap,
} from "./utils/agent";

import { AptitudeCheckModal } from "./screens/postproduction/renders/components/AptitudeCheckModal";
import "./global.css";
import { readIdentity, writeIdentity } from "./utils/identity";
import { createT } from "./i18n";
import { NoticeContext } from "./NoticeContext";
import { buildTaskAutoRenderStateByTaskId } from "./screens/postproduction/renderEditor/helpers";
import { buildRenderQueueTasks } from "./screens/postproduction/renders/hooks/queue/buildRenderQueueTasks";
import { getQueueEntryLaunchMeta } from "./screens/postproduction/renders/hooks/queue/queueDerivedDataHelpers";
import { launchScheduledTaskRenderAction } from "./screens/postproduction/renders/hooks/queue/queueLaunchControllerHelpers";

const APP_VERSION = "2026.3"; // à mettre à jour quand tu changes de version
const LS_SYNC_KEY = 'uu_client_syncEnabled';
const LS_POSTPROD_AUTH_KEY = 'uu_postprod_auth';
const LS_POSTPROD_OFFLINE_OUTBOX_KEY = 'uu_postprod_offline_outbox_v1';
const LS_POSTPROD_WORKER_COMPLETION_OUTBOX_KEY = 'uu_postprod_worker_completion_outbox_v1';
const LS_POSTPROD_RENDERS_QUEUE_RUNTIME_MODE_KEY = 'uu_postprod_renders_validation_queue_runtime_mode';
const MAX_POSTPROD_OFFLINE_OUTBOX_ITEMS = 100;
const MAX_POSTPROD_WORKER_COMPLETION_OUTBOX_ITEMS = 200;
const POSTPROD_OFFLINE_REPLAY_MIN_INTERVAL_MS = 15000;
const POSTPROD_WORKER_COMPLETION_REPLAY_MIN_INTERVAL_MS = 5000;
const ScreenFallback = <div className="uu-loading" style={{ padding: '24px' }}>…</div>;
const APP_MODE_LIVE = 'live';
const APP_MODE_POSTPROD = 'postprod';
const POSTPROD_TAB_USERS = "Utilisateurs";
const POSTPROD_TAB_PROFILES = "Profils";
const POSTPROD_TAB_RENDERS_CREATE = "RendusCreate";
const POSTPROD_TABS_BASE = [
  POSTPROD_TAB_USERS,
  "Projets",
  "Synchronisation",
  "Ressources",
  "Datas",
  "Rendus",
  POSTPROD_TAB_RENDERS_CREATE,
];
function normalizeTaskCatalogOptions(entries = []) {
  const out = [];
  const seen = new Set();
  const list = Array.isArray(entries) ? entries : [];
  for (const entry of list) {
    const ref = String(entry?.ref || "").trim();
    if (!ref || seen.has(ref)) continue;
    seen.add(ref);
    const id = String(entry?.id || "").trim();
    const name = String(entry?.name || "").trim();
    const usageMode = String(entry?.usageMode || "").trim();
    const uprojectPath = String(entry?.uprojectPath || "").trim();
    const metaStatus = String(entry?.metaStatus || "").trim();
    out.push({
      ref,
      label: String(entry?.label || ref).trim() || ref,
      id,
      name,
      usageMode,
      uprojectPath,
      metaStatus,
    });
  }
  out.sort((a, b) => a.label.localeCompare(b.label));
  return out;
}

function mapTaskProjectOptions(payload = {}) {
  const projects = Array.isArray(payload?.projects) ? payload.projects : [];
  return normalizeTaskCatalogOptions(
    projects.map((project) => {
      const id = String(project?.id || "").trim();
      const name = String(project?.name || "").trim();
      const usageMode = String(project?.metaUsageMode || project?.usageMode || "").trim();
      const uprojectPath = String(project?.uprojectPath || project?.uproject || '').trim();
      const metaStatus = String(project?.metaStatus || project?.status || "").trim();
      return {
        ref: id || name,
        label: name || id,
        id: id || '',
        name: name || '',
        uprojectPath,
        usageMode: usageMode || '',
        metaStatus: metaStatus || '',
      };
    })
  );
}

function mapTaskResourceOptions(payload = {}) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  return normalizeTaskCatalogOptions(
    items.map((item) => {
      const uid = String(item?.uid || item?.listingUid || "").trim();
      const title = String(item?.title || item?.name || item?.displayName || "").trim();
      return {
        ref: uid || title,
        label: title && uid ? `${title} [${uid}]` : (title || uid),
      };
    })
  );
}

function mapRenderExportDestinationOptions(commonCfg = {}, unnamedLabel = "") {
  const entries = Array.isArray(commonCfg?.renderExportDestinations)
    ? commonCfg.renderExportDestinations
    : (
      Array.isArray(commonCfg?.render_export_destinations)
        ? commonCfg.render_export_destinations
        : []
    );
  const out = [];
  const seen = new Set();
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;
    if (entry.isActive === false) continue;
    const id = String(entry?.id || "").trim().toLowerCase();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const rawLabel = String(entry?.name || entry?.label || "").trim();
    const looksTechnicalId = /^dest-\d+$/i.test(rawLabel || id);
    const fallbackLabel = String(unnamedLabel || "").trim();
    const label = rawLabel && !looksTechnicalId
      ? rawLabel
      : (fallbackLabel || id);
    out.push({ value: id, label });
  }
  out.sort((a, b) => String(a.label || "").localeCompare(String(b.label || "")));
  return out;
}

function getPostprodTabsForUser(
  user = null,
  authenticated = false,
  {
    resourcesEnabled = true,
  } = {}
) {
  if (!authenticated || !user || typeof user !== 'object') return [POSTPROD_TAB_USERS];
  const canManageUsers = user?.permissions?.canManageUsers === true;
  const canManageRoles = user?.permissions?.canManageRoles === true;
  const canManageForms = user?.permissions?.canManageForms === true;
  const canCreateTasks = user?.permissions?.canCreateTasks !== false;
  const canSyncScenes = user?.permissions?.canSyncScenes === true;
  const canViewResources = user?.permissions?.canViewResources !== false;
  const canAccessResources = canViewResources && resourcesEnabled;
  const tabs = [];
  if (canManageRoles) tabs.push(POSTPROD_TAB_PROFILES);
  tabs.push(POSTPROD_TAB_USERS);
  tabs.push(
    ...POSTPROD_TABS_BASE.filter(
      (tab) => (
        tab !== POSTPROD_TAB_USERS
        && (tab !== "Datas" || canManageForms)
        && (tab !== "Ressources" || canAccessResources)
        && (tab !== POSTPROD_TAB_RENDERS_CREATE || canCreateTasks)
        && (tab !== "Synchronisation" || canSyncScenes)
      )
    )
  );
  return tabs;
}

function getModeAccessForUser(user = null, authenticated = false) {
  if (!authenticated || !user || typeof user !== "object") {
    return {
      canUseLive: true,
      canUsePostprod: true,
      canChooseMode: true,
      forcedMode: null,
    };
  }

  const explicitCanUseLive = user?.permissions?.canUseLiveMode;
  const explicitCanUsePostprod = user?.permissions?.canUsePostprodMode;
  const canUseLive = typeof explicitCanUseLive === "boolean"
    ? explicitCanUseLive
    : true;
  const canUsePostprod = typeof explicitCanUsePostprod === "boolean"
    ? explicitCanUsePostprod
    : true;
  const canChooseMode = canUseLive && canUsePostprod;
  const forcedMode = canChooseMode
    ? null
    : (canUsePostprod ? APP_MODE_POSTPROD : (canUseLive ? APP_MODE_LIVE : APP_MODE_POSTPROD));

  return {
    canUseLive,
    canUsePostprod,
    canChooseMode,
    forcedMode,
  };
}

function readPostprodAuth() {
  try {
    const raw = localStorage.getItem(LS_POSTPROD_AUTH_KEY);
    if (!raw) return { token: '', user: null, expiresAt: '' };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { token: '', user: null, expiresAt: '' };
    return {
      token: String(parsed.token || '').trim(),
      user: parsed.user && typeof parsed.user === 'object' ? parsed.user : null,
      expiresAt: String(parsed.expiresAt || '').trim(),
    };
  } catch {
    return { token: '', user: null, expiresAt: '' };
  }
}

function isPostprodQueueRuntimeActive() {
  try {
    const raw = String(localStorage.getItem(LS_POSTPROD_RENDERS_QUEUE_RUNTIME_MODE_KEY) || "").trim().toLowerCase();
    return raw !== "paused";
  } catch {
    return true;
  }
}

function writePostprodAuth(next = null) {
  try {
    if (!next || typeof next !== 'object' || !next.token) {
      localStorage.removeItem(LS_POSTPROD_AUTH_KEY);
      return;
    }
    localStorage.setItem(LS_POSTPROD_AUTH_KEY, JSON.stringify({
      token: String(next.token || '').trim(),
      user: next.user && typeof next.user === 'object' ? next.user : null,
      expiresAt: String(next.expiresAt || '').trim(),
    }, null, 2));
  } catch {}
}

function normalizePostprodOfflineOutbox(entries = []) {
  const list = Array.isArray(entries) ? entries : [];
  const normalized = [];
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') continue;
    const id = String(raw?.id || '').trim();
    const kind = String(raw?.kind || '').trim().toLowerCase();
    if (!id || kind !== 'create_render') continue;
    const payload = raw?.payload && typeof raw.payload === 'object' ? raw.payload : {};
    const userIdRaw = Number(raw?.userId || 0);
    const userId = Number.isFinite(userIdRaw) && userIdRaw > 0 ? Math.trunc(userIdRaw) : null;
    const attemptsRaw = Number(raw?.attempts || 0);
    normalized.push({
      id,
      kind: 'create_render',
      userId,
      payload,
      createdAt: String(raw?.createdAt || '').trim(),
      attempts: Number.isFinite(attemptsRaw) && attemptsRaw > 0 ? Math.trunc(attemptsRaw) : 0,
      lastAttemptAt: String(raw?.lastAttemptAt || '').trim(),
      lastError: String(raw?.lastError || '').trim(),
    });
  }
  if (normalized.length <= MAX_POSTPROD_OFFLINE_OUTBOX_ITEMS) return normalized;
  return normalized.slice(normalized.length - MAX_POSTPROD_OFFLINE_OUTBOX_ITEMS);
}

function readPostprodOfflineOutbox() {
  try {
    const raw = localStorage.getItem(LS_POSTPROD_OFFLINE_OUTBOX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return normalizePostprodOfflineOutbox(parsed);
  } catch {
    return [];
  }
}

function writePostprodOfflineOutbox(entries = []) {
  try {
    const normalized = normalizePostprodOfflineOutbox(entries);
    if (normalized.length <= 0) {
      localStorage.removeItem(LS_POSTPROD_OFFLINE_OUTBOX_KEY);
      return;
    }
    localStorage.setItem(
      LS_POSTPROD_OFFLINE_OUTBOX_KEY,
      JSON.stringify(normalized, null, 2)
    );
  } catch {}
}

function normalizePostprodWorkerCompletionOutbox(entries = []) {
  const list = Array.isArray(entries) ? entries : [];
  const normalized = [];
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') continue;
    const id = String(raw?.id || '').trim();
    const kind = String(raw?.kind || '').trim().toLowerCase();
    const workerKey = String(raw?.workerKey || '').trim();
    const renderIdRaw = Number(raw?.renderId || 0);
    const renderId = Number.isFinite(renderIdRaw) && renderIdRaw > 0 ? Math.trunc(renderIdRaw) : 0;
    if (!id || kind !== 'worker_complete' || !workerKey || renderId <= 0) continue;
    const payload = raw?.payload && typeof raw.payload === 'object' ? raw.payload : {};
    const userIdRaw = Number(raw?.userId || 0);
    const userId = Number.isFinite(userIdRaw) && userIdRaw > 0 ? Math.trunc(userIdRaw) : null;
    const attemptsRaw = Number(raw?.attempts || 0);
    normalized.push({
      id,
      kind: 'worker_complete',
      workerKey,
      renderId,
      userId,
      payload,
      createdAt: String(raw?.createdAt || '').trim(),
      attempts: Number.isFinite(attemptsRaw) && attemptsRaw > 0 ? Math.trunc(attemptsRaw) : 0,
      lastAttemptAt: String(raw?.lastAttemptAt || '').trim(),
      lastError: String(raw?.lastError || '').trim(),
    });
  }
  if (normalized.length <= MAX_POSTPROD_WORKER_COMPLETION_OUTBOX_ITEMS) return normalized;
  return normalized.slice(normalized.length - MAX_POSTPROD_WORKER_COMPLETION_OUTBOX_ITEMS);
}

function readPostprodWorkerCompletionOutbox() {
  try {
    const raw = localStorage.getItem(LS_POSTPROD_WORKER_COMPLETION_OUTBOX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return normalizePostprodWorkerCompletionOutbox(parsed);
  } catch {
    return [];
  }
}

function writePostprodWorkerCompletionOutbox(entries = []) {
  try {
    const normalized = normalizePostprodWorkerCompletionOutbox(entries);
    if (normalized.length <= 0) {
      localStorage.removeItem(LS_POSTPROD_WORKER_COMPLETION_OUTBOX_KEY);
      return;
    }
    localStorage.setItem(
      LS_POSTPROD_WORKER_COMPLETION_OUTBOX_KEY,
      JSON.stringify(normalized, null, 2)
    );
  } catch {}
}

function isPostprodRecoverableOfflineError(err) {
  const status = Number(err?.status || 0);
  if (!Number.isFinite(status) || status === 0) return true;
  if (status >= 500 && status <= 599) return true;
  const code = String(err?.code || '').trim().toLowerCase();
  if (!code && status <= 0) return true;
  if (code === 'postprod_unavailable') return true;
  const message = String(err?.message || '').trim().toLowerCase();
  return (
    message.includes('failed to fetch') ||
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('abort')
  );
}

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
  if (code === 'invalid_employment_type') return t('postprod.users.error.invalidEmploymentType');
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
  if (code === 'wrc_timeout') return 'Preset WRC inaccessible (timeout). Verifie le port RC HTTP et l’accessibilite de la station.';
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

function normalizeAppMode(mode) {
  return String(mode || '').trim().toLowerCase() === APP_MODE_POSTPROD
    ? APP_MODE_POSTPROD
    : APP_MODE_LIVE;
}

function waitMs(ms = 0) {
  return new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, Number(ms) || 0));
  });
}

function summarizeProcessFailure(procRes = {}) {
  const code = Number(procRes?.code);
  const timedOut = procRes?.timedOut === true;
  const stderr = String(procRes?.stderr || '').trim();
  const error = String(procRes?.error || '').trim();
  if (timedOut) return 'worker_process_timeout';
  if (stderr) return stderr.slice(0, 400);
  if (error) return error.slice(0, 400);
  if (Number.isFinite(code)) return `worker_process_exit_${code}`;
  return 'worker_process_failed';
}

function compactProcessLogText(value = '', maxChars = 700) {
  const raw = String(value || '').replace(/\r\n/g, '\n').trim();
  const maxLen = Number.isFinite(Number(maxChars)) ? Math.max(80, Math.trunc(Number(maxChars))) : 700;
  if (!raw) return '';
  if (raw.length <= maxLen) return raw;
  return `...${raw.slice(raw.length - maxLen)}`;
}

function compactProcessLogTextMiddle(value = '', maxChars = 1200) {
  const raw = String(value || '').replace(/\r\n/g, '\n').trim();
  const maxLen = Number.isFinite(Number(maxChars)) ? Math.max(120, Math.trunc(Number(maxChars))) : 1200;
  if (!raw) return '';
  if (raw.length <= maxLen) return raw;
  const half = Math.max(40, Math.floor((maxLen - 12) / 2));
  const head = raw.slice(0, half);
  const tail = raw.slice(raw.length - half);
  return `${head}\n...[snip]...\n${tail}`;
}

function extractProcessDiagnosticLines(value = '', maxLines = 18) {
  const raw = String(value || '').replace(/\r\n/g, '\n');
  if (!raw) return [];
  const lines = raw.split('\n');
  const out = [];
  const seen = new Set();
  const rx = /(error|fatal|exception|failed|moviepipeline|uurender|remote ?control|not bound|invalid|missing|unknown|warning)/i;
  for (const line of lines) {
    const trimmed = String(line || '').trim();
    if (!trimmed) continue;
    if (/metadata set\s*:\s*commandline/i.test(trimmed)) continue;
    if (/^logcsvprofiler:/i.test(trimmed) && /commandline/i.test(trimmed)) continue;
    if (!rx.test(trimmed)) continue;
    const normalizedLine = trimmed.length > 340 ? `${trimmed.slice(0, 340)} ...` : trimmed;
    const key = normalizedLine.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalizedLine);
    if (out.length >= maxLines) break;
  }
  return out;
}

function buildWorkerProcessEventComment({
  command = '',
  args = [],
  procRes = {},
  workerLogPath = '',
  workerLogText = '',
} = {}) {
  const safeCommand = String(command || '').trim();
  const resolvedCommand = String(procRes?.command || '').trim();
  const safeArgs = Array.isArray(args)
    ? args.map((arg) => String(arg || '').trim()).filter(Boolean)
    : [];
  const cmdLine = [safeCommand, ...safeArgs].filter(Boolean).join(' ');
  const cmdLineShort = compactProcessLogTextMiddle(cmdLine, 1400);
  const exitCodeRaw = Number(procRes?.code);
  const hasExitCode = Number.isFinite(exitCodeRaw);
  const timedOut = procRes?.timedOut === true;
  const ok = procRes?.ok === true;
  const stdoutRaw = String(procRes?.stdout || '');
  const stderrRaw = String(procRes?.stderr || '');
  const stdoutTail = compactProcessLogText(stdoutRaw, 2400);
  const stderrTail = compactProcessLogText(stderrRaw, 2400);
  const stdoutHead = String(stdoutRaw || '').replace(/\r\n/g, '\n').slice(0, 900).trim();
  const stderrHead = String(stderrRaw || '').replace(/\r\n/g, '\n').slice(0, 900).trim();
  const diagnostics = [
    ...extractProcessDiagnosticLines(stderrRaw, 20),
    ...extractProcessDiagnosticLines(stdoutRaw, 20),
    ...extractProcessDiagnosticLines(workerLogText, 28),
  ].slice(0, 24);
  const out = [];
  if (cmdLineShort) out.push(`cmd: ${cmdLineShort}`);
  if (resolvedCommand && resolvedCommand !== safeCommand) {
    out.push(`cmd_resolved: ${resolvedCommand}`);
  }
  if (String(workerLogPath || '').trim()) out.push(`workerlog: ${String(workerLogPath).trim()}`);
  if (ok) out.push(`exit: ok${hasExitCode ? ` (${Math.trunc(exitCodeRaw)})` : ''}`);
  else if (timedOut) out.push('exit: timeout');
  else out.push(`exit: failed${hasExitCode ? ` (${Math.trunc(exitCodeRaw)})` : ''}`);
  if (diagnostics.length > 0) {
    out.push(`diagnostics:\n${diagnostics.join('\n')}`);
  }
  if (stderrHead) out.push(`stderr(head):\n${stderrHead}`);
  if (stderrTail) out.push(`stderr:\n${stderrTail}`);
  if (stdoutHead) out.push(`stdout(head):\n${stdoutHead}`);
  if (stdoutTail) out.push(`stdout:\n${stdoutTail}`);
  if (workerLogText) {
    const logHead = String(workerLogText || '').replace(/\r\n/g, '\n').slice(0, 900).trim();
    const logTail = compactProcessLogText(workerLogText, 2400);
    if (logHead) out.push(`workerlog(head):\n${logHead}`);
    if (logTail) out.push(`workerlog(tail):\n${logTail}`);
  }
  if (!out.length) return '';
  return out.join('\n');
}

function replaceProcessTemplateVars(input = '', context = {}) {
  const source = String(input == null ? '' : input);
  if (!source) return '';
  const values = context && typeof context === 'object' ? context : {};
  return source.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}|%([a-zA-Z0-9_]+)%/g, (_match, p1, p2) => {
    const keyRaw = String(p1 || p2 || '').trim();
    if (!keyRaw) return '';
    const key = keyRaw.toLowerCase();
    const value = values[key];
    if (value == null) return '';
    return String(value);
  });
}

function hasProcessTemplateToken(value = '') {
  const input = String(value || '');
  if (!input) return false;
  return /\{\{\s*[a-zA-Z0-9_]+\s*\}\}|%[a-zA-Z0-9_]+%/.test(input);
}

function encodeBase64Utf8(value = '') {
  const source = String(value == null ? '' : value);
  if (!source) return '';
  try {
    if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function') {
      return Buffer.from(source, 'utf8').toString('base64');
    }
  } catch {}
  try {
    if (typeof TextEncoder === 'function' && typeof btoa === 'function') {
      const bytes = new TextEncoder().encode(source);
      let binary = '';
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }
      return btoa(binary);
    }
  } catch {}
  return '';
}

function ensureRenderOutputExt(fileName = '', fallbackExt = '.mov') {
  const raw = String(fileName || '').trim();
  if (!raw) return '';
  if (/[\\/]\s*$/.test(raw)) return raw;
  if (/\.[a-z0-9]{2,6}$/i.test(raw)) return raw;
  return `${raw}${String(fallbackExt || '.mov')}`;
}

const RENDER_OUTPUT_VIDEO_EXTS = ['.mp4', '.mov', '.mxf', '.avi', '.webm', '.mkv'];
const RENDER_OUTPUT_IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.exr', '.tga', '.bmp', '.dpx', '.hdr'];
const RENDER_OUTPUT_ALL_EXTS = [...RENDER_OUTPUT_VIDEO_EXTS, ...RENDER_OUTPUT_IMAGE_EXTS];

function getRenderPathExtension(filePath = '') {
  const raw = String(filePath || '').trim();
  if (!raw) return '';
  const clean = raw.replace(/[\\/]+$/g, '');
  const fileName = clean.split(/[\\/]/).pop() || clean;
  const idx = fileName.lastIndexOf('.');
  if (idx <= 0) return '';
  return fileName.slice(idx).toLowerCase();
}

function replaceRenderPathExtension(filePath = '', nextExt = '') {
  const raw = String(filePath || '').trim();
  const ext = String(nextExt || '').trim().toLowerCase();
  if (!raw || !ext) return raw;
  const slashIdx = Math.max(raw.lastIndexOf('/'), raw.lastIndexOf('\\'));
  const head = slashIdx >= 0 ? raw.slice(0, slashIdx + 1) : '';
  const tail = slashIdx >= 0 ? raw.slice(slashIdx + 1) : raw;
  const dotIdx = tail.lastIndexOf('.');
  const base = dotIdx > 0 ? tail.slice(0, dotIdx) : tail;
  return `${head}${base}${ext}`;
}

function inferExpectedRenderOutputExt(outputProfile = '') {
  const profile = String(outputProfile || '').trim().toLowerCase();
  if (!profile) return '.mov';
  if (profile.includes('h264') || profile.includes('h265') || profile.includes('hevc') || profile.includes('mp4')) {
    return '.mp4';
  }
  if (profile.includes('mxf') || profile.includes('dnxhd') || profile.includes('dnxhr')) {
    return '.mxf';
  }
  if (profile.includes('avi')) return '.avi';
  if (profile.includes('webm')) return '.webm';
  if (profile.includes('jpg') || profile.includes('jpeg')) return '.jpg';
  if (profile.includes('exr')) return '.exr';
  if (profile.includes('png')) return '.png';
  return '.mov';
}

function isLikelyRenderOutputMedia(filePath = '') {
  const ext = getRenderPathExtension(filePath);
  return RENDER_OUTPUT_ALL_EXTS.includes(ext);
}

function buildRenderOutputPathCandidates(filePath = '') {
  const raw = String(filePath || '').trim();
  if (!raw) return [];
  const out = [];
  const seen = new Set();
  const push = (value) => {
    const next = String(value || '').trim();
    if (!next) return;
    const key = next.replace(/\\/g, '/').toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(next);
  };
  push(raw);
  const currentExt = getRenderPathExtension(raw);
  if (currentExt) {
    for (const altExt of RENDER_OUTPUT_ALL_EXTS) {
      push(replaceRenderPathExtension(raw, altExt));
    }
  } else {
    for (const ext of RENDER_OUTPUT_ALL_EXTS) {
      push(`${raw}${ext}`);
    }
  }
  return out;
}

function joinRenderOutputPath(baseDir = '', fileName = '') {
  const dir = String(baseDir || '').trim().replace(/[\\/]+$/g, '');
  const name = String(fileName || '').trim().replace(/^[\\/]+/g, '');
  if (dir && name) return `${dir}/${name}`;
  if (dir) return dir;
  return name;
}

function normalizeUnrealMapLaunchArg(rawMapName = '') {
  let mapArg = String(rawMapName || '').trim();
  if (!mapArg) return '';
  mapArg = mapArg.replace(/\\/g, '/');
  if (mapArg.startsWith('/Game/')) {
    // already normalized
  } else if (mapArg.startsWith('/Maps/')) mapArg = `/Game${mapArg}`;
  else if (mapArg.startsWith('Maps/')) mapArg = `/Game/${mapArg}`;
  else if (mapArg.startsWith('/')) mapArg = `/Game${mapArg}`;
  mapArg = mapArg.replace(/\.umap$/i, '');
  if (mapArg.startsWith('/Game/') && mapArg.includes('.')) {
    mapArg = mapArg.split('.')[0];
  }
  return mapArg;
}

function normalizeUnrealPresetName(rawPreset = '') {
  const input = String(rawPreset || '').trim();
  if (!input) return '';
  const normalized = input.replace(/\\/g, '/');
  const tail = normalized.split('/').filter(Boolean).pop() || normalized;
  if (tail.includes('.')) {
    const parts = tail.split('.');
    return String(parts[parts.length - 1] || tail).trim();
  }
  return String(tail || input).trim();
}

function normalizeBooleanFlag(value, fallback = false) {
  if (value === true) return true;
  if (value === false) return false;
  if (typeof value === 'number') return value !== 0;
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return fallback === true;
  if (raw === 'true' || raw === '1' || raw === 'yes' || raw === 'on') return true;
  if (raw === 'false' || raw === '0' || raw === 'no' || raw === 'off') return false;
  return fallback === true;
}

function withJobContextProcessArgs(execution = null, hasFormData = false) {
  if (!execution || typeof execution !== 'object' || Array.isArray(execution)) return null;
  const args = Array.isArray(execution.args) ? [...execution.args] : [];
  const hasJobB64 = args.some((a) => String(a || '').toLowerCase().includes('renderjobb64'));
  const hasFormB64 = args.some((a) => String(a || '').toLowerCase().includes('formdatab64'));
  const hasOutputDir = args.some((a) => String(a || '').toLowerCase().includes('uurenderoutputdir'));
  const hasMovieFolder = args.some((a) => String(a || '').toLowerCase().includes('moviefolder'));
  const hasMovieName = args.some((a) => String(a || '').toLowerCase().includes('moviename'));
  if (!hasJobB64) args.push('-UURenderJobB64={{renderjobb64}}');
  if (hasFormData && !hasFormB64) args.push('-UURenderFormDataB64={{formdatab64}}');
  if (!hasMovieFolder) args.push('-MovieFolder={{outputdir}}');
  if (!hasMovieName) args.push('-MovieName={{expectedrendername}}');
  if (!hasOutputDir) args.push('-UURenderOutputDir={{outputdir}}');
  return { ...execution, args };
}

function withRenderOffscreenProcessArgs(execution = null, renderOffscreen = false) {
  if (!execution || typeof execution !== 'object' || Array.isArray(execution)) return null;
  const offscreen = normalizeBooleanFlag(renderOffscreen, false);
  const cloned = {
    ...execution,
    renderOffscreen: offscreen,
  };
  const args = Array.isArray(execution?.args) ? execution.args : [];
  if (args.length <= 0) {
    if (offscreen) cloned.args = ['-RenderOffscreen'];
    return cloned;
  }
  const nextArgs = args
    .map((arg) => String(arg || '').trim())
    .filter(Boolean)
    .filter((arg) => String(arg || '').trim().toLowerCase() !== '-renderoffscreen');
  if (offscreen) nextArgs.push('-RenderOffscreen');
  cloned.args = nextArgs;
  return cloned;
}

function buildRenderProcessTemplateContext({
  render = null,
  payload = null,
  execution = null,
  workerKey = '',
  defaultUnrealEditorPath = '',
} = {}) {
  const renderObj = render && typeof render === 'object' ? render : {};
  const payloadObj = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
  const executionObj = execution && typeof execution === 'object' && !Array.isArray(execution) ? execution : {};
  const renderId = Number(renderObj?.id || 0);
  const linkedTaskId = Number(renderObj?.linkedTaskId || payloadObj?.taskId || 0);
  const taskExpectedCount = Number(payloadObj?.taskExpectedRenderCount || renderObj?.taskExpectedRenderCount || 0);
  const taskDetectedCount = Number(payloadObj?.taskDetectedRenderCount || renderObj?.taskDetectedRenderCount || 0);
  const fallbackExpectedName = renderId > 0 ? `render-${renderId}` : '';
  const expectedRenderNameRaw = String(
    payloadObj?.matchedExpectedRenderName ||
    renderObj?.matchedExpectedRenderName ||
    fallbackExpectedName
  ).trim();
  const expectedExt = inferExpectedRenderOutputExt(payloadObj?.outputProfile || '');
  const expectedRenderName = ensureRenderOutputExt(expectedRenderNameRaw, expectedExt);
  const outputDir = String(
    payloadObj?.outputDir ||
    payloadObj?.renderOutputDir ||
    executionObj?.outputDir ||
    ''
  ).trim();
  const projectPath = String(
    payloadObj?.projectPath ||
    payloadObj?.uprojectPath ||
    executionObj?.projectPath ||
    executionObj?.uprojectPath ||
    ''
  ).trim();
  const unrealEditorPath = String(
    payloadObj?.unrealEditorPath ||
    payloadObj?.unrealExe ||
    executionObj?.unrealEditorPath ||
    executionObj?.unrealExe ||
    defaultUnrealEditorPath ||
    ''
  ).trim();
  const outputPathRaw = String(
    executionObj?.outputPath ||
    payloadObj?.outputPath ||
    ''
  ).trim();
  const outputPathFallback = joinRenderOutputPath(outputDir, expectedRenderName || fallbackExpectedName);
  const outputPath = outputPathRaw && !hasProcessTemplateToken(outputPathRaw)
    ? outputPathRaw
    : outputPathFallback;
  const workerLogPath = outputDir
    ? joinRenderOutputPath(joinRenderOutputPath(outputDir, 'logs'), `uu-worker-render-${renderId > 0 ? renderId : 'latest'}.log`)
    : '';
  const formDataObject = payloadObj?.formData && typeof payloadObj.formData === 'object' && !Array.isArray(payloadObj.formData)
    ? payloadObj.formData
    : {};
  const hasFormData = Object.keys(formDataObject).length > 0;
  const payloadWrcFiles = Array.isArray(payloadObj?.wrcFiles)
    ? payloadObj.wrcFiles
    : (Array.isArray(payloadObj?.wrc_files) ? payloadObj.wrc_files : []);
  const fallbackWrcPresetPath = payloadWrcFiles
    .map((entry) => String(entry || '').trim())
    .find(Boolean) || '';
  const presetPathRaw = String(
    payloadObj?.presetPath
    || payloadObj?.preset_path
    || executionObj?.presetPath
    || executionObj?.preset_path
    || fallbackWrcPresetPath
    || ''
  ).trim();
  const explicitPresetNameRaw = String(
    payloadObj?.presetName
    || payloadObj?.wrcPresetName
    || executionObj?.presetName
    || ''
  ).trim();
  const legacyPresetFallback = hasFormData
    ? ''
    : String(
      payloadObj?.renderModeName
      || renderObj?.templateName
      || ''
    ).trim();
  const presetNameRaw = explicitPresetNameRaw
    || normalizeUnrealPresetName(presetPathRaw)
    || legacyPresetFallback;
  const presetName = normalizeUnrealPresetName(presetNameRaw) || presetNameRaw;
  const presetPath = presetPathRaw.startsWith('/') ? presetPathRaw : '';
  let formDataJson = '';
  try {
    formDataJson = JSON.stringify(formDataObject || {});
  } catch {
    formDataJson = '{}';
  }
  if (!formDataJson) formDataJson = '{}';
  const bridgeJobPayload = {
    renderId: Number.isFinite(renderId) ? renderId : 0,
    taskId: Number.isFinite(linkedTaskId) ? linkedTaskId : 0,
    workerKey: String(workerKey || renderObj?.assignedWorkerKey || '').trim(),
    projectPath,
    unrealEditorPath,
    projectName: String(renderObj?.projectName || payloadObj?.projectName || '').trim(),
    templateName: String(renderObj?.templateName || payloadObj?.templateName || '').trim(),
    mapName: normalizeUnrealMapLaunchArg(payloadObj?.mapName || '') || String(payloadObj?.mapName || '').trim(),
    sequenceName: String(payloadObj?.sequenceName || '').trim(),
    outputProfile: String(payloadObj?.outputProfile || '').trim(),
    outputDir,
    outputPath,
    expectedRenderName: expectedRenderName || fallbackExpectedName,
    presetName,
    presetPath,
    formData: formDataObject,
    textValue: String(payloadObj?.textValue || '').trim(),
    payload: payloadObj,
  };
  let renderJobJson = '';
  try {
    renderJobJson = JSON.stringify(bridgeJobPayload || {});
  } catch {
    renderJobJson = '{}';
  }
  if (!renderJobJson) renderJobJson = '{}';
  const formDataB64 = encodeBase64Utf8(formDataJson);
  const renderJobB64 = encodeBase64Utf8(renderJobJson);
  const now = new Date();
  const isoNow = now.toISOString();
  return {
    workerkey: String(workerKey || renderObj?.assignedWorkerKey || '').trim(),
    renderid: Number.isFinite(renderId) && renderId > 0 ? String(Math.trunc(renderId)) : '',
    taskid: Number.isFinite(linkedTaskId) && linkedTaskId > 0 ? String(Math.trunc(linkedTaskId)) : '',
    tasktitle: String(payloadObj?.taskTitle || renderObj?.linkedTaskTitle || '').trim(),
    projectname: String(renderObj?.projectName || payloadObj?.projectName || '').trim(),
    templatename: String(renderObj?.templateName || payloadObj?.templateName || '').trim(),
    mapname: normalizeUnrealMapLaunchArg(payloadObj?.mapName || '') || String(payloadObj?.mapName || '').trim(),
    sequencename: String(payloadObj?.sequenceName || '').trim(),
    outputprofile: String(payloadObj?.outputProfile || '').trim(),
    presetname: presetName,
    presetpath: presetPath,
    textvalue: String(payloadObj?.textValue || '').trim(),
    formdatajson: formDataJson,
    formdatab64: formDataB64,
    renderjobjson: renderJobJson,
    renderjobb64: renderJobB64,
    projectpath: projectPath,
    uprojectpath: projectPath,
    unrealeditorpath: unrealEditorPath,
    unrealexepath: unrealEditorPath,
    outputdir: outputDir,
    expectedrendername: expectedRenderName || fallbackExpectedName,
    outputpath: outputPath,
    workerlogpath: workerLogPath,
    date: isoNow.slice(0, 10),
    datetime: isoNow,
    timestamp: String(Math.trunc(now.getTime())),
    taskexpectedrendercount: Number.isFinite(taskExpectedCount) && taskExpectedCount > 0
      ? String(Math.trunc(taskExpectedCount))
      : '',
    taskdetectedrendercount: Number.isFinite(taskDetectedCount) && taskDetectedCount >= 0
      ? String(Math.trunc(taskDetectedCount))
      : '',
  };
}

function buildDefaultUnrealProcessExecution({
  mapName = '',
  sequenceName = '',
  outputProfile = '',
  presetName = '',
  formData = null,
  textValue = '',
  renderOffscreen = false,
} = {}) {
  const safeMapName = normalizeUnrealMapLaunchArg(mapName);
  const safeSequenceName = String(sequenceName || '').trim();
  const safeOutputProfile = String(outputProfile || '').trim();
  const safePresetRaw = String(presetName || '').trim();
  const safePresetName = normalizeUnrealPresetName(safePresetRaw);
  const safePresetPath = safePresetRaw.startsWith('/') ? safePresetRaw : '';
  const safeFormData = formData && typeof formData === 'object' && !Array.isArray(formData)
    ? formData
    : {};
  const safeTextValue = String(textValue || '').trim();
  const offscreenEnabled = normalizeBooleanFlag(renderOffscreen, false);
  const hasFormData = Object.keys(safeFormData).length > 0;

  const args = [
    '{{uprojectpath}}',
  ];
  if (safeMapName) args.push('{{mapname}}');
  args.push('-game');
  args.push(
    '-NoLoadingScreen',
    '-Unattended',
    '-log',
    '-StdOut',
    '-allowStdOutLogVerbosity',
    '-FullStdOutLogOutput',
    '-RCWebControlEnable',
    '-MoviePipelineLocalExecutorClass=/Script/MovieRenderPipelineCore.MoviePipelineInProcessExecutor'
  );
  if (safeSequenceName) args.push('-LevelSequence={{sequencename}}');
  if (safeOutputProfile) args.push('-MoviePipelineConfig={{outputprofile}}');
  args.push('-MovieFolder={{outputdir}}');
  args.push('-MovieName={{expectedrendername}}');
  args.push('-UURenderOutputDir={{outputdir}}');
  args.push('-Abslog={{workerlogpath}}');
  if (safePresetName) args.push('-UURenderPreset={{presetname}}');
  if (safePresetPath) args.push('-UURenderPresetPath={{presetpath}}');
  if (hasFormData) args.push('-UURenderFormDataB64={{formdatab64}}');
  args.push('-UURenderJobB64={{renderjobb64}}');
  if (safeTextValue) args.push('-UUTextValue={{textvalue}}');
  if (offscreenEnabled) args.push('-RenderOffscreen');

  return {
    mode: 'process',
    command: '{{unrealeditorpath}}',
    commandFallback: 'UnrealEditor.exe',
    args,
    renderOffscreen: offscreenEnabled,
    timeoutMs: 4 * 60 * 60 * 1000,
    outputPath: '',
  };
}

function canReplayWorkerCompletion(render = null, workerKey = '') {
  const job = render && typeof render === 'object' ? render : null;
  if (!job) return false;
  const status = String(job?.status || '').trim();
  const assignedWorkerKey = String(job?.assignedWorkerKey || '').trim();
  const expectedWorkerKey = String(workerKey || '').trim();
  return status === 'Running' && !!assignedWorkerKey && assignedWorkerKey === expectedWorkerKey;
}

function buildWorkerCompletionReplayPayload(basePayload = {}, render = null, workerKey = '') {
  const rawPayload = basePayload && typeof basePayload === 'object' ? basePayload : {};
  const job = render && typeof render === 'object' ? render : {};
  const jobPayload = job?.payload && typeof job.payload === 'object' && !Array.isArray(job.payload)
    ? job.payload
    : {};
  const jobExecution = jobPayload?.execution && typeof jobPayload.execution === 'object' && !Array.isArray(jobPayload.execution)
    ? jobPayload.execution
    : {};
  const normalizedWorkerKey = String(workerKey || rawPayload?.workerKey || job?.assignedWorkerKey || '').trim();
  const success = rawPayload?.success !== false;

  if (success) {
    const fallbackRenderId = Number(job?.id || 0);
    const outputPathRaw = String(
      rawPayload?.outputPath ||
      job?.outputPath ||
      jobExecution?.outputPath ||
      jobPayload?.outputPath ||
      (fallbackRenderId > 0 ? `renders/render-${fallbackRenderId}.mov` : '')
    ).trim();
    const outputPath = hasProcessTemplateToken(outputPathRaw) ? '' : outputPathRaw;
    if (!outputPath) {
      return {
        ...rawPayload,
        workerKey: normalizedWorkerKey,
        success: false,
        outputPath: '',
        errorMessage: 'output_file_not_found',
        comment: String(rawPayload?.comment || '').trim() || 'worker_offline_replay_missing_output',
      };
    }
    return {
      ...rawPayload,
      workerKey: normalizedWorkerKey,
      success: true,
      outputPath,
      errorMessage: '',
      comment: String(rawPayload?.comment || '').trim() || 'worker_offline_replay_done',
    };
  }

  const errorMessage = String(
    rawPayload?.errorMessage ||
    job?.errorMessage ||
    'worker_offline_replay_failed'
  ).trim().slice(0, 400);
  return {
    ...rawPayload,
    workerKey: normalizedWorkerKey,
    success: false,
    outputPath: '',
    errorMessage: errorMessage || 'worker_offline_replay_failed',
    comment: String(rawPayload?.comment || '').trim() || 'worker_offline_replay_fail',
  };
}

function getLiveAccountTabs({ authenticated = false, canManageUsers = false, canManageRoles = false } = {}) {
  if (!authenticated) return [];
  const tabs = [];
  if (canManageRoles) tabs.push(POSTPROD_TAB_PROFILES);
  if (canManageUsers) tabs.push(POSTPROD_TAB_USERS);
  return tabs;
}

function getSidebarItems({
  role,
  appMode,
  clientSyncEnabled,
  resourcesAvailable,
  postprodTabs = POSTPROD_TABS_BASE,
  postprodCanManageMachines = true,
  liveAccountTabs = [],
}) {
  if (appMode === APP_MODE_POSTPROD) {
    const tabs = Array.isArray(postprodTabs) ? postprodTabs : [];
    const hasProfiles = tabs.includes(POSTPROD_TAB_PROFILES);
    const hasUsers = tabs.includes(POSTPROD_TAB_USERS);
    const accountTabs = [
      ...(hasProfiles ? [POSTPROD_TAB_PROFILES] : []),
      ...(hasUsers ? [POSTPROD_TAB_USERS] : []),
    ];
    const restTabs = tabs.filter(
      (tab) => (
        tab !== POSTPROD_TAB_PROFILES
        && tab !== POSTPROD_TAB_USERS
        && tab !== POSTPROD_TAB_RENDERS_CREATE
      )
    );
    return [...accountTabs, ...(postprodCanManageMachines ? ["Setup"] : []), ...restTabs, "Logs"];
  }

  const accountTabs = Array.isArray(liveAccountTabs) ? liveAccountTabs : [];

  return role === "server"
    ? [...accountTabs, "Setup", "Projets", ...(resourcesAvailable ? ["Ressources"] : []), "Synchronisation", "Launch Control", "Production", "Logs"]
    : clientSyncEnabled
      ? [...accountTabs, "Setup", "Synchronisation", "Logs"]
      : [...accountTabs, "Setup", "Projets", "Logs"];
}

function getAllowedTabs({
  role,
  appMode,
  clientSyncEnabled,
  resourcesAvailable,
  postprodTabs = POSTPROD_TABS_BASE,
  postprodCanManageMachines = true,
  liveAccountTabs = [],
}) {
  if (appMode === APP_MODE_POSTPROD) {
    return role === "server"
      ? [...(postprodCanManageMachines ? ["Setup"] : []), "Configuration", ...postprodTabs, "Logs"]
      : [...(postprodCanManageMachines ? ["Setup"] : []), ...postprodTabs, "Logs"];
  }

  const accountTabs = Array.isArray(liveAccountTabs) ? liveAccountTabs : [];

  if (role === "server") {
    const allowed = ["Setup", "Configuration", "Projets", "Synchronisation", "Launch Control", "Production", "Logs"];
    if (resourcesAvailable) allowed.splice(2, 0, "Ressources");
    if (accountTabs.length > 0) {
      const logsIdx = allowed.indexOf('Logs');
      const insertAt = logsIdx >= 0 ? logsIdx : allowed.length;
      allowed.splice(insertAt, 0, ...accountTabs);
    }
    return allowed;
  }

  return clientSyncEnabled
    ? ["Setup", "Synchronisation", ...accountTabs, "Logs"]
    : ["Setup", "Projets", ...accountTabs, "Logs"];
}

function resolveDefaultTab(allowedTabs = [], appMode = APP_MODE_LIVE) {
  const tabs = Array.isArray(allowedTabs) ? allowedTabs : [];
  if (tabs.includes("Projets")) return "Projets";
  if (tabs.length > 0) return tabs[0];
  return appMode === APP_MODE_POSTPROD ? POSTPROD_TAB_USERS : "Setup";
}

/* --------------------- Notice (bande flottante) --------------------- */
function useNotice() {
  const [notice, setNotice] = useState({ text: '', type: '', sticky: false });
  const timerRef = React.useRef(null);

  const clearNotice = useCallback(() => {
    setNotice({ text: '', type: '', sticky: false });
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const showNotice = useCallback((text, type = '', opts = {}) => {
    if (!text) return;
    const sticky = !!(opts && typeof opts === 'object' && opts.sticky === true);
    setNotice({ text, type, sticky });
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!sticky) {
      timerRef.current = setTimeout(
        () => setNotice({ text: '', type: '', sticky: false }),
        3000
      );
    }
  }, []);

  return { notice, showNotice, clearNotice };
}

/* --------------------- ErrorBoundary --------------------- */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    this.setState({ error, info });
  }
  render() {
    if (this.state.error) {
      return (
        <div className="uu-error">
          <h2 className="uu-error-title">
            {createT(String((readIdentity()?.lang || 'fr')).trim())('errorBoundary.title')}
          </h2>
          <pre className="uu-error-pre">
            {String(
              (this.state.error && this.state.error.message) || this.state.error
            )}
          </pre>
          {this.state.info?.componentStack && (
            <details className="uu-error-details" open>
              <summary>
                {createT(String((readIdentity()?.lang || 'fr')).trim())('errorBoundary.stackSummary')}
              </summary>
              <pre className="uu-error-pre">
                {this.state.info.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

/* --------------------- Barre latérale --------------------- */
function Sidebar({
  current,
  setCurrent,
  role,
  appMode,
  t,
  clientSyncEnabled,
  postprodTabs = POSTPROD_TABS_BASE,
  postprodCanManageMachines = true,
  liveAccountTabs = [],
  configMissing,
  resourcesAvailable,
  postprodLockedTabs = [],
  postprodLockedTitle = '',
  logsAlert = null,
  usersAlert = null,
  rendersAlert = null,
  postprodUser = null,
  onUserClick = null,
}) {
  const items = getSidebarItems({
    role,
    appMode,
    clientSyncEnabled,
    resourcesAvailable,
    postprodTabs,
    postprodCanManageMachines,
    liveAccountTabs,
  });
  const modeLabel = appMode === APP_MODE_POSTPROD
    ? t('app.mode.short.postprod', 'Post-production')
    : t('app.mode.short.live', 'Live');

  const labelMap = {
    Setup: t('nav.machines'),
    Projets: t('nav.projects'),
    Synchronisation: t('nav.sync'),
    'Launch Control': t('nav.launch'),
    Production: t('nav.production'),
    Ressources: t('nav.resources'),
    Utilisateurs: t('nav.users'),
    Rendus: t('nav.renders'),
    Datas: t('nav.data'),
    Profils: t('nav.profiles'),
    Logs: appMode === APP_MODE_POSTPROD ? t('nav.historyLogs') : t('nav.logs'),
  };

  return (
    <aside className="uu-sidebar">
      <div className="uu-sidebar-title">UltiUnreal</div>
      <div className="uu-sidebar-mode">{modeLabel}</div>

      {/* onglets "classiques" */}
      <nav className="uu-nav">
        {items.map((item) => {
          const locked = postprodLockedTabs.includes(item);
          const isActive = (
            current === item
            || (item === "Rendus" && current === POSTPROD_TAB_RENDERS_CREATE)
          );
          const isLogs = item === 'Logs';
          const isUsers = item === 'Utilisateurs';
          const isRenders = item === 'Rendus';
          const activeAlert = isLogs
            ? logsAlert
            : (isUsers ? usersAlert : (isRenders ? rendersAlert : null));
          const logsClass = activeAlert?.level === 'error'
            ? ' logs-alert-error'
            : (activeAlert?.level === 'warn' ? ' logs-alert-warn' : '');
          const logsTitle = locked
            ? postprodLockedTitle
            : (activeAlert?.tooltip || undefined);
          return (
          <button
            key={item}
            className={`uu-nav-btn ${isActive ? "active" : ""}${logsClass}${locked ? " locked" : ""}`}
            disabled={locked}
            onClick={() => {
              if (locked) return;
              // Permet de "revenir" à la liste depuis un détail même si l'onglet est déjà actif
              if (current === item) {
                if (item === "Projets" && typeof window.closeProjectDetail === 'function') {
                  window.closeProjectDetail();
                } else if (item === "Ressources" && typeof window.closeResourceDetail === 'function') {
                  window.closeResourceDetail();
                }
              }
              setCurrent(item);
            }}
            onMouseEnter={() => preloaders[item]?.()}
            onFocus={() => preloaders[item]?.()}
            title={logsTitle}
          >
            {labelMap[item] || item}
          </button>
          );
        })}
      </nav>

      {/* bas de la sidebar : carte utilisateur + config */}
      {(postprodUser || role === "server") && (
        <div className="uu-sidebar-bottom">
          {postprodUser ? (
            <button
              type="button"
              className="uu-sidebar-user"
              onClick={onUserClick}
            >
              {/^data:image\//i.test(String(postprodUser.avatarPath || '')) || /^https?:\/\//i.test(String(postprodUser.avatarPath || '')) ? (
                <img
                  className="uu-sidebar-user-avatar"
                  src={postprodUser.avatarPath}
                  alt=""
                  aria-hidden="true"
                />
              ) : (
                <div className="uu-sidebar-user-avatar uu-sidebar-user-avatar-fallback" aria-hidden="true">
                  {String(postprodUser.displayName || postprodUser.username || '?')[0].toUpperCase()}
                </div>
              )}
              <div className="uu-sidebar-user-info">
                <span className="uu-sidebar-user-name">
                  {postprodUser.displayName || postprodUser.username || '–'}
                </span>
                <span className="uu-sidebar-user-role">
                  {postprodUser.role || ''}
                </span>
              </div>
            </button>
          ) : null}

          {role === "server" && (
            <div className="uu-sidebar-footer">
              <button
                type="button"
                className={`uu-nav-btn uu-nav-btn-gear ${
                  current === "Configuration" ? "active" : ""
                } ${
                  configMissing ? "gear-missing" : ""
                }`}
                onClick={() => setCurrent("Configuration")}
                onMouseEnter={() => preloaders.Configuration?.()}
                onFocus={() => preloaders.Configuration?.()}
                title={configMissing ? t('config.gearMissingTooltip') || 'Configuration incomplète' : undefined}
              >
                <span className="uu-gear-icon" aria-hidden="true">
                  ⚙
                </span>
              </button>

              <div className="uu-sidebar-version">
                JDarrasVP – {APP_VERSION}
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

/* --------------------- App --------------------- */
function App() {
  // Toujours avoir un objet, jamais null
  const [identity, setIdentity] = useState(() => readIdentity());
  const [postprodAuth, setPostprodAuth] = useState(() => {
    const saved = readPostprodAuth();
    return {
      ...saved,
      busy: false,
      error: '',
      hydrated: false,
    };
  });
  const [postprodUsers, setPostprodUsers] = useState({
    items: [],
    loading: false,
    error: '',
  });
  const [postprodRoles, setPostprodRoles] = useState({
    items: [],
    loading: false,
    error: '',
  });
  const [postprodTasks, setPostprodTasks] = useState({
    items: [],
    loading: false,
    error: '',
  });
  const [postprodTaskCatalog, setPostprodTaskCatalog] = useState({
    projects: [],
    resources: [],
    loading: false,
    error: '',
  });
  const [postprodRenderEditorRequest, setPostprodRenderEditorRequest] = useState(null);
  const postprodRenderEditorWasOpenRef = useRef(false);
  const [postprodRenderFormFocusRequest, setPostprodRenderFormFocusRequest] = useState(null);
  const [postprodEditUserRequest, setPostprodEditUserRequest] = useState(null);
  const [postprodProjects, setPostprodProjects] = useState({
    items: [],
    loading: false,
    error: '',
  });
  const [postprodResources, setPostprodResources] = useState({
    items: [],
    loading: false,
    error: '',
    source: '',
    sync: null,
  });
  const [postprodRenderProjectCatalog, setPostprodRenderProjectCatalog] = useState({
    items: [],
    loading: false,
    error: '',
  });
  const [postprodRenders, setPostprodRenders] = useState({
    items: [],
    loading: false,
    error: '',
    detectedScan: null,
  });
  const [postprodUserAlerts, setPostprodUserAlerts] = useState({
    items: [],
    summary: null,
    loading: false,
    error: '',
  });
  const [postprodRenderHealth, setPostprodRenderHealth] = useState({
    data: null,
    loading: false,
    error: '',
  });
  const [postprodOfflineOutbox, setPostprodOfflineOutbox] = useState(() => readPostprodOfflineOutbox());
  const [postprodWorkerCompletionOutbox, setPostprodWorkerCompletionOutbox] = useState(() => readPostprodWorkerCompletionOutbox());
  const [postprodRenderWorkers, setPostprodRenderWorkers] = useState({
    items: [],
    loading: false,
    error: '',
  });
  const [postprodRenderTemplates, setPostprodRenderTemplates] = useState({
    items: [],
    loading: false,
    error: '',
  });
  const [postprodRenderForms, setPostprodRenderForms] = useState({
    items: [],
    loading: false,
    error: '',
  });
  const [postprodProfile, setPostprodProfile] = useState({
    saving: false,
    error: '',
  });
  const [postprodMyActivity, setPostprodMyActivity] = useState({
    activities: [],
    summary: { total: 0, actions: {}, projects: [] },
    loading: false,
    error: '',
  });
  const [postprodAudit, setPostprodAudit] = useState({
    entries: [],
    loading: false,
    error: '',
    total: 0,
    page: 1,
    pageSize: 100,
    hasMore: false,
    auditLogStore: null,
    filters: {
      actorUserId: null,
      action: '',
      scopeType: '',
      fromAt: '',
      toAt: '',
    },
  });
  const [postprodRenderHealthAuditMaintenance, setPostprodRenderHealthAuditMaintenance] = useState({
    data: null,
    loading: false,
    error: '',
    purging: false,
    purgeError: '',
    lastPurge: null,
  });
  const [showWelcome, setShowWelcome] = useState(true);
  const [showLicense, setShowLicense] = useState(false);
  const [licenseOrigin, setLicenseOrigin] = useState('welcome');
  const [current, setCurrent] = useState("Projets");
  const [userTabKey, setUserTabKey] = useState(0);
  const [roleTabKey, setRoleTabKey] = useState(0);
  const [datasTabKey, setDatasTabKey] = useState(0);
  const [quitDialogOpen, setQuitDialogOpen] = useState(false);
  const [aptitudeCheckPending, setAptitudeCheckPending] = useState(null);
  const [queuePausedLaunchPending, setQueuePausedLaunchPending] = useState(null);
  const [busyImmediateLaunchPending, setBusyImmediateLaunchPending] = useState(null);
  const [resourcesRefreshKey, setResourcesRefreshKey] = useState(0);
  const [postprodTaskFormOpen, setPostprodTaskFormOpen] = useState(false);
  const [postprodUserEditorOpen, setPostprodUserEditorOpen] = useState(false);
  const [hasLibraryItems, setHasLibraryItems] = useState(false);
  const noticeApi = useNotice();
  const [clientSyncEnabled, setClientSyncEnabled] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_SYNC_KEY);
      if (raw === 'true') return true;
      if (raw === 'false') return false;
    } catch {}
    return false;
  });
  const [commonCfg, setCommonCfg] = useState(null);
  const [commonLoaded, setCommonLoaded] = useState(false);
  const [hostsCfg, setHostsCfg] = useState([]);
  const [hostsLoaded, setHostsLoaded] = useState(false);
  const [logsStorageSummary, setLogsStorageSummary] = useState(null);
  const [initialClientNavDone, setInitialClientNavDone] = useState(false);
  const logsAlertPrevRef = useRef({ initialized: false, byIp: {} });
  const postprodOfflineReplayInFlightRef = useRef(false);
  const postprodWorkerCompletionReplayInFlightRef = useRef(false);
  const postprodOfflineReplayLastKickRef = useRef(0);
  const postprodWorkerCompletionReplayLastKickRef = useRef(0);
  const postprodAutoDispatchLastKickRef = useRef(0);
  const postprodBackgroundQueueLaunchRef = useRef({ taskId: 0, kickAt: 0 });
  const postprodBackgroundQueueSnapshotRef = useRef({ at: 0, tasks: [], renders: [] });
  const postprodRendersRequestSeqRef = useRef(0);
  const postprodAgentBootRef = useRef({ started: false, port: '' });
  const postprodWrcCacheNoticeRef = useRef({});
  const handleCommonUpdated = React.useCallback((next) => {
    if (!next || typeof next !== 'object') return;
    setCommonCfg(next);
    setCommonLoaded(true);
  }, []);
  const safeIdentity = identity && typeof identity === 'object' ? identity : {};
  const appMode = normalizeAppMode(safeIdentity.mode);
  const role = appMode === APP_MODE_POSTPROD
    ? "server"
    : (safeIdentity.role || "server");
  const lang = String(safeIdentity.lang || 'fr').trim();
  const localIp = String(safeIdentity.localIp || '').trim().toLowerCase();
  const t = useMemo(() => createT(lang), [lang]);
  const postprodAuthenticated = !!(postprodAuth.token && postprodAuth.user);
  const postprodModeAccess = useMemo(
    () => getModeAccessForUser(postprodAuth.user, postprodAuthenticated),
    [postprodAuth.user, postprodAuthenticated]
  );

  const handleSetAppLanguage = useCallback((nextLang = "fr") => {
    const normalized = String(nextLang || "").trim().toLowerCase() === "en" ? "en" : "fr";
    setIdentity((prev) => {
      const currentIdentity = prev && typeof prev === "object" ? prev : {};
      if (String(currentIdentity.lang || "fr").trim().toLowerCase() === normalized) {
        return currentIdentity;
      }
      const nextIdentity = {
        ...currentIdentity,
        lang: normalized,
      };
      writeIdentity(nextIdentity);
      return nextIdentity;
    });
  }, []);
  const applyUserLanguageToIdentity = useCallback((userLike = null) => {
    if (!userLike || typeof userLike !== "object") return;
    if (!Object.prototype.hasOwnProperty.call(userLike, "language")) return;
    const normalized = String(userLike?.language || "").trim().toLowerCase() === "en" ? "en" : "fr";
    setIdentity((prev) => {
      const currentIdentity = prev && typeof prev === "object" ? prev : {};
      if (String(currentIdentity.lang || "fr").trim().toLowerCase() === normalized) {
        return currentIdentity;
      }
      const nextIdentity = {
        ...currentIdentity,
        lang: normalized,
      };
      writeIdentity(nextIdentity);
      return nextIdentity;
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (typeof window.electron?.startAgent !== 'function') return;
    if (postprodAuthenticated) return;

    const rawPort = Number(safeIdentity.agentPort);
    const normalizedPort = Number.isFinite(rawPort) && rawPort > 0 && rawPort < 65536
      ? String(Math.trunc(rawPort))
      : '4000';

    if (
      postprodAgentBootRef.current.started
      && postprodAgentBootRef.current.port === normalizedPort
    ) {
      return;
    }

    postprodAgentBootRef.current = { started: true, port: normalizedPort };
    window.electron.startAgent(normalizedPort).catch(() => {
      postprodAgentBootRef.current = { started: false, port: '' };
    });
  }, [postprodAuthenticated, safeIdentity.agentPort]);

  useEffect(() => {
    if (!postprodAuthenticated) {
      setPostprodRenderEditorRequest(null);
    }
  }, [postprodAuthenticated]);

  useEffect(() => {
    if (!postprodAuthenticated) return;
    const forcedMode = String(postprodModeAccess?.forcedMode || "").trim();
    if (!forcedMode) return;
    const currentMode = normalizeAppMode(safeIdentity.mode);
    if (currentMode === forcedMode) return;

    const nextIdentity = {
      ...safeIdentity,
      mode: forcedMode,
      role: forcedMode === APP_MODE_POSTPROD
        ? "server"
        : (String(safeIdentity.role || "server").trim() || "server"),
      serverIp: forcedMode === APP_MODE_POSTPROD
        ? ""
        : String(safeIdentity.serverIp || "").trim(),
    };
    writeIdentity(nextIdentity);
    setIdentity(nextIdentity);
    setCurrent("Projets");
  }, [
    postprodAuthenticated,
    postprodModeAccess?.forcedMode,
    safeIdentity.mode,
    safeIdentity.role,
    safeIdentity.serverIp,
  ]);

  // Fournit la bande de notification globale
  const noticeContextValue = useMemo(() => ({
    showNotice: noticeApi.showNotice,
    clearNotice: noticeApi.clearNotice,
    notice: noticeApi.notice,
  }), [noticeApi.notice, noticeApi.showNotice, noticeApi.clearNotice]);
  const updatePostprodOfflineOutbox = useCallback((updater) => {
    setPostprodOfflineOutbox((current) => {
      const base = normalizePostprodOfflineOutbox(current);
      const nextRaw = typeof updater === 'function' ? updater(base) : updater;
      const next = normalizePostprodOfflineOutbox(nextRaw);
      writePostprodOfflineOutbox(next);
      return next;
    });
  }, []);
  const updatePostprodWorkerCompletionOutbox = useCallback((updater) => {
    setPostprodWorkerCompletionOutbox((current) => {
      const base = normalizePostprodWorkerCompletionOutbox(current);
      const nextRaw = typeof updater === 'function' ? updater(base) : updater;
      const next = normalizePostprodWorkerCompletionOutbox(nextRaw);
      writePostprodWorkerCompletionOutbox(next);
      return next;
    });
  }, []);

  const goToProjectDetail = React.useCallback((projectId) => {
    if (!projectId) return;
    try { localStorage.setItem('uu_pending_detail', String(projectId)); } catch {}
    setCurrent("Projets");
  }, []);

  useEffect(() => {
    window.goToProjectDetail = goToProjectDetail;
    // Navigation inverse : fermer le détail projet
    window.closeProjectDetail = async () => {
      try {
        if (window.__closeProjectDetail) {
          await window.__closeProjectDetail();
        }
      } catch {}
      setCurrent("Projets");
    };
    // Fermeture du détail ressource via clic sur l'onglet actif
    window.closeResourceDetail = async () => {
      try {
        if (window.__closeResourceDetail) {
          await window.__closeResourceDetail();
        }
      } catch {}
      setCurrent("Ressources");
    };
    return () => {
      if (window.goToProjectDetail === goToProjectDetail) {
        delete window.goToProjectDetail;
      }
      if (window.closeProjectDetail && window.__closeProjectDetail) {
        delete window.closeProjectDetail;
      }
      if (window.closeResourceDetail && window.__closeResourceDetail) {
        delete window.closeResourceDetail;
      }
    };
  }, [goToProjectDetail]);

  const showNotice = noticeApi.showNotice;
  const quitOkBtnRef = useRef(null);
  const quitPrevFocusRef = useRef(null);

  const openQuitDialog = useCallback(() => {
    setQuitDialogOpen((prev) => {
      if (prev) return prev;
      const activeEl =
        typeof document !== 'undefined' && document?.activeElement
          ? document.activeElement
          : null;
      quitPrevFocusRef.current =
        activeEl && typeof activeEl.focus === 'function' ? activeEl : null;
      return true;
    });
  }, []);

  const closeQuitDialog = useCallback((shouldQuit) => {
    setQuitDialogOpen(false);
    const prev = quitPrevFocusRef.current;
    quitPrevFocusRef.current = null;
    if (shouldQuit) {
      window.electron?.quitApp?.();
      return;
    }
    if (prev && typeof prev.focus === 'function') {
      setTimeout(() => {
        try {
          prev.focus();
        } catch {}
      }, 0);
    }
  }, []);

  useEffect(() => {
    if (!quitDialogOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeQuitDialog(false);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        closeQuitDialog(true);
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    const timer = setTimeout(() => {
      quitOkBtnRef.current?.focus?.();
    }, 0);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [quitDialogOpen, closeQuitDialog]);

  useEffect(() => {
    if (!window.electron?.onAppQuitRequested) return undefined;
    const off = window.electron.onAppQuitRequested(() => {
      openQuitDialog();
    });
    return () => {
      if (typeof off === 'function') off();
    };
  }, [openQuitDialog]);

  const postprodCanManageUsers = !!postprodAuth.user?.permissions?.canManageUsers;
  const postprodCanManageRoles = postprodAuth.user?.permissions?.canManageRoles === true;
  const postprodCanManageRenderTemplates = postprodAuth.user?.permissions?.canManageForms === true;
  const postprodCanManageMachines = postprodAuth.user?.permissions?.canManageMachines === true;
  const postprodCanBanUsers = postprodAuth.user?.permissions?.canBanUsers === true;
  const postprodCanManageProjectPermissions =
    postprodAuth.user?.permissions?.canManageProjectPermissions === true;
  const postprodCanViewResources = postprodAuth.user?.permissions?.canViewResources !== false;
  const resourcesEnabled = !!(
    commonCfg
    && (
      commonCfg.fab_resources_enabled === true
      || commonCfg.fabResourcesEnabled === true
    )
  );
  const postprodCanAccessResources = postprodCanViewResources && resourcesEnabled;
  const postprodCanCreateTasks = postprodAuth.user?.permissions?.canCreateTasks !== false;
  const postprodCanAssignRenderRequests = postprodAuth.user?.permissions?.canAssignRenderRequests === true;
  const postprodCanBypassPadForTasks = postprodAuth.user?.permissions?.canSyncScenes === true;
  const postprodCanEditProjects = postprodAuth.user?.permissions?.canEditProjects !== false;
  const postprodCanManageLayouts = postprodAuth.user?.permissions?.canManageLayouts !== false;
  const postprodCanLaunchLiveProjects = postprodAuth.user?.permissions?.canLaunchLiveProjects !== false;
  const postprodCanLaunchProjects = postprodAuth.user?.permissions?.canLaunchProjects !== false;
  const liveCanEditProjects = postprodAuthenticated ? postprodCanEditProjects : true;
  const liveCanLaunchRuntimeProjects = postprodAuthenticated ? postprodCanLaunchLiveProjects : true;
  const liveCanLaunchEditorProjects = postprodAuthenticated ? postprodCanLaunchProjects : true;
  const postprodCanLaunchRenders = !!postprodAuth.user?.permissions?.canLaunchRenders;
  const postprodRefreshSec = Math.max(2, Number(commonCfg?.refreshSec || 5) || 5);
  const postprodRefreshMs = postprodRefreshSec * 1000;
  const postprodManageableRoles = Array.isArray(postprodAuth.user?.permissions?.manageableRoles)
    ? postprodAuth.user.permissions.manageableRoles
    : [];
  const postprodVisibleTabs = useMemo(
    () =>
      getPostprodTabsForUser(postprodAuth.user, postprodAuthenticated, {
        resourcesEnabled,
      }),
    [postprodAuth.user, postprodAuthenticated, resourcesEnabled]
  );
  const liveAccountTabs = useMemo(
    () => getLiveAccountTabs({
      authenticated: postprodAuthenticated,
      canManageUsers: postprodCanManageUsers,
      canManageRoles: postprodCanManageRoles,
    }),
    [postprodAuthenticated, postprodCanManageUsers, postprodCanManageRoles]
  );
  const postprodLockedTabs = appMode === APP_MODE_POSTPROD && !postprodAuthenticated
    ? postprodVisibleTabs.filter((tab) => tab !== POSTPROD_TAB_USERS)
    : [];
  const postprodOfflineOutboxCount = useMemo(
    () => normalizePostprodOfflineOutbox(postprodOfflineOutbox).length,
    [postprodOfflineOutbox]
  );
  const postprodWorkerCompletionOutboxCount = useMemo(
    () => normalizePostprodWorkerCompletionOutbox(postprodWorkerCompletionOutbox).length,
    [postprodWorkerCompletionOutbox]
  );
  const postprodRenderHealthView = useMemo(() => {
    const data = postprodRenderHealth.data && typeof postprodRenderHealth.data === 'object'
      ? postprodRenderHealth.data
      : null;
    if (!data) return data;
    return {
      ...data,
      offlineOutboxPending: postprodOfflineOutboxCount + postprodWorkerCompletionOutboxCount,
      offlineRenderCreateOutboxPending: postprodOfflineOutboxCount,
      offlineWorkerCompletionOutboxPending: postprodWorkerCompletionOutboxCount,
    };
  }, [postprodRenderHealth.data, postprodOfflineOutboxCount, postprodWorkerCompletionOutboxCount]);
  const [licenseStatus, setLicenseStatus] = useState({ ok: false, status: 'loading' });
  const licenseOk = licenseStatus && licenseStatus.ok === true;

  const logsNavAlert = useMemo(() => {
    if (appMode === APP_MODE_POSTPROD) {
      const store = postprodAudit?.auditLogStore && typeof postprodAudit.auditLogStore === 'object'
        ? postprodAudit.auditLogStore
        : null;
      const count = Number(store?.count || 0);
      const warnAt = Number(store?.warnAt || 1500);
      const hardLimit = Number(store?.hardLimit || 2000);
      const saturated = !!store?.saturated || (Number.isFinite(hardLimit) && hardLimit > 0 && count >= hardLimit);
      const warnReached = !!store?.warnReached
        || saturated
        || (Number.isFinite(warnAt) && warnAt > 0 && count >= warnAt);
      if (saturated) {
        return {
          level: 'error',
          tooltip: t('postprod.audit.store.saturated'),
          entries: [],
        };
      }
      if (warnReached) {
        return {
          level: 'warn',
          tooltip: t('postprod.audit.store.warn'),
          entries: [],
        };
      }
      return { level: '', tooltip: '', entries: [] };
    }

    const items = Array.isArray(logsStorageSummary?.items) ? logsStorageSummary.items : [];
    const warnItems = [];
    const saturatedItems = [];

    for (const it of items) {
      const state = String(it?.state || '').trim().toLowerCase();
      if (state === 'saturated') saturatedItems.push(it);
      else if (state === 'warn') warnItems.push(it);
    }

    const level = saturatedItems.length > 0 ? 'error' : (warnItems.length > 0 ? 'warn' : '');
    if (!level) {
      return { level: '', tooltip: '', entries: [] };
    }

    const describe = (entry, state) => {
      const name = String(entry?.name || entry?.ip || 'Station').trim();
      const count = Number(entry?.logStore?.lineCount || 0);
      const warnAt = Number(entry?.logStore?.warnAt || 1500);
      const hardLimit = Number(entry?.logStore?.hardLimit || 2000);
      const text = state === 'saturated'
        ? t('logs.storage.saturated', { count, limit: hardLimit })
        : t('logs.storage.warn', { count, warnAt, limit: hardLimit });
      return `${name}: ${text}`;
    };

    const tooltipLines = [
      ...saturatedItems.map((it) => describe(it, 'saturated')),
      ...warnItems.map((it) => describe(it, 'warn')),
    ];

    return {
      level,
      tooltip: tooltipLines.join('\n'),
      entries: [
        ...saturatedItems.map((it) => ({ ...it, __state: 'saturated' })),
        ...warnItems.map((it) => ({ ...it, __state: 'warn' })),
      ],
    };
  }, [appMode, logsStorageSummary, postprodAudit?.auditLogStore, t]);

  const usersNavAlert = useMemo(() => {
    if (appMode !== APP_MODE_POSTPROD) return null;
    const store = postprodAudit?.auditLogStore && typeof postprodAudit.auditLogStore === 'object'
      ? postprodAudit.auditLogStore
      : null;
    if (!store) return null;
    const count = Number(store?.count || 0);
    const warnAt = Number(store?.warnAt || 5000);
    const hardLimit = Number(store?.hardLimit || 10000);
    const saturated = !!store?.saturated || (Number.isFinite(hardLimit) && hardLimit > 0 && count >= hardLimit);
    const warnReached = !!store?.warnReached
      || saturated
      || (Number.isFinite(warnAt) && warnAt > 0 && count >= warnAt);
    if (saturated) return { level: 'error', tooltip: t('postprod.users.audit.store.saturated') };
    if (warnReached) return { level: 'warn', tooltip: t('postprod.users.audit.store.warn') };
    return null;
  }, [appMode, postprodAudit?.auditLogStore, t]);
  const resolveRendersToModifyNotice = useCallback((countValue = 0) => {
    const countRaw = Number(countValue || 0);
    const count = Number.isFinite(countRaw) && countRaw > 0 ? Math.trunc(countRaw) : 0;
    if (count <= 0) return '';
    if (count === 1) {
      return t(
        'postprod.renders.toModify.noticeSingular',
        '1 rendu à modifier vous est assigné ou vous appartient.'
      );
    }
    return t(
      'postprod.renders.toModify.noticePlural',
      '{count} rendus à modifier vous sont assignés ou vous appartiennent.',
      { count }
    );
  }, [t]);
  const resolveRendersErrorNotice = useCallback((countValue = 0) => {
    const countRaw = Number(countValue || 0);
    const count = Number.isFinite(countRaw) && countRaw > 0 ? Math.trunc(countRaw) : 0;
    if (count <= 0) return '';
    if (count === 1) {
      return t(
        'postprod.renders.error.noticeSingular',
        '1 rendu en erreur vous est assigné ou vous appartient.'
      );
    }
    return t(
      'postprod.renders.error.noticePlural',
      '{count} rendus en erreur vous sont assignés ou vous appartiennent.',
      { count }
    );
  }, [t]);
  const resolveRendersAssignmentNotice = useCallback((countValue = 0) => {
    const countRaw = Number(countValue || 0);
    const count = Number.isFinite(countRaw) && countRaw > 0 ? Math.trunc(countRaw) : 0;
    if (count <= 0) return '';
    if (count === 1) {
      return t(
        'postprod.renders.assignment.noticeSingular',
        '1 nouveau rendu vous est assigné.'
      );
    }
    return t(
      'postprod.renders.assignment.noticePlural',
      '{count} nouveaux rendus vous sont assignés.',
      { count }
    );
  }, [t]);
  const rendersNavAlert = useMemo(() => {
    if (appMode !== APP_MODE_POSTPROD || !postprodAuthenticated) return null;
    const summary = postprodUserAlerts?.summary && typeof postprodUserAlerts.summary === 'object'
      ? postprodUserAlerts.summary
      : null;
    const toModifyCountRaw = Number(summary?.toModifyOpen || 0);
    const toModifyCount = Number.isFinite(toModifyCountRaw) && toModifyCountRaw > 0
      ? Math.trunc(toModifyCountRaw)
      : 0;
    const renderErrorCountRaw = Number(summary?.renderErrorOpen || 0);
    const renderErrorCount = Number.isFinite(renderErrorCountRaw) && renderErrorCountRaw > 0
      ? Math.trunc(renderErrorCountRaw)
      : 0;
    const newAssignmentCountRaw = Number(summary?.newAssignmentOpen || 0);
    const newAssignmentCount = Number.isFinite(newAssignmentCountRaw) && newAssignmentCountRaw > 0
      ? Math.trunc(newAssignmentCountRaw)
      : 0;
    const totalCountRaw = Number(summary?.totalOpen || (toModifyCount + renderErrorCount + newAssignmentCount));
    const totalCount = Number.isFinite(totalCountRaw) && totalCountRaw > 0
      ? Math.trunc(totalCountRaw)
      : (toModifyCount + renderErrorCount + newAssignmentCount);
    if (totalCount <= 0) return null;
    const tooltipLines = [];
    if (toModifyCount > 0) tooltipLines.push(resolveRendersToModifyNotice(toModifyCount));
    if (renderErrorCount > 0) tooltipLines.push(resolveRendersErrorNotice(renderErrorCount));
    if (newAssignmentCount > 0) tooltipLines.push(resolveRendersAssignmentNotice(newAssignmentCount));
    let level = 'warn';
    let message = '';
    if (toModifyCount > 0) {
      level = 'warn';
      message = resolveRendersToModifyNotice(toModifyCount);
    } else if (renderErrorCount > 0) {
      level = 'error';
      message = resolveRendersErrorNotice(renderErrorCount);
    } else if (newAssignmentCount > 0) {
      level = 'warn';
      message = resolveRendersAssignmentNotice(newAssignmentCount);
    }
    return {
      level,
      count: totalCount,
      tooltip: tooltipLines.join('\n'),
      message,
      summary: {
        toModifyCount,
        renderErrorCount,
        newAssignmentCount,
        totalCount,
      },
    };
  }, [
    appMode,
    postprodAuthenticated,
    postprodUserAlerts?.summary,
    resolveRendersToModifyNotice,
    resolveRendersErrorNotice,
    resolveRendersAssignmentNotice,
  ]);
  const rendersTopNoticeText = useMemo(() => {
    if (appMode !== APP_MODE_POSTPROD) return '';
    const text = String(rendersNavAlert?.message || '').trim();
    if (text) return text;
    const tooltip = String(rendersNavAlert?.tooltip || '').trim();
    if (!tooltip) return '';
    const [firstLine] = tooltip.split('\n');
    return String(firstLine || '').trim();
  }, [appMode, rendersNavAlert?.message, rendersNavAlert?.tooltip]);

  useEffect(() => {
    if (showWelcome || showLicense) return;
    if (
      appMode === APP_MODE_POSTPROD
      && current === POSTPROD_TAB_RENDERS_CREATE
      && postprodTaskFormOpen
    ) {
      return;
    }

    let stopped = false;
    let timer = null;
    const pollSec = Math.max(2, Number(commonCfg?.refreshSec || 5) || 5);

    const tick = async () => {
      try {
        const status = await getLogsStorage({ allHosts: true });
        if (!stopped && status && typeof status === 'object' && status.ok !== false) {
          setLogsStorageSummary(status);
        }
      } catch {
        // conserve le dernier état connu en cas d'erreur réseau temporaire
      }

      if (!stopped) {
        timer = setTimeout(tick, pollSec * 1000);
      }
    };

    tick();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [
    showWelcome,
    showLicense,
    commonCfg?.refreshSec,
    appMode,
    current,
    postprodTaskFormOpen,
  ]);

  useEffect(() => {
    const entries = Array.isArray(logsNavAlert?.entries) ? logsNavAlert.entries : [];
    const prev = logsAlertPrevRef.current;
    if (!entries.length) {
      prev.initialized = true;
      prev.byIp = {};
      return;
    }

    const nextByIp = {};
    for (const entry of entries) {
      const ip = String(entry?.ip || '').trim();
      const st = String(entry?.__state || entry?.state || '').trim().toLowerCase();
      if (!ip || (st !== 'warn' && st !== 'saturated')) continue;
      nextByIp[ip] = st;
    }

    if (prev.initialized) {
      const transitions = [];
      for (const entry of entries) {
        const ip = String(entry?.ip || '').trim();
        const st = String(entry?.__state || entry?.state || '').trim().toLowerCase();
        if (!ip || (st !== 'warn' && st !== 'saturated')) continue;
        const prevState = String(prev.byIp?.[ip] || 'ok').trim().toLowerCase();
        if (prevState === st) continue;
        transitions.push({ entry, st, severity: st === 'saturated' ? 2 : 1 });
      }
      transitions.sort((a, b) => b.severity - a.severity);

      const top = transitions[0] || null;
      if (top) {
        const name = String(top.entry?.name || top.entry?.ip || 'Station').trim();
        const count = Number(top.entry?.logStore?.lineCount || 0);
        const warnAt = Number(top.entry?.logStore?.warnAt || 1500);
        const hardLimit = Number(top.entry?.logStore?.hardLimit || 2000);
        const detail = top.st === 'saturated'
          ? t('logs.storage.saturated', { count, limit: hardLimit })
          : t('logs.storage.warn', { count, warnAt, limit: hardLimit });
        showNotice(`${name}: ${detail}`, top.st === 'saturated' ? 'error' : 'warn');
      }
    }

    prev.initialized = true;
    prev.byIp = nextByIp;
  }, [logsNavAlert, showNotice, t]);

  const refreshLicenseStatus = React.useCallback(async () => {
    if (!window.electron?.licenseGetStatus) {
      const fallback = { ok: false, status: 'unavailable' };
      setLicenseStatus(fallback);
      return fallback;
    }
    try {
      const res = await window.electron.licenseGetStatus();
      const next = res && typeof res === 'object' ? res : { ok: false, status: 'error' };
      setLicenseStatus(next);
      return next;
    } catch {
      const next = { ok: false, status: 'error' };
      setLicenseStatus(next);
      return next;
    }
  }, []);

  useEffect(() => {
    refreshLicenseStatus();
  }, [refreshLicenseStatus]);

  // Charger common/hosts (config locale + capacites Unreal locales)
  useEffect(() => {
    if (showWelcome || showLicense) return;
    let cancelled = false;
    setCommonLoaded(false);
    setHostsLoaded(false);
    (async () => {
      try {
        const [c, h] = await Promise.all([
          getCommon(),
          getHosts().catch(() => []),
        ]);
        if (!cancelled) {
          setCommonCfg(c || {});
          setCommonLoaded(true);
          setHostsCfg(Array.isArray(h) ? h : []);
          setHostsLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setCommonCfg(null);
          // On laisse commonLoaded à false en cas d'échec pour ne pas marquer en rouge
          setCommonLoaded(false);
          setHostsCfg([]);
          setHostsLoaded(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [role, current, showWelcome, showLicense]);

  const resourcesAvailable = resourcesEnabled && hasLibraryItems;
  const resourcesTabAvailable = resourcesAvailable && postprodCanViewResources;

  const refreshLibraryAvailability = React.useCallback(async () => {
    if (role !== 'server' || showWelcome || showLicense || !resourcesEnabled) {
      setHasLibraryItems(false);
      return;
    }
    try {
      const res = await getLibraryMeta();
      const count = Number(res?.count);
      const itemsCount = Number.isFinite(count)
        ? count
        : (Array.isArray(res?.items) ? res.items.length : 0);
      const hasItems = res?.hasItems === true || itemsCount > 0;
      setHasLibraryItems(hasItems);
    } catch {}
  }, [role, resourcesEnabled, showWelcome, showLicense]);

  useEffect(() => {
    refreshLibraryAvailability();
  }, [refreshLibraryAvailability, resourcesRefreshKey]);

  const handleNavClick = React.useCallback((item, opts = {}) => {
    const force = !!opts.force;
    if (item === "Ressources") {
      const canOpenResources = appMode === APP_MODE_POSTPROD
        ? postprodCanAccessResources
        : resourcesTabAvailable;
      if (!canOpenResources && !force) return;
      setResourcesRefreshKey((prev) => prev + 1);
    }
    if (item === POSTPROD_TAB_USERS) {
      setUserTabKey((prev) => prev + 1);
    }
    if (item === POSTPROD_TAB_PROFILES) {
      setRoleTabKey((prev) => prev + 1);
    }
    if (item === "Datas") {
      setDatasTabKey((prev) => prev + 1);
    }
    setCurrent(item);
  }, [appMode, postprodCanAccessResources, resourcesTabAvailable]);
  const handlePostprodOpenRenderEditor = React.useCallback((payload = {}) => {
    const typeRaw = String(payload?.type || '').trim().toLowerCase();
    const type = typeRaw === "rendu" ? "render" : typeRaw;
    const ref = String(payload?.ref || '').trim();
    if (!ref) return;
    const action = String(payload?.action || '').trim().toLowerCase();
    const task = payload?.task && typeof payload.task === "object" && !Array.isArray(payload.task)
      ? payload.task
      : null;
    if (
      type !== 'project'
      && type !== 'resource'
      && type !== 'task'
      && type !== 'render'
      && type !== 'project_create'
    ) return;
    setPostprodRenderEditorRequest({
      id: `${type}:${action}:${ref}:${Date.now()}`,
      type,
      ref,
      action,
      task,
    });
    setCurrent(POSTPROD_TAB_RENDERS_CREATE);
  }, []);
  const handlePostprodOpenActivityTarget = React.useCallback((payload = {}) => {
    const type = String(payload?.type || "").trim().toLowerCase();
    if (!type) return;

    if (type === "project") {
      const projectRef = String(payload?.projectRef || payload?.ref || "").trim();
      if (projectRef) {
        try { localStorage.setItem("uu_pending_detail", projectRef); } catch {}
      }
      setCurrent("Projets");
      return;
    }

    if (type === "form" || type === "formulaire") {
      setCurrent("Datas");
      return;
    }

    if (type === "task" || type === "tache") {
      const taskIdRaw = Number(payload?.taskId || payload?.ref || 0);
      const taskRef = Number.isFinite(taskIdRaw) && taskIdRaw > 0
        ? String(Math.trunc(taskIdRaw))
        : String(payload?.ref || "").trim();
      if (!taskRef) return;
      setPostprodRenderEditorRequest({
        id: `render:${taskRef}:${Date.now()}`,
        type: "render",
        ref: taskRef,
      });
      setCurrent(POSTPROD_TAB_RENDERS_CREATE);
      return;
    }

    if (type === "validation" || type === "render" || type === "rendu") {
      setCurrent("Rendus");
    }
  }, []);
  const normalizePostprodWrcFiles = useCallback((wrcPresets = []) => {
    const list = Array.isArray(wrcPresets) ? wrcPresets : [];
    const out = [];
    const seen = new Set();
    for (const entry of list) {
      const value = String(
        (entry && typeof entry === 'object'
          ? (entry.assetPath || entry.path || entry.name)
          : entry
        ) || ''
      ).trim();
      if (!value) continue;
      const key = value.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(value);
    }
    return out;
  }, []);

  const refreshPostprodProjectWrcSnapshots = useCallback(async (projectRef, wrcPresets = []) => {
    const token = String(postprodAuth.token || '').trim();
    const project = String(projectRef || '').trim();
    if (!token || !project) {
      return { attempted: 0, refreshed: 0, usingLastKnown: 0, missingSnapshot: 0, failed: 0 };
    }
    const wrcFiles = normalizePostprodWrcFiles(wrcPresets);
    if (wrcFiles.length <= 0) {
      return { attempted: 0, refreshed: 0, usingLastKnown: 0, missingSnapshot: 0, failed: 0 };
    }
    let refreshed = 0;
    let usingLastKnown = 0;
    let missingSnapshot = 0;
    let failed = 0;
    for (const wrcFile of wrcFiles) {
      try {
        const res = await postprodGetProjectWrcFields(token, project, wrcFile, 10000, { refreshSnapshot: true });
        if (res?.refreshedFromUnreal === true) refreshed += 1;
        if (res?.usingLastKnownPreset === true) usingLastKnown += 1;
      } catch (e) {
        const code = String(e?.code || '').trim().toLowerCase();
        if (code === 'wrc_preset_unreachable_no_snapshot') missingSnapshot += 1;
        else failed += 1;
      }
    }
    return { attempted: wrcFiles.length, refreshed, usingLastKnown, missingSnapshot, failed };
  }, [postprodAuth.token, normalizePostprodWrcFiles]);
  const handlePostprodNavigateToProject = React.useCallback(async (projectRef, opts = {}) => {
    const ref = String(projectRef || '').trim();
    if (!ref) return;
    if (opts?.start) {
      try {
        const hostList = Array.isArray(hostsCfg) && hostsCfg.length > 0
          ? hostsCfg
          : (await getHosts().catch(() => []));
        const preferredHost = (
          Array.isArray(hostList)
            ? hostList.find(
                (host) =>
                  host
                  && String(host.ip || '').trim().toLowerCase() === String(localIp || '').trim().toLowerCase()
              ) || hostList[0]
            : null
        );
        const hostIp = String(preferredHost?.ip || '').trim();
        if (!hostIp) {
          showNotice(t('launch.status.agentOffline'), 'warn');
          return;
        }

        const projectsPayload = await getProjects({ timeoutMs: 30000 }).catch(() => ({}));
        const projectsList = Array.isArray(projectsPayload?.projects) ? projectsPayload.projects : [];
        const refLower = ref.toLowerCase();
        const selectedProject = projectsList.find((project) => {
          const id = String(project?.id || '').trim().toLowerCase();
          const name = String(project?.name || '').trim().toLowerCase();
          const code = String(project?.code || '').trim().toLowerCase();
          return refLower === id || refLower === name || refLower === code;
        }) || null;
        const uproject = String(
          selectedProject?.uproject
          || selectedProject?.projectPath
          || selectedProject?.path
          || selectedProject?.uprojectPath
          || ''
        ).trim();
        const requiredVersion = String(selectedProject?.engineVersion || '').trim();
        if (!uproject) {
          showNotice(t('launch.status.missingUproject'), 'warn');
          return;
        }

        await postCommon({ launchMode: 'integration' });
        const launchRes = await postLaunch(hostIp, { uproject, engineVersion: requiredVersion });
        if (launchRes?.localFallback?.used) {
          showNotice(t('launch.msg.localFallback') || 'Reseau Ethernet inactif, bascule locale sur 127.0.0.1.', 'warn');
        }
        const postprodToken = String(postprodAuth.token || '').trim();
        const projectRefForRefresh = String(
          selectedProject?.id
          || selectedProject?.name
          || ref
        ).trim();
        if (postprodToken && projectRefForRefresh) {
          let wrcPresetsFromProject = Array.isArray(selectedProject?.wrcNames)
            ? selectedProject.wrcNames
            : [];
          try {
            const catalogRes = await postprodGetProjectUnrealCatalog(postprodToken, projectRefForRefresh);
            const catalogObj = catalogRes?.catalog && typeof catalogRes.catalog === 'object'
              ? catalogRes.catalog
              : {};
            const catalogWrc = Array.isArray(catalogObj?.wrcPresets) ? catalogObj.wrcPresets : [];
            if (catalogWrc.length > 0) wrcPresetsFromProject = catalogWrc;
          } catch {}
          void refreshPostprodProjectWrcSnapshots(projectRefForRefresh, wrcPresetsFromProject);
        }
        return;
      } catch (e) {
        showNotice(String(e?.message || e || t('postprod.projects.error')), 'error');
        return;
      }
    }
    try { localStorage.setItem('uu_pending_detail', ref); } catch {}
    setCurrent('Projets');
  }, [hostsCfg, localIp, showNotice, t, postprodAuth.token, refreshPostprodProjectWrcSnapshots]);
  const handlePostprodRenderEditorHandled = React.useCallback(() => {
    setPostprodRenderEditorRequest(null);
  }, []);
  const handlePostprodRenderFormFocusHandled = React.useCallback(() => {
    setPostprodRenderFormFocusRequest(null);
  }, []);
  const handlePostprodNavigateToRenderForm = React.useCallback((form) => {
    const formId = Number(form?.id || 0);
    if (formId <= 0) return;
    setPostprodRenderFormFocusRequest({ ref: String(formId) });
    setCurrent("Datas");
  }, []);
  const handlePostprodEditUserHandled = React.useCallback((reqKey) => {
    setPostprodEditUserRequest(prev => prev?.reqKey === reqKey ? null : prev);
  }, []);
  const handlePostprodOpenUser = React.useCallback((entry) => {
    const userId = Number(entry?.id || 0);
    if (!userId) return;
    handleNavClick(POSTPROD_TAB_USERS);
    setPostprodEditUserRequest({ userId, reqKey: Date.now() });
  }, [handleNavClick]);
  const handleLibraryImported = React.useCallback(() => {
    setHasLibraryItems(true);
    setResourcesRefreshKey((prev) => prev + 1);
  }, []);

  const versionsList = Array.isArray(commonCfg?.unrealVersions)
    ? commonCfg.unrealVersions.map((v) => String(v || '').trim()).filter(Boolean)
    : [];
  const localHost =
    (Array.isArray(hostsCfg)
      ? hostsCfg.find(
          (h) =>
            h &&
            String(h.ip || '').trim().toLowerCase() === localIp
        )
      : null) || ((Array.isArray(hostsCfg) && hostsCfg.length === 1) ? hostsCfg[0] || null : null);
  const localEditors =
    localHost && localHost.unrealEditors && typeof localHost.unrealEditors === 'object'
      ? localHost.unrealEditors
      : {};
  const localEditorEntries = Object.entries(localEditors || {}).filter(([, value]) => {
    const normalized = String(value || "").trim();
    return normalized.length > 0;
  });
  const localEditorPathsByVersion = new Map(
    localEditorEntries.map(([version, value]) => [String(version || "").trim(), String(value || "").trim()])
  );
  const localEditorPaths = Array.from(localEditorPathsByVersion.values()).filter(Boolean);
  const localPrimaryUnrealEditorPath = (
    Array.isArray(versionsList)
      ? versionsList
          .map((v) => String(localEditors?.[v] || '').trim())
          .find((pathValue) => pathValue.length > 0)
      : ''
  ) || localEditorPaths[0] || String(localHost?.unreal_editor || '').trim();
  const localHostName = String(localHost?.name || '').trim();
  const localUnrealVersions = (
    versionsList.length > 0
      ? versionsList.filter((v) => String(localEditors?.[v] || '').trim().length > 0)
      : Array.from(localEditorPathsByVersion.keys()).filter(Boolean)
  );
  const localUnrealVersionsKey = localUnrealVersions.join('|');
  const localRenderAvailability = (() => {
    const VALID = ['capable', 'busy', 'excluded'];
    if (VALID.includes(localHost?.renderAvailability)) return localHost.renderAvailability;
    return localHost?.renderEnabled === false ? 'excluded' : 'capable';
  })();
  const localRenderEnabled = localRenderAvailability !== 'excluded'; // backward compat alias
  const hasLocalUnrealCapability = (
    localEditorPaths.length > 0
    || String(localHost?.unreal_editor || '').trim().length > 0
  );
  const postprodRenderOutputDir = String(
    commonCfg?.render_output_dir
    ?? commonCfg?.renderOutputDir
    ?? (
      (Array.isArray(commonCfg?.render_output_dirs) ? commonCfg.render_output_dirs : (
        Array.isArray(commonCfg?.renderOutputDirs) ? commonCfg.renderOutputDirs : []
      ))
        .map((entry) => String(entry || '').trim())
        .find(Boolean)
    )
    ?? ''
  ).trim();
  const unnamedRenderDestinationLabel = String(
    t("postprod.tasks.form.exportDestinations.undefined", "Aucune destination définie")
  ).trim();
  const postprodRenderExportDestinationOptions = useMemo(
    () => mapRenderExportDestinationOptions(commonCfg, unnamedRenderDestinationLabel),
    [commonCfg, unnamedRenderDestinationLabel]
  );
  const renderWorkerKey = String(safeIdentity.localIp || '').trim()
    || (postprodAuth.user?.username ? `user:${String(postprodAuth.user.username).trim()}` : '');
  const renderWorkerDisplayName = String(localHostName || safeIdentity.localIp || postprodAuth.user?.username || 'Worker')
    .trim();
  const renderWorkerCapabilities = useMemo(() => {
    const runtimePlatform = typeof navigator !== 'undefined'
      ? String(navigator.platform || '').trim().toLowerCase()
      : '';
    const out = {
      unrealEnabled: hasLocalUnrealCapability,
      renderEnabled: localRenderEnabled,
      unrealVersions: localUnrealVersions,
      platform: runtimePlatform,
    };
    if (localHostName) out.hostName = localHostName;
    if (localPrimaryUnrealEditorPath) out.unrealEditorPath = localPrimaryUnrealEditorPath;
    return out;
  }, [hasLocalUnrealCapability, localRenderEnabled, localPrimaryUnrealEditorPath, localUnrealVersionsKey, localHostName]);

  const ensureLocalRenderWorkerOnline = useCallback(async () => {
    const token = String(postprodAuth.token || '').trim();
    const workerKey = String(renderWorkerKey || '').trim();
    if (!token || !workerKey) return false;
    const payloadBase = {
      workerKey,
      displayName: renderWorkerDisplayName,
      capabilities: renderWorkerCapabilities,
      canRender: localRenderEnabled,
      renderAvailability: localRenderAvailability,
      isActive: true,
    };
    try {
      await postprodUpsertRenderWorker(token, { ...payloadBase, isOnline: true });
      return true;
    } catch {
      return false;
    }
  }, [
    postprodAuth.token,
    renderWorkerKey,
    renderWorkerDisplayName,
    renderWorkerCapabilities,
    hasLocalUnrealCapability,
    localRenderEnabled,
    localRenderAvailability,
  ]);

  const postprodRenderWorkersForUi = useMemo(() => {
    const base = Array.isArray(postprodRenderWorkers.items) ? postprodRenderWorkers.items : [];
    const workerKey = String(renderWorkerKey || '').trim();
    if (!workerKey) return base;
    const idx = base.findIndex((entry) => String(entry?.workerKey || '').trim() === workerKey);
    if (idx >= 0) {
      const next = [...base];
      const current = next[idx] && typeof next[idx] === 'object' ? next[idx] : {};
      next[idx] = {
        ...current,
        workerKey,
        displayName: String(current?.displayName || '').trim() || renderWorkerDisplayName || workerKey,
        // La station courante est localement joignable par l'application.
        isOnline: true,
        canRender: localRenderEnabled ? true : current?.canRender,
        renderAvailability: localRenderAvailability,
      };
      return next;
    }
    if (!localRenderEnabled) return base;
    return [
      {
        workerKey,
        displayName: renderWorkerDisplayName || workerKey,
        isOnline: true,
        canRender: true,
        renderAvailability: localRenderAvailability,
        capabilities: renderWorkerCapabilities,
        isActive: true,
      },
      ...base,
    ];
  }, [
    postprodRenderWorkers.items,
    renderWorkerKey,
    renderWorkerDisplayName,
    renderWorkerCapabilities,
    hasLocalUnrealCapability,
    localRenderEnabled,
    localRenderAvailability,
  ]);

  const configMissing =
    role === 'server' &&
    commonLoaded &&
    commonCfg &&
    (
      !Number(commonCfg.rcHttpPort || 0) ||
      versionsList.length === 0 ||
      (hostsLoaded &&
        versionsList.some(
          (v) => !String(localEditors[v] || '').trim()
        ))
    );

  // Quand on valide l’écran Welcome
  async function handleWelcomeContinue(newIdentity) {
    const requestedMode = normalizeAppMode(newIdentity?.mode);
    const mode = postprodModeAccess?.forcedMode
      ? normalizeAppMode(postprodModeAccess.forcedMode)
      : requestedMode;
    const nextIdentity = {
      ...(newIdentity || {}),
      mode,
      role: mode === APP_MODE_POSTPROD
        ? 'server'
        : String(newIdentity?.role || 'server').trim() || 'server',
      serverIp: mode === APP_MODE_POSTPROD
        ? ''
        : String(newIdentity?.serverIp || '').trim(),
    };
    writeIdentity(nextIdentity);
    setIdentity(nextIdentity);
    const allowed = getAllowedTabs({
      role: nextIdentity.mode === APP_MODE_POSTPROD ? "server" : (String(nextIdentity.role || "server").trim() || "server"),
      appMode: nextIdentity.mode,
      clientSyncEnabled,
      resourcesAvailable: resourcesTabAvailable,
      postprodTabs: postprodVisibleTabs,
      postprodCanManageMachines,
      liveAccountTabs,
    });
    setCurrent(resolveDefaultTab(allowed, nextIdentity.mode));
    setInitialClientNavDone(false);
    const latest = await refreshLicenseStatus();
    if (latest && latest.ok) {
      setShowWelcome(false);
      setShowLicense(false);
    } else {
      setShowWelcome(false);
      setShowLicense(true);
      setLicenseOrigin('gate');
    }
  }

  function openLicense(origin) {
    setLicenseOrigin(origin || 'welcome');
    setShowWelcome(false);
    setShowLicense(true);
  }

  function handleLicenseBack() {
    setShowLicense(false);
    setShowWelcome(true);
  }

  function handleLicenseContinue() {
    if (licenseOrigin === 'welcome') {
      setShowLicense(false);
      setShowWelcome(true);
      return;
    }
    setShowLicense(false);
  }

  const clearPostprodAuth = useCallback((errorText = '') => {
    postprodOfflineReplayInFlightRef.current = false;
    postprodOfflineReplayLastKickRef.current = 0;
    postprodWorkerCompletionReplayInFlightRef.current = false;
    postprodWorkerCompletionReplayLastKickRef.current = 0;
    writePostprodAuth(null);
    setPostprodAuth({
      token: '',
      user: null,
      expiresAt: '',
      busy: false,
      error: String(errorText || ''),
      hydrated: true,
    });
    setPostprodUsers({ items: [], loading: false, error: '' });
    setPostprodRoles({ items: [], loading: false, error: '' });
    setPostprodTasks({ items: [], loading: false, error: '' });
    setPostprodTaskCatalog({ projects: [], resources: [], loading: false, error: '' });
    setPostprodProjects({ items: [], loading: false, error: '' });
    setPostprodResources({ items: [], loading: false, error: '', source: '', sync: null });
    setPostprodRenderProjectCatalog({ items: [], loading: false, error: '' });
    setPostprodRenders({ items: [], loading: false, error: '', detectedScan: null });
    setPostprodUserAlerts({ items: [], summary: null, loading: false, error: '' });
    setPostprodRenderHealth({ data: null, loading: false, error: '' });
    setPostprodRenderWorkers({ items: [], loading: false, error: '' });
    setPostprodRenderTemplates({ items: [], loading: false, error: '' });
    setPostprodRenderForms({ items: [], loading: false, error: '' });
    setPostprodProfile({ saving: false, error: '' });
    setPostprodMyActivity({
      activities: [],
      summary: { total: 0, actions: {}, projects: [] },
      loading: false,
      error: '',
    });
    setPostprodAudit({
      entries: [],
      loading: false,
      error: '',
      total: 0,
      page: 1,
      pageSize: 100,
      hasMore: false,
      filters: {
        actorUserId: null,
        action: '',
        scopeType: '',
        fromAt: '',
        toAt: '',
      },
    });
    setPostprodRenderHealthAuditMaintenance({
      data: null,
      loading: false,
      error: '',
      purging: false,
      purgeError: '',
      lastPurge: null,
    });
  }, []);

  const handlePostprodLogin = useCallback(async (credentials = {}) => {
    setPostprodAuth((prev) => ({ ...prev, busy: true, error: '' }));
    try {
      if (typeof window !== 'undefined' && typeof window.electron?.startAgent === 'function') {
        const rawPort = Number(safeIdentity.agentPort);
        const normalizedPort = Number.isFinite(rawPort) && rawPort > 0 && rawPort < 65536
          ? String(Math.trunc(rawPort))
          : '4000';
        const boot = await window.electron.startAgent(normalizedPort);
        if (boot && typeof boot === 'object' && boot.ok === false) {
          const bootError = Object.assign(
            new Error(String(boot.error || 'postprod_unavailable')),
            { code: 'postprod_unavailable', status: 503 }
          );
          throw bootError;
        }
      }
      const res = await postprodAuthLogin(credentials);
      const token = String(res?.token || '').trim();
      const user = res?.user && typeof res.user === 'object' ? res.user : null;
      const expiresAt = String(res?.session?.expiresAt || '').trim();
      if (!token || !user) {
        throw Object.assign(new Error('invalid_session'), { code: 'invalid_session', status: 401 });
      }
      const payload = { token, user, expiresAt };
      const modeAccess = getModeAccessForUser(user, true);
      const persistedIdentity = readIdentity() || {};
      const persistedMode = normalizeAppMode(persistedIdentity?.mode);
      const normalizedMode = modeAccess?.forcedMode
        ? normalizeAppMode(modeAccess.forcedMode)
        : persistedMode;
      const nextIdentity = {
        ...persistedIdentity,
        mode: normalizedMode,
        role: normalizedMode === APP_MODE_POSTPROD
          ? 'server'
          : (String(persistedIdentity?.role || 'server').trim() || 'server'),
        serverIp: normalizedMode === APP_MODE_POSTPROD
          ? ''
          : String(persistedIdentity?.serverIp || '').trim(),
      };
      writeIdentity(nextIdentity);
      setIdentity(nextIdentity);
      writePostprodAuth(payload);
      setPostprodAuth({
        ...payload,
        busy: false,
        error: '',
        hydrated: true,
      });
      applyUserLanguageToIdentity(user);
      setPostprodProfile({ saving: false, error: '' });
      const nextTabs = getPostprodTabsForUser(user, true, {
        resourcesEnabled,
      });
      const allowed = getAllowedTabs({
        role: normalizedMode === APP_MODE_POSTPROD
          ? "server"
          : (String(nextIdentity.role || "server").trim() || "server"),
        appMode: normalizedMode,
        clientSyncEnabled,
        resourcesAvailable: resourcesTabAvailable,
        postprodTabs: normalizedMode === APP_MODE_POSTPROD ? nextTabs : postprodVisibleTabs,
        postprodCanManageMachines,
        liveAccountTabs,
      });
      setCurrent(allowed.includes("Projets") ? "Projets" : resolveDefaultTab(allowed, normalizedMode));
      showNotice(t('app.auth.msg.loginOk'), 'ok');
    } catch (e) {
      const msg = resolvePostprodAuthError(e, t);
      setPostprodAuth((prev) => ({
        ...prev,
        busy: false,
        error: msg,
        hydrated: true,
      }));
    }
  }, [
    showNotice,
    t,
    safeIdentity.agentPort,
    applyUserLanguageToIdentity,
    clientSyncEnabled,
    resourcesTabAvailable,
    resourcesEnabled,
    postprodCanManageMachines,
    liveAccountTabs,
    postprodVisibleTabs,
  ]);

  const handlePostprodLogout = useCallback(async () => {
    const token = String(postprodAuth.token || '').trim();
    setPostprodAuth((prev) => ({ ...prev, busy: true, error: '' }));
    try {
      if (token) {
        await postprodAuthLogout(token).catch(() => ({}));
      }
    } finally {
      clearPostprodAuth('');
      const allowed = getAllowedTabs({
        role,
        appMode,
        clientSyncEnabled,
        resourcesAvailable: resourcesTabAvailable,
        postprodTabs: postprodVisibleTabs,
        postprodCanManageMachines,
        liveAccountTabs,
      });
      setCurrent(resolveDefaultTab(allowed, appMode));
      showNotice(t('app.auth.msg.logoutOk'), 'info');
    }
  }, [
    postprodAuth.token,
    clearPostprodAuth,
    showNotice,
    t,
    appMode,
    role,
    clientSyncEnabled,
    resourcesTabAvailable,
    postprodVisibleTabs,
    postprodCanManageMachines,
    liveAccountTabs,
  ]);

  const loadPostprodUsers = useCallback(async () => {
    const token = String(postprodAuth.token || '').trim();
    if (!token || !postprodCanManageUsers) {
      setPostprodUsers({ items: [], loading: false, error: '' });
      return;
    }
    setPostprodUsers((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await postprodListUsers(token);
      const items = Array.isArray(res?.users) ? res.users : [];
      setPostprodUsers({ items, loading: false, error: '' });
    } catch (e) {
      setPostprodUsers((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodUsersError(e, t),
      }));
    }
  }, [postprodAuth.token, postprodCanManageUsers, t]);

  const loadPostprodMyActivity = useCallback(async (options = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) {
      setPostprodMyActivity({
        activities: [],
        summary: { total: 0, actions: {}, projects: [] },
        loading: false,
        error: '',
      });
      return;
    }
    setPostprodMyActivity((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await postprodListMyActivity(token, 50, options);
      const activities = Array.isArray(res?.activities) ? res.activities : [];
      const summary = res?.summary && typeof res.summary === 'object'
        ? res.summary
        : { total: activities.length, actions: {}, projects: [] };
      setPostprodMyActivity({
        activities,
        summary,
        loading: false,
        error: '',
      });
    } catch (e) {
      setPostprodMyActivity((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodActivityError(e, t),
      }));
    }
  }, [postprodAuth.token, t]);

  const loadPostprodAudit = useCallback(async (options = {}) => {
    const token = String(postprodAuth.token || '').trim();
    const nextActorUserIdRaw = Number(options?.actorUserId);
    const nextActorUserId = Number.isFinite(nextActorUserIdRaw) && nextActorUserIdRaw > 0
      ? Math.trunc(nextActorUserIdRaw)
      : null;
    const nextAction = String(options?.action || '').trim();
    const nextScopeType = String(options?.scopeType || '').trim();
    const nextFromAt = String(options?.fromAt || '').trim();
    const nextToAt = String(options?.toAt || '').trim();
    const requestedPageSize = Number(options?.pageSize ?? options?.limit);
    const pageSize = Number.isFinite(requestedPageSize)
      ? Math.max(1, Math.min(500, Math.trunc(requestedPageSize)))
      : 100;
    const requestedPage = Number(options?.page);
    const page = Number.isFinite(requestedPage)
      ? Math.max(1, Math.trunc(requestedPage))
      : 1;

    if (!token) {
      setPostprodAudit({
        entries: [],
        loading: false,
        error: '',
        total: 0,
        page,
        pageSize,
        hasMore: false,
        filters: {
          actorUserId: nextActorUserId,
          action: nextAction,
          scopeType: nextScopeType,
          fromAt: nextFromAt,
          toAt: nextToAt,
        },
      });
      return;
    }
    setPostprodAudit((prev) => ({
      ...prev,
      loading: true,
      error: '',
      page,
      pageSize,
      filters: {
        actorUserId: nextActorUserId,
        action: nextAction,
        scopeType: nextScopeType,
        fromAt: nextFromAt,
        toAt: nextToAt,
      },
    }));
    try {
      const res = await postprodListAudit(token, {
        page,
        pageSize,
        actorUserId: nextActorUserId,
        action: nextAction,
        scopeType: nextScopeType,
        fromAt: nextFromAt,
        toAt: nextToAt,
      });
      const entries = Array.isArray(res?.entries) ? res.entries : [];
      const pagination = res?.pagination && typeof res.pagination === 'object'
        ? res.pagination
        : {};
      const totalRaw = Number(pagination?.total);
      const total = Number.isFinite(totalRaw) ? Math.max(0, Math.trunc(totalRaw)) : entries.length;
      const pageOutRaw = Number(pagination?.page);
      const pageOut = Number.isFinite(pageOutRaw) ? Math.max(1, Math.trunc(pageOutRaw)) : page;
      const pageSizeOutRaw = Number(pagination?.limit);
      const pageSizeOut = Number.isFinite(pageSizeOutRaw)
        ? Math.max(1, Math.min(500, Math.trunc(pageSizeOutRaw)))
        : pageSize;
      const hasMore = pagination?.hasMore === true
        || (pageOut * pageSizeOut) < total;
      const auditLogStore = res?.auditLogStore && typeof res.auditLogStore === 'object'
        ? res.auditLogStore
        : null;
      setPostprodAudit({
        entries,
        loading: false,
        error: '',
        total,
        page: pageOut,
        pageSize: pageSizeOut,
        hasMore,
        auditLogStore,
        filters: {
          actorUserId: nextActorUserId,
          action: nextAction,
          scopeType: nextScopeType,
          fromAt: nextFromAt,
          toAt: nextToAt,
        },
      });
    } catch (e) {
      setPostprodAudit((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodAuditError(e, t),
      }));
    }
  }, [postprodAuth.token, t]);

  const loadPostprodRenderHealthAuditMaintenance = useCallback(async () => {
    const token = String(postprodAuth.token || '').trim();
    if (!token || !postprodCanManageRoles) {
      setPostprodRenderHealthAuditMaintenance({
        data: null,
        loading: false,
        error: '',
        purging: false,
        purgeError: '',
        lastPurge: null,
      });
      return null;
    }
    setPostprodRenderHealthAuditMaintenance((prev) => ({
      ...prev,
      loading: true,
      error: '',
    }));
    try {
      const res = await postprodGetRenderHealthAuditMaintenance(token);
      const data = res?.maintenance && typeof res.maintenance === 'object'
        ? res.maintenance
        : null;
      setPostprodRenderHealthAuditMaintenance((prev) => ({
        ...prev,
        data,
        loading: false,
        error: '',
      }));
      return data;
    } catch (e) {
      setPostprodRenderHealthAuditMaintenance((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodAuditError(e, t),
      }));
      return null;
    }
  }, [postprodAuth.token, postprodCanManageRoles, t]);

  const handlePostprodPurgeRenderHealthAudit = useCallback(async () => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) {
      const err = new Error('missing_token');
      err.code = 'missing_token';
      err.status = 401;
      throw err;
    }
    if (!postprodCanManageRoles) {
      const err = new Error('forbidden');
      err.code = 'forbidden';
      err.status = 403;
      throw err;
    }
    setPostprodRenderHealthAuditMaintenance((prev) => ({
      ...prev,
      purging: true,
      purgeError: '',
    }));
    try {
      const res = await postprodPurgeRenderHealthAudit(token);
      const maintenance = res?.maintenance && typeof res.maintenance === 'object'
        ? res.maintenance
        : null;
      const purge = res?.purge && typeof res.purge === 'object'
        ? res.purge
        : null;
      setPostprodRenderHealthAuditMaintenance((prev) => ({
        ...prev,
        data: maintenance || prev.data,
        purging: false,
        purgeError: '',
        lastPurge: purge,
      }));
      const deletedCount = Math.max(0, Math.trunc(Number(purge?.deleted || 0)));
      showNotice(
        deletedCount > 0
          ? `Purge audit: ${deletedCount} evenement(s) supprime(s)`
          : 'Purge audit: aucune entree supprimee',
        deletedCount > 0 ? 'ok' : 'info'
      );
      return res;
    } catch (e) {
      const errorText = resolvePostprodAuditError(e, t);
      setPostprodRenderHealthAuditMaintenance((prev) => ({
        ...prev,
        purging: false,
        purgeError: errorText,
      }));
      throw e;
    }
  }, [postprodAuth.token, postprodCanManageRoles, showNotice, t]);

  const handlePostprodPurgeAudit = useCallback(async () => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return;
    if (!postprodCanManageRoles) return;
    try {
      const res = await postprodPurgeAudit(token);
      const deletedCount = Math.max(0, Math.trunc(Number(res?.purge?.deleted || 0)));
      showNotice(
        deletedCount > 0
          ? t('postprod.audit.purge.successCount', { count: deletedCount })
          : t('postprod.audit.purge.successEmpty'),
        deletedCount > 0 ? 'ok' : 'info'
      );
      await loadPostprodAudit?.({ page: 1 });
    } catch {
      showNotice(t('postprod.audit.purge.error'), 'error');
    }
  }, [postprodAuth.token, postprodCanManageRoles, loadPostprodAudit, showNotice, t]);

  const collectPostprodAuditEntries = useCallback(async ({
    token = '',
    actorUserId = null,
    action = '',
    scopeType = '',
    fromAt = '',
    toAt = '',
    pageSize = 500,
  } = {}) => {
    const entries = [];
    let page = 1;
    let guard = 0;
    let hasMore = true;

    while (hasMore) {
      guard += 1;
      if (guard > 500) break;
      const res = await postprodListAudit(token, {
        page,
        pageSize,
        actorUserId,
        action,
        scopeType,
        fromAt,
        toAt,
      });
      const chunk = Array.isArray(res?.entries) ? res.entries : [];
      if (chunk.length > 0) entries.push(...chunk);

      const pagination = res?.pagination && typeof res.pagination === 'object'
        ? res.pagination
        : {};
      const pageOutRaw = Number(pagination?.page);
      const pageOut = Number.isFinite(pageOutRaw)
        ? Math.max(1, Math.trunc(pageOutRaw))
        : page;
      const limitOutRaw = Number(pagination?.limit);
      const limitOut = Number.isFinite(limitOutRaw)
        ? Math.max(1, Math.min(500, Math.trunc(limitOutRaw)))
        : pageSize;
      const totalOutRaw = Number(pagination?.total);
      const totalOut = Number.isFinite(totalOutRaw)
        ? Math.max(0, Math.trunc(totalOutRaw))
        : entries.length;
      const hasMoreOut = pagination?.hasMore === true
        || (pageOut * limitOut) < totalOut;

      if (!hasMoreOut || chunk.length <= 0) {
        hasMore = false;
        break;
      }
      page = pageOut + 1;
    }

    return entries;
  }, []);

  const exportPostprodAuditAll = useCallback(async (options = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) {
      const err = new Error('missing_token');
      err.code = 'missing_token';
      throw err;
    }

    const baseFilters = postprodAudit?.filters && typeof postprodAudit.filters === 'object'
      ? postprodAudit.filters
      : {};
    const actorRaw = Number(options?.actorUserId ?? baseFilters.actorUserId);
    const actorUserId = Number.isFinite(actorRaw) && actorRaw > 0
      ? Math.trunc(actorRaw)
      : null;
    const action = String(options?.action ?? baseFilters.action ?? '').trim();
    const scopeType = String(options?.scopeType ?? baseFilters.scopeType ?? '').trim();
    const fromAt = String(options?.fromAt ?? baseFilters.fromAt ?? '').trim();
    const toAt = String(options?.toAt ?? baseFilters.toAt ?? '').trim();
    const query = String(options?.query ?? options?.q ?? '').trim();
    const pageSizeRaw = Number(options?.pageSize ?? options?.limit ?? 500);
    const pageSize = Number.isFinite(pageSizeRaw)
      ? Math.max(1, Math.min(500, Math.trunc(pageSizeRaw)))
      : 500;

    try {
      const csvRes = await postprodExportAuditCsv(token, {
        actorUserId,
        action,
        scopeType,
        fromAt,
        toAt,
        query,
        batch: pageSize,
      });
      return {
        csvText: String(csvRes?.csv || ''),
        filters: {
          actorUserId,
          action,
          scopeType,
          fromAt,
          toAt,
          query,
        },
      };
    } catch (e) {
      const status = Number(e?.status || 0);
      const code = String(e?.code || '').trim().toLowerCase();
      const canFallback =
        status === 404 ||
        status === 405 ||
        code === 'not_found' ||
        code === 'method_not_allowed';
      if (!canFallback) throw e;
    }

    const entries = await collectPostprodAuditEntries({
      token,
      actorUserId,
      action,
      scopeType,
      fromAt,
      toAt,
      pageSize,
    });

    return {
      entries,
      filters: {
        actorUserId,
        action,
        scopeType,
        fromAt,
        toAt,
        query,
      },
    };
  }, [collectPostprodAuditEntries, postprodAuth.token, postprodAudit.filters]);

  const exportPostprodAuditAllJson = useCallback(async (options = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) {
      const err = new Error('missing_token');
      err.code = 'missing_token';
      throw err;
    }

    const baseFilters = postprodAudit?.filters && typeof postprodAudit.filters === 'object'
      ? postprodAudit.filters
      : {};
    const actorRaw = Number(options?.actorUserId ?? baseFilters.actorUserId);
    const actorUserId = Number.isFinite(actorRaw) && actorRaw > 0
      ? Math.trunc(actorRaw)
      : null;
    const action = String(options?.action ?? baseFilters.action ?? '').trim();
    const scopeType = String(options?.scopeType ?? baseFilters.scopeType ?? '').trim();
    const fromAt = String(options?.fromAt ?? baseFilters.fromAt ?? '').trim();
    const toAt = String(options?.toAt ?? baseFilters.toAt ?? '').trim();
    const query = String(options?.query ?? options?.q ?? '').trim();
    const pageSizeRaw = Number(options?.pageSize ?? options?.limit ?? 500);
    const pageSize = Number.isFinite(pageSizeRaw)
      ? Math.max(1, Math.min(500, Math.trunc(pageSizeRaw)))
      : 500;

    try {
      const jsonRes = await postprodExportAuditJson(token, {
        actorUserId,
        action,
        scopeType,
        fromAt,
        toAt,
        query,
        batch: pageSize,
      });
      return {
        data: jsonRes && typeof jsonRes === 'object'
          ? jsonRes
          : { ok: true, entries: [] },
      };
    } catch (e) {
      const status = Number(e?.status || 0);
      const code = String(e?.code || '').trim().toLowerCase();
      const canFallback =
        status === 404 ||
        status === 405 ||
        code === 'not_found' ||
        code === 'method_not_allowed';
      if (!canFallback) throw e;
    }

    const entries = await collectPostprodAuditEntries({
      token,
      actorUserId,
      action,
      scopeType,
      fromAt,
      toAt,
      pageSize,
    });
    return {
      data: {
        ok: true,
        exportedAt: new Date().toISOString(),
        filters: {
          actorUserId,
          action,
          scopeType,
          fromAt,
          toAt,
          query,
        },
        total: entries.length,
        entries,
      },
    };
  }, [collectPostprodAuditEntries, postprodAuth.token, postprodAudit.filters]);

  const exportPostprodAuditAllNdjson = useCallback(async (options = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) {
      const err = new Error('missing_token');
      err.code = 'missing_token';
      throw err;
    }

    const baseFilters = postprodAudit?.filters && typeof postprodAudit.filters === 'object'
      ? postprodAudit.filters
      : {};
    const actorRaw = Number(options?.actorUserId ?? baseFilters.actorUserId);
    const actorUserId = Number.isFinite(actorRaw) && actorRaw > 0
      ? Math.trunc(actorRaw)
      : null;
    const action = String(options?.action ?? baseFilters.action ?? '').trim();
    const scopeType = String(options?.scopeType ?? baseFilters.scopeType ?? '').trim();
    const fromAt = String(options?.fromAt ?? baseFilters.fromAt ?? '').trim();
    const toAt = String(options?.toAt ?? baseFilters.toAt ?? '').trim();
    const query = String(options?.query ?? options?.q ?? '').trim();
    const pageSizeRaw = Number(options?.pageSize ?? options?.limit ?? 500);
    const pageSize = Number.isFinite(pageSizeRaw)
      ? Math.max(1, Math.min(500, Math.trunc(pageSizeRaw)))
      : 500;

    try {
      const ndjsonRes = await postprodExportAuditNdjson(token, {
        actorUserId,
        action,
        scopeType,
        fromAt,
        toAt,
        query,
        batch: pageSize,
      });
      return {
        ndjsonText: String(ndjsonRes?.ndjson || ''),
      };
    } catch (e) {
      const status = Number(e?.status || 0);
      const code = String(e?.code || '').trim().toLowerCase();
      const canFallback =
        status === 404 ||
        status === 405 ||
        code === 'not_found' ||
        code === 'method_not_allowed';
      if (!canFallback) throw e;
    }

    const entries = await collectPostprodAuditEntries({
      token,
      actorUserId,
      action,
      scopeType,
      fromAt,
      toAt,
      pageSize,
    });
    return {
      entries,
      filters: {
        actorUserId,
        action,
        scopeType,
        fromAt,
        toAt,
        query,
      },
    };
  }, [collectPostprodAuditEntries, postprodAuth.token, postprodAudit.filters]);

  const loadPostprodRoles = useCallback(async () => {
    const token = String(postprodAuth.token || '').trim();
    if (!token || (!postprodCanManageUsers && !postprodCanManageRoles)) {
      setPostprodRoles({ items: [], loading: false, error: '' });
      return;
    }
    setPostprodRoles((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await postprodListRoles(token);
      const items = Array.isArray(res?.roles) ? res.roles : [];
      setPostprodRoles({ items, loading: false, error: '' });
    } catch (e) {
      setPostprodRoles((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodRolesError(e, t),
      }));
    }
  }, [postprodAuth.token, postprodCanManageUsers, postprodCanManageRoles, t]);

  const loadPostprodTasks = useCallback(async (options = {}) => {
    const silent = options?.silent === true;
    const token = String(postprodAuth.token || '').trim();
    if (!token) {
      setPostprodTasks({ items: [], loading: false, error: '' });
      return;
    }
    if (silent) {
      setPostprodTasks((prev) => ({ ...prev, error: '' }));
    } else {
      setPostprodTasks((prev) => ({ ...prev, loading: true, error: '' }));
    }
    try {
      const res = await postprodListTasks(token);
      const items = Array.isArray(res?.tasks) ? res.tasks : [];
      setPostprodTasks({ items, loading: false, error: '' });
    } catch (e) {
      setPostprodTasks((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodTasksError(e, t),
      }));
    }
  }, [postprodAuth.token, t]);

  const loadPostprodProjects = useCallback(async () => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) {
      setPostprodProjects({ items: [], loading: false, error: '' });
      return;
    }
    setPostprodProjects((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await postprodListProjects(token);
      const items = Array.isArray(res?.projects) ? res.projects : [];
      setPostprodProjects({ items, loading: false, error: '' });
    } catch (e) {
      setPostprodProjects((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodProjectsError(e, t),
      }));
    }
  }, [postprodAuth.token, t]);

  const loadPostprodResources = useCallback(async (options = {}) => {
    const token = String(postprodAuth.token || '').trim();
    const forceSync = options?.forceSync === true;
    if (!token) {
      setPostprodResources({ items: [], loading: false, error: '', source: '', sync: null });
      return;
    }
    setPostprodResources((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await postprodListResources(token, 8000, { refresh: forceSync });
      const items = Array.isArray(res?.items) ? res.items : [];
      const source = String(res?.source || '').trim();
      const sync = res?.sync && typeof res.sync === 'object' ? res.sync : null;
      setPostprodResources({ items, loading: false, error: '', source, sync });
    } catch (e) {
      setPostprodResources((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodResourcesError(e, t),
      }));
    }
  }, [postprodAuth.token, t]);

  const loadPostprodTaskCatalog = useCallback(async (options = {}) => {
    const silent = options?.silent === true;
    const token = String(postprodAuth.token || '').trim();
    if (!token) {
      setPostprodTaskCatalog({ projects: [], resources: [], loading: false, error: '' });
      return;
    }
    if (silent) {
      setPostprodTaskCatalog((prev) => ({ ...prev, error: '' }));
    } else {
      setPostprodTaskCatalog((prev) => ({ ...prev, loading: true, error: '' }));
    }
    try {
      const [projectsRes, resourcesRes] = await Promise.all([
        postprodListProjects(token).catch(() => ({})),
        postprodListResources(token, 8000).catch(() => ({})),
      ]);
      const projects = mapTaskProjectOptions(projectsRes);
      const resources = mapTaskResourceOptions(resourcesRes);
      setPostprodTaskCatalog({
        projects,
        resources,
        loading: false,
        error: '',
      });
    } catch {
      setPostprodTaskCatalog((prev) => ({
        ...prev,
        loading: false,
        error: t('postprod.tasks.catalog.error'),
      }));
    }
  }, [postprodAuth.token, t]);

  const handlePostprodLoadResourceDetail = useCallback(async (resourceRef) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return null;
    const id = String(resourceRef || '').trim();
    if (!id) return null;
    const res = await postprodGetResource(token, id);
    const item = res?.item && typeof res.item === 'object' ? res.item : null;
    if (!item) {
      throw Object.assign(new Error('resource_not_found'), {
        code: 'resource_not_found',
        status: 404,
      });
    }
    return item;
  }, [postprodAuth.token]);

  const handlePostprodReindexResources = useCallback(async () => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return false;
    setPostprodResources((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await postprodReindexResources(token);
      await Promise.all([
        loadPostprodResources({ forceSync: true }),
        loadPostprodTaskCatalog(),
      ]);
      const processed = Number(res?.processed || 0);
      const inserted = Number(res?.inserted || 0);
      const updated = Number(res?.updated || 0);
      showNotice(
        t('postprod.resources.msg.reindexed', {
          processed: Number.isFinite(processed) ? processed : 0,
          inserted: Number.isFinite(inserted) ? inserted : 0,
          updated: Number.isFinite(updated) ? updated : 0,
        }),
        'ok'
      );
      return true;
    } catch (e) {
      const msg = resolvePostprodResourcesError(e, t);
      setPostprodResources((prev) => ({
        ...prev,
        loading: false,
        error: msg,
      }));
      return false;
    }
  }, [postprodAuth.token, loadPostprodResources, loadPostprodTaskCatalog, showNotice, t]);

  const handlePostprodLoadProjectRenderTemplates = useCallback(async (projectRef) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return [];
    try {
      const res = await postprodListProjectRenderTemplates(token, projectRef);
      return Array.isArray(res?.templates) ? res.templates : [];
    } catch (e) {
      const err = new Error(resolvePostprodProjectsError(e, t));
      err.code = e?.code || '';
      throw err;
    }
  }, [postprodAuth.token, t]);

  const handlePostprodLoadRenderTransitions = useCallback(async (renderId) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return [];
    try {
      const res = await postprodListRenderTransitions(token, renderId);
      return Array.isArray(res?.transitions) ? res.transitions : [];
    } catch (e) {
      const err = new Error(resolvePostprodRendersError(e, t));
      err.code = e?.code || '';
      throw err;
    }
  }, [postprodAuth.token, t]);

  const handlePostprodLoadProjectUnrealCatalog = useCallback(async (projectRef) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) {
      return { levels: [], sequences: [], presets: [], wrcPresets: [], stats: null };
    }
    try {
      const res = await postprodGetProjectUnrealCatalog(token, projectRef);
      const catalog = res?.catalog && typeof res.catalog === 'object' ? res.catalog : {};
      const normalizedCatalog = {
        levels: Array.isArray(catalog.levels) ? catalog.levels : [],
        sequences: Array.isArray(catalog.sequences) ? catalog.sequences : [],
        presets: Array.isArray(catalog.presets) ? catalog.presets : [],
        wrcPresets: Array.isArray(catalog.wrcPresets) ? catalog.wrcPresets : [],
        stats: catalog?.stats && typeof catalog.stats === 'object' ? catalog.stats : null,
      };
      // Refresh snapshot in background on form editor open / project selection.
      void (async () => {
        const summary = await refreshPostprodProjectWrcSnapshots(projectRef, normalizedCatalog.wrcPresets);
        const projectKey = String(projectRef || '').trim().toLowerCase();
        if (summary?.usingLastKnown > 0) {
          return;
        }
        if (summary?.missingSnapshot > 0) {
          const noticeKey = `catalog::nosnapshot::${projectKey}`;
          const nowTs = Date.now();
          const previousTs = Number(postprodWrcCacheNoticeRef.current?.[noticeKey] || 0);
          if (!Number.isFinite(previousTs) || (nowTs - previousTs) > 10000) {
            postprodWrcCacheNoticeRef.current = {
              ...(postprodWrcCacheNoticeRef.current || {}),
              [noticeKey]: nowTs,
            };
            showNotice(t('production.error.wrcUnreachableNoSnapshot'), 'warn');
          }
        }
      })();
      return normalizedCatalog;
    } catch (e) {
      const err = new Error(resolvePostprodProjectsError(e, t));
      err.code = e?.code || '';
      throw err;
    }
  }, [postprodAuth.token, t, refreshPostprodProjectWrcSnapshots, showNotice]);

  const handlePostprodLoadProjectWrcFields = useCallback(async (projectRef, wrcFile = '', options = null) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return [];
    const opts = options && typeof options === 'object' && !Array.isArray(options) ? options : {};
    try {
      const res = await postprodGetProjectWrcFields(token, projectRef, wrcFile, 10000, opts);
      return Array.isArray(res?.fields) ? res.fields : [];
    } catch (e) {
      const code = String(e?.code || '').trim().toLowerCase();
      if (code === 'wrc_preset_unreachable_no_snapshot') {
        const noticeKey = `nosnapshot::${String(projectRef || '').trim()}::${String(wrcFile || '').trim()}`.toLowerCase();
        const nowTs = Date.now();
        const previousTs = Number(postprodWrcCacheNoticeRef.current?.[noticeKey] || 0);
        if (!Number.isFinite(previousTs) || (nowTs - previousTs) > 10000) {
          postprodWrcCacheNoticeRef.current = {
            ...(postprodWrcCacheNoticeRef.current || {}),
            [noticeKey]: nowTs,
          };
          showNotice(t('production.error.wrcUnreachableNoSnapshot'), 'warn');
        }
      }
      const resolved = resolvePostprodProjectsError(e, t);
      const fallback = String(e?.message || '').trim();
      const message = fallback && resolved === t('postprod.projects.error')
        ? fallback
        : resolved;
      const err = new Error(message);
      err.code = e?.code || '';
      throw err;
    }
  }, [postprodAuth.token, t, showNotice]);

  const handlePostprodLoadProjectDataTables = useCallback(async (projectRef) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return [];
    try {
      const res = await postprodListProjectDataTables(token, projectRef);
      return Array.isArray(res?.tables) ? res.tables : [];
    } catch (e) {
      const err = new Error(resolvePostprodDataError(e, t));
      err.code = e?.code || '';
      throw err;
    }
  }, [postprodAuth.token, t]);

  const handlePostprodSyncProject = useCallback(async (projectRef, payload = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return null;
    try {
      const res = await postprodSyncProject(token, projectRef, payload);
      await loadPostprodProjects();
      showNotice('Projet synchronise.', 'ok');
      return res?.sync && typeof res.sync === 'object' ? res.sync : null;
    } catch (e) {
      const err = new Error(resolvePostprodProjectsError(e, t));
      err.code = e?.code || '';
      throw err;
    }
  }, [postprodAuth.token, loadPostprodProjects, showNotice, t]);

  const handlePostprodUpsertDataTableRow = useCallback(async (tableId, payload = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return null;
    try {
      const res = await postprodUpsertDataTableRow(token, tableId, payload);
      showNotice('Ligne de donnees enregistree.', 'ok');
      return res?.row && typeof res.row === 'object' ? res.row : null;
    } catch (e) {
      const err = new Error(resolvePostprodDataError(e, t));
      err.code = e?.code || '';
      throw err;
    }
  }, [postprodAuth.token, showNotice, t]);

  const handlePostprodUpdateDataTable = useCallback(async (tableId, payload = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return null;
    try {
      const res = await postprodUpdateDataTable(token, tableId, payload);
      showNotice('Liaison widgets enregistree.', 'ok');
      return res?.table && typeof res.table === 'object' ? res.table : null;
    } catch (e) {
      const err = new Error(resolvePostprodDataError(e, t));
      err.code = e?.code || '';
      throw err;
    }
  }, [postprodAuth.token, showNotice, t]);

  const loadPostprodRenderProjectCatalog = useCallback(async (options = {}) => {
    const silent = options?.silent === true;
    const token = String(postprodAuth.token || '').trim();
    if (!token) {
      setPostprodRenderProjectCatalog({ items: [], loading: false, error: '' });
      return;
    }
    if (silent) {
      setPostprodRenderProjectCatalog((prev) => ({ ...prev, error: '' }));
    } else {
      setPostprodRenderProjectCatalog((prev) => ({ ...prev, loading: true, error: '' }));
    }
    try {
      const projectsRes = await postprodListProjects(token, {
        usageMode: ['auto_render', 'live_auto_render'],
      });
      const items = mapTaskProjectOptions(projectsRes);
      setPostprodRenderProjectCatalog({
        items,
        loading: false,
        error: '',
      });
    } catch {
      setPostprodRenderProjectCatalog((prev) => ({
        ...prev,
        loading: false,
        error: t('postprod.renders.projects.error'),
      }));
    }
  }, [postprodAuth.token, t]);

  const loadPostprodRenders = useCallback(async (options = {}) => {
    const requestSeq = (postprodRendersRequestSeqRef.current || 0) + 1;
    postprodRendersRequestSeqRef.current = requestSeq;
    const isLatestRequest = () => requestSeq === postprodRendersRequestSeqRef.current;

    const token = String(postprodAuth.token || '').trim();
    const forceScan = options?.forceScan === true;
    const showDetectedNotice = options?.showDetectedNotice === true;
    const silent = options?.silent === true;
    const includeRemote = options?.includeRemote === true
      || (options?.includeRemote !== false && current === 'Rendus');
    if (!token) {
      if (isLatestRequest()) {
        setPostprodRenders({ items: [], loading: false, error: '', detectedScan: null });
      }
      return;
    }
    let didSetLoading = false;
    if (silent) {
      if (isLatestRequest()) {
        setPostprodRenders((prev) => ({ ...prev, error: '' }));
      }
    } else {
      if (isLatestRequest()) {
        setPostprodRenders((prev) => ({ ...prev, loading: true, error: '' }));
        didSetLoading = true;
      }
    }
    try {
      const res = await postprodListRenders(token, 8000, { scan: forceScan });
      const localItemsRaw = Array.isArray(res?.renders) ? res.renders : [];
      const detectedScan = res?.detectedScan && typeof res.detectedScan === 'object'
        ? res.detectedScan
        : null;
      const localIpNormalized = String(localIp || '').trim().toLowerCase();
      const localIdentityIpNormalized = String(safeIdentity.localIp || '').trim().toLowerCase();
      const localAgentPortRaw = Number(safeIdentity.agentPort);
      const localAgentPort = Number.isFinite(localAgentPortRaw) && localAgentPortRaw > 0
        ? Math.max(1, Math.min(65535, Math.trunc(localAgentPortRaw)))
        : 4000;
      const normalizeStationIp = (value) => String(value || '').trim().toLowerCase();
      const isSameStationIp = (left, right) => normalizeStationIp(left) === normalizeStationIp(right);
      const hostNameByIp = new Map();
      if (Array.isArray(hostsCfg)) {
        for (const host of hostsCfg) {
          const hostIpKey = normalizeStationIp(host?.ip);
          const hostName = String(host?.name || '').trim();
          if (!hostIpKey || !hostName || hostNameByIp.has(hostIpKey)) continue;
          hostNameByIp.set(hostIpKey, hostName);
        }
      }
      const resolveHostNameByIp = (stationIp = '') => {
        const key = normalizeStationIp(stationIp);
        if (!key) return '';
        return String(hostNameByIp.get(key) || '').trim();
      };
      const firstNonEmptyStationName = (values = []) => {
        for (const value of Array.isArray(values) ? values : []) {
          const normalized = String(value || '').trim();
          if (normalized) return normalized;
        }
        return '';
      };
      const localHostName = resolveHostNameByIp(localIpNormalized);
      const localStationName = String(localHostName || safeIdentity.localIp || 'Local').trim() || 'Local';
      const localStationIp = String(safeIdentity.localIp || '127.0.0.1').trim() || '127.0.0.1';
      const isLocalStation = (stationIp = '') => (
        isSameStationIp(stationIp, localStationIp)
        || isSameStationIp(stationIp, localIpNormalized)
        || isSameStationIp(stationIp, localIdentityIpNormalized)
        || normalizeStationIp(stationIp) === 'local'
      );
      const resolveDisplayStationName = (item = null, stationIp = '') => {
        const hostName = resolveHostNameByIp(stationIp);
        if (hostName) return hostName;
        const directName = firstNonEmptyStationName([
          item?.assignedWorkerName,
          item?.renderStationName,
          item?.stationName,
          item?.originStationName,
        ]);
        if (directName && normalizeStationIp(directName) !== 'local') return directName;
        const ipLabel = String(stationIp || '').trim();
        if (ipLabel && !isLocalStation(ipLabel) && normalizeStationIp(ipLabel) !== 'local') return ipLabel;
        return localStationName;
      };

      const localItems = localItemsRaw.map((item) => {
        const stationIp = String(
          item?.stationIp
          || item?.renderStation
          || item?.originStationIp
          || localStationIp
        ).trim() || localStationIp;
        const stationName = resolveDisplayStationName(item, stationIp);
        const stationIsLocal = isLocalStation(stationIp);
        return {
          ...item,
          sourceScope: 'local',
          stationIp,
          stationName,
          stationIsLocal,
          stationIsRemote: !stationIsLocal,
        };
      });

      let remoteItems = [];
      if (includeRemote) {
        let remoteHosts = [];
        try {
          const hosts = await getHosts();
          const hostsList = Array.isArray(hosts) ? hosts : [];
          remoteHosts = hostsList.filter((host) => {
            const ip = normalizeStationIp(host?.ip);
            if (!ip) return false;
            if (ip === '127.0.0.1' || ip === 'localhost') return false;
            if (isSameStationIp(ip, localIpNormalized)) return false;
            if (isSameStationIp(ip, localIdentityIpNormalized)) return false;
            return true;
          });
        } catch {
          remoteHosts = [];
        }

        if (remoteHosts.length > 0) {
          const remoteSettled = await Promise.allSettled(
            remoteHosts.map(async (host) => {
              const hostIp = String(host?.ip || '').trim();
              const hostPortRaw = Number(host?.agentPort || host?.port || localAgentPort);
              const hostPort = Number.isFinite(hostPortRaw) && hostPortRaw > 0
                ? Math.max(1, Math.min(65535, Math.trunc(hostPortRaw)))
                : localAgentPort;
              const remoteRes = await postprodListRemoteJobsByStation(hostIp, hostPort, 3000);
              if (!remoteRes?.ok) return [];
              const stationIp = String(remoteRes.stationIp || hostIp).trim() || hostIp;
              const jobs = Array.isArray(remoteRes.jobs) ? remoteRes.jobs : [];
              return jobs.map((job) => {
                const resolvedStationIp = String(job?.stationIp || job?.renderStation || stationIp).trim() || stationIp;
                const stationIsLocal = isLocalStation(resolvedStationIp);
                const stationName = resolveDisplayStationName({
                  ...job,
                  stationName: String(host?.name || remoteRes.stationName || job?.stationName || '').trim(),
                }, resolvedStationIp);
                return {
                  ...job,
                  sourceScope: 'remote',
                  stationIp: resolvedStationIp,
                  stationName,
                  stationIsLocal,
                  stationIsRemote: !stationIsLocal,
                };
              });
            })
          );
          remoteItems = remoteSettled
            .filter((entry) => entry?.status === 'fulfilled' && Array.isArray(entry.value))
            .flatMap((entry) => entry.value);
        }
      }

      const toPositiveInt = (value) => {
        const numeric = Number(value || 0);
        return Number.isFinite(numeric) && numeric > 0 ? Math.trunc(numeric) : 0;
      };

      const localStationIpKeys = new Set([
        normalizeStationIp(localStationIp),
        localIpNormalized,
        localIdentityIpNormalized,
      ].filter(Boolean));

      const resolveOriginStationIp = (item) => {
        const payload = item?.payload && typeof item.payload === 'object' && !Array.isArray(item.payload)
          ? item.payload
          : {};
        return normalizeStationIp(
          item?.originStationIp
          || item?.origin_station_ip
          || payload?.originStationIp
          || payload?.origin_station_ip
          || ''
        );
      };

      const resolveRemoteJobId = (item) => {
        const payload = item?.payload && typeof item.payload === 'object' && !Array.isArray(item.payload)
          ? item.payload
          : {};
        return toPositiveInt(item?.remoteJobId || item?.remote_job_id || payload?.remoteJobId || payload?.remote_job_id);
      };

      const resolveRenderStationIp = (item) => {
        const payload = item?.payload && typeof item.payload === 'object' && !Array.isArray(item.payload)
          ? item.payload
          : {};
        return normalizeStationIp(
          item?.stationIp
          || item?.renderStation
          || item?.render_station
          || payload?.stationIp
          || payload?.renderStation
          || payload?.render_station
          || ''
        );
      };

      const localMirroredRemoteKeys = new Set();
      for (const localItem of localItems) {
        const remoteJobId = resolveRemoteJobId(localItem);
        const originStationIp = resolveOriginStationIp(localItem);
        const renderStationIp = resolveRenderStationIp(localItem);
        if (remoteJobId <= 0) continue;
        if (originStationIp && !localStationIpKeys.has(originStationIp)) {
          localMirroredRemoteKeys.add(`${originStationIp}::${remoteJobId}`);
        }
        if (
          renderStationIp
          && !localStationIpKeys.has(renderStationIp)
          && renderStationIp !== 'local'
        ) {
          localMirroredRemoteKeys.add(`${renderStationIp}::${remoteJobId}`);
        }
      }

      const mergedItems = [...localItems, ...remoteItems]
        .filter((item) => {
          if (item?.stationIsRemote !== true) return true;
          const remoteStationIp = normalizeStationIp(item?.stationIp || item?.renderStation || item?.originStationIp || '');
          const remoteRenderId = toPositiveInt(item?.id || item?.renderId);
          const remoteOriginStationIp = resolveOriginStationIp(item);
          if (
            remoteOriginStationIp
            && localStationIpKeys.has(remoteOriginStationIp)
          ) {
            // Echo d'un job initie localement et execute a distance: on ne l'affiche pas.
            return false;
          }
          if (!remoteStationIp || remoteRenderId <= 0) return true;
          return !localMirroredRemoteKeys.has(`${remoteStationIp}::${remoteRenderId}`);
        })
        .sort((a, b) => {
          const leftRaw = Date.parse(String(a?.createdAt || a?.created_at || '').trim());
          const rightRaw = Date.parse(String(b?.createdAt || b?.created_at || '').trim());
          const leftTs = Number.isFinite(leftRaw) ? leftRaw : 0;
          const rightTs = Number.isFinite(rightRaw) ? rightRaw : 0;
          if (rightTs !== leftTs) return rightTs - leftTs;
          const aLocal = a?.stationIsLocal === true ? 1 : 0;
          const bLocal = b?.stationIsLocal === true ? 1 : 0;
          if (bLocal !== aLocal) return bLocal - aLocal;
          const leftId = Number(a?.id || a?.renderId || 0);
          const rightId = Number(b?.id || b?.renderId || 0);
          return (Number.isFinite(rightId) ? rightId : 0) - (Number.isFinite(leftId) ? leftId : 0);
        });

      const normalizeOutputKey = (item) => {
        const payload = item?.payload && typeof item.payload === 'object' && !Array.isArray(item.payload)
          ? item.payload
          : {};
        const raw = String(
          item?.outputPath
          || item?.output_path
          || payload?.filePath
          || payload?.outputPath
          || ''
        ).trim();
        if (!raw) return '';
        if (/\{\{[^{}]+\}\}/.test(raw)) return '';
        return raw
          .replace(/\\/g, '/')
          .replace(/\/+/g, '/')
          .toLowerCase();
      };

      const resolveLinkedTaskId = (item) => {
        const payload = item?.payload && typeof item.payload === 'object' && !Array.isArray(item.payload)
          ? item.payload
          : {};
        return toPositiveInt(item?.linkedTaskId || payload?.taskId);
      };

      const resolveRemoteRelayIdForLocalOrigin = (item) => {
        const payload = item?.payload && typeof item.payload === 'object' && !Array.isArray(item.payload)
          ? item.payload
          : {};
        const remoteJobId = toPositiveInt(item?.remoteJobId || item?.remote_job_id || payload?.remoteJobId);
        if (remoteJobId <= 0) return 0;
        const originStationIp = normalizeStationIp(
          item?.originStationIp
          || item?.origin_station_ip
          || payload?.originStationIp
        );
        if (!originStationIp || !localStationIpKeys.has(originStationIp)) return 0;
        return remoteJobId;
      };

      const computeItemQuality = (item, outputKey = '') => {
        const payload = item?.payload && typeof item.payload === 'object' && !Array.isArray(item.payload)
          ? item.payload
          : {};
        const statusKey = String(item?.status || '').trim().toLowerCase();
        const sourceKey = String(payload?.source || '').trim().toLowerCase();
        const hasProjectMeta = Boolean(
          String(item?.projectName || '').trim()
          || String(item?.projectDisplayName || '').trim()
          || String(item?.projectId || '').trim()
          || String(payload?.projectName || '').trim()
          || String(payload?.projectDisplayName || '').trim()
          || String(payload?.projectId || '').trim()
        );
        const hasSequenceMeta = Boolean(
          String(item?.sequenceName || '').trim()
          || String(payload?.sequenceName || '').trim()
          || String(payload?.levelSequence || '').trim()
          || String(payload?.levelSequenceName || '').trim()
        );
        const hasFormMeta = Boolean(
          toPositiveInt(item?.formId || item?.renderFormId || payload?.formId || payload?.renderFormId)
          || String(item?.formName || '').trim()
          || String(item?.renderFormName || '').trim()
          || String(payload?.formName || '').trim()
          || String(payload?.renderFormName || '').trim()
          || String(payload?.formLabel || '').trim()
        );
        const hasTaskMeta = Boolean(
          toPositiveInt(item?.linkedTaskId || payload?.taskId)
          || String(item?.linkedTaskTitle || '').trim()
          || String(payload?.taskTitle || '').trim()
        );
        const hasProxyMeta = Boolean(
          String(payload?.proxyPath || '').trim()
          || String(payload?.thumbPath || '').trim()
          || String(payload?.alphaPath || '').trim()
          || Number(payload?.proxyWidth || 0) > 0
          || Number(payload?.proxyHeight || 0) > 0
        );
        let score = 0;
        if (outputKey) score += 100;
        if (hasProxyMeta) score += 35;
        if (hasProjectMeta) score += 8;
        if (hasSequenceMeta) score += 8;
        if (hasFormMeta) score += 8;
        if (hasTaskMeta) score += 5;
        if (statusKey === 'done') score += 10;
        if (sourceKey === 'detected_file' || sourceKey === 'detected') score -= 12;
        return score;
      };

      const computeItemRecency = (item) => {
        const candidates = [
          item?.updatedAt,
          item?.updated_at,
          item?.finishedAt,
          item?.finished_at,
          item?.createdAt,
          item?.created_at,
        ];
        let best = 0;
        for (const candidate of candidates) {
          const parsed = Date.parse(String(candidate || '').trim());
          if (Number.isFinite(parsed) && parsed > best) best = parsed;
        }
        return best;
      };

      const selectDedupKey = (item, outputKey = '', linkedTaskId = 0, relayLocalRenderId = 0) => {
        if (linkedTaskId > 0) return `task:${linkedTaskId}`;
        if (outputKey) return `output:${outputKey}`;
        if (relayLocalRenderId > 0) return `relay:${relayLocalRenderId}`;
        const fallbackKey = `${String(item?.stationIp || '').trim().toLowerCase()}|${String(item?.id || item?.renderId || '').trim()}`;
        return `fallback:${fallbackKey || 'unknown'}`;
      };

      const dedupBuckets = new Map();
      let orderIndex = 0;
      for (const item of mergedItems) {
        const outputKey = normalizeOutputKey(item);
        const linkedTaskId = resolveLinkedTaskId(item);
        const relayLocalRenderId = resolveRemoteRelayIdForLocalOrigin(item)
          || ((item?.stationIsLocal === true && !outputKey) ? toPositiveInt(item?.id || item?.renderId) : 0);
        const dedupKey = selectDedupKey(item, outputKey, linkedTaskId, relayLocalRenderId);
        const score = computeItemQuality(item, outputKey);
        const recency = computeItemRecency(item);
        const numericId = toPositiveInt(item?.id || item?.renderId || 0);
        const existing = dedupBuckets.get(dedupKey);
        if (!existing) {
          dedupBuckets.set(dedupKey, {
            item,
            score,
            recency,
            numericId,
            order: orderIndex++,
          });
          continue;
        }
        const shouldReplace = (
          recency > Number(existing.recency || 0)
          || (recency === Number(existing.recency || 0) && (
            score > Number(existing.score || 0)
            || (score === Number(existing.score || 0) && numericId > Number(existing.numericId || 0))
          ))
        );
        if (shouldReplace) {
          dedupBuckets.set(dedupKey, {
            ...existing,
            item,
            score,
            recency,
            numericId,
          });
        }
      }

      const dedupedItems = Array.from(dedupBuckets.values())
        .sort((a, b) => a.order - b.order)
        .map((entry) => entry.item);

      if (!isLatestRequest()) {
        if (didSetLoading) setPostprodRenders((prev) => ({ ...prev, loading: false }));
        return;
      }

      setPostprodRenders({ items: dedupedItems, loading: false, error: '', detectedScan });
      if (showDetectedNotice && detectedScan) {
        showNotice(
          t('postprod.renders.msg.detectedScanSummary', {
            imported: Number.isFinite(Number(detectedScan.imported)) ? Number(detectedScan.imported) : 0,
            duplicates: Number.isFinite(Number(detectedScan.duplicates)) ? Number(detectedScan.duplicates) : 0,
            errors: Number.isFinite(Number(detectedScan.errors)) ? Number(detectedScan.errors) : 0,
            scanned: Number.isFinite(Number(detectedScan.scanned)) ? Number(detectedScan.scanned) : 0,
          }),
          Number(detectedScan.errors || 0) > 0
            ? 'warn'
            : (Number(detectedScan.imported || 0) > 0 ? 'ok' : 'info')
        );
      }
    } catch (e) {
      if (!isLatestRequest()) {
        if (didSetLoading) setPostprodRenders((prev) => ({ ...prev, loading: false }));
        return;
      }
      setPostprodRenders((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodRendersError(e, t),
      }));
    }
  }, [postprodAuth.token, current, hostsCfg, localIp, safeIdentity.agentPort, safeIdentity.localIp, showNotice, t]);

  const loadPostprodUserAlerts = useCallback(async (options = {}) => {
    const token = String(postprodAuth.token || '').trim();
    const silent = options?.silent === true;
    if (!token) {
      setPostprodUserAlerts({ items: [], summary: null, loading: false, error: '' });
      return;
    }
    if (silent) {
      setPostprodUserAlerts((prev) => ({ ...prev, error: '' }));
    } else {
      setPostprodUserAlerts((prev) => ({ ...prev, loading: true, error: '' }));
    }
    try {
      const res = await postprodListUserAlerts(token, { limit: 200, timeoutMs: 6000 });
      const items = Array.isArray(res?.alerts) ? res.alerts : [];
      const summary = res?.summary && typeof res.summary === 'object'
        ? res.summary
        : null;
      setPostprodUserAlerts({
        items,
        summary,
        loading: false,
        error: '',
      });
    } catch (e) {
      setPostprodUserAlerts((prev) => ({
        ...prev,
        loading: false,
        error: String(e?.message || e || 'postprod_alerts_load_failed'),
      }));
    }
  }, [postprodAuth.token]);

  const handlePostprodScanDetectedRenders = useCallback(async () => {
    await loadPostprodRenders({ forceScan: true, showDetectedNotice: true });
  }, [loadPostprodRenders]);

  const handlePostprodGenerateRenderProxy = useCallback(async (renderIdRaw) => {
    const token = String(postprodAuth.token || "").trim();
    const renderId = Number.isFinite(Number(renderIdRaw)) && Number(renderIdRaw) > 0
      ? Math.trunc(Number(renderIdRaw))
      : 0;
    if (!token || renderId <= 0) {
      const err = new Error("invalid_render_id");
      err.code = "invalid_render_id";
      throw err;
    }
    const res = await postprodRegenerateAllProxies({ renderIds: [renderId] }, 15 * 60 * 1000);
    if (!res || res.ok === false) {
      const err = new Error(String(res?.error || "proxy_regenerate_failed"));
      err.code = String(res?.error || "proxy_regenerate_failed");
      throw err;
    }
    await loadPostprodRenders({ silent: true, includeRemote: true });
    return res;
  }, [loadPostprodRenders, postprodAuth.token]);

  const loadPostprodRenderTemplates = useCallback(async (options = {}) => {
    const silent = options?.silent === true;
    const token = String(postprodAuth.token || '').trim();
    if (!token) {
      setPostprodRenderTemplates({ items: [], loading: false, error: '' });
      return;
    }
    if (silent) {
      setPostprodRenderTemplates((prev) => ({ ...prev, error: '' }));
    } else {
      setPostprodRenderTemplates((prev) => ({ ...prev, loading: true, error: '' }));
    }
    try {
      const res = await postprodListRenderTemplates(token);
      const items = Array.isArray(res?.templates) ? res.templates : [];
      setPostprodRenderTemplates({ items, loading: false, error: '' });
    } catch (e) {
      setPostprodRenderTemplates((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodRendersError(e, t),
      }));
    }
  }, [postprodAuth.token, t]);

  const loadPostprodRenderForms = useCallback(async () => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) {
      setPostprodRenderForms({ items: [], loading: false, error: '' });
      return;
    }
    setPostprodRenderForms((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await postprodListRenderForms(token);
      const items = Array.isArray(res?.forms) ? res.forms : [];
      setPostprodRenderForms({ items, loading: false, error: '' });
    } catch (e) {
      setPostprodRenderForms((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodRendersError(e, t),
      }));
    }
  }, [postprodAuth.token, t]);

  const loadPostprodRenderHealth = useCallback(async (options = {}) => {
    const silent = options?.silent === true;
    const token = String(postprodAuth.token || '').trim();
    if (!token) {
      setPostprodRenderHealth({ data: null, loading: false, error: '' });
      return;
    }
    if (silent) {
      setPostprodRenderHealth((prev) => ({ ...prev, error: '' }));
    } else {
      setPostprodRenderHealth((prev) => ({ ...prev, loading: true, error: '' }));
    }
    try {
      const res = await postprodGetHealth(token);
      const data = res?.health && typeof res.health === 'object' ? res.health : null;
      setPostprodRenderHealth({ data, loading: false, error: '' });
    } catch (e) {
      setPostprodRenderHealth((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodRendersError(e, t),
      }));
    }
  }, [postprodAuth.token, t]);

  const replayPostprodOfflineOutbox = useCallback(async ({ notifyIfNone = false } = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return { replayed: 0, dropped: 0, pending: 0 };
    const currentUserIdRaw = Number(postprodAuth.user?.id || 0);
    const currentUserId = Number.isFinite(currentUserIdRaw) && currentUserIdRaw > 0
      ? Math.trunc(currentUserIdRaw)
      : null;
    const initialOutbox = normalizePostprodOfflineOutbox(postprodOfflineOutbox);
    if (initialOutbox.length <= 0) {
      if (notifyIfNone) {
        showNotice(t('postprod.renders.msg.offlineReplayNone'), 'info');
      }
      return { replayed: 0, dropped: 0, pending: 0 };
    }
    if (postprodOfflineReplayInFlightRef.current) {
      return { replayed: 0, dropped: 0, pending: initialOutbox.length };
    }
    postprodOfflineReplayInFlightRef.current = true;
    let replayed = 0;
    let dropped = 0;
    let stoppedOnRecoverableError = false;
    const nextOutbox = [...initialOutbox];
    try {
      for (const entry of initialOutbox) {
        if (entry?.kind !== 'create_render') continue;
        if (currentUserId != null && entry?.userId != null && Number(entry.userId) !== currentUserId) {
          continue;
        }
        try {
          await postprodCreateRender(token, entry.payload || {});
          replayed += 1;
          const idx = nextOutbox.findIndex((it) => String(it?.id || '') === String(entry.id || ''));
          if (idx >= 0) nextOutbox.splice(idx, 1);
        } catch (err) {
          const idx = nextOutbox.findIndex((it) => String(it?.id || '') === String(entry.id || ''));
          if (isPostprodRecoverableOfflineError(err)) {
            stoppedOnRecoverableError = true;
            if (idx >= 0) {
              const attempts = Number(nextOutbox[idx]?.attempts || 0);
              nextOutbox[idx] = {
                ...nextOutbox[idx],
                attempts: Number.isFinite(attempts) ? Math.max(0, Math.trunc(attempts)) + 1 : 1,
                lastAttemptAt: new Date().toISOString(),
                lastError: String(err?.message || err?.code || 'network_error').trim().slice(0, 200),
              };
            }
            break;
          }
          dropped += 1;
          if (idx >= 0) nextOutbox.splice(idx, 1);
        }
      }
      updatePostprodOfflineOutbox(nextOutbox);
      if (replayed > 0) {
        await Promise.all([
          loadPostprodRenders(),
          loadPostprodRenderHealth(),
        ]);
        showNotice(t('postprod.renders.msg.offlineReplaySent', { count: replayed }), 'ok');
      } else if (notifyIfNone && dropped <= 0 && !stoppedOnRecoverableError) {
        showNotice(t('postprod.renders.msg.offlineReplayNone'), 'info');
      }
      if (dropped > 0) {
        showNotice(t('postprod.renders.msg.offlineReplayDropped', { count: dropped }), 'warn');
      }
    } finally {
      postprodOfflineReplayInFlightRef.current = false;
    }
    return {
      replayed,
      dropped,
      pending: Math.max(0, normalizePostprodOfflineOutbox(nextOutbox).length),
    };
  }, [
    postprodAuth.token,
    postprodAuth.user?.id,
    postprodOfflineOutbox,
    updatePostprodOfflineOutbox,
    loadPostprodRenders,
    loadPostprodRenderHealth,
    showNotice,
    t,
  ]);
  const replayPostprodWorkerCompletionOutbox = useCallback(async ({ notifyIfNone = false } = {}) => {
    const token = String(postprodAuth.token || '').trim();
    const workerKey = String(renderWorkerKey || '').trim();
    if (!token || !workerKey) return { replayed: 0, dropped: 0, pending: 0 };
    const currentUserIdRaw = Number(postprodAuth.user?.id || 0);
    const currentUserId = Number.isFinite(currentUserIdRaw) && currentUserIdRaw > 0
      ? Math.trunc(currentUserIdRaw)
      : null;
    const initialOutbox = normalizePostprodWorkerCompletionOutbox(postprodWorkerCompletionOutbox);
    const scopedEntries = initialOutbox.filter((entry) => {
      if (String(entry?.workerKey || '').trim() !== workerKey) return false;
      if (currentUserId != null && entry?.userId != null && Number(entry.userId) !== currentUserId) return false;
      return true;
    });
    if (scopedEntries.length <= 0) {
      if (notifyIfNone) {
        showNotice(t('postprod.renders.msg.workerOfflineReplayNone'), 'info');
      }
      return { replayed: 0, dropped: 0, pending: 0 };
    }
    if (postprodWorkerCompletionReplayInFlightRef.current) {
      return { replayed: 0, dropped: 0, pending: scopedEntries.length };
    }
    postprodWorkerCompletionReplayInFlightRef.current = true;
    let replayed = 0;
    let dropped = 0;
    let stoppedOnRecoverableError = false;
    const nextOutbox = [...initialOutbox];
    try {
      for (const entry of scopedEntries) {
        const renderId = Number(entry?.renderId || 0);
        if (!Number.isFinite(renderId) || renderId <= 0) continue;
        const idx = nextOutbox.findIndex((it) => String(it?.id || '') === String(entry?.id || ''));
        if (idx < 0) continue;
        let completionPayload = entry?.payload && typeof entry.payload === 'object'
          ? entry.payload
          : {};
        try {
          const renderRes = await postprodGetRenderJob(token, renderId, 8000);
          const renderJob = renderRes?.render && typeof renderRes.render === 'object'
            ? renderRes.render
            : (renderRes?.renderJob && typeof renderRes.renderJob === 'object' ? renderRes.renderJob : null);
          if (!canReplayWorkerCompletion(renderJob, workerKey)) {
            dropped += 1;
            nextOutbox.splice(idx, 1);
            continue;
          }
          completionPayload = buildWorkerCompletionReplayPayload(completionPayload, renderJob, workerKey);
          await postprodCompleteRenderWorkerJob(token, renderId, completionPayload);
          replayed += 1;
          nextOutbox.splice(idx, 1);
        } catch (err) {
          if (isPostprodRecoverableOfflineError(err)) {
            stoppedOnRecoverableError = true;
            const attempts = Number(nextOutbox[idx]?.attempts || 0);
            nextOutbox[idx] = {
              ...nextOutbox[idx],
              payload: completionPayload,
              attempts: Number.isFinite(attempts) ? Math.max(0, Math.trunc(attempts)) + 1 : 1,
              lastAttemptAt: new Date().toISOString(),
              lastError: String(err?.message || err?.code || 'network_error').trim().slice(0, 200),
            };
            break;
          }
          dropped += 1;
          nextOutbox.splice(idx, 1);
        }
      }
      updatePostprodWorkerCompletionOutbox(nextOutbox);
      if (replayed > 0) {
        await Promise.all([
          loadPostprodRenders(),
          loadPostprodRenderHealth(),
        ]);
        showNotice(t('postprod.renders.msg.workerOfflineReplaySent', { count: replayed }), 'ok');
      } else if (notifyIfNone && dropped <= 0 && !stoppedOnRecoverableError) {
        showNotice(t('postprod.renders.msg.workerOfflineReplayNone'), 'info');
      }
      if (dropped > 0) {
        showNotice(t('postprod.renders.msg.workerOfflineReplayDropped', { count: dropped }), 'warn');
      }
    } finally {
      postprodWorkerCompletionReplayInFlightRef.current = false;
    }
    const pending = normalizePostprodWorkerCompletionOutbox(nextOutbox).filter((entry) => {
      if (String(entry?.workerKey || '').trim() !== workerKey) return false;
      if (currentUserId != null && entry?.userId != null && Number(entry.userId) !== currentUserId) return false;
      return true;
    }).length;
    return { replayed, dropped, pending: Math.max(0, pending) };
  }, [
    postprodAuth.token,
    postprodAuth.user?.id,
    renderWorkerKey,
    localPrimaryUnrealEditorPath,
    postprodWorkerCompletionOutbox,
    updatePostprodWorkerCompletionOutbox,
    loadPostprodRenders,
    loadPostprodRenderHealth,
    showNotice,
    t,
  ]);
  useEffect(() => {
    if (appMode !== APP_MODE_POSTPROD || !postprodAuthenticated) return;
    if (postprodOfflineOutboxCount <= 0) return;
    if (postprodRenderHealth.loading) return;
    const hasError = String(postprodRenderHealth.error || '').trim().length > 0;
    if (hasError) return;
    const nowMs = Date.now();
    if ((nowMs - Number(postprodOfflineReplayLastKickRef.current || 0)) < POSTPROD_OFFLINE_REPLAY_MIN_INTERVAL_MS) {
      return;
    }
    postprodOfflineReplayLastKickRef.current = nowMs;
    replayPostprodOfflineOutbox().catch(() => {});
  }, [
    appMode,
    postprodAuthenticated,
    postprodOfflineOutboxCount,
    postprodRenderHealth.loading,
    postprodRenderHealth.error,
    postprodRenderHealth.data,
    replayPostprodOfflineOutbox,
  ]);
  useEffect(() => {
    if (appMode !== APP_MODE_POSTPROD || !postprodAuthenticated) return;
    if (postprodWorkerCompletionOutboxCount <= 0) return;
    if (postprodRenderHealth.loading) return;
    const hasError = String(postprodRenderHealth.error || '').trim().length > 0;
    if (hasError) return;
    const nowMs = Date.now();
    if ((nowMs - Number(postprodWorkerCompletionReplayLastKickRef.current || 0)) < POSTPROD_WORKER_COMPLETION_REPLAY_MIN_INTERVAL_MS) {
      return;
    }
    postprodWorkerCompletionReplayLastKickRef.current = nowMs;
    replayPostprodWorkerCompletionOutbox().catch(() => {});
  }, [
    appMode,
    postprodAuthenticated,
    postprodWorkerCompletionOutboxCount,
    postprodRenderHealth.loading,
    postprodRenderHealth.error,
    postprodRenderHealth.data,
    replayPostprodWorkerCompletionOutbox,
  ]);

  const loadPostprodRenderWorkers = useCallback(async (options = {}) => {
    const silent = options?.silent === true;
    const token = String(postprodAuth.token || '').trim();
    if (!token) {
      setPostprodRenderWorkers({ items: [], loading: false, error: '' });
      return;
    }
    if (silent) {
      setPostprodRenderWorkers((prev) => ({ ...prev, error: '' }));
    } else {
      setPostprodRenderWorkers((prev) => ({ ...prev, loading: true, error: '' }));
    }
    try {
      const res = await postprodListRenderWorkers(token);
      const items = Array.isArray(res?.workers) ? res.workers : [];
      setPostprodRenderWorkers({ items, loading: false, error: '' });
    } catch (e) {
      setPostprodRenderWorkers((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodRendersError(e, t),
      }));
    }
  }, [postprodAuth.token, t]);

  const handlePatchLocalWorkerAptitude = useCallback(async (apte) => {
    const token = String(postprodAuth.token || '').trim();
    const workerKey = String(renderWorkerKey || '').trim();
    if (!token || !workerKey) return;
    try {
      await postprodPatchRenderWorkerAptitude(token, workerKey, apte);
      await loadPostprodRenderWorkers();
    } catch {
      // best-effort
    }
  }, [postprodAuth.token, renderWorkerKey, loadPostprodRenderWorkers]);

  const handleAptitudeConfirm = useCallback(async () => {
    const pending = aptitudeCheckPending;
    setAptitudeCheckPending(null);
    if (!pending) return;
    const token = String(postprodAuth.token || '').trim();
    if (!token) return;
    try {
      await ensureLocalRenderWorkerOnline();
      await handlePatchLocalWorkerAptitude(true);
      await ensureLocalRenderWorkerOnline();
      if (!isPostprodQueueRuntimeActive()) {
        showNotice("File d'attente en pause: le rendu reste en attente.", "warn");
        await Promise.all([loadPostprodRenders(), loadPostprodRenderWorkers(), loadPostprodRenderHealth()]);
        return;
      }
      const dispatchRes = await postprodDispatchRenders(token, {
        maxJobs: 1,
        renderIds: pending.renderId > 0 ? [pending.renderId] : undefined,
      });
      const dispatchedCount = Number.isFinite(Number(dispatchRes?.count)) ? Math.max(0, Math.trunc(Number(dispatchRes.count))) : 0;
      if (dispatchedCount <= 0) {
        showNotice("Rendu cree mais non demarre: aucune station disponible.", "warn");
      }
    } catch {
      showNotice("Rendu cree, mais lancement immediat indisponible.", "warn");
    }
    await Promise.all([loadPostprodRenders(), loadPostprodRenderWorkers(), loadPostprodRenderHealth()]);
  }, [
    aptitudeCheckPending,
    handlePatchLocalWorkerAptitude,
    ensureLocalRenderWorkerOnline,
    postprodAuth.token,
    loadPostprodRenders,
    loadPostprodRenderWorkers,
    loadPostprodRenderHealth,
    showNotice,
  ]);

  const handleAptitudeCancel = useCallback(() => {
    setAptitudeCheckPending(null);
    showNotice(t('postprod.renders.aptitude.noticeCancelled'), 'warn');
  }, [showNotice, t]);

  const handleQueuePausedLaunchConfirm = useCallback(async () => {
    const pending = queuePausedLaunchPending;
    setQueuePausedLaunchPending(null);
    if (!pending) return;
    const token = String(postprodAuth.token || '').trim();
    if (!token) return;
    try {
      localStorage.setItem(LS_POSTPROD_RENDERS_QUEUE_RUNTIME_MODE_KEY, 'active');
    } catch {}
    const pendingRenderIdRaw = Number(pending?.renderId || 0);
    const pendingRenderId = Number.isFinite(pendingRenderIdRaw) && pendingRenderIdRaw > 0
      ? Math.trunc(pendingRenderIdRaw)
      : 0;
    try {
      await ensureLocalRenderWorkerOnline();
      const dispatchRes = await postprodDispatchRenders(token, {
        maxJobs: 1,
        renderIds: pendingRenderId > 0 ? [pendingRenderId] : undefined,
      });
      const dispatchedCount = Number.isFinite(Number(dispatchRes?.count))
        ? Math.max(0, Math.trunc(Number(dispatchRes.count)))
        : 0;
      if (dispatchedCount <= 0) {
        showNotice("Rendu cree mais non demarre: aucune station de rendu disponible/compatible pour le moment.", "warn");
      } else {
        showNotice(t('postprod.renders.queuePause.noticeActivated'), 'ok');
      }
    } catch {
      showNotice("Rendu cree, mais lancement immediat indisponible. Verifie les stations de rendu disponibles.", "warn");
    }
    await Promise.all([loadPostprodRenders(), loadPostprodRenderWorkers(), loadPostprodRenderHealth()]);
  }, [
    queuePausedLaunchPending,
    postprodAuth.token,
    ensureLocalRenderWorkerOnline,
    loadPostprodRenders,
    loadPostprodRenderWorkers,
    loadPostprodRenderHealth,
    showNotice,
    t,
  ]);

  const handleQueuePausedLaunchContinue = useCallback(() => {
    setQueuePausedLaunchPending(null);
    showNotice(t('postprod.renders.queuePause.noticeKeptPaused'), 'info');
  }, [showNotice, t]);

  const handleBusyImmediateLaunchConfirm = useCallback(async () => {
    const pending = busyImmediateLaunchPending;
    setBusyImmediateLaunchPending(null);
    if (!pending) return;
    const token = String(postprodAuth.token || '').trim();
    if (!token) return;

    try {
      await setAgentRenderAvailability('capable', null);
      const freshHosts = await getHosts().catch(() => null);
      if (Array.isArray(freshHosts)) {
        setHostsCfg(freshHosts);
        setHostsLoaded(true);
      }
      await ensureLocalRenderWorkerOnline();
      await handlePatchLocalWorkerAptitude(true);
      const dispatchRes = await postprodDispatchRenders(token, {
        maxJobs: 1,
        renderIds: pending.renderId > 0 ? [pending.renderId] : undefined,
      });
      const dispatchedCountRaw = Number(dispatchRes?.count || 0);
      const dispatchedCount = Number.isFinite(dispatchedCountRaw) ? Math.max(0, Math.trunc(dispatchedCountRaw)) : 0;
      if (dispatchedCount <= 0) {
        showNotice(
          "Rendu créé mais non démarré: aucune station de rendu disponible/compatible pour le moment.",
          "warn"
        );
      }
    } catch {
      showNotice(
        "Impossible de passer la station en disponible. Le rendu reste en attente.",
        "warn"
      );
    }
    await Promise.all([loadPostprodRenders(), loadPostprodRenderWorkers(), loadPostprodRenderHealth()]);
  }, [
    busyImmediateLaunchPending,
    postprodAuth.token,
    ensureLocalRenderWorkerOnline,
    handlePatchLocalWorkerAptitude,
    loadPostprodRenders,
    loadPostprodRenderWorkers,
    loadPostprodRenderHealth,
    showNotice,
  ]);

  const handleBusyImmediateLaunchCancel = useCallback(() => {
    setBusyImmediateLaunchPending(null);
    showNotice("Rendu en attente: sera lancé automatiquement quand une station sera disponible.", "info");
  }, [showNotice]);

  const handlePostprodUpdateMe = useCallback(async (payload = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return;
    setPostprodProfile({ saving: true, error: '' });
    try {
      const res = await postprodUpdateMe(token, payload);
      const user = res?.user && typeof res.user === 'object' ? res.user : null;
      if (!user) {
        throw Object.assign(new Error('invalid_session'), { code: 'invalid_session', status: 401 });
      }
      setPostprodAuth((prev) => {
        const next = {
          ...prev,
          user,
          busy: false,
          error: '',
          hydrated: true,
        };
        writePostprodAuth({
          token: String(next.token || ''),
          user: next.user,
          expiresAt: String(next.expiresAt || ''),
        });
        return next;
      });
      applyUserLanguageToIdentity(user);
      setPostprodProfile({ saving: false, error: '' });
      if (postprodCanManageUsers) {
        await loadPostprodUsers();
      }
      showNotice(t('postprod.profile.msg.updated'), 'ok');
    } catch (e) {
      setPostprodProfile({
        saving: false,
        error: resolvePostprodUsersError(e, t),
      });
    }
  }, [postprodAuth.token, postprodCanManageUsers, loadPostprodUsers, showNotice, t, applyUserLanguageToIdentity]);

  const handlePostprodCreateUser = useCallback(async (payload = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return false;
    setPostprodUsers((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      await postprodCreateUser(token, payload);
      await loadPostprodUsers();
      showNotice(t('postprod.users.msg.created'), 'ok');
      return true;
    } catch (e) {
      setPostprodUsers((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodUsersError(e, t),
      }));
      return false;
    }
  }, [postprodAuth.token, loadPostprodUsers, showNotice, t]);

  const handlePostprodUpdateUser = useCallback(async (userId, payload = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return false;
    setPostprodUsers((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await postprodUpdateUser(token, userId, payload);
      await loadPostprodUsers();

      const targetId = Number(res?.user?.id || userId || 0);
      const selfId = Number(postprodAuth.user?.id || 0);
      if (targetId > 0 && selfId > 0 && targetId === selfId) {
        try {
          const me = await postprodAuthMe(token);
          const meUser = me?.user && typeof me.user === 'object' ? me.user : null;
          if (meUser) {
            setPostprodAuth((prev) => ({
              ...prev,
              user: meUser,
              expiresAt: String(me?.session?.expiresAt || prev.expiresAt || '').trim(),
              error: '',
              busy: false,
              hydrated: true,
            }));
            applyUserLanguageToIdentity(meUser);
          }
        } catch {}
      }

      showNotice(t('postprod.users.msg.updated'), 'info');
      return true;
    } catch (e) {
      setPostprodUsers((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodUsersError(e, t),
      }));
      return false;
    }
  }, [postprodAuth.token, postprodAuth.user?.id, loadPostprodUsers, showNotice, t, applyUserLanguageToIdentity]);

  const handlePostprodDeleteUser = useCallback(async (userId) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return false;
    setPostprodUsers((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      await postprodDeleteUser(token, userId);
      await loadPostprodUsers();
      showNotice(t('postprod.users.msg.deleted'), 'info');
      return true;
    } catch (e) {
      setPostprodUsers((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodUsersError(e, t),
      }));
      return false;
    }
  }, [postprodAuth.token, loadPostprodUsers, showNotice, t]);

  const handlePostprodUpdateUserProjectPermissions = useCallback(async (userId, projectRef, payload = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return null;
    if (!postprodCanManageProjectPermissions) {
      const err = new Error(resolvePostprodUsersError({ code: 'forbidden_project_permissions_manage' }, t));
      err.code = 'forbidden_project_permissions_manage';
      throw err;
    }
    const normalizedPayload = {
      isReferent: payload?.isReferent === true,
      canValidate: payload?.canValidate === true,
      canSync: payload?.canSync === true,
      canLaunchRender: payload?.canLaunchRender === true,
      canEditData: payload?.canEditData === true,
    };
    if (normalizedPayload.canSync) {
      normalizedPayload.isReferent = true;
    }
    try {
      const res = await postprodUpdateUserProjectPermissions(
        token,
        userId,
        projectRef,
        normalizedPayload
      );
      showNotice('Droits projet mis a jour.', 'ok');
      const permissions = res?.projectPermissions && typeof res.projectPermissions === 'object'
        ? res.projectPermissions
        : null;
      return permissions;
    } catch (e) {
      const err = new Error(resolvePostprodUsersError(e, t));
      err.code = e?.code || '';
      throw err;
    }
  }, [postprodAuth.token, postprodCanManageProjectPermissions, showNotice, t]);

  const handlePostprodToggleUserActive = useCallback(async (userId, isActive) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return;
    if (!postprodCanBanUsers) return;
    setPostprodUsers((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      await postprodUpdateUser(token, userId, { isActive });
      await loadPostprodUsers();
      showNotice(
        isActive ? t('postprod.users.msg.activated') : t('postprod.users.msg.deactivated'),
        'info'
      );
    } catch (e) {
      setPostprodUsers((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodUsersError(e, t),
      }));
    }
  }, [postprodAuth.token, postprodCanBanUsers, loadPostprodUsers, showNotice, t]);

  const handlePostprodLoadUserActivity = useCallback(async (userId, limit = 50, options = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return { ok: true, activities: [], summary: { total: 0, actions: {}, projects: [] } };
    return await postprodListUserActivity(token, userId, limit, options);
  }, [postprodAuth.token]);

  const handlePostprodPurgeUserActivity = useCallback(async (userId) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return false;
    try {
      await postprodPurgeUserActivity(token, userId);
      showNotice(t('postprod.users.activity.msg.purged'), 'ok');
      return true;
    } catch {
      return false;
    }
  }, [postprodAuth.token, showNotice, t]);

  const handlePostprodLoadUserProjectPermissions = useCallback(async (userId) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return { ok: true, userId: Number(userId || 0), projectPermissions: [] };
    if (!postprodCanManageProjectPermissions) {
      return { ok: true, userId: Number(userId || 0), projectPermissions: [] };
    }
    try {
      const res = await postprodListUserProjectPermissions(token, userId);
      return {
        ok: true,
        userId: Number(res?.userId || userId || 0),
        projectPermissions: Array.isArray(res?.projectPermissions) ? res.projectPermissions : [],
      };
    } catch (e) {
      const err = new Error(resolvePostprodUsersError(e, t));
      err.code = e?.code || '';
      throw err;
    }
  }, [postprodAuth.token, postprodCanManageProjectPermissions, t]);

  const handlePostprodCreateRole = useCallback(async (payload = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return false;
    setPostprodRoles((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      await postprodCreateRole(token, payload);
      await loadPostprodRoles();
      showNotice(t('postprod.roles.msg.created'), 'ok');
      return true;
    } catch (e) {
      setPostprodRoles((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodRolesError(e, t),
      }));
      return false;
    }
  }, [postprodAuth.token, loadPostprodRoles, showNotice, t]);

  const handlePostprodUpdateRole = useCallback(async (roleKey, payload = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return false;
    setPostprodRoles((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      await postprodUpdateRole(token, roleKey, payload);
      await loadPostprodRoles();
      showNotice(t('postprod.roles.msg.updated'), 'info');
      return true;
    } catch (e) {
      setPostprodRoles((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodRolesError(e, t),
      }));
      return false;
    }
  }, [postprodAuth.token, loadPostprodRoles, showNotice, t]);

  const handlePostprodDeleteRole = useCallback(async (roleKey) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return false;
    setPostprodRoles((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      await postprodDeleteRole(token, roleKey);
      await Promise.all([loadPostprodRoles(), loadPostprodUsers()]);
      showNotice(t('postprod.roles.msg.deleted'), 'ok');
      return true;
    } catch (e) {
      setPostprodRoles((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodRolesError(e, t),
      }));
      return false;
    }
  }, [postprodAuth.token, loadPostprodRoles, loadPostprodUsers, showNotice, t]);

  const handlePostprodCreateTask = useCallback(async (payload = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return false;
    setPostprodTasks((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await postprodCreateTask(token, payload);
      await loadPostprodTasks();
      showNotice(t('postprod.tasks.msg.created'), 'ok');
      return res?.task && typeof res.task === 'object' ? res.task : true;
    } catch (e) {
      setPostprodTasks((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodTasksError(e, t),
      }));
      return false;
    }
  }, [postprodAuth.token, loadPostprodTasks, showNotice, t]);

  const handlePostprodUpdateTask = useCallback(async (taskId, payload = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return false;
    setPostprodTasks((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await postprodUpdateTask(token, taskId, payload);
      await loadPostprodTasks();
      showNotice(t('postprod.tasks.msg.updated'), 'info');
      return res?.task && typeof res.task === 'object' ? res.task : true;
    } catch (e) {
      setPostprodTasks((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodTasksError(e, t),
      }));
      return false;
    }
  }, [postprodAuth.token, loadPostprodTasks, showNotice, t]);

  const handlePostprodDeleteTask = useCallback(async (taskId) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return false;
    setPostprodTasks((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      await postprodDeleteTask(token, taskId);
      await loadPostprodTasks();
      showNotice(t('postprod.tasks.msg.deleted'), 'info');
      return true;
    } catch (e) {
      setPostprodTasks((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodTasksError(e, t),
      }));
      return false;
    }
  }, [postprodAuth.token, loadPostprodTasks, showNotice, t]);

  const handlePostprodTransitionTask = useCallback(async (taskId, payload = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return;
    setPostprodTasks((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      await postprodTransitionTask(token, taskId, payload);
      await loadPostprodTasks();
      showNotice(t('postprod.tasks.msg.transitionOk'), 'info');
    } catch (e) {
      setPostprodTasks((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodTasksError(e, t),
      }));
    }
  }, [postprodAuth.token, loadPostprodTasks, showNotice, t]);

  const handlePostprodCreateRenderTemplate = useCallback(async (payload = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return false;
    if (!postprodCanManageRenderTemplates) {
      showNotice(t('postprod.renders.error.forbiddenTemplateManage'), 'warn');
      return false;
    }
    setPostprodRenderTemplates((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await postprodCreateRenderTemplate(token, payload);
      await loadPostprodRenderTemplates();
      showNotice(t('postprod.renders.msg.templateCreated'), 'ok');
      return res?.template && typeof res.template === 'object' ? res.template : true;
    } catch (e) {
      setPostprodRenderTemplates((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodRendersError(e, t),
      }));
      return false;
    }
  }, [postprodAuth.token, postprodCanManageRenderTemplates, loadPostprodRenderTemplates, showNotice, t]);

  const handlePostprodUpdateRenderTemplate = useCallback(async (templateId, payload = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return false;
    if (!postprodCanManageRenderTemplates) {
      showNotice(t('postprod.renders.error.forbiddenTemplateManage'), 'warn');
      return false;
    }
    setPostprodRenderTemplates((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await postprodUpdateRenderTemplate(token, templateId, payload);
      await loadPostprodRenderTemplates();
      showNotice(t('postprod.renders.msg.templateUpdated'), 'info');
      return res?.template && typeof res.template === 'object' ? res.template : true;
    } catch (e) {
      setPostprodRenderTemplates((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodRendersError(e, t),
      }));
      return false;
    }
  }, [postprodAuth.token, postprodCanManageRenderTemplates, loadPostprodRenderTemplates, showNotice, t]);

  const handlePostprodDeleteRenderTemplate = useCallback(async (templateId) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return false;
    if (!postprodCanManageRenderTemplates) {
      showNotice(t('postprod.renders.error.forbiddenTemplateManage'), 'warn');
      return false;
    }
    setPostprodRenderTemplates((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      await postprodDeleteRenderTemplate(token, templateId);
      await loadPostprodRenderTemplates();
      showNotice(t('postprod.renders.msg.templateDeleted'), 'info');
      return true;
    } catch (e) {
      setPostprodRenderTemplates((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodRendersError(e, t),
      }));
      return false;
    }
  }, [postprodAuth.token, postprodCanManageRenderTemplates, loadPostprodRenderTemplates, showNotice, t]);

  const handlePostprodCreateRenderForm = useCallback(async (payload = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return false;
    if (!postprodCanManageRenderTemplates) {
      showNotice(t('postprod.renders.error.forbiddenTemplateManage'), 'warn');
      return false;
    }
    setPostprodRenderForms((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await postprodCreateRenderForm(token, payload);
      await loadPostprodRenderForms();
      showNotice('Formulaire de rendu cree.', 'ok');
      return res?.form && typeof res.form === 'object' ? res.form : true;
    } catch (e) {
      setPostprodRenderForms((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodRendersError(e, t),
      }));
      return false;
    }
  }, [postprodAuth.token, postprodCanManageRenderTemplates, loadPostprodRenderForms, showNotice, t]);

  const handlePostprodUpdateRenderForm = useCallback(async (formId, payload = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return false;
    if (!postprodCanManageRenderTemplates) {
      showNotice(t('postprod.renders.error.forbiddenTemplateManage'), 'warn');
      return false;
    }
    setPostprodRenderForms((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await postprodUpdateRenderForm(token, formId, payload);
      await loadPostprodRenderForms();
      showNotice('Formulaire de rendu mis a jour.', 'ok');
      return res?.form && typeof res.form === 'object' ? res.form : true;
    } catch (e) {
      setPostprodRenderForms((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodRendersError(e, t),
      }));
      return false;
    }
  }, [postprodAuth.token, postprodCanManageRenderTemplates, loadPostprodRenderForms, showNotice, t]);

  const handlePostprodDeleteRenderForm = useCallback(async (formId) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return false;
    if (!postprodCanManageRenderTemplates) {
      showNotice(t('postprod.renders.error.forbiddenTemplateManage'), 'warn');
      return false;
    }
    setPostprodRenderForms((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      await postprodDeleteRenderForm(token, formId);
      const formIdNum = Number(formId);
      if (Number.isFinite(formIdNum) && formIdNum > 0) {
        const normalizedId = Math.trunc(formIdNum);
        setPostprodRenderForms((prev) => {
          const currentItems = Array.isArray(prev?.items) ? prev.items : [];
          return {
            ...prev,
            items: currentItems.filter((entry) => Number(entry?.id || 0) !== normalizedId),
          };
        });
      }
      await loadPostprodRenderForms();
      showNotice('Formulaire de rendu supprime.', 'info');
      return true;
    } catch (e) {
      setPostprodRenderForms((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodRendersError(e, t),
      }));
      return false;
    }
  }, [postprodAuth.token, postprodCanManageRenderTemplates, loadPostprodRenderForms, showNotice, t]);

  const handlePostprodLoadRenderFormFields = useCallback(async (formId) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return [];
    try {
      const res = await postprodListRenderFormFields(token, formId);
      return Array.isArray(res?.fields) ? res.fields : [];
    } catch {
      return [];
    }
  }, [postprodAuth.token]);

  const handlePostprodReplaceRenderFormFields = useCallback(async (formId, fields = [], wrcFile = '') => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return [];
    if (!postprodCanManageRenderTemplates) {
      showNotice(t('postprod.renders.error.forbiddenTemplateManage'), 'warn');
      return [];
    }
    const res = await postprodReplaceRenderFormFields(token, formId, fields, wrcFile);
    await loadPostprodRenderForms();
    return Array.isArray(res?.fields) ? res.fields : [];
  }, [postprodAuth.token, postprodCanManageRenderTemplates, loadPostprodRenderForms, showNotice, t]);

  const handlePostprodReserveRenderId = useCallback(async () => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return 0;
    try {
      const res = await postprodReserveRenderId(token);
      const idRaw = Number(res?.reservedRenderId || 0);
      return Number.isFinite(idRaw) && idRaw > 0 ? Math.trunc(idRaw) : 0;
    } catch {
      return 0;
    }
  }, [postprodAuth.token]);

  const handlePostprodCreateRender = useCallback(async (payload = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return;
    const currentUserIdRaw = Number(postprodAuth.user?.id || 0);
    const currentUserId = Number.isFinite(currentUserIdRaw) && currentUserIdRaw > 0
      ? Math.trunc(currentUserIdRaw)
      : null;
    const sourcePayload = payload && typeof payload === 'object' && !Array.isArray(payload)
      ? payload
      : {};
    const sourceJobPayload = sourcePayload?.payload && typeof sourcePayload.payload === 'object' && !Array.isArray(sourcePayload.payload)
      ? sourcePayload.payload
      : {};
    const normalizedPayload = {
      ...sourcePayload,
      payload: {
        ...sourceJobPayload,
      },
    };
    const jobPayload = normalizedPayload.payload;
    const mapName = String(jobPayload?.mapName || normalizedPayload?.mapName || '').trim();
    const sequenceName = String(jobPayload?.sequenceName || normalizedPayload?.sequenceName || '').trim();
    const outputProfile = String(jobPayload?.outputProfile || normalizedPayload?.outputProfile || '').trim();
    const formData = jobPayload?.formData && typeof jobPayload.formData === 'object' && !Array.isArray(jobPayload.formData)
      ? jobPayload.formData
      : (normalizedPayload?.formData && typeof normalizedPayload.formData === 'object' && !Array.isArray(normalizedPayload.formData)
          ? normalizedPayload.formData
          : {});
    const formDataCount = Object.keys(formData).length;
    const payloadWrcFiles = Array.isArray(jobPayload?.wrcFiles)
      ? jobPayload.wrcFiles
      : (Array.isArray(jobPayload?.wrc_files) ? jobPayload.wrc_files : []);
    const fallbackWrcPresetPath = payloadWrcFiles
      .map((entry) => String(entry || '').trim())
      .find(Boolean) || '';
    const presetPath = String(
      jobPayload?.presetPath
      || jobPayload?.preset_path
      || normalizedPayload?.presetPath
      || normalizedPayload?.preset_path
      || fallbackWrcPresetPath
      || ''
    ).trim();
    const explicitPresetName = String(
      jobPayload?.presetName
      || normalizedPayload?.presetName
      || ''
    ).trim();
    const renderModePresetFallback = formDataCount > 0
      ? ''
      : String(
        jobPayload?.renderModeName
        || normalizedPayload?.renderModeName
        || ''
      ).trim();
    const presetName = explicitPresetName
      || normalizeUnrealPresetName(presetPath)
      || renderModePresetFallback;
    if (presetPath && !jobPayload.presetPath) jobPayload.presetPath = presetPath;
    if (presetName && !jobPayload.presetName) jobPayload.presetName = presetName;
    const textValue = String(jobPayload?.textValue || normalizedPayload?.textValue || '').trim();
    const renderOffscreen = normalizeBooleanFlag(
      jobPayload?.renderOffscreen
      ?? normalizedPayload?.renderOffscreen
      ?? jobPayload?.execution?.renderOffscreen
      ?? false,
      false
    );
    jobPayload.renderOffscreen = renderOffscreen;
    const outputDir = String(
      jobPayload?.outputDir
      || normalizedPayload?.outputDir
      || postprodRenderOutputDir
      || ''
    ).trim();
    if (outputDir && !jobPayload.outputDir) {
      jobPayload.outputDir = outputDir;
    }
    if (localPrimaryUnrealEditorPath && !jobPayload.unrealEditorPath) {
      jobPayload.unrealEditorPath = localPrimaryUnrealEditorPath;
    }
    const existingExecution = jobPayload?.execution;
    const hasExecutionObject = existingExecution && typeof existingExecution === 'object' && !Array.isArray(existingExecution);
    if (!hasExecutionObject) {
      jobPayload.execution = buildDefaultUnrealProcessExecution({
        mapName,
        sequenceName,
        outputProfile,
        outputDir,
        presetName,
        formData,
        textValue,
        renderOffscreen,
      });
    } else {
      let normalizedExecution = withRenderOffscreenProcessArgs(existingExecution, renderOffscreen);
      if (!normalizedExecution && typeof existingExecution === 'object' && !Array.isArray(existingExecution)) {
        normalizedExecution = { ...existingExecution, renderOffscreen };
      }
      if (normalizedExecution) {
        jobPayload.execution = withJobContextProcessArgs(normalizedExecution, formDataCount > 0) || normalizedExecution;
      }
    }
    const sourceTag = String(jobPayload?.source || normalizedPayload?.source || "").trim().toLowerCase();
    const launchModeTag = String(normalizedPayload?.launchMode || "").trim().toLowerCase();
    const launchNowRequested = (
      sourceTag === "task_auto_render_now"
      || launchModeTag === "now"
      || normalizedPayload?.launchNow === true
    );
    const requestedStationChoice = String(
      normalizedPayload?.render_station
      || normalizedPayload?.renderStation
      || jobPayload?.render_station
      || jobPayload?.renderStation
      || ''
    ).trim().toLowerCase();
    const autoDispatcherRequested = (
      requestedStationChoice === 'auto'
      || requestedStationChoice === 'auto_dispatcher'
    );
    const queueRuntimeActive = isPostprodQueueRuntimeActive();
    const createPayload = {
      ...normalizedPayload,
      payload: {
        ...jobPayload,
      },
    };
    if (launchNowRequested && !queueRuntimeActive) {
      createPayload.render_station = 'local';
      createPayload.render_station_name = '';
      createPayload.renderStation = 'local';
      createPayload.renderStationName = '';
      if (createPayload.payload && typeof createPayload.payload === 'object' && !Array.isArray(createPayload.payload)) {
        createPayload.payload.render_station = 'local';
        createPayload.payload.render_station_name = '';
        createPayload.payload.renderStation = 'local';
        createPayload.payload.renderStationName = '';
      }
    }
    setPostprodRenders((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const createRes = await postprodCreateRender(token, createPayload);
      const remoteDispatch = createRes?.remoteDispatch && typeof createRes.remoteDispatch === 'object'
        ? createRes.remoteDispatch
        : null;
      const createdRenderIdRaw = Number(createRes?.render?.id || createRes?.renderJob?.id || 0);
      const createdRenderId = Number.isFinite(createdRenderIdRaw) && createdRenderIdRaw > 0
        ? Math.trunc(createdRenderIdRaw)
        : 0;
      const remoteDispatchMode = String(remoteDispatch?.mode || '').trim().toLowerCase();
      const remoteDispatchOk = remoteDispatch?.ok === true
        && (remoteDispatchMode === 'auto' || remoteDispatchMode === 'manual');
      if (launchNowRequested && !queueRuntimeActive) {
        if (createdRenderId > 0) {
          setQueuePausedLaunchPending({ renderId: createdRenderId });
        } else {
          showNotice(t('postprod.renders.queuePause.noticeKeptPaused'), 'info');
        }
      }
      if (launchNowRequested && !remoteDispatchOk && queueRuntimeActive) {
        const localWorkerKey = String(renderWorkerKey || '').trim();
        let freshWorkersList = postprodRenderWorkers.items || [];
        try {
          const freshWorkersRes = await postprodListRenderWorkers(token);
          if (Array.isArray(freshWorkersRes?.workers)) {
            freshWorkersList = freshWorkersRes.workers;
            setPostprodRenderWorkers((prev) => ({ ...prev, items: freshWorkersList }));
          }
        } catch {
          // fall back to cached state
        }
        const localWorkerInList = localWorkerKey
          ? freshWorkersList.find((w) => String(w?.workerKey || '').trim() === localWorkerKey)
          : null;
        const localWorkerAvailability = String(
          localWorkerInList?.renderAvailability || localRenderAvailability || ''
        ).trim().toLowerCase();
        const localWorkerIsBusy = localWorkerAvailability === 'busy';
        const localWorkerIsInapte = localWorkerInList && localWorkerInList.apte === false;
        const localWorkerKeyLower = String(localWorkerKey || '').trim().toLowerCase();
        const launchTargetsLocalWorker = (
          !requestedStationChoice
          || requestedStationChoice === 'local'
          || requestedStationChoice === localWorkerKeyLower
          || autoDispatcherRequested
        );
        if (localWorkerIsBusy && launchTargetsLocalWorker) {
          setBusyImmediateLaunchPending({
            renderId: createdRenderId,
            workerDisplayName: String(localWorkerInList?.displayName || renderWorkerDisplayName || localWorkerKey).trim(),
          });
        } else if (localWorkerIsInapte && !autoDispatcherRequested) {
          setAptitudeCheckPending({
            renderId: createdRenderId,
            workerDisplayName: String(localWorkerInList?.displayName || renderWorkerDisplayName || localWorkerKey).trim(),
          });
        } else {
          try {
            await ensureLocalRenderWorkerOnline();
            await handlePatchLocalWorkerAptitude(true);
            const dispatchRes = await postprodDispatchRenders(token, {
              maxJobs: 1,
              renderIds: createdRenderId > 0 ? [createdRenderId] : undefined,
            });
            const dispatchedCountRaw = Number(dispatchRes?.count || 0);
            const dispatchedCount = Number.isFinite(dispatchedCountRaw) ? Math.max(0, Math.trunc(dispatchedCountRaw)) : 0;
            if (dispatchedCount <= 0) {
              showNotice(
                "Rendu cree mais non demarre: aucune station de rendu disponible/compatible pour le moment.",
                "warn"
              );
            }
          } catch (dispatchErr) {
            const dispatchErrCode = String(dispatchErr?.code || "").trim().toLowerCase();
            if (dispatchErrCode === "forbidden_dispatch") {
              showNotice(
                "Rendu cree, mais dispatch auto non autorise pour ce role. Lance le rendu depuis la file d'attente.",
                "warn"
              );
            } else {
              showNotice(
                "Rendu cree, mais lancement immediat indisponible. Verifie les stations de rendu disponibles.",
                "warn"
              );
            }
          }
        }
      }
      if (launchNowRequested && remoteDispatchOk && queueRuntimeActive) {
        showNotice(
          `Rendu transmis a ${remoteDispatch?.stationName || remoteDispatch?.stationIp || 'la station distante'}.`,
          'info'
        );
      }
      if (remoteDispatch && remoteDispatch.ok === false) {
        if (String(remoteDispatch.mode || '').trim().toLowerCase() === 'manual') {
          showNotice(
            `Station cible indisponible (${remoteDispatch.stationName || remoteDispatch.stationIp || 'inconnue'}). Le rendu reste en attente.`,
            'warn'
          );
        } else if (String(remoteDispatch.mode || '').trim().toLowerCase() === 'auto') {
          showNotice(
            'Aucune station distante joignable: bascule automatique en rendu local.',
            'warn'
          );
        }
      }
      await Promise.all([
        loadPostprodRenders(),
        loadPostprodRenderWorkers(),
        loadPostprodRenderHealth(),
        loadPostprodUserAlerts({ silent: true }),
      ]);
      showNotice(t('postprod.renders.msg.created'), 'ok');
      return createRes?.render || createRes?.renderJob || null;
    } catch (e) {
      if (isPostprodRecoverableOfflineError(e)) {
        const item = {
          id: `offline-render-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          kind: 'create_render',
          userId: currentUserId,
          payload: normalizedPayload,
          createdAt: new Date().toISOString(),
          attempts: 0,
          lastAttemptAt: '',
          lastError: String(e?.message || e?.code || 'network_error').trim().slice(0, 200),
        };
        updatePostprodOfflineOutbox((current) => [...current, item]);
        setPostprodRenders((prev) => ({
          ...prev,
          loading: false,
          error: '',
        }));
        const pendingCount = Math.max(1, postprodOfflineOutboxCount + 1);
        showNotice(t('postprod.renders.msg.queuedOffline', { count: pendingCount }), 'warn');
        return null;
      }
      setPostprodRenders((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodRendersError(e, t),
      }));
      return null;
    }
  }, [
    postprodAuth.token,
    postprodAuth.user?.id,
    postprodOfflineOutboxCount,
    updatePostprodOfflineOutbox,
    localPrimaryUnrealEditorPath,
    postprodRenderOutputDir,
    loadPostprodRenders,
    loadPostprodRenderWorkers,
    loadPostprodRenderHealth,
    loadPostprodUserAlerts,
    showNotice,
    ensureLocalRenderWorkerOnline,
    renderWorkerKey,
    renderWorkerDisplayName,
    localRenderAvailability,
    postprodRenderWorkers.items,
    setAptitudeCheckPending,
    setBusyImmediateLaunchPending,
    handlePatchLocalWorkerAptitude,
    t,
  ]);

  const handlePostprodScheduleRender = useCallback(async (renderId, scheduledAt) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return;
    try {
      await postprodScheduleRenderJob(token, renderId, { scheduledAt: scheduledAt ?? null });
      await loadPostprodRenders();
    } catch (e) {
      showNotice(String(e?.message || e?.code || 'schedule_error'), 'error');
    }
  }, [postprodAuth.token, loadPostprodRenders, showNotice]);

  const handlePostprodUpdateRenderExportDestinations = useCallback(async (renderId, exportDestinationIds = []) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return;
    try {
      await postprodUpdateRenderExportDestinations(token, renderId, exportDestinationIds);
      await loadPostprodRenders({ silent: true });
    } catch (e) {
      showNotice(String(e?.message || e?.code || 'update_export_destinations_error'), 'error');
    }
  }, [postprodAuth.token, loadPostprodRenders, showNotice]);

  const handlePostprodDeleteRender = useCallback(async (renderId) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return false;
    const renderIdNum = Number(renderId);
    const normalizedRenderId = Number.isFinite(renderIdNum) && renderIdNum > 0
      ? Math.trunc(renderIdNum)
      : 0;
    if (normalizedRenderId <= 0) return false;

    setPostprodRenders((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      await postprodDeleteRenderJob(token, normalizedRenderId);
      await Promise.all([
        loadPostprodRenders(),
        loadPostprodTasks(),
        loadPostprodRenderHealth(),
        loadPostprodUserAlerts({ silent: true }),
      ]);
      showNotice(t('postprod.renders.msg.deleted'), 'info');
      return true;
    } catch (e) {
      setPostprodRenders((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodRendersError(e, t),
      }));
      return false;
    }
  }, [
    postprodAuth.token,
    loadPostprodRenders,
    loadPostprodTasks,
    loadPostprodRenderHealth,
    loadPostprodUserAlerts,
    showNotice,
    t,
  ]);

  const handlePostprodReorderRenders = useCallback(async (order = []) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return;
    try {
      await postprodReorderRenderJobs(token, { order });
      await loadPostprodRenders();
    } catch (e) {
      showNotice(String(e?.message || e?.code || 'reorder_error'), 'error');
    }
  }, [postprodAuth.token, loadPostprodRenders, showNotice]);

  const handlePostprodTransitionRender = useCallback(async (renderId, payload = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return;
    setPostprodRenders((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      await postprodTransitionRender(token, renderId, payload);
      await Promise.all([
        loadPostprodRenders(),
        loadPostprodRenderHealth(),
        loadPostprodUserAlerts({ silent: true }),
      ]);
      showNotice(t('postprod.renders.msg.transitionOk'), 'info');
    } catch (e) {
      setPostprodRenders((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodRendersError(e, t),
      }));
    }
  }, [postprodAuth.token, loadPostprodRenders, loadPostprodRenderHealth, loadPostprodUserAlerts, showNotice, t]);

  const handlePostprodDispatchRenders = useCallback(async (payload = {}) => {
    const token = String(postprodAuth.token || '').trim();
    const sourcePayload = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
    const silent = sourcePayload.silent === true;
    const forceDispatch = sourcePayload.force === true;
    if (!token) return { count: 0, compatibilityBlocked: 0 };
    if (!isPostprodQueueRuntimeActive() && !forceDispatch) {
      if (!silent) {
        showNotice("File d'attente en pause: aucun rendu ne peut etre lance.", "warn");
      }
      return { count: 0, compatibilityBlocked: 0 };
    }
    const dispatchPayload = { ...sourcePayload };
    delete dispatchPayload.silent;
    delete dispatchPayload.force;
    if (!silent) {
      setPostprodRenders((prev) => ({ ...prev, loading: true, error: '' }));
    }
    try {
      await ensureLocalRenderWorkerOnline();
      const res = await postprodDispatchRenders(token, dispatchPayload);
      await Promise.all([
        loadPostprodRenders(silent ? { silent: true } : undefined),
        loadPostprodRenderWorkers(silent ? { silent: true } : undefined),
        loadPostprodRenderHealth(silent ? { silent: true } : undefined),
        loadPostprodUserAlerts({ silent: true }),
      ]);
      const count = Number(res?.count || 0);
      const compatibilityBlockedRaw = res?.compatibilityBlocked;
      const compatibilityBlocked = Array.isArray(compatibilityBlockedRaw)
        ? compatibilityBlockedRaw.length
        : Number(compatibilityBlockedRaw || 0);
      if (!silent) {
        showNotice(
          t('postprod.renders.msg.dispatched', { count: Number.isFinite(count) ? count : 0 }),
          count > 0 ? 'ok' : 'info'
        );
        if (Number.isFinite(compatibilityBlocked) && compatibilityBlocked > 0) {
          showNotice(
            `Dispatch: ${count} assignes, ${compatibilityBlocked} en attente (incompatibilite capacites station de rendu).`,
            'warn'
          );
        }
      }
      return {
        count,
        compatibilityBlocked: Number.isFinite(compatibilityBlocked) ? compatibilityBlocked : 0,
      };
    } catch (e) {
      if (!silent) {
        setPostprodRenders((prev) => ({
          ...prev,
          loading: false,
          error: resolvePostprodRendersError(e, t),
        }));
      }
      return { count: 0, compatibilityBlocked: 0 };
    }
  }, [
    postprodAuth.token,
    ensureLocalRenderWorkerOnline,
    loadPostprodRenders,
    loadPostprodRenderWorkers,
    loadPostprodRenderHealth,
    loadPostprodUserAlerts,
    showNotice,
    t,
  ]);

  const handlePostprodPatchWorkerAptitude = useCallback(async (workerKey, apte) => {
    const token = String(postprodAuth.token || '').trim();
    const key = String(workerKey || '').trim();
    if (!token || !key) return;
    try {
      await postprodPatchRenderWorkerAptitude(token, key, apte);
      await loadPostprodRenderWorkers();
      if ((apte === true || apte === 1) && isPostprodQueueRuntimeActive()) {
        await Promise.resolve(handlePostprodDispatchRenders({ maxJobs: 1, silent: true })).catch(() => ({}));
      }
    } catch {
      // best-effort
    }
  }, [postprodAuth.token, loadPostprodRenderWorkers, handlePostprodDispatchRenders]);

  const handlePostprodSaveDispatchPolicy = useCallback(async (payload = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return null;
    setPostprodRenders((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await postprodSaveDispatchPolicy(token, payload);
      await loadPostprodRenderHealth();
      setPostprodRenders((prev) => ({ ...prev, loading: false, error: '' }));
      showNotice(t('postprod.renders.dispatchPolicy.msg.saved', 'Politique de dispatch enregistree.'), 'ok');
      return res?.dispatchPolicy && typeof res.dispatchPolicy === 'object'
        ? res.dispatchPolicy
        : null;
    } catch (e) {
      setPostprodRenders((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodRendersError(e, t),
      }));
      return null;
    }
  }, [postprodAuth.token, loadPostprodRenderHealth, showNotice, t]);

  useEffect(() => {
    let cancelled = false;
    const token = String(postprodAuth.token || '').trim();

    if (!token) {
      setPostprodAuth((prev) => prev.hydrated ? prev : ({ ...prev, hydrated: true }));
      return;
    }
    if (postprodAuth.hydrated && postprodAuth.user) return;

    setPostprodAuth((prev) => ({ ...prev, busy: true, error: '' }));
    (async () => {
      try {
        const me = await postprodAuthMe(token);
        if (cancelled) return;
        const user = me?.user && typeof me.user === 'object' ? me.user : null;
        if (!user) {
          throw Object.assign(new Error('invalid_session'), { code: 'invalid_session', status: 401 });
        }
        const expiresAt = String(me?.session?.expiresAt || postprodAuth.expiresAt || '').trim();
        const payload = { token, user, expiresAt };
        writePostprodAuth(payload);
        setPostprodAuth({
          ...payload,
          busy: false,
          error: '',
          hydrated: true,
        });
        applyUserLanguageToIdentity(user);
      } catch {
        if (cancelled) return;
        const isInitialHydration = !postprodAuth.hydrated;
        const message = isInitialHydration ? '' : t('postprod.auth.error.invalidSession');
        clearPostprodAuth(message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    postprodAuth.token,
    postprodAuth.user,
    postprodAuth.hydrated,
    postprodAuth.expiresAt,
    clearPostprodAuth,
    applyUserLanguageToIdentity,
    t,
  ]);

  useEffect(() => {
    if (!postprodAuthenticated || !postprodCanManageUsers) return;
    if (current !== POSTPROD_TAB_USERS && current !== POSTPROD_TAB_PROFILES && current !== POSTPROD_TAB_RENDERS_CREATE) return;
    loadPostprodUsers();
  }, [
    postprodAuthenticated,
    postprodCanManageUsers,
    current,
    loadPostprodUsers,
  ]);

  useEffect(() => {
    if (!postprodAuthenticated) return;
    if (current !== POSTPROD_TAB_USERS) return;
    if (postprodCanManageUsers) {
      setPostprodMyActivity({
        activities: [],
        summary: { total: 0, actions: {}, projects: [] },
        loading: false,
        error: '',
      });
      return;
    }
    loadPostprodMyActivity();
  }, [
    postprodAuthenticated,
    postprodCanManageUsers,
    current,
    loadPostprodMyActivity,
  ]);

  useEffect(() => {
    if (!postprodAuthenticated) return;
    if (!postprodCanManageUsers && !postprodCanManageRoles) return;
    if (current !== POSTPROD_TAB_USERS && current !== POSTPROD_TAB_PROFILES) return;
    loadPostprodRoles();
  }, [
    postprodAuthenticated,
    postprodCanManageUsers,
    postprodCanManageRoles,
    current,
    loadPostprodRoles,
  ]);

  useEffect(() => {
    if (appMode !== APP_MODE_POSTPROD || !postprodAuthenticated) return;
    if (current !== POSTPROD_TAB_RENDERS_CREATE && current !== 'Rendus') return;
    loadPostprodTasks();
  }, [
    appMode,
    postprodAuthenticated,
    current,
    loadPostprodTasks,
  ]);

  useEffect(() => {
    if (!postprodAuthenticated) return;
    if (current !== POSTPROD_TAB_RENDERS_CREATE) return;
    loadPostprodTaskCatalog();
  }, [
    postprodAuthenticated,
    current,
    loadPostprodTaskCatalog,
  ]);

  useEffect(() => {
    if (appMode !== APP_MODE_POSTPROD || !postprodAuthenticated) return;
    const needsProjectsForTab =
      current === 'Projets' ||
      (current === 'Datas' && postprodCanManageRenderTemplates) ||
      current === POSTPROD_TAB_USERS;
    if (!needsProjectsForTab) return;
    loadPostprodProjects();
  }, [
    appMode,
    postprodAuthenticated,
    postprodCanManageRenderTemplates,
    current,
    loadPostprodProjects,
  ]);

  useEffect(() => {
    if (appMode !== APP_MODE_POSTPROD || !postprodAuthenticated) return;
    if (current !== 'Ressources') return;
    if (!postprodCanAccessResources) return;
    loadPostprodResources();
  }, [
    appMode,
    postprodAuthenticated,
    current,
    postprodCanAccessResources,
    loadPostprodResources,
  ]);

  useEffect(() => {
    if (appMode !== APP_MODE_POSTPROD || !postprodAuthenticated) return;
    if (current !== POSTPROD_TAB_RENDERS_CREATE && current !== 'Rendus') return;
    loadPostprodRenderTemplates();
    loadPostprodRenderWorkers();
    if (current === POSTPROD_TAB_RENDERS_CREATE) {
      loadPostprodRenderForms();
      loadPostprodRenders();
    }
    if (current === 'Rendus') {
      loadPostprodRenderProjectCatalog();
      loadPostprodRenderForms();
      loadPostprodRenders();
    }
  }, [
    appMode,
    postprodAuthenticated,
    current,
    loadPostprodRenderProjectCatalog,
    loadPostprodRenders,
    loadPostprodRenderForms,
    loadPostprodRenderTemplates,
    loadPostprodRenderWorkers,
  ]);

  useEffect(() => {
    if (appMode !== APP_MODE_POSTPROD || !postprodAuthenticated) return;
    if (current !== 'Datas') return;
    if (!postprodCanManageRenderTemplates) return;
    loadPostprodRenderForms();
  }, [
    appMode,
    postprodAuthenticated,
    postprodCanManageRenderTemplates,
    current,
    loadPostprodRenderForms,
  ]);

  useEffect(() => {
    if (appMode !== APP_MODE_POSTPROD || !postprodAuthenticated) return;
    if (current !== 'Logs') return;
    loadPostprodAudit();
    setPostprodRenderHealthAuditMaintenance({
      data: null,
      loading: false,
      error: '',
      purging: false,
      purgeError: '',
      lastPurge: null,
    });
  }, [
    appMode,
    postprodAuthenticated,
    current,
    loadPostprodAudit,
  ]);

  useEffect(() => {
    if (appMode !== APP_MODE_POSTPROD || !postprodAuthenticated) return;
    loadPostprodUserAlerts();
  }, [
    appMode,
    postprodAuthenticated,
    loadPostprodUserAlerts,
  ]);

  const refreshPostprodCurrentTab = useCallback(async () => {
    if (appMode !== APP_MODE_POSTPROD || !postprodAuthenticated) return;
    if (current === POSTPROD_TAB_RENDERS_CREATE && postprodTaskFormOpen) return;

    const jobs = [];
    const queue = (fn) => {
      if (typeof fn === 'function') jobs.push(fn);
    };

    queue(loadPostprodRenderHealth);
    queue(() => loadPostprodUserAlerts({ silent: true }));
    if (current !== POSTPROD_TAB_RENDERS_CREATE && current !== 'Rendus') {
      queue(() => loadPostprodTasks({ silent: true }));
      queue(() => loadPostprodRenders({ silent: true }));
    }

    if (current === POSTPROD_TAB_USERS) {
      if (!postprodUserEditorOpen) {
        queue(loadPostprodUsers);
        queue(loadPostprodProjects);
        if (postprodCanManageUsers) {
          queue(loadPostprodRoles);
        } else {
          queue(loadPostprodMyActivity);
        }
      }
    } else if (current === POSTPROD_TAB_PROFILES) {
      if (postprodCanManageUsers || postprodCanManageRoles) {
        queue(loadPostprodRoles);
      }
      if (postprodCanManageRoles) {
        queue(loadPostprodUsers);
      }
    } else if (current === 'Projets') {
      queue(loadPostprodProjects);
    } else if (current === 'Ressources') {
      if (postprodCanAccessResources) {
        queue(loadPostprodResources);
      }
    } else if (current === POSTPROD_TAB_RENDERS_CREATE) {
      if (!postprodTaskFormOpen) {
        queue(() => loadPostprodTasks({ silent: true }));
        queue(() => loadPostprodTaskCatalog({ silent: true }));
        queue(() => loadPostprodRenderTemplates({ silent: true }));
        queue(() => loadPostprodRenderWorkers({ silent: true }));
        queue(() => loadPostprodRenders({ silent: true }));
        queue(loadPostprodRenderForms);
      }
    } else if (current === 'Rendus') {
      queue(() => loadPostprodTasks({ silent: true }));
      queue(() => loadPostprodRenderProjectCatalog({ silent: true }));
      queue(() => loadPostprodRenderTemplates({ silent: true }));
      queue(() => loadPostprodRenderWorkers({ silent: true }));
      queue(() => loadPostprodRenders({ silent: true }));
      queue(loadPostprodRenderForms);
    } else if (current === 'Datas') {
      if (postprodCanManageRenderTemplates) {
        queue(loadPostprodProjects);
        queue(loadPostprodRenderForms);
      }
    } else if (current === 'Logs') {
      queue(loadPostprodAudit);
    }

    await Promise.all(
      jobs.map(async (fn) => {
        try {
          await fn();
        } catch {}
      })
    );

  }, [
    appMode,
    postprodAuthenticated,
    current,
    postprodAuth.token,
    postprodCanManageUsers,
    postprodCanManageRoles,
    postprodCanManageRenderTemplates,
    postprodCanAccessResources,
    loadPostprodUsers,
    loadPostprodProjects,
    loadPostprodRoles,
    loadPostprodMyActivity,
    loadPostprodResources,
    loadPostprodTasks,
    loadPostprodTaskCatalog,
    loadPostprodRenderTemplates,
    loadPostprodRenderWorkers,
    loadPostprodRenderForms,
    postprodTaskFormOpen,
    loadPostprodRenderProjectCatalog,
    loadPostprodRenders,
    loadPostprodAudit,
    loadPostprodRenderHealth,
    loadPostprodUserAlerts,
    postprodUserEditorOpen,
  ]);

  useEffect(() => {
    if (appMode !== APP_MODE_POSTPROD || !postprodAuthenticated) return;
    if (current === 'Datas' || current === 'Logs' || current === 'Rendus' || current === POSTPROD_TAB_RENDERS_CREATE) return;
    if (current === POSTPROD_TAB_USERS && !postprodCanManageUsers) return;

    let stopped = false;
    let timer = null;

    const tick = async () => {
      await refreshPostprodCurrentTab();
      if (!stopped) {
        timer = setTimeout(tick, postprodRefreshMs);
      }
    };

    timer = setTimeout(tick, postprodRefreshMs);

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [
    appMode,
    postprodAuthenticated,
    current,
    postprodRefreshMs,
    postprodCanManageUsers,
    refreshPostprodCurrentTab,
  ]);

  useEffect(() => {
    if (appMode !== APP_MODE_POSTPROD || !postprodAuthenticated) return;
    if (current !== 'Rendus') return;

    let stopped = false;
    let timer = null;
    const intervalMs = 10000;

    const tick = async () => {
      const isVisible = typeof document === 'undefined'
        ? true
        : document.visibilityState === 'visible';
      if (isVisible) {
        await refreshPostprodCurrentTab();
      }
      if (!stopped) {
        timer = setTimeout(tick, intervalMs);
      }
    };

    timer = setTimeout(tick, intervalMs);

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [
    appMode,
    postprodAuthenticated,
    current,
    refreshPostprodCurrentTab,
  ]);

  useEffect(() => {
    if (appMode !== APP_MODE_POSTPROD || !postprodAuthenticated) return;
    if (!postprodCanLaunchRenders || !localRenderEnabled) return;

    let stopped = false;
    let timer = null;
    let inFlight = false;
    const intervalMs = 5000;

    const tick = async () => {
      if (stopped) return;
      if (inFlight) {
        timer = setTimeout(tick, intervalMs);
        return;
      }

      const queueRuntimeActive = isPostprodQueueRuntimeActive();
      const token = String(postprodAuth.token || '').trim();
      const AUTO_DISPATCH_COOLDOWN_MS = 5_000;
      const autoDispatchAllowed = (Date.now() - postprodAutoDispatchLastKickRef.current) >= AUTO_DISPATCH_COOLDOWN_MS;
      if (!queueRuntimeActive || !token || !autoDispatchAllowed) {
        timer = setTimeout(tick, intervalMs);
        return;
      }

      let dueScheduledQueueEntry = null;
      if (current !== 'Rendus') {
        let taskItems = Array.isArray(postprodTasks?.items) ? postprodTasks.items : [];
        let renderItems = Array.isArray(postprodRenders?.items) ? postprodRenders.items : [];

        const SNAPSHOT_REFRESH_MS = 12_000;
        const snapshotNowMs = Date.now();
        const snapshot = (
          postprodBackgroundQueueSnapshotRef.current
          && typeof postprodBackgroundQueueSnapshotRef.current === 'object'
        )
          ? postprodBackgroundQueueSnapshotRef.current
          : { at: 0, tasks: [], renders: [] };
        const hasFreshSnapshot = (snapshotNowMs - Number(snapshot.at || 0)) < SNAPSHOT_REFRESH_MS;

        if (hasFreshSnapshot) {
          if (Array.isArray(snapshot.tasks)) taskItems = snapshot.tasks;
          if (Array.isArray(snapshot.renders)) renderItems = snapshot.renders;
        } else {
          try {
            const [tasksRes, rendersRes] = await Promise.all([
              postprodListTasks(token),
              postprodListRenders(token, 8000, { scan: false }),
            ]);
            const freshTasks = Array.isArray(tasksRes?.tasks) ? tasksRes.tasks : [];
            const freshRenders = Array.isArray(rendersRes?.renders) ? rendersRes.renders : [];
            postprodBackgroundQueueSnapshotRef.current = {
              at: snapshotNowMs,
              tasks: freshTasks,
              renders: freshRenders,
            };
            taskItems = freshTasks;
            renderItems = freshRenders;
          } catch {
            if (Array.isArray(snapshot.tasks) && snapshot.tasks.length > 0) taskItems = snapshot.tasks;
            if (Array.isArray(snapshot.renders) && snapshot.renders.length > 0) renderItems = snapshot.renders;
          }
        }

        if (taskItems.length > 0) {
          const autoRenderStateByTaskId = buildTaskAutoRenderStateByTaskId(renderItems);
          const queueEntries = buildRenderQueueTasks({
            tasks: taskItems,
            autoRenderStateByTaskId,
          });
          for (const entry of queueEntries) {
            const launchMeta = getQueueEntryLaunchMeta(entry);
            if (launchMeta?.isWaitingLaunchable) {
              dueScheduledQueueEntry = entry;
              break;
            }
          }
        }
      }

      inFlight = true;
      try {
        if (dueScheduledQueueEntry) {
          const nowMs = Date.now();
          const taskIdRaw = Number(dueScheduledQueueEntry?.task?.id || 0);
          const taskId = Number.isFinite(taskIdRaw) && taskIdRaw > 0 ? Math.trunc(taskIdRaw) : 0;
          const lastKick = postprodBackgroundQueueLaunchRef.current;
          const sameTaskCooldownActive = (
            taskId > 0
            && Number(lastKick?.taskId || 0) === taskId
            && (nowMs - Number(lastKick?.kickAt || 0)) < 30_000
          );
          if (!sameTaskCooldownActive) {
            postprodBackgroundQueueLaunchRef.current = { taskId, kickAt: nowMs };
            postprodAutoDispatchLastKickRef.current = nowMs;
            await Promise.resolve(handlePatchLocalWorkerAptitude(true)).catch(() => {});
            await launchScheduledTaskRenderAction({
              task: dueScheduledQueueEntry?.task || null,
              queueEntry: dueScheduledQueueEntry,
              onCreateRender: handlePostprodCreateRender,
              onDispatchRenders: handlePostprodDispatchRenders,
            });
          }
          return;
        }

        await ensureLocalRenderWorkerOnline();
        await Promise.resolve(handlePatchLocalWorkerAptitude(true)).catch(() => {});
        postprodAutoDispatchLastKickRef.current = Date.now();
        await Promise.resolve(handlePostprodDispatchRenders({ maxJobs: 1, silent: true })).catch(() => ({}));
      } catch {
      } finally {
        inFlight = false;
        if (!stopped) timer = setTimeout(tick, intervalMs);
      }
    };

    timer = setTimeout(tick, 2500);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [
    appMode,
    postprodAuthenticated,
    postprodCanLaunchRenders,
    localRenderEnabled,
    current,
    postprodTasks.items,
    postprodRenders.items,
    postprodAuth.token,
    handlePostprodCreateRender,
    ensureLocalRenderWorkerOnline,
    handlePostprodDispatchRenders,
    handlePatchLocalWorkerAptitude,
  ]);

  useEffect(() => {
    postprodBackgroundQueueSnapshotRef.current = { at: 0, tasks: [], renders: [] };
  }, [postprodAuth.token]);

  useEffect(() => {
    if (current !== POSTPROD_TAB_RENDERS_CREATE) {
      setPostprodTaskFormOpen(false);
    }
    if (current !== POSTPROD_TAB_USERS) {
      setPostprodUserEditorOpen(false);
    }
  }, [current]);

  useEffect(() => {
    if (current !== POSTPROD_TAB_RENDERS_CREATE) {
      postprodRenderEditorWasOpenRef.current = postprodTaskFormOpen === true;
      return;
    }

    const wasOpen = postprodRenderEditorWasOpenRef.current === true;
    const isOpen = postprodTaskFormOpen === true;
    postprodRenderEditorWasOpenRef.current = isOpen;

    // Retour auto vers "Rendus" uniquement quand l'utilisateur ferme un formulaire déjà ouvert.
    if (wasOpen && !isOpen && !postprodRenderEditorRequest) {
      setCurrent("Rendus");
    }
  }, [current, postprodTaskFormOpen, postprodRenderEditorRequest]);

  useEffect(() => {
    if (!postprodAuthenticated) return;
    const token = String(postprodAuth.token || '').trim();
    const workerKey = String(renderWorkerKey || '').trim();
    if (!token || !workerKey) return;

    let stopped = false;
    let timer = null;
    const payloadBase = {
      workerKey,
      displayName: renderWorkerDisplayName,
      capabilities: renderWorkerCapabilities,
      canRender: localRenderEnabled,
      renderAvailability: localRenderAvailability,
      isActive: true,
    };

    const beat = async () => {
      try {
        await postprodUpsertRenderWorker(token, { ...payloadBase, isOnline: true });
      } catch {}
      if (!stopped) {
        timer = setTimeout(beat, 30000);
      }
    };

    beat();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      // Ne pas forcer offline sur chaque rerender/transition UI.
      // Le sweep backend marque offline automatiquement si heartbeat stale.
    };
  }, [
    postprodAuthenticated,
    postprodAuth.token,
    renderWorkerKey,
    renderWorkerDisplayName,
    renderWorkerCapabilities,
    hasLocalUnrealCapability,
    localRenderEnabled,
    localRenderAvailability,
  ]);

  useEffect(() => {
    if (!postprodAuthenticated) return;
    if (!postprodCanLaunchRenders || !localRenderEnabled) return;
    const token = String(postprodAuth.token || '').trim();
    const workerKey = String(renderWorkerKey || '').trim();
    if (!token || !workerKey) return;
    const currentUserIdRaw = Number(postprodAuth.user?.id || 0);
    const currentUserId = Number.isFinite(currentUserIdRaw) && currentUserIdRaw > 0
      ? Math.trunc(currentUserIdRaw)
      : null;

    let stopped = false;
    let timer = null;
    let inFlight = false;

    const tick = async () => {
      if (stopped) return;
      if (inFlight) {
        timer = setTimeout(tick, 5000);
        return;
      }
      inFlight = true;
      try {
        await replayPostprodWorkerCompletionOutbox();
        const pendingCompletionRenderIds = new Set(
          normalizePostprodWorkerCompletionOutbox(postprodWorkerCompletionOutbox)
            .filter((entry) => {
              if (String(entry?.workerKey || '').trim() !== workerKey) return false;
              if (currentUserId != null && entry?.userId != null && Number(entry.userId) !== currentUserId) return false;
              return true;
            })
            .map((entry) => Number(entry?.renderId || 0))
            .filter((renderId) => Number.isFinite(renderId) && renderId > 0)
        );
        const res = await postprodListRenders(token, 8000);
        const renders = Array.isArray(res?.renders) ? res.renders : [];
        const assignedRunning = renders.find((render) => {
          const status = String(render?.status || '').trim();
          const assignedKey = String(render?.assignedWorkerKey || '').trim();
          const renderId = Number(render?.id || 0);
          return (
            status === 'Running'
            && assignedKey === workerKey
            && !pendingCompletionRenderIds.has(renderId)
          );
        });
        const renderId = Number(assignedRunning?.id || 0);
        if (renderId > 0) {
          const payload = assignedRunning?.payload && typeof assignedRunning.payload === 'object' && !Array.isArray(assignedRunning.payload)
            ? assignedRunning.payload
            : {};
          const execution = payload?.execution && typeof payload.execution === 'object' && !Array.isArray(payload.execution)
            ? payload.execution
            : {};
          const executionModeRaw = String(
            execution?.mode ?? payload?.workerExecutionMode ?? payload?.workerMode ?? 'simulate'
          ).trim().toLowerCase();

          let completionPayload = null;
          if (executionModeRaw === 'process') {
            const templateContext = buildRenderProcessTemplateContext({
              render: assignedRunning,
              payload,
              execution,
              workerKey,
              defaultUnrealEditorPath: localPrimaryUnrealEditorPath,
            });
            const primaryCommand = replaceProcessTemplateVars(
              execution?.command ?? payload?.command ?? '',
              templateContext
            ).trim();
            const fallbackCommand = replaceProcessTemplateVars(
              execution?.commandFallback ?? payload?.commandFallback ?? '',
              templateContext
            ).trim();
            const command = primaryCommand || fallbackCommand;
            const args = (
              Array.isArray(execution?.args)
              ? execution.args
                : (Array.isArray(payload?.args) ? payload.args : [])
            ).map((arg) => replaceProcessTemplateVars(arg, templateContext).trim()).filter(Boolean);
            const normalizedArgs = [];
            for (let i = 0; i < args.length; i += 1) {
              const currentArg = String(args[i] || '').trim();
              if (!currentArg) continue;
              if (
                currentArg.toLowerCase() === '-moviepipelineconfig'
                && i + 1 < args.length
              ) {
                const nextArg = String(args[i + 1] || '').trim();
                if (nextArg && !nextArg.startsWith('-')) {
                  normalizedArgs.push(`-MoviePipelineConfig=${nextArg}`);
                  i += 1;
                  continue;
                }
              }
              normalizedArgs.push(currentArg);
            }
            const outputDirForArgs = String(templateContext.outputdir || payload?.outputDir || '').trim();
            const expectedNameForArgs = String(templateContext.expectedrendername || '').trim();
            const hasMovieFolderArg = normalizedArgs.some((arg) => String(arg || '').trim().toLowerCase().includes('moviefolder'));
            const hasMovieNameArg = normalizedArgs.some((arg) => String(arg || '').trim().toLowerCase().includes('moviename'));
            const hasOutputDirArg = normalizedArgs.some((arg) => String(arg || '').trim().toLowerCase().includes('uurenderoutputdir'));
            if (outputDirForArgs && !hasMovieFolderArg) {
              normalizedArgs.push(`-MovieFolder=${outputDirForArgs}`);
            }
            if (expectedNameForArgs && !hasMovieNameArg) {
              normalizedArgs.push(`-MovieName=${expectedNameForArgs}`);
            }
            if (outputDirForArgs && !hasOutputDirArg) {
              normalizedArgs.push(`-UURenderOutputDir=${outputDirForArgs}`);
            }
            const timeoutMsRaw = Number(execution?.timeoutMs ?? payload?.timeoutMs ?? 30 * 60 * 1000);
            const timeoutMs = Number.isFinite(timeoutMsRaw)
              ? Math.max(1000, Math.min(4 * 60 * 60 * 1000, Math.trunc(timeoutMsRaw)))
              : (30 * 60 * 1000);
            const cwd = replaceProcessTemplateVars(
              execution?.cwd ?? payload?.cwd ?? '',
              templateContext
            ).trim();
            const configuredOutputPathTemplate = String(
              execution?.outputPath ?? payload?.outputPath ?? ''
            ).trim();
            const configuredOutputPath = replaceProcessTemplateVars(
              configuredOutputPathTemplate,
              templateContext
            ).trim();
            const fallbackOutputPath = String(templateContext.outputpath || '').trim();
            const completionOutputPathRaw = configuredOutputPath || fallbackOutputPath;
            const completionOutputPath = hasProcessTemplateToken(completionOutputPathRaw)
              ? ''
              : completionOutputPathRaw;
            const outputDirForSearch = String(
              templateContext.outputdir || payload?.outputDir || ''
            ).trim();
            const allowMissingOutputArtifact = normalizeBooleanFlag(
              execution?.allowMissingOutputArtifact
                ?? payload?.allowMissingOutputArtifact
                ?? false,
              false
            );
            const processStartMs = Date.now();
            let detectedOutputPath = '';

            if (!command) {
              completionPayload = {
                workerKey,
                success: false,
                errorMessage: 'missing_worker_command',
                comment: 'worker_process_fail',
              };
            } else {
              const pidTag = `r${renderId}`;
              let _procOk = null;
              let _procError = '';

              const existingPidRes = await readRenderPid(pidTag);
              if (stopped) return;
              const existingPid = Number(existingPidRes?.pid || 0);

              const pollUntilDead = async (pid, deadlineMs) => {
                while (true) {
                  if (stopped) return 'stopped';
                  if (Date.now() > deadlineMs) return 'timeout';
                  await waitMs(10_000);
                  if (stopped) return 'stopped';
                  const alive = await checkPidAlive(pid);
                  if (!alive?.alive) return 'done';
                }
              };

              const resolveOutputArtifactPath = async () => {
                const directCandidates = buildRenderOutputPathCandidates(
                  completionOutputPath || fallbackOutputPath
                );
                for (const candidate of directCandidates) {
                  const candidatePath = String(candidate || '').trim();
                  if (!candidatePath) continue;
                  const fileRes = await checkFileExists(candidatePath);
                  if (fileRes?.exists === true) return candidatePath;
                }

                if (!outputDirForSearch) return '';
                const scanRes = await findRenderOutputs({
                  rootDir: outputDirForSearch,
                  minMtimeMs: Math.max(0, processStartMs - (24 * 60 * 60 * 1000)),
                  maxDepth: 6,
                  limit: 300,
                });
                const files = Array.isArray(scanRes?.files) ? scanRes.files : [];
                for (const entry of files) {
                  const candidatePath = String(entry?.path || '').trim();
                  if (!candidatePath) continue;
                  if (!isLikelyRenderOutputMedia(candidatePath)) continue;
                  return candidatePath;
                }
                return '';
              };

              const resolveOutputOk = async () => {
                const resolvedOutput = await resolveOutputArtifactPath();
                if (resolvedOutput) {
                  detectedOutputPath = resolvedOutput;
                  return true;
                }
                return allowMissingOutputArtifact === true;
              };

              if (existingPid > 0) {
                const aliveCheck = await checkPidAlive(existingPid);
                if (stopped) return;
                if (aliveCheck?.alive) {
                  const pollResult = await pollUntilDead(existingPid, Date.now() + timeoutMs);
                  if (pollResult === 'stopped') return;
                  if (pollResult === 'timeout') { _procOk = false; _procError = 'timeout'; }
                }
                if (_procOk === null) {
                  _procOk = await resolveOutputOk();
                  if (!_procOk) _procError = 'output_file_not_found';
                }
                await deleteRenderPid(pidTag);
              } else {
                const spawnRes = await spawnDetachedRender({ command, args: normalizedArgs, cwd, pidTag });
                if (stopped) return;
                if (!spawnRes?.ok || !spawnRes?.detached) {
                  _procOk = false;
                  _procError = spawnRes?.error || 'spawn_failed';
                } else {
                  const pollResult = await pollUntilDead(Number(spawnRes.pid || 0), Date.now() + timeoutMs);
                  if (pollResult === 'stopped') return;
                  if (pollResult === 'timeout') { _procOk = false; _procError = 'timeout'; }
                  if (_procOk === null) {
                    _procOk = await resolveOutputOk();
                    if (!_procOk) _procError = 'output_file_not_found';
                  }
                  await deleteRenderPid(pidTag);
                }
              }

              const procRes = { ok: _procOk === true, stdout: '', stderr: '', error: _procError, timedOut: _procError === 'timeout' };
              if (stopped) return;
              const workerLogPath = String(templateContext.workerlogpath || '').trim();
              let workerLogText = '';
              if (workerLogPath && typeof window !== 'undefined' && window?.electron?.readFileText) {
                try {
                  const loadedText = await window.electron.readFileText(workerLogPath);
                  workerLogText = typeof loadedText === 'string' ? loadedText : '';
                } catch {
                  workerLogText = '';
                }
              }
              const processEventComment = buildWorkerProcessEventComment({
                command,
                args: normalizedArgs,
                procRes,
                workerLogPath,
                workerLogText,
              });
              if (procRes?.ok === true) {
                const finalOutputPath = String(
                  detectedOutputPath || completionOutputPath || `renders/render-${renderId}.mov`
                ).trim();
                completionPayload = {
                  workerKey,
                  success: true,
                  outputPath: finalOutputPath,
                  comment: ['worker_process_done', processEventComment]
                    .filter((part) => String(part || '').trim().length > 0)
                    .join('\n')
                    .slice(0, 12000),
                };
              } else {
                completionPayload = {
                  workerKey,
                  success: false,
                  errorMessage: summarizeProcessFailure(procRes),
                  comment: ['worker_process_fail', processEventComment]
                    .filter((part) => String(part || '').trim().length > 0)
                    .join('\n')
                    .slice(0, 12000),
                };
              }
            }
          } else {
            const requestedDelay = Number(
              execution?.delayMs ??
              execution?.simulateDurationMs ??
              payload?.workerDurationMs ??
              payload?.simulateDurationMs ??
              payload?.delayMs ??
              4000
            );
            const delayMs = Math.min(120000, Math.max(1000, Math.trunc(requestedDelay || 4000)));
            await waitMs(delayMs);
            if (stopped) return;

            const shouldFail =
              execution?.simulateFail === true ||
              payload?.simulateFail === true ||
              payload?.forceFail === true;
            const simulatedOutputPathRaw = String(
              execution?.outputPath ??
              payload?.outputPath ??
              `renders/render-${renderId}.mov`
            ).trim();
            const simulatedOutputCandidates = buildRenderOutputPathCandidates(simulatedOutputPathRaw);
            let simulatedDetectedOutputPath = '';
            for (const candidate of simulatedOutputCandidates) {
              const candidatePath = String(candidate || '').trim();
              if (!candidatePath) continue;
              const fileRes = await checkFileExists(candidatePath);
              if (fileRes?.exists === true) {
                simulatedDetectedOutputPath = candidatePath;
                break;
              }
            }
            const allowMissingOutputArtifact = normalizeBooleanFlag(
              execution?.allowMissingOutputArtifact
                ?? payload?.allowMissingOutputArtifact
                ?? false,
              false
            );
            const simulatedOutputReady = !!simulatedDetectedOutputPath || allowMissingOutputArtifact === true;
            const simulatedSuccess = !shouldFail && simulatedOutputReady;

            completionPayload = simulatedSuccess
              ? {
                workerKey,
                success: true,
                outputPath: simulatedDetectedOutputPath || simulatedOutputPathRaw,
                comment: 'worker_auto_done',
              }
              : {
                workerKey,
                success: false,
                errorMessage: shouldFail
                  ? String(
                    execution?.errorMessage ??
                    payload?.errorMessage ??
                    'worker_simulated_failure'
                  )
                  : 'output_file_not_found',
                comment: shouldFail ? 'worker_auto_fail' : 'worker_auto_missing_output',
              };
          }

          try {
            await postprodCompleteRenderWorkerJob(token, renderId, completionPayload);
            await Promise.all([
              loadPostprodRenders().catch(() => ({})),
              loadPostprodRenderWorkers().catch(() => ({})),
              loadPostprodRenderHealth().catch(() => ({})),
            ]);
            if (isPostprodQueueRuntimeActive()) {
              await Promise.resolve(
                handlePostprodDispatchRenders({ maxJobs: 1, silent: true })
              ).catch(() => ({}));
            }
          } catch (err) {
            if (isPostprodRecoverableOfflineError(err)) {
              const nowIso = new Date().toISOString();
              let pendingCount = 0;
              updatePostprodWorkerCompletionOutbox((current) => {
                const next = normalizePostprodWorkerCompletionOutbox(current);
                const existingIdx = next.findIndex((entry) => (
                  String(entry?.workerKey || '').trim() === workerKey
                  && Number(entry?.renderId || 0) === renderId
                  && (
                    currentUserId == null
                    || entry?.userId == null
                    || Number(entry.userId) === currentUserId
                  )
                ));
                if (existingIdx >= 0) {
                  const attempts = Number(next[existingIdx]?.attempts || 0);
                  next[existingIdx] = {
                    ...next[existingIdx],
                    payload: completionPayload,
                    attempts: Number.isFinite(attempts) ? Math.max(0, Math.trunc(attempts)) + 1 : 1,
                    lastAttemptAt: nowIso,
                    lastError: String(err?.message || err?.code || 'network_error').trim().slice(0, 200),
                  };
                } else {
                  next.push({
                    id: `worker-complete-${workerKey}-${renderId}-${Date.now()}`,
                    kind: 'worker_complete',
                    workerKey,
                    renderId,
                    userId: currentUserId,
                    payload: completionPayload,
                    createdAt: nowIso,
                    attempts: 1,
                    lastAttemptAt: nowIso,
                    lastError: String(err?.message || err?.code || 'network_error').trim().slice(0, 200),
                  });
                }
                pendingCount = next.filter((entry) => (
                  String(entry?.workerKey || '').trim() === workerKey
                  && (
                    currentUserId == null
                    || entry?.userId == null
                    || Number(entry.userId) === currentUserId
                  )
                )).length;
                return next;
              });
              showNotice(t('postprod.renders.msg.workerQueuedOffline', { count: pendingCount }), 'warn');
              loadPostprodRenderHealth().catch(() => ({}));
            }
          }
        }
      } catch {} finally {
        inFlight = false;
        if (!stopped) {
          timer = setTimeout(tick, 5000);
        }
      }
    };

    timer = setTimeout(tick, 2500);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [
    postprodAuthenticated,
    postprodCanLaunchRenders,
    hasLocalUnrealCapability,
    localRenderEnabled,
    postprodAuth.token,
    postprodAuth.user?.id,
    renderWorkerKey,
    postprodWorkerCompletionOutbox,
    replayPostprodWorkerCompletionOutbox,
    updatePostprodWorkerCompletionOutbox,
    loadPostprodRenders,
    loadPostprodRenderWorkers,
    loadPostprodRenderHealth,
    handlePostprodDispatchRenders,
    showNotice,
    t,
  ]);

  // ---- Notifications renderReturnAt (retour de station depuis 'busy') ----
  const renderReturnNotifiedRef = useRef({}); // { `${ip}:${threshold}` -> true }
  useEffect(() => {
    const THRESHOLDS_MIN = [15, 5, 1];
    let stopped = false;
    let timer = null;

    const tick = async () => {
      if (stopped) return;
      try {
        const map = await getOnlineMap();
        const now = Date.now();
        for (const [ip, entry] of Object.entries(map || {})) {
          if (entry?.renderAvailability !== 'busy') continue;
          const rat = entry?.renderReturnAt;
          if (!rat || typeof rat !== 'string') continue;
          const returnMs = Date.parse(rat);
          if (!Number.isFinite(returnMs)) continue;
          const diffMin = (returnMs - now) / 60000;
          if (diffMin < 0) continue; // already past

          const name = String(entry?.name || ip || '').trim() || ip;
          for (const thresh of THRESHOLDS_MIN) {
            if (diffMin <= thresh + 0.5 && diffMin > thresh - 1.5) {
              const key = `${ip}:${thresh}`;
              if (!renderReturnNotifiedRef.current[key]) {
                renderReturnNotifiedRef.current[key] = true;
                const msgKey = thresh === 15
                  ? 'renderReturnAt.notify.15min'
                  : thresh === 5
                    ? 'renderReturnAt.notify.5min'
                    : 'renderReturnAt.notify.1min';
                showNotice(t(msgKey, { name }), 'info');
              }
            }
          }
          // Clear stale notified keys for entries no longer busy
          const stalePrefix = `${ip}:`;
          for (const k of Object.keys(renderReturnNotifiedRef.current)) {
            if (k.startsWith(stalePrefix)) {
              const thresh = Number(k.split(':')[1]);
              const diffMin2 = (returnMs - Date.now()) / 60000;
              if (diffMin2 < thresh - 2) {
                // threshold is safely behind us — allow re-notification next cycle if needed
                delete renderReturnNotifiedRef.current[k];
              }
            }
          }
        }
      } catch {}
      if (!stopped) {
        timer = setTimeout(tick, 60000); // check once per minute
      }
    };

    tick();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [showNotice, t]);

  // Garde un onglet valide quand le rôle change
  useEffect(() => {
    const allowed = getAllowedTabs({
      role,
      appMode,
      clientSyncEnabled,
      resourcesAvailable: resourcesTabAvailable,
      postprodTabs: postprodVisibleTabs,
      postprodCanManageMachines,
      liveAccountTabs,
    });
    if (!allowed.includes(current)) {
      setCurrent(resolveDefaultTab(allowed, appMode));
    }
  }, [role, appMode, current, clientSyncEnabled, resourcesTabAvailable, postprodVisibleTabs, postprodCanManageMachines, liveAccountTabs]);

  useEffect(() => {
    if (appMode !== APP_MODE_POSTPROD || postprodAuthenticated) return;
    if (postprodLockedTabs.includes(current)) {
      const allowed = getAllowedTabs({
        role,
        appMode,
        clientSyncEnabled,
        resourcesAvailable: resourcesTabAvailable,
        postprodTabs: postprodVisibleTabs,
        postprodCanManageMachines,
        liveAccountTabs,
      });
      setCurrent(resolveDefaultTab(allowed, appMode));
    }
  }, [
    appMode,
    postprodAuthenticated,
    postprodLockedTabs,
    current,
    role,
    clientSyncEnabled,
    resourcesTabAvailable,
    postprodVisibleTabs,
    postprodCanManageMachines,
    liveAccountTabs,
  ]);

  useEffect(() => {
    if (appMode !== APP_MODE_POSTPROD) return;
    if (current === "Validations") {
      setCurrent("Rendus");
      return;
    }
    if (current === "Historique") {
      setCurrent("Logs");
    }
  }, [appMode, current]);

  // Côté client : déterminer dès que possible l'onglet par défaut selon syncEnabled (depuis le serveur ou l'unique host)
  useEffect(() => {
    if (role !== "client" || appMode !== APP_MODE_LIVE || showWelcome || showLicense || initialClientNavDone) return;
    let cancelled = false;
    (async () => {
      // On reste sur Setup au démarrage client ; on ne force pas de changement d'onglet si l'utilisateur est déjà sur Setup
      if (current === "Setup") {
        setInitialClientNavDone(true);
        return;
      }
      let sync = (() => {
        try {
          const raw = localStorage.getItem(LS_SYNC_KEY);
          if (raw === 'true') return true;
          if (raw === 'false') return false;
        } catch {}
        return false;
      })();
      try {
        const hosts = await getHosts().catch(() => []);
        const list = Array.isArray(hosts) ? hosts : [];
        const ip = String(safeIdentity.localIp || "").trim().toLowerCase();
        let host =
          list.find(
            (h) =>
              h &&
              String(h.ip || "")
                .trim()
                .toLowerCase() === ip
          ) || null;
        if (!host && list.length === 1) host = list[0];
        if (host) {
          sync =
            typeof host.syncEnabled === "boolean"
              ? host.syncEnabled
              : !!host.syncRoot;
          setClientSyncEnabled(sync);
          try { localStorage.setItem(LS_SYNC_KEY, String(!!sync)); } catch {}
        }
      } catch {
        // on garde sync = false par défaut
      }
      if (!cancelled) {
        setCurrent("Projets");
        setInitialClientNavDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role, appMode, showWelcome, showLicense, initialClientNavDone, safeIdentity.localIp, current]);



  // Émettre périodiquement une présence pour que le serveur détecte les machines actives
  useEffect(() => {
    if (showWelcome || showLicense) return;
    const ip = String(safeIdentity.localIp || '').trim();
    const srvIp = String(safeIdentity.serverIp || '').trim();
    const roleNow = String(safeIdentity.role || '').trim();
    if (!ip) return;
    if (roleNow === 'client' && !srvIp) return; // impossible d'atteindre le serveur

    let stopped = false;
    let timer = null;

    const sendPresence = async () => {
      try {
        await postPresence({ ip, name: ip });
      } catch {
        // échec silencieux, on réessaie au tick suivant
      }
      if (!stopped) {
        timer = setTimeout(sendPresence, 5000);
      }
    };

    sendPresence();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [showWelcome, showLicense, safeIdentity.localIp, safeIdentity.serverIp, safeIdentity.role]);


  const offsetClass = React.useMemo(() => {
    if (role === "server") {
      if (current === "Projets") return "uu-screen-offset-small";
      if (current === "Ressources") return "uu-screen-offset-negative";
      if (current === "Launch Control") return "uu-screen-offset-none";
      if (current === "Synchronisation") return "uu-screen-offset";
    }
    if (role === "client" && ["Projets", "Synchronisation"].includes(current)) {
      return "uu-screen-offset";
    }
    return "";
  }, [role, current]);

  useEffect(() => {
    noticeApi.clearNotice();
  }, [current]);

  const quitDialog = quitDialogOpen ? (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          closeQuitDialog(false);
        }
      }}
    >
      <div
        className="uu-card"
        role="dialog"
        aria-modal="true"
        aria-label={t('production.confirm.title') || 'Confirmation'}
        style={{
          width: 'min(460px, calc(100vw - 32px))',
          padding: '16px'
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ fontWeight: 600, marginBottom: '10px' }}>
          {t('production.confirm.title') || 'Confirmation'}
        </div>
        <div style={{ marginBottom: '14px', lineHeight: 1.35 }}>
          {t('app.quit.confirm.message') || "Voulez-vous quitter l'application ?"}
        </div>
        <div className="uu-row" style={{ justifyContent: 'flex-end', gap: '8px' }}>
          <button
            type="button"
            className="uu-btn"
            onClick={() => closeQuitDialog(false)}
          >
            {t('app.quit.confirm.cancel') || 'Annuler'}
          </button>
          <button
            ref={quitOkBtnRef}
            type="button"
            className="uu-btn prod-toggle-active"
            onClick={() => closeQuitDialog(true)}
          >
            {t('app.quit.confirm.ok') || "Quitter l'application"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  if (!postprodAuth.hydrated) {
    return (
      <>
        <div className="uu-page uu-page-compact">
          <section className="uu-section uu-maxw-420" style={{ margin: '24px auto' }}>
            <div className="uu-msg info">{t('common.loading')}</div>
          </section>
        </div>
        {quitDialog}
      </>
    );
  }

  if (!postprodAuthenticated) {
    return (
      <>
        <AuthGateScreen
          t={t}
          appMode={appMode}
          busy={postprodAuth.busy}
          error={postprodAuth.error}
          onLogin={handlePostprodLogin}
        />
        {quitDialog}
      </>
    );
  }

  // Écran Welcome après authentification
  if (showWelcome) {
    return (
      <NoticeContext.Provider value={noticeContextValue}>
        <>
          <Welcome
            onContinue={handleWelcomeContinue}
            onOpenLicense={() => openLicense('welcome')}
            licenseStatus={licenseStatus}
            appVersion={APP_VERSION}
            modeAccess={postprodModeAccess}
            currentUser={postprodAuth.user}
          />
          {quitDialog}
        </>
      </NoticeContext.Provider>
    );
  }

  if (showLicense || !licenseOk) {
    return (
      <>
        <Suspense fallback={ScreenFallback}>
          <LicenseScreen
            licenseStatus={licenseStatus}
            onRefresh={refreshLicenseStatus}
            onStatusChange={setLicenseStatus}
            onBack={handleLicenseBack}
            onContinue={handleLicenseContinue}
          />
        </Suspense>
        {quitDialog}
      </>
    );
  }

  return (
    <NoticeContext.Provider value={noticeContextValue}>
    <div className="uu-shell">
        <Sidebar
          current={current}
          setCurrent={handleNavClick}
          role={role}
          appMode={appMode}
          t={t}
          clientSyncEnabled={clientSyncEnabled}
          postprodTabs={postprodVisibleTabs}
          postprodCanManageMachines={postprodCanManageMachines}
          liveAccountTabs={liveAccountTabs}
          configMissing={configMissing}
          resourcesAvailable={resourcesTabAvailable}
          postprodLockedTabs={postprodLockedTabs}
          postprodLockedTitle={t('postprod.auth.navLocked')}
          logsAlert={logsNavAlert}
          usersAlert={usersNavAlert}
          rendersAlert={rendersNavAlert}
          postprodUser={postprodAuthenticated ? postprodAuth.user : null}
          onUserClick={() => {
            handleNavClick('Utilisateurs');
            if (postprodCanManageUsers) {
              setPostprodEditUserRequest({ userId: postprodAuth.user?.id, reqKey: Date.now() });
            }
          }}
        />


      <main className="uu-content">
        <header className="uu-topbar">
          <div className="uu-topbar-notice">
            {rendersTopNoticeText ? (
              <span className={`uu-top-notice ${String(rendersNavAlert?.level || 'warn').trim() || 'warn'}`} title={rendersTopNoticeText}>
                {rendersTopNoticeText}
              </span>
            ) : null}
            {noticeApi.notice?.text ? (
              <span className={`uu-top-notice ${noticeApi.notice.type || ''}`}>
                {noticeApi.notice.text}
              </span>
            ) : null}
          </div>
          <div className="ml-auto uu-row uu-align-center uu-row-gap0">
            {postprodAuthenticated ? (
              <>
                <button
                  className="uu-btn-ghost"
                  onClick={handlePostprodLogout}
                  disabled={postprodAuth.busy}
                >
                  {t('postprod.auth.logout')}
                </button>
              </>
            ) : null}
            <button
              className="uu-btn-ghost"
              onClick={() => {
                setShowLicense(false);
                setShowWelcome(true);
              }}
            >
              {t('nav.home')}
            </button>
            <button
              className="uu-btn-ghost"
              onClick={openQuitDialog}
            >
              {t('nav.quit')}
            </button>
          </div>
        </header>

        {/* Rendu des écrans selon rôle */}
        <section className={`uu-screen ${offsetClass}`}>
          {role === "server" && current === "Setup" && (appMode !== APP_MODE_POSTPROD || postprodCanManageMachines) && <SetupScreen />}
          {role === "server" && current === "Configuration" && (
            <Suspense fallback={ScreenFallback}>
              <ConfigurationScreen
                licenseStatus={licenseStatus}
                onCommonUpdated={handleCommonUpdated}
                onNavigate={handleNavClick}
                onLibraryImported={handleLibraryImported}
                onIdentityUpdated={setIdentity}
                onScanDetectedRenders={handlePostprodScanDetectedRenders}
                appMode={appMode}
                canViewResources={postprodCanViewResources}
                canManageProjects={postprodCanEditProjects}
                canLaunchUnrealEditor={liveCanLaunchEditorProjects}
              />
            </Suspense>
          )}
          {role === "server" && appMode === APP_MODE_LIVE && current === "Projets" && (
            <Suspense fallback={ScreenFallback}>
              <ProjectsScreen
                canManageUnrealProjects={liveCanLaunchEditorProjects}
                canEditProjectFields={liveCanEditProjects}
                showProjectActivation={true}
                appMode={appMode}
              />
            </Suspense>
          )}
          {role === "server" && appMode === APP_MODE_LIVE && resourcesTabAvailable && current === "Ressources" && (
            <Suspense fallback={ScreenFallback}>
              <ResourcesScreen refreshKey={resourcesRefreshKey} />
            </Suspense>
          )}
          {role === "server" && appMode === APP_MODE_LIVE && current === "Synchronisation" && (
            <Suspense fallback={ScreenFallback}>
              <SynchronisationScreen />
            </Suspense>
          )}
          {role === "server" && appMode === APP_MODE_LIVE && (
            <div
              style={{ display: current === "Launch Control" ? "block" : "none" }}
              aria-hidden={current !== "Launch Control"}
            >
              <Suspense fallback={ScreenFallback}>
                <LaunchControlScreen
                  isVisible={current === "Launch Control"}
                  canLaunchLiveProjects={liveCanLaunchRuntimeProjects}
                  canLaunchEditorProjects={liveCanLaunchEditorProjects}
                  canEditProjectFields={liveCanEditProjects}
                />
              </Suspense>
            </div>
          )}
          {role === "server" && appMode === APP_MODE_LIVE && current === "Production" && (
            <Suspense fallback={ScreenFallback}>
              <ProductionScreen canManageLayouts={postprodCanManageLayouts} />
            </Suspense>
          )}
          {role === "server" && appMode === APP_MODE_LIVE && current === "Logs" && (
            <Suspense fallback={ScreenFallback}>
              <LogsScreen />
            </Suspense>
          )}
          {role === "server" && appMode === APP_MODE_POSTPROD && postprodAuthenticated && current === "Projets" && (
            <Suspense fallback={ScreenFallback}>
              <ProjectsScreen
                canManageUnrealProjects={postprodCanLaunchProjects}
                canEditProjectFields={postprodCanEditProjects}
                canCreateTasks={postprodCanCreateTasks}
                canBypassPadForTasks={postprodCanBypassPadForTasks}
                showProjectActivation={false}
                appMode={appMode}
                onCreateTaskFromProject={(projectRef) => {
                  const ref = String(projectRef || "").trim();
                  if (!ref) return;
                  handlePostprodOpenRenderEditor({
                    type: "project_create",
                    action: "create",
                    ref,
                  });
                }}
              />
            </Suspense>
          )}
          {role === "server" && appMode === APP_MODE_POSTPROD && postprodAuthenticated && postprodCanAccessResources && current === "Ressources" && (
            <Suspense fallback={ScreenFallback}>
              <ResourcesScreen refreshKey={resourcesRefreshKey} />
            </Suspense>
          )}
          {role === "server" && appMode === APP_MODE_POSTPROD && postprodAuthenticated && current === "Synchronisation" && (
            <Suspense fallback={ScreenFallback}>
              <SynchronisationScreen />
            </Suspense>
          )}
          {role === "server" && appMode === APP_MODE_POSTPROD && (postprodVisibleTabs.includes(current) || current === "Logs" || current === POSTPROD_TAB_USERS) && current !== "Projets" && current !== "Ressources" && current !== "Synchronisation" && (
            <Suspense fallback={ScreenFallback}>
              <PostProductionScreen
                tabKey={appMode === APP_MODE_POSTPROD && current === "Logs" ? "Historique" : current}
                userTabKey={userTabKey}
                roleTabKey={roleTabKey}
                datasTabKey={datasTabKey}
                titleOverride={current === POSTPROD_TAB_USERS ? t('nav.users') : ''}
                hideStubNotice={true}
                t={t}
                isAuthenticated={postprodAuthenticated}
                authBusy={postprodAuth.busy}
                authError={postprodAuth.error}
                onLogin={handlePostprodLogin}
                onLogout={handlePostprodLogout}
                user={postprodAuth.user}
                appLang={lang}
                onChangeAppLanguage={handleSetAppLanguage}
                onNotify={showNotice}
                canManageUsers={postprodCanManageUsers}
                canManageRoles={postprodCanManageRoles}
                canManageRenderTemplates={postprodCanManageRenderTemplates}
                canBanUsers={postprodCanBanUsers}
                canManageProjectPermissions={postprodCanManageProjectPermissions}
                canViewResources={postprodCanAccessResources}
                canCreateTasks={postprodCanCreateTasks}
                canAssignRenderRequests={postprodCanAssignRenderRequests}
                manageableRoles={postprodManageableRoles}
                users={postprodUsers.items}
                usersLoading={postprodUsers.loading}
                usersError={postprodUsers.error}
                roles={postprodRoles.items}
                rolesLoading={postprodRoles.loading}
                rolesError={postprodRoles.error}
                profileSaving={postprodProfile.saving}
                profileError={postprodProfile.error}
                myActivity={postprodMyActivity.activities}
                myActivitySummary={postprodMyActivity.summary}
                myActivityLoading={postprodMyActivity.loading}
                myActivityError={postprodMyActivity.error}
                auditEntries={postprodAudit.entries}
                auditLoading={postprodAudit.loading}
                auditError={postprodAudit.error}
                auditTotal={postprodAudit.total}
                auditPage={postprodAudit.page}
                auditPageSize={postprodAudit.pageSize}
                auditHasMore={postprodAudit.hasMore}
                auditFilters={postprodAudit.filters}
                auditLogStore={postprodAudit.auditLogStore}
                tasks={postprodTasks.items}
                tasksLoading={postprodTasks.loading}
                tasksError={postprodTasks.error}
                taskProjectOptions={postprodTaskCatalog.projects}
                taskResourceOptions={postprodTaskCatalog.resources}
                taskCatalogLoading={postprodTaskCatalog.loading}
                taskCatalogError={postprodTaskCatalog.error}
                projects={postprodProjects.items}
                projectsLoading={postprodProjects.loading}
                projectsError={postprodProjects.error}
                resources={postprodResources.items}
                resourcesLoading={postprodResources.loading}
                resourcesError={postprodResources.error}
                resourcesSource={postprodResources.source}
                resourcesSync={postprodResources.sync}
                renderProjectOptions={postprodRenderProjectCatalog.items}
                renderProjectOptionsLoading={postprodRenderProjectCatalog.loading}
                renderProjectOptionsError={postprodRenderProjectCatalog.error}
                renders={postprodRenders.items}
                rendersLoading={postprodRenders.loading}
                rendersError={postprodRenders.error}
                rendersDetectedScan={postprodRenders.detectedScan}
                renderHealth={postprodRenderHealthView}
                renderHealthLoading={postprodRenderHealth.loading}
                renderHealthError={postprodRenderHealth.error}
                offlineRenderCreateOutboxItems={postprodOfflineOutbox}
                offlineWorkerCompletionOutboxItems={postprodWorkerCompletionOutbox}
                renderHealthAuditMaintenance={postprodRenderHealthAuditMaintenance.data}
                renderHealthAuditMaintenanceLoading={postprodRenderHealthAuditMaintenance.loading}
                renderHealthAuditMaintenanceError={postprodRenderHealthAuditMaintenance.error}
                renderHealthAuditPurgeBusy={postprodRenderHealthAuditMaintenance.purging}
                renderHealthAuditPurgeError={postprodRenderHealthAuditMaintenance.purgeError}
                renderHealthAuditLastPurge={postprodRenderHealthAuditMaintenance.lastPurge}
                renderWorkers={postprodRenderWorkersForUi}
                renderWorkersLoading={postprodRenderWorkers.loading}
                renderWorkersError={postprodRenderWorkers.error}
                renderTemplates={postprodRenderTemplates.items}
                renderTemplatesLoading={postprodRenderTemplates.loading}
                renderTemplatesError={postprodRenderTemplates.error}
                renderForms={postprodRenderForms.items}
                renderFormsLoading={postprodRenderForms.loading}
                renderFormsError={postprodRenderForms.error}
                renderOutputDir={postprodRenderOutputDir}
                renderExportDestinationOptions={postprodRenderExportDestinationOptions}
                onCreateUser={handlePostprodCreateUser}
                onUpdateUser={handlePostprodUpdateUser}
                onDeleteUser={handlePostprodDeleteUser}
                onUpdateUserProjectPermissions={handlePostprodUpdateUserProjectPermissions}
                onLoadUserActivity={handlePostprodLoadUserActivity}
                onLoadUserProjectPermissions={handlePostprodLoadUserProjectPermissions}
                onToggleUserActive={handlePostprodToggleUserActive}
                onRefreshUsers={loadPostprodUsers}
                onCreateRole={handlePostprodCreateRole}
                onUpdateRole={handlePostprodUpdateRole}
                onDeleteRole={handlePostprodDeleteRole}
                onOpenUser={handlePostprodOpenUser}
                onRefreshRoles={loadPostprodRoles}
                onUpdateMe={handlePostprodUpdateMe}
                onRefreshMyActivity={loadPostprodMyActivity}                onRefreshAudit={loadPostprodAudit}
                onRefreshRenderHealthAuditMaintenance={loadPostprodRenderHealthAuditMaintenance}
                onPurgeAudit={postprodCanManageRoles ? handlePostprodPurgeAudit : null}
                onPurgeRenderHealthAudit={handlePostprodPurgeRenderHealthAudit}
                onExportAuditAll={exportPostprodAuditAll}
                onExportAuditAllJson={exportPostprodAuditAllJson}
                onExportAuditAllNdjson={exportPostprodAuditAllNdjson}
                onCreateTask={handlePostprodCreateTask}
                onUpdateTask={handlePostprodUpdateTask}
                onDeleteTask={handlePostprodDeleteTask}
                onTransitionTask={handlePostprodTransitionTask}
                onRefreshTasks={loadPostprodTasks}
                onTaskFormOpenChange={setPostprodTaskFormOpen}
                onUserEditorModeChange={setPostprodUserEditorOpen}
                onRefreshTaskCatalog={loadPostprodTaskCatalog}
                onRefreshProjects={loadPostprodProjects}
                onLoadProjectRenderTemplates={handlePostprodLoadProjectRenderTemplates}
                onLoadProjectUnrealCatalog={handlePostprodLoadProjectUnrealCatalog}
                onLoadProjectWrcFields={handlePostprodLoadProjectWrcFields}
                onSyncProject={handlePostprodSyncProject}
                onLoadProjectDataTables={handlePostprodLoadProjectDataTables}
                onUpsertDataTableRow={handlePostprodUpsertDataTableRow}
                onUpdateDataTable={handlePostprodUpdateDataTable}
                onRefreshResources={loadPostprodResources}
                onReindexResources={handlePostprodReindexResources}
                onLoadResourceDetail={handlePostprodLoadResourceDetail}
                onCreateRenderTemplate={handlePostprodCreateRenderTemplate}
                onUpdateRenderTemplate={handlePostprodUpdateRenderTemplate}
                onDeleteRenderTemplate={handlePostprodDeleteRenderTemplate}
                onCreateRender={handlePostprodCreateRender}
                onReserveRenderId={handlePostprodReserveRenderId}
                onTransitionRender={handlePostprodTransitionRender}
                onLoadRenderTransitions={handlePostprodLoadRenderTransitions}
                onDispatchRenders={handlePostprodDispatchRenders}
                onSaveDispatchPolicy={handlePostprodSaveDispatchPolicy}
                onScheduleRender={handlePostprodScheduleRender}
                onUpdateRenderExportDestinations={handlePostprodUpdateRenderExportDestinations}
                onReorderRenders={handlePostprodReorderRenders}
                onDeleteRender={handlePostprodDeleteRender}
                onGenerateProxy={handlePostprodGenerateRenderProxy}
                onPatchWorkerAptitude={handlePostprodPatchWorkerAptitude}
                onRefreshRenderTemplates={loadPostprodRenderTemplates}
                onRefreshRenderForms={loadPostprodRenderForms}
                onCreateRenderForm={handlePostprodCreateRenderForm}
                onUpdateRenderForm={handlePostprodUpdateRenderForm}
                onDeleteRenderForm={handlePostprodDeleteRenderForm}
                onLoadRenderFormFields={handlePostprodLoadRenderFormFields}
                onReplaceRenderFormFields={handlePostprodReplaceRenderFormFields}
                onRefreshRenders={loadPostprodRenders}
                onScanDetectedRenders={handlePostprodScanDetectedRenders}
                onRefreshRenderHealth={loadPostprodRenderHealth}
                onRefreshRenderWorkers={loadPostprodRenderWorkers}
                renderFocusRequest={postprodRenderEditorRequest}
                onRenderFocusHandled={handlePostprodRenderEditorHandled}
                editUserIdRequest={postprodEditUserRequest}
                onEditUserIdHandled={handlePostprodEditUserHandled}
                onRequestOpenRenderEditor={handlePostprodOpenRenderEditor}
                onPurgeUserActivity={handlePostprodPurgeUserActivity}
                onOpenActivityTarget={handlePostprodOpenActivityTarget}
                onNavigateToProject={handlePostprodNavigateToProject}
                renderFormFocusRequest={postprodRenderFormFocusRequest}
                onRenderFormFocusHandled={handlePostprodRenderFormFocusHandled}
                onNavigateToRenderForm={handlePostprodNavigateToRenderForm}
              />
            </Suspense>
          )}
          {role === "server" && appMode === APP_MODE_LIVE && liveAccountTabs.includes(current) && (
            <Suspense fallback={ScreenFallback}>
              <PostProductionScreen
                tabKey={appMode === APP_MODE_POSTPROD && current === "Logs" ? "Historique" : current}
                userTabKey={userTabKey}
                roleTabKey={roleTabKey}
                datasTabKey={datasTabKey}
                titleOverride={current === POSTPROD_TAB_USERS ? t('nav.users') : ''}
                hideStubNotice={true}
                t={t}
                isAuthenticated={postprodAuthenticated}
                authBusy={postprodAuth.busy}
                authError={postprodAuth.error}
                onLogin={handlePostprodLogin}
                onLogout={handlePostprodLogout}
                user={postprodAuth.user}
                appLang={lang}
                onChangeAppLanguage={handleSetAppLanguage}
                onNotify={showNotice}
                canManageUsers={postprodCanManageUsers}
                canManageRoles={postprodCanManageRoles}
                canManageRenderTemplates={postprodCanManageRenderTemplates}
                canBanUsers={postprodCanBanUsers}
                canManageProjectPermissions={postprodCanManageProjectPermissions}
                canViewResources={postprodCanAccessResources}
                canCreateTasks={postprodCanCreateTasks}
                canAssignRenderRequests={postprodCanAssignRenderRequests}
                manageableRoles={postprodManageableRoles}
                users={postprodUsers.items}
                usersLoading={postprodUsers.loading}
                usersError={postprodUsers.error}
                roles={postprodRoles.items}
                rolesLoading={postprodRoles.loading}
                rolesError={postprodRoles.error}
                profileSaving={postprodProfile.saving}
                profileError={postprodProfile.error}
                myActivity={postprodMyActivity.activities}
                myActivitySummary={postprodMyActivity.summary}
                myActivityLoading={postprodMyActivity.loading}
                myActivityError={postprodMyActivity.error}
                auditEntries={postprodAudit.entries}
                auditLoading={postprodAudit.loading}
                auditError={postprodAudit.error}
                auditTotal={postprodAudit.total}
                auditPage={postprodAudit.page}
                auditPageSize={postprodAudit.pageSize}
                auditHasMore={postprodAudit.hasMore}
                auditFilters={postprodAudit.filters}
                auditLogStore={postprodAudit.auditLogStore}
                tasks={postprodTasks.items}
                tasksLoading={postprodTasks.loading}
                tasksError={postprodTasks.error}
                taskProjectOptions={postprodTaskCatalog.projects}
                taskResourceOptions={postprodTaskCatalog.resources}
                taskCatalogLoading={postprodTaskCatalog.loading}
                taskCatalogError={postprodTaskCatalog.error}
                projects={postprodProjects.items}
                projectsLoading={postprodProjects.loading}
                projectsError={postprodProjects.error}
                resources={postprodResources.items}
                resourcesLoading={postprodResources.loading}
                resourcesError={postprodResources.error}
                resourcesSource={postprodResources.source}
                resourcesSync={postprodResources.sync}
                renderProjectOptions={postprodRenderProjectCatalog.items}
                renderProjectOptionsLoading={postprodRenderProjectCatalog.loading}
                renderProjectOptionsError={postprodRenderProjectCatalog.error}
                renders={postprodRenders.items}
                rendersLoading={postprodRenders.loading}
                rendersError={postprodRenders.error}
                rendersDetectedScan={postprodRenders.detectedScan}
                renderHealth={postprodRenderHealthView}
                renderHealthLoading={postprodRenderHealth.loading}
                renderHealthError={postprodRenderHealth.error}
                offlineRenderCreateOutboxItems={postprodOfflineOutbox}
                offlineWorkerCompletionOutboxItems={postprodWorkerCompletionOutbox}
                renderHealthAuditMaintenance={postprodRenderHealthAuditMaintenance.data}
                renderHealthAuditMaintenanceLoading={postprodRenderHealthAuditMaintenance.loading}
                renderHealthAuditMaintenanceError={postprodRenderHealthAuditMaintenance.error}
                renderHealthAuditPurgeBusy={postprodRenderHealthAuditMaintenance.purging}
                renderHealthAuditPurgeError={postprodRenderHealthAuditMaintenance.purgeError}
                renderHealthAuditLastPurge={postprodRenderHealthAuditMaintenance.lastPurge}
                renderWorkers={postprodRenderWorkersForUi}
                renderWorkersLoading={postprodRenderWorkers.loading}
                renderWorkersError={postprodRenderWorkers.error}
                renderTemplates={postprodRenderTemplates.items}
                renderTemplatesLoading={postprodRenderTemplates.loading}
                renderTemplatesError={postprodRenderTemplates.error}
                renderForms={postprodRenderForms.items}
                renderFormsLoading={postprodRenderForms.loading}
                renderFormsError={postprodRenderForms.error}
                renderOutputDir={postprodRenderOutputDir}
                renderExportDestinationOptions={postprodRenderExportDestinationOptions}
                onCreateUser={handlePostprodCreateUser}
                onUpdateUser={handlePostprodUpdateUser}
                onDeleteUser={handlePostprodDeleteUser}
                onUpdateUserProjectPermissions={handlePostprodUpdateUserProjectPermissions}
                onLoadUserActivity={handlePostprodLoadUserActivity}
                onLoadUserProjectPermissions={handlePostprodLoadUserProjectPermissions}
                onToggleUserActive={handlePostprodToggleUserActive}
                onRefreshUsers={loadPostprodUsers}
                onCreateRole={handlePostprodCreateRole}
                onUpdateRole={handlePostprodUpdateRole}
                onDeleteRole={handlePostprodDeleteRole}
                onOpenUser={handlePostprodOpenUser}
                onRefreshRoles={loadPostprodRoles}
                onUpdateMe={handlePostprodUpdateMe}
                onRefreshMyActivity={loadPostprodMyActivity}                onRefreshAudit={loadPostprodAudit}
                onRefreshRenderHealthAuditMaintenance={loadPostprodRenderHealthAuditMaintenance}
                onPurgeAudit={postprodCanManageRoles ? handlePostprodPurgeAudit : null}
                onPurgeRenderHealthAudit={handlePostprodPurgeRenderHealthAudit}
                onExportAuditAll={exportPostprodAuditAll}
                onExportAuditAllJson={exportPostprodAuditAllJson}
                onExportAuditAllNdjson={exportPostprodAuditAllNdjson}
                onCreateTask={handlePostprodCreateTask}
                onUpdateTask={handlePostprodUpdateTask}
                onDeleteTask={handlePostprodDeleteTask}
                onTransitionTask={handlePostprodTransitionTask}
                onRefreshTasks={loadPostprodTasks}
                onTaskFormOpenChange={setPostprodTaskFormOpen}
                onUserEditorModeChange={setPostprodUserEditorOpen}
                onRefreshTaskCatalog={loadPostprodTaskCatalog}
                onRefreshProjects={loadPostprodProjects}
                onLoadProjectRenderTemplates={handlePostprodLoadProjectRenderTemplates}
                onLoadProjectUnrealCatalog={handlePostprodLoadProjectUnrealCatalog}
                onLoadProjectWrcFields={handlePostprodLoadProjectWrcFields}
                onSyncProject={handlePostprodSyncProject}
                onLoadProjectDataTables={handlePostprodLoadProjectDataTables}
                onUpsertDataTableRow={handlePostprodUpsertDataTableRow}
                onUpdateDataTable={handlePostprodUpdateDataTable}
                onRefreshResources={loadPostprodResources}
                onReindexResources={handlePostprodReindexResources}
                onLoadResourceDetail={handlePostprodLoadResourceDetail}
                onCreateRenderTemplate={handlePostprodCreateRenderTemplate}
                onUpdateRenderTemplate={handlePostprodUpdateRenderTemplate}
                onDeleteRenderTemplate={handlePostprodDeleteRenderTemplate}
                onCreateRender={handlePostprodCreateRender}
                onReserveRenderId={handlePostprodReserveRenderId}
                onTransitionRender={handlePostprodTransitionRender}
                onLoadRenderTransitions={handlePostprodLoadRenderTransitions}
                onDispatchRenders={handlePostprodDispatchRenders}
                onSaveDispatchPolicy={handlePostprodSaveDispatchPolicy}
                onScheduleRender={handlePostprodScheduleRender}
                onUpdateRenderExportDestinations={handlePostprodUpdateRenderExportDestinations}
                onReorderRenders={handlePostprodReorderRenders}
                onDeleteRender={handlePostprodDeleteRender}
                onGenerateProxy={handlePostprodGenerateRenderProxy}
                onPatchWorkerAptitude={handlePostprodPatchWorkerAptitude}
                onRefreshRenderTemplates={loadPostprodRenderTemplates}
                onRefreshRenderForms={loadPostprodRenderForms}
                onCreateRenderForm={handlePostprodCreateRenderForm}
                onUpdateRenderForm={handlePostprodUpdateRenderForm}
                onDeleteRenderForm={handlePostprodDeleteRenderForm}
                onLoadRenderFormFields={handlePostprodLoadRenderFormFields}
                onReplaceRenderFormFields={handlePostprodReplaceRenderFormFields}
                onRefreshRenders={loadPostprodRenders}
                onScanDetectedRenders={handlePostprodScanDetectedRenders}
                onRefreshRenderHealth={loadPostprodRenderHealth}
                onRefreshRenderWorkers={loadPostprodRenderWorkers}
                renderFocusRequest={postprodRenderEditorRequest}
                onRenderFocusHandled={handlePostprodRenderEditorHandled}
                editUserIdRequest={postprodEditUserRequest}
                onEditUserIdHandled={handlePostprodEditUserHandled}
                onRequestOpenRenderEditor={handlePostprodOpenRenderEditor}
                onPurgeUserActivity={handlePostprodPurgeUserActivity}
                onOpenActivityTarget={handlePostprodOpenActivityTarget}
                onNavigateToProject={handlePostprodNavigateToProject}
                renderFormFocusRequest={postprodRenderFormFocusRequest}
                onRenderFormFocusHandled={handlePostprodRenderFormFocusHandled}
                onNavigateToRenderForm={handlePostprodNavigateToRenderForm}
              />
            </Suspense>
          )}

          {role === "client" && current === "Setup" && (appMode !== APP_MODE_POSTPROD || postprodCanManageMachines) && (
            <SetupScreen
              clientSyncEnabled={clientSyncEnabled}
              onClientSyncChange={setClientSyncEnabled}
            />
          )}
          {role === "client" && appMode === APP_MODE_LIVE && current === "Projets" && (
            <Suspense fallback={ScreenFallback}>
              <ProjectsScreen showProjectActivation={true} appMode={appMode} />
            </Suspense>
          )}
          {role === "client" && appMode === APP_MODE_LIVE && current === "Synchronisation" && (
            <Suspense fallback={ScreenFallback}>
              <SynchronisationScreen />
            </Suspense>
          )}
          {role === "client" && appMode === APP_MODE_LIVE && current === "Logs" && (
            <Suspense fallback={ScreenFallback}>
              <LogsScreen />
            </Suspense>
          )}
          {role === "client" && appMode === APP_MODE_POSTPROD && postprodAuthenticated && current === "Synchronisation" && (
            <Suspense fallback={ScreenFallback}>
              <SynchronisationScreen />
            </Suspense>
          )}
          {role === "client" && appMode === APP_MODE_POSTPROD && (postprodVisibleTabs.includes(current) || current === "Logs" || current === POSTPROD_TAB_USERS) && current !== "Synchronisation" && (
            <Suspense fallback={ScreenFallback}>
              <PostProductionScreen
                tabKey={appMode === APP_MODE_POSTPROD && current === "Logs" ? "Historique" : current}
                userTabKey={userTabKey}
                roleTabKey={roleTabKey}
                datasTabKey={datasTabKey}
                hideStubNotice={true}
                t={t}
                isAuthenticated={postprodAuthenticated}
                authBusy={postprodAuth.busy}
                authError={postprodAuth.error}
                onLogin={handlePostprodLogin}
                onLogout={handlePostprodLogout}
                user={postprodAuth.user}
                appLang={lang}
                onChangeAppLanguage={handleSetAppLanguage}
                onNotify={showNotice}
                canManageUsers={postprodCanManageUsers}
                canManageRoles={postprodCanManageRoles}
                canManageRenderTemplates={postprodCanManageRenderTemplates}
                canBanUsers={postprodCanBanUsers}
                canManageProjectPermissions={postprodCanManageProjectPermissions}
                manageableRoles={postprodManageableRoles}
                users={postprodUsers.items}
                usersLoading={postprodUsers.loading}
                usersError={postprodUsers.error}
                roles={postprodRoles.items}
                rolesLoading={postprodRoles.loading}
                rolesError={postprodRoles.error}
                profileSaving={postprodProfile.saving}
                profileError={postprodProfile.error}
                myActivity={postprodMyActivity.activities}
                myActivitySummary={postprodMyActivity.summary}
                myActivityLoading={postprodMyActivity.loading}
                myActivityError={postprodMyActivity.error}
                auditEntries={postprodAudit.entries}
                auditLoading={postprodAudit.loading}
                auditError={postprodAudit.error}
                auditTotal={postprodAudit.total}
                auditPage={postprodAudit.page}
                auditPageSize={postprodAudit.pageSize}
                auditHasMore={postprodAudit.hasMore}
                auditFilters={postprodAudit.filters}
                auditLogStore={postprodAudit.auditLogStore}
                tasks={postprodTasks.items}
                tasksLoading={postprodTasks.loading}
                tasksError={postprodTasks.error}
                taskProjectOptions={postprodTaskCatalog.projects}
                taskResourceOptions={postprodTaskCatalog.resources}
                taskCatalogLoading={postprodTaskCatalog.loading}
                taskCatalogError={postprodTaskCatalog.error}
                projects={postprodProjects.items}
                projectsLoading={postprodProjects.loading}
                projectsError={postprodProjects.error}
                resources={postprodResources.items}
                resourcesLoading={postprodResources.loading}
                resourcesError={postprodResources.error}
                resourcesSource={postprodResources.source}
                resourcesSync={postprodResources.sync}
                renderProjectOptions={postprodRenderProjectCatalog.items}
                renderProjectOptionsLoading={postprodRenderProjectCatalog.loading}
                renderProjectOptionsError={postprodRenderProjectCatalog.error}
                renders={postprodRenders.items}
                rendersLoading={postprodRenders.loading}
                rendersError={postprodRenders.error}
                rendersDetectedScan={postprodRenders.detectedScan}
                renderHealth={postprodRenderHealthView}
                renderHealthLoading={postprodRenderHealth.loading}
                renderHealthError={postprodRenderHealth.error}
                offlineRenderCreateOutboxItems={postprodOfflineOutbox}
                offlineWorkerCompletionOutboxItems={postprodWorkerCompletionOutbox}
                renderHealthAuditMaintenance={postprodRenderHealthAuditMaintenance.data}
                renderHealthAuditMaintenanceLoading={postprodRenderHealthAuditMaintenance.loading}
                renderHealthAuditMaintenanceError={postprodRenderHealthAuditMaintenance.error}
                renderHealthAuditPurgeBusy={postprodRenderHealthAuditMaintenance.purging}
                renderHealthAuditPurgeError={postprodRenderHealthAuditMaintenance.purgeError}
                renderHealthAuditLastPurge={postprodRenderHealthAuditMaintenance.lastPurge}
                renderWorkers={postprodRenderWorkersForUi}
                renderWorkersLoading={postprodRenderWorkers.loading}
                renderWorkersError={postprodRenderWorkers.error}
                renderTemplates={postprodRenderTemplates.items}
                renderTemplatesLoading={postprodRenderTemplates.loading}
                renderTemplatesError={postprodRenderTemplates.error}
                renderForms={postprodRenderForms.items}
                renderFormsLoading={postprodRenderForms.loading}
                renderFormsError={postprodRenderForms.error}
                renderOutputDir={postprodRenderOutputDir}
                renderExportDestinationOptions={postprodRenderExportDestinationOptions}
                onCreateUser={handlePostprodCreateUser}
                onUpdateUser={handlePostprodUpdateUser}
                onDeleteUser={handlePostprodDeleteUser}
                onUpdateUserProjectPermissions={handlePostprodUpdateUserProjectPermissions}
                onLoadUserActivity={handlePostprodLoadUserActivity}
                onLoadUserProjectPermissions={handlePostprodLoadUserProjectPermissions}
                onToggleUserActive={handlePostprodToggleUserActive}
                onRefreshUsers={loadPostprodUsers}
                onCreateRole={handlePostprodCreateRole}
                onUpdateRole={handlePostprodUpdateRole}
                onDeleteRole={handlePostprodDeleteRole}
                onOpenUser={handlePostprodOpenUser}
                onRefreshRoles={loadPostprodRoles}
                onUpdateMe={handlePostprodUpdateMe}
                onRefreshMyActivity={loadPostprodMyActivity}                onRefreshAudit={loadPostprodAudit}
                onRefreshRenderHealthAuditMaintenance={loadPostprodRenderHealthAuditMaintenance}
                onPurgeAudit={postprodCanManageRoles ? handlePostprodPurgeAudit : null}
                onPurgeRenderHealthAudit={handlePostprodPurgeRenderHealthAudit}
                onExportAuditAll={exportPostprodAuditAll}
                onExportAuditAllJson={exportPostprodAuditAllJson}
                onExportAuditAllNdjson={exportPostprodAuditAllNdjson}
                onCreateTask={handlePostprodCreateTask}
                onUpdateTask={handlePostprodUpdateTask}
                onDeleteTask={handlePostprodDeleteTask}
                onTransitionTask={handlePostprodTransitionTask}
                onRefreshTasks={loadPostprodTasks}
                onTaskFormOpenChange={setPostprodTaskFormOpen}
                onUserEditorModeChange={setPostprodUserEditorOpen}
                onRefreshTaskCatalog={loadPostprodTaskCatalog}
                onRefreshProjects={loadPostprodProjects}
                onLoadProjectRenderTemplates={handlePostprodLoadProjectRenderTemplates}
                onLoadProjectUnrealCatalog={handlePostprodLoadProjectUnrealCatalog}
                onLoadProjectWrcFields={handlePostprodLoadProjectWrcFields}
                onSyncProject={handlePostprodSyncProject}
                onLoadProjectDataTables={handlePostprodLoadProjectDataTables}
                onUpsertDataTableRow={handlePostprodUpsertDataTableRow}
                onUpdateDataTable={handlePostprodUpdateDataTable}
                onRefreshResources={loadPostprodResources}
                onReindexResources={handlePostprodReindexResources}
                onLoadResourceDetail={handlePostprodLoadResourceDetail}
                onCreateRenderTemplate={handlePostprodCreateRenderTemplate}
                onUpdateRenderTemplate={handlePostprodUpdateRenderTemplate}
                onDeleteRenderTemplate={handlePostprodDeleteRenderTemplate}
                onCreateRender={handlePostprodCreateRender}
                onReserveRenderId={handlePostprodReserveRenderId}
                onTransitionRender={handlePostprodTransitionRender}
                onLoadRenderTransitions={handlePostprodLoadRenderTransitions}
                onDispatchRenders={handlePostprodDispatchRenders}
                onSaveDispatchPolicy={handlePostprodSaveDispatchPolicy}
                onScheduleRender={handlePostprodScheduleRender}
                onUpdateRenderExportDestinations={handlePostprodUpdateRenderExportDestinations}
                onReorderRenders={handlePostprodReorderRenders}
                onDeleteRender={handlePostprodDeleteRender}
                onGenerateProxy={handlePostprodGenerateRenderProxy}
                onPatchWorkerAptitude={handlePostprodPatchWorkerAptitude}
                onRefreshRenderTemplates={loadPostprodRenderTemplates}
                onRefreshRenderForms={loadPostprodRenderForms}
                onCreateRenderForm={handlePostprodCreateRenderForm}
                onUpdateRenderForm={handlePostprodUpdateRenderForm}
                onDeleteRenderForm={handlePostprodDeleteRenderForm}
                onLoadRenderFormFields={handlePostprodLoadRenderFormFields}
                onReplaceRenderFormFields={handlePostprodReplaceRenderFormFields}
                onRefreshRenders={loadPostprodRenders}
                onScanDetectedRenders={handlePostprodScanDetectedRenders}
                onRefreshRenderHealth={loadPostprodRenderHealth}
                onRefreshRenderWorkers={loadPostprodRenderWorkers}
                renderFocusRequest={postprodRenderEditorRequest}
                onRenderFocusHandled={handlePostprodRenderEditorHandled}
                editUserIdRequest={postprodEditUserRequest}
                onEditUserIdHandled={handlePostprodEditUserHandled}
                onRequestOpenRenderEditor={handlePostprodOpenRenderEditor}
                onPurgeUserActivity={handlePostprodPurgeUserActivity}
                onOpenActivityTarget={handlePostprodOpenActivityTarget}
                onNavigateToProject={handlePostprodNavigateToProject}
                renderFormFocusRequest={postprodRenderFormFocusRequest}
                onRenderFormFocusHandled={handlePostprodRenderFormFocusHandled}
                onNavigateToRenderForm={handlePostprodNavigateToRenderForm}
              />
            </Suspense>
          )}
          {role === "client" && appMode === APP_MODE_LIVE && liveAccountTabs.includes(current) && (
            <Suspense fallback={ScreenFallback}>
              <PostProductionScreen
                tabKey={appMode === APP_MODE_POSTPROD && current === "Logs" ? "Historique" : current}
                userTabKey={userTabKey}
                roleTabKey={roleTabKey}
                datasTabKey={datasTabKey}
                hideStubNotice={true}
                t={t}
                isAuthenticated={postprodAuthenticated}
                authBusy={postprodAuth.busy}
                authError={postprodAuth.error}
                onLogin={handlePostprodLogin}
                onLogout={handlePostprodLogout}
                user={postprodAuth.user}
                appLang={lang}
                onChangeAppLanguage={handleSetAppLanguage}
                onNotify={showNotice}
                canManageUsers={postprodCanManageUsers}
                canManageRoles={postprodCanManageRoles}
                canManageRenderTemplates={postprodCanManageRenderTemplates}
                canBanUsers={postprodCanBanUsers}
                canManageProjectPermissions={postprodCanManageProjectPermissions}
                manageableRoles={postprodManageableRoles}
                users={postprodUsers.items}
                usersLoading={postprodUsers.loading}
                usersError={postprodUsers.error}
                roles={postprodRoles.items}
                rolesLoading={postprodRoles.loading}
                rolesError={postprodRoles.error}
                profileSaving={postprodProfile.saving}
                profileError={postprodProfile.error}
                myActivity={postprodMyActivity.activities}
                myActivitySummary={postprodMyActivity.summary}
                myActivityLoading={postprodMyActivity.loading}
                myActivityError={postprodMyActivity.error}
                auditEntries={postprodAudit.entries}
                auditLoading={postprodAudit.loading}
                auditError={postprodAudit.error}
                auditTotal={postprodAudit.total}
                auditPage={postprodAudit.page}
                auditPageSize={postprodAudit.pageSize}
                auditHasMore={postprodAudit.hasMore}
                auditFilters={postprodAudit.filters}
                auditLogStore={postprodAudit.auditLogStore}
                tasks={postprodTasks.items}
                tasksLoading={postprodTasks.loading}
                tasksError={postprodTasks.error}
                taskProjectOptions={postprodTaskCatalog.projects}
                taskResourceOptions={postprodTaskCatalog.resources}
                taskCatalogLoading={postprodTaskCatalog.loading}
                taskCatalogError={postprodTaskCatalog.error}
                projects={postprodProjects.items}
                projectsLoading={postprodProjects.loading}
                projectsError={postprodProjects.error}
                resources={postprodResources.items}
                resourcesLoading={postprodResources.loading}
                resourcesError={postprodResources.error}
                resourcesSource={postprodResources.source}
                resourcesSync={postprodResources.sync}
                renderProjectOptions={postprodRenderProjectCatalog.items}
                renderProjectOptionsLoading={postprodRenderProjectCatalog.loading}
                renderProjectOptionsError={postprodRenderProjectCatalog.error}
                renders={postprodRenders.items}
                rendersLoading={postprodRenders.loading}
                rendersError={postprodRenders.error}
                rendersDetectedScan={postprodRenders.detectedScan}
                renderHealth={postprodRenderHealthView}
                renderHealthLoading={postprodRenderHealth.loading}
                renderHealthError={postprodRenderHealth.error}
                offlineRenderCreateOutboxItems={postprodOfflineOutbox}
                offlineWorkerCompletionOutboxItems={postprodWorkerCompletionOutbox}
                renderHealthAuditMaintenance={postprodRenderHealthAuditMaintenance.data}
                renderHealthAuditMaintenanceLoading={postprodRenderHealthAuditMaintenance.loading}
                renderHealthAuditMaintenanceError={postprodRenderHealthAuditMaintenance.error}
                renderHealthAuditPurgeBusy={postprodRenderHealthAuditMaintenance.purging}
                renderHealthAuditPurgeError={postprodRenderHealthAuditMaintenance.purgeError}
                renderHealthAuditLastPurge={postprodRenderHealthAuditMaintenance.lastPurge}
                renderWorkers={postprodRenderWorkersForUi}
                renderWorkersLoading={postprodRenderWorkers.loading}
                renderWorkersError={postprodRenderWorkers.error}
                renderTemplates={postprodRenderTemplates.items}
                renderTemplatesLoading={postprodRenderTemplates.loading}
                renderTemplatesError={postprodRenderTemplates.error}
                renderForms={postprodRenderForms.items}
                renderFormsLoading={postprodRenderForms.loading}
                renderFormsError={postprodRenderForms.error}
                renderOutputDir={postprodRenderOutputDir}
                renderExportDestinationOptions={postprodRenderExportDestinationOptions}
                onCreateUser={handlePostprodCreateUser}
                onUpdateUser={handlePostprodUpdateUser}
                onDeleteUser={handlePostprodDeleteUser}
                onUpdateUserProjectPermissions={handlePostprodUpdateUserProjectPermissions}
                onLoadUserActivity={handlePostprodLoadUserActivity}
                onLoadUserProjectPermissions={handlePostprodLoadUserProjectPermissions}
                onToggleUserActive={handlePostprodToggleUserActive}
                onRefreshUsers={loadPostprodUsers}
                onCreateRole={handlePostprodCreateRole}
                onUpdateRole={handlePostprodUpdateRole}
                onDeleteRole={handlePostprodDeleteRole}
                onOpenUser={handlePostprodOpenUser}
                onRefreshRoles={loadPostprodRoles}
                onUpdateMe={handlePostprodUpdateMe}
                onRefreshMyActivity={loadPostprodMyActivity}                onRefreshAudit={loadPostprodAudit}
                onRefreshRenderHealthAuditMaintenance={loadPostprodRenderHealthAuditMaintenance}
                onPurgeAudit={postprodCanManageRoles ? handlePostprodPurgeAudit : null}
                onPurgeRenderHealthAudit={handlePostprodPurgeRenderHealthAudit}
                onExportAuditAll={exportPostprodAuditAll}
                onExportAuditAllJson={exportPostprodAuditAllJson}
                onExportAuditAllNdjson={exportPostprodAuditAllNdjson}
                onCreateTask={handlePostprodCreateTask}
                onUpdateTask={handlePostprodUpdateTask}
                onDeleteTask={handlePostprodDeleteTask}
                onTransitionTask={handlePostprodTransitionTask}
                onRefreshTasks={loadPostprodTasks}
                onTaskFormOpenChange={setPostprodTaskFormOpen}
                onUserEditorModeChange={setPostprodUserEditorOpen}
                onRefreshTaskCatalog={loadPostprodTaskCatalog}
                onRefreshProjects={loadPostprodProjects}
                onLoadProjectRenderTemplates={handlePostprodLoadProjectRenderTemplates}
                onLoadProjectUnrealCatalog={handlePostprodLoadProjectUnrealCatalog}
                onLoadProjectWrcFields={handlePostprodLoadProjectWrcFields}
                onSyncProject={handlePostprodSyncProject}
                onLoadProjectDataTables={handlePostprodLoadProjectDataTables}
                onUpsertDataTableRow={handlePostprodUpsertDataTableRow}
                onUpdateDataTable={handlePostprodUpdateDataTable}
                onRefreshResources={loadPostprodResources}
                onReindexResources={handlePostprodReindexResources}
                onLoadResourceDetail={handlePostprodLoadResourceDetail}
                onCreateRenderTemplate={handlePostprodCreateRenderTemplate}
                onUpdateRenderTemplate={handlePostprodUpdateRenderTemplate}
                onDeleteRenderTemplate={handlePostprodDeleteRenderTemplate}
                onCreateRender={handlePostprodCreateRender}
                onReserveRenderId={handlePostprodReserveRenderId}
                onTransitionRender={handlePostprodTransitionRender}
                onLoadRenderTransitions={handlePostprodLoadRenderTransitions}
                onDispatchRenders={handlePostprodDispatchRenders}
                onSaveDispatchPolicy={handlePostprodSaveDispatchPolicy}
                onScheduleRender={handlePostprodScheduleRender}
                onUpdateRenderExportDestinations={handlePostprodUpdateRenderExportDestinations}
                onReorderRenders={handlePostprodReorderRenders}
                onDeleteRender={handlePostprodDeleteRender}
                onGenerateProxy={handlePostprodGenerateRenderProxy}
                onPatchWorkerAptitude={handlePostprodPatchWorkerAptitude}
                onRefreshRenderTemplates={loadPostprodRenderTemplates}
                onRefreshRenderForms={loadPostprodRenderForms}
                onCreateRenderForm={handlePostprodCreateRenderForm}
                onUpdateRenderForm={handlePostprodUpdateRenderForm}
                onDeleteRenderForm={handlePostprodDeleteRenderForm}
                onLoadRenderFormFields={handlePostprodLoadRenderFormFields}
                onReplaceRenderFormFields={handlePostprodReplaceRenderFormFields}
                onRefreshRenders={loadPostprodRenders}
                onScanDetectedRenders={handlePostprodScanDetectedRenders}
                onRefreshRenderHealth={loadPostprodRenderHealth}
                onRefreshRenderWorkers={loadPostprodRenderWorkers}
                renderFocusRequest={postprodRenderEditorRequest}
                onRenderFocusHandled={handlePostprodRenderEditorHandled}
                editUserIdRequest={postprodEditUserRequest}
                onEditUserIdHandled={handlePostprodEditUserHandled}
                onRequestOpenRenderEditor={handlePostprodOpenRenderEditor}
                onPurgeUserActivity={handlePostprodPurgeUserActivity}
                onOpenActivityTarget={handlePostprodOpenActivityTarget}
                onNavigateToProject={handlePostprodNavigateToProject}
                renderFormFocusRequest={postprodRenderFormFocusRequest}
                onRenderFormFocusHandled={handlePostprodRenderFormFocusHandled}
                onNavigateToRenderForm={handlePostprodNavigateToRenderForm}
              />
            </Suspense>
          )}
        </section>

        {aptitudeCheckPending && (
          <AptitudeCheckModal
            t={t}
            workerDisplayName={aptitudeCheckPending.workerDisplayName}
            onConfirm={handleAptitudeConfirm}
            onCancel={handleAptitudeCancel}
          />
        )}

        {queuePausedLaunchPending && (
          <AptitudeCheckModal
            t={t}
            title={t("postprod.renders.queuePause.modalTitle")}
            body={t("postprod.renders.queuePause.modalBody")}
            confirmLabel={t("postprod.renders.queuePause.confirm")}
            cancelLabel={t("postprod.renders.queuePause.cancel")}
            onConfirm={handleQueuePausedLaunchConfirm}
            onCancel={handleQueuePausedLaunchContinue}
          />
        )}

        {busyImmediateLaunchPending && (
          <AptitudeCheckModal
            t={t}
            workerDisplayName={busyImmediateLaunchPending.workerDisplayName}
            title={"Station occupée"}
            body={"La station est actuellement occupée. Voulez-vous la passer en disponible et lancer le rendu immédiat, ou patienter ?"}
            confirmLabel={"Passer en disponible et lancer"}
            cancelLabel={"Patienter"}
            onConfirm={handleBusyImmediateLaunchConfirm}
            onCancel={handleBusyImmediateLaunchCancel}
          />
        )}

        {quitDialog}
      </main>
    </div>
    </NoticeContext.Provider>
  );
}

/* --------------------- Rendu racine --------------------- */
const root = createRoot(document.getElementById("root"));
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
