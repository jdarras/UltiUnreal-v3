import { useMemo } from "react";
import { safeT } from "./shared/helpers";
import { buildTaskAutoRenderStateByTaskId, resolveTaskVisualStatus } from "./renderEditor/helpers";
import { resolveAutoRenderConfig } from "./shared/autoRenderHelpers";
import { useRendersCardController } from "./renders/hooks/useRendersCardController";
import { RenderDetailModal } from "./renders/components/RenderDetailModal";
import { RenderRejectDialog } from "./renders/components/RenderRejectDialog";
import { RendersAssignmentsPanel } from "./renders/components/RendersAssignmentsPanel";
import { RendersListPanel } from "./renders/components/RendersListPanel";
import { RendersQueuePanel } from "./renders/components/RendersQueuePanel";
import { RendersAdvancedSearchPanel, RendersToolbar } from "./renders/components/RendersToolbar";

function normalizeProjectLookupKey(value = "") {
  return String(value || "").trim().toLowerCase();
}

function normalizeProjectNumericKey(value = "") {
  const raw = String(value || "").trim();
  if (!raw || !/^\d+$/.test(raw)) return "";
  return String(Math.trunc(Number(raw)));
}

function buildProjectLabelByRef(projects = []) {
  const map = new Map();
  const list = Array.isArray(projects) ? projects : [];

  const register = (rawKey = "", label = "") => {
    const key = normalizeProjectLookupKey(rawKey);
    const projectLabel = String(label || "").trim();
    if (!key || !projectLabel || map.has(key)) return;
    map.set(key, projectLabel);
  };

  for (const project of list) {
    const projectId = String(project?.id || "").trim();
    const projectRef = String(project?.ref || projectId || "").trim();
    const projectName = String(project?.name || "").trim();
    const projectLabel = projectName || projectId || projectRef;
    if (!projectLabel) continue;
    register(projectRef, projectLabel);
    register(projectId, projectLabel);
    register(normalizeProjectNumericKey(projectRef), projectLabel);
    register(normalizeProjectNumericKey(projectId), projectLabel);
  }

  return map;
}

function toPositiveInt(value = 0) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 0;
}

function normalizeIdentityToken(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function firstNonEmptyString(values = []) {
  const list = Array.isArray(values) ? values : [];
  for (const value of list) {
    const normalized = String(value || "").trim();
    if (normalized) return normalized;
  }
  return "";
}

function normalizeTimestamp(value = "") {
  const parsed = Date.parse(String(value || "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function isAssignmentDraftTask(task = null) {
  const autoRenderConfig = resolveAutoRenderConfig(task) || {};
  const raw = autoRenderConfig?.assignmentDraft;
  if (raw === true) return true;
  return String(raw || "").trim().toLowerCase() === "true";
}

function isPendingRenderCreationTask(task = null, linkedRender = null) {
  if (linkedRender) return false;
  const status = String(task?.status || "").trim().toLowerCase();
  const closedStatuses = new Set([
    "a valider",
    "à valider",
    "validee",
    "rejetee",
  ]);
  if (closedStatuses.has(status)) return false;
  if (isAssignmentDraftTask(task)) return true;
  return true;
}

function resolveTaskAssignee(task = null) {
  const id = toPositiveInt(task?.assigneeUserId || task?.assignee_user_id || task?.assigneeId || 0);
  const username = firstNonEmptyString([
    task?.assigneeUsername,
    task?.assignee_username,
  ]);
  const displayName = firstNonEmptyString([
    task?.assigneeDisplayName,
    task?.assignee_display_name,
    task?.assigneeName,
    task?.assignee_name,
  ]);
  const firstName = String(task?.assigneeFirstName || task?.assignee_first_name || "").trim();
  const lastName = String(task?.assigneeLastName || task?.assignee_last_name || "").trim();
  const fullName = `${firstName} ${lastName}`.trim();
  const label = firstNonEmptyString([fullName, displayName, username, id > 0 ? String(id) : ""]);
  return {
    id,
    label,
    usernameToken: normalizeIdentityToken(username),
    displayToken: normalizeIdentityToken(label),
  };
}

function resolveTaskRequester(task = null) {
  const id = toPositiveInt(
    task?.reporterUserId
    || task?.reporter_user_id
    || task?.requestedByUserId
    || task?.requested_by_user_id
    || task?.createdByUserId
    || task?.created_by_user_id
    || 0
  );
  const username = firstNonEmptyString([
    task?.reporterUsername,
    task?.reporter_username,
    task?.requestedByUsername,
    task?.requested_by_username,
    task?.createdByUsername,
    task?.created_by_username,
  ]);
  const displayName = firstNonEmptyString([
    task?.reporterDisplayName,
    task?.reporter_display_name,
    task?.requestedByDisplayName,
    task?.requested_by_display_name,
    task?.createdByDisplayName,
    task?.created_by_display_name,
    task?.requestedBy,
  ]);
  const firstName = firstNonEmptyString([
    task?.reporterFirstName,
    task?.reporter_first_name,
    task?.requestedByFirstName,
    task?.requested_by_first_name,
    task?.createdByFirstName,
    task?.created_by_first_name,
  ]);
  const lastName = firstNonEmptyString([
    task?.reporterLastName,
    task?.reporter_last_name,
    task?.requestedByLastName,
    task?.requested_by_last_name,
    task?.createdByLastName,
    task?.created_by_last_name,
  ]);
  const fullName = `${firstName} ${lastName}`.trim();
  const label = firstNonEmptyString([fullName, displayName, username, id > 0 ? String(id) : ""]);
  return {
    id,
    label,
    usernameToken: normalizeIdentityToken(username),
    displayToken: normalizeIdentityToken(label),
  };
}

function resolveCurrentUserIdentity(user = null) {
  const id = toPositiveInt(user?.id || 0);
  const username = String(user?.username || "").trim();
  const displayName = String(user?.displayName || "").trim();
  const firstName = String(user?.firstName || user?.first_name || "").trim();
  const lastName = String(user?.lastName || user?.last_name || "").trim();
  const fullName = `${firstName} ${lastName}`.trim();
  const label = firstNonEmptyString([fullName, displayName, username, id > 0 ? String(id) : ""]);
  return {
    id,
    usernameToken: normalizeIdentityToken(username),
    displayToken: normalizeIdentityToken(label),
  };
}

function matchesUserIdentity(currentUser = null, other = null) {
  const current = currentUser && typeof currentUser === "object" ? currentUser : {};
  const target = other && typeof other === "object" ? other : {};
  if (current.id > 0 && target.id > 0 && current.id === target.id) return true;
  if (
    current.usernameToken
    && target.usernameToken
    && current.usernameToken === target.usernameToken
  ) return true;
  if (
    current.displayToken
    && target.displayToken
    && current.displayToken === target.displayToken
  ) return true;
  return false;
}

function isAutoRenderTask(task = null) {
  return String(task?.requestType || "").trim().toLowerCase() === "auto_render";
}

function assignmentEntryUpdatedAt(task = null, linkedRender = null) {
  return firstNonEmptyString([
    linkedRender?.updatedAt,
    linkedRender?.createdAt,
    task?.updatedAt,
    task?.createdAt,
    "",
  ]);
}

function sortAssignmentEntries(entries = []) {
  return [...(Array.isArray(entries) ? entries : [])].sort((left, right) => {
    const leftStamp = normalizeTimestamp(left?.updatedAt || "");
    const rightStamp = normalizeTimestamp(right?.updatedAt || "");
    if (leftStamp !== rightStamp) return rightStamp - leftStamp;
    const leftId = toPositiveInt(left?.task?.id || 0);
    const rightId = toPositiveInt(right?.task?.id || 0);
    return rightId - leftId;
  });
}

function RendersValidationCard({
  t,
  user = null,
  renders = [],
  rendersLoading = false,
  rendersError = "",
  projects = [],
  renderForms = [],
  tasks = [],
  tasksLoading = false,
  renderWorkers = [],
  onScanDetectedRenders = null,
  onTransitionRender = null,
  onLoadRenderTransitions = null,
  onLoadRenderFormFields = null,
  onCreateRender = null,
  onDispatchRenders = null,
  onScheduleRender = null,
  onUpdateRenderExportDestinations = null,
  onReorderRenders = null,
  onDeleteTask = null,
  onDeleteRender = null,
  onGenerateProxy = null,
  onRequestOpenRenderEditor = null,
  onNavigateToProject = null,
  onNavigateToRenderForm = null,
  renderExportDestinationOptions = [],
}) {
  const requestOpenRenderEditor = onRequestOpenRenderEditor;

  const {
    toolbarProps,
    queuePanelProps,
    listPanelProps,
    detailModalProps,
    rejectDialogOpen,
    rejectDialogRender,
    rejectDialogReason,
    setRejectDialogReason,
    closeRejectDialog,
    confirmRejectDialog,
    busyReviewRenderId,
    showHistory,
    setShowHistory,
  } = useRendersCardController({
    t,
    user,
    renders,
    rendersLoading,
    rendersError,
    tasks,
    tasksLoading,
    renderWorkers,
    onScanDetectedRenders,
    onTransitionRender,
    onLoadRenderTransitions,
    onCreateRender,
    onDispatchRenders,
    onScheduleRender,
  });

  const projectLabelByRef = useMemo(() => buildProjectLabelByRef(projects), [projects]);
  const currentUserIdentity = useMemo(() => resolveCurrentUserIdentity(user), [user]);
  const canDeleteAssignedTasks = (
    typeof onDeleteTask === "function"
    && user?.permissions?.canAssignRenderRequests === true
  );
  const taskRenderStateByTaskId = useMemo(
    () => buildTaskAutoRenderStateByTaskId(renders),
    [renders]
  );
  const assignments = useMemo(() => {
    const taskList = Array.isArray(tasks) ? tasks : [];
    const assignedToMe = [];
    const assignedByMe = [];

    for (const task of taskList) {
      if (!task || typeof task !== "object") continue;
      if (!isAutoRenderTask(task)) continue;
      const taskId = toPositiveInt(task?.id || 0);
      if (taskId <= 0) continue;

      const renderEntry = taskRenderStateByTaskId.get(taskId);
      const linkedRender = renderEntry?.render && typeof renderEntry.render === "object"
        ? renderEntry.render
        : null;
      if (!isPendingRenderCreationTask(task, linkedRender)) continue;

      const assignee = resolveTaskAssignee(task);
      const requester = resolveTaskRequester(task);
      const isAssignedToMe = matchesUserIdentity(currentUserIdentity, assignee);
      const isAssignedByMe = matchesUserIdentity(currentUserIdentity, requester);
      const statusKey = resolveTaskVisualStatus(task, taskRenderStateByTaskId);
      const updatedAt = assignmentEntryUpdatedAt(task, linkedRender);

      if (isAssignedToMe) {
        assignedToMe.push({
          task,
          statusKey,
          updatedAt,
          secondaryLabel: requester.label || "-",
          canEdit: true,
          canDelete: canDeleteAssignedTasks,
        });
      }

      if (isAssignedByMe && !isAssignedToMe && (assignee.label || assignee.id > 0)) {
        assignedByMe.push({
          task,
          statusKey,
          updatedAt,
          secondaryLabel: assignee.label || "-",
          canEdit: true,
          canDelete: canDeleteAssignedTasks,
        });
      }
    }

    return {
      assignedToMe: sortAssignmentEntries(assignedToMe),
      assignedByMe: sortAssignmentEntries(assignedByMe),
    };
  }, [canDeleteAssignedTasks, currentUserIdentity, taskRenderStateByTaskId, tasks]);
  const hasRenderDetailPage = Boolean(detailModalProps?.render);
  const renderReviewKeyResolver = typeof listPanelProps?.renderReviewStatusKey === "function"
    ? listPanelProps.renderReviewStatusKey
    : (() => "to_validate");
  const allListRenders = Array.isArray(listPanelProps?.sortedDisplayedRenders)
    ? listPanelProps.sortedDisplayedRenders
    : [];
  const activeListRenders = allListRenders.filter(
    (render) => String(renderReviewKeyResolver(render) || "").trim().toLowerCase() === "to_validate"
  );
  const historyListRenders = showHistory
    ? allListRenders.filter((render) => String(renderReviewKeyResolver(render) || "").trim().toLowerCase() === "validated")
    : [];
  const rejectDialogRenderIdRaw = Number(rejectDialogRender?.id || 0);
  const rejectDialogRenderId = Number.isFinite(rejectDialogRenderIdRaw) && rejectDialogRenderIdRaw > 0
    ? Math.trunc(rejectDialogRenderIdRaw)
    : 0;
  const rejectDialogBusy = busyReviewRenderId > 0 && rejectDialogRenderId > 0 && busyReviewRenderId === rejectDialogRenderId;

  return (
    <section className="uu-section">
      <RenderRejectDialog
        t={t}
        open={rejectDialogOpen === true}
        render={rejectDialogRender}
        reason={rejectDialogReason}
        busy={rejectDialogBusy}
        renderOutputFilename={listPanelProps?.renderOutputFilename}
        onChangeReason={(nextValue) => setRejectDialogReason?.(nextValue)}
        onCancel={() => closeRejectDialog?.()}
        onConfirm={() => { void confirmRejectDialog?.(); }}
      />
      {!hasRenderDetailPage ? (
        <>
          <RendersToolbar
            {...toolbarProps}
            onOpenCreateRender={() => {
              if (typeof requestOpenRenderEditor !== "function") return;
              requestOpenRenderEditor({
                type: "render",
                action: "create",
                ref: "new",
                task: null,
              });
            }}
            showHistory={showHistory}
            onSetShowHistory={setShowHistory}
          />
          <RendersAdvancedSearchPanel {...toolbarProps} />

          {rendersError ? <div className="uu-msg error mt-12">{rendersError}</div> : null}

          {assignments.assignedToMe.length > 0 ? (
            <RendersAssignmentsPanel
              t={t}
              title={safeT(t, "postprod.renders.assignments.todo.title", "Rendus à réaliser")}
              entries={assignments.assignedToMe}
              secondaryColumnLabel={safeT(t, "postprod.renders.assignments.table.requester", "Demandeur")}
              onOpenTask={(task) => {
                const taskId = toPositiveInt(task?.id || 0);
                if (typeof requestOpenRenderEditor !== "function" || taskId <= 0) return;
                requestOpenRenderEditor({
                  type: "render",
                  action: "edit",
                  ref: String(taskId),
                  task,
                });
              }}
              onDeleteTask={canDeleteAssignedTasks ? (taskId) => onDeleteTask(taskId) : null}
            />
          ) : null}

          {assignments.assignedByMe.length > 0 ? (
            <RendersAssignmentsPanel
              t={t}
              title={safeT(t, "postprod.renders.assignments.byMe.title", "Rendus assignés")}
              entries={assignments.assignedByMe}
              secondaryColumnLabel={safeT(t, "postprod.renders.assignments.table.assignee", "Assigné à")}
              onOpenTask={(task) => {
                const taskId = toPositiveInt(task?.id || 0);
                if (typeof requestOpenRenderEditor !== "function" || taskId <= 0) return;
                requestOpenRenderEditor({
                  type: "render",
                  action: "edit",
                  ref: String(taskId),
                  task,
                });
              }}
              onDeleteTask={canDeleteAssignedTasks ? (taskId) => onDeleteTask(taskId) : null}
            />
          ) : null}

          <RendersQueuePanel
            {...queuePanelProps}
            onRequestOpenRenderEditor={requestOpenRenderEditor}
            onReorderRenders={onReorderRenders}
            onEditQueueTask={(task) => {
              const taskId = Number(task?.id || 0);
              if (typeof requestOpenRenderEditor !== "function") return;
              if (!Number.isFinite(taskId) || taskId <= 0) return;
              requestOpenRenderEditor({
                type: "render",
                action: "edit",
                ref: String(Math.trunc(taskId)),
                task: task && typeof task === "object" ? task : null,
              });
            }}
            onDeleteQueueTask={canDeleteAssignedTasks ? async (task, queueEntry = null) => {
              if (typeof onDeleteTask !== "function") return false;
              const taskId = Number(task?.id || 0);
              if (!Number.isFinite(taskId) || taskId <= 0) return false;
              const linkedRenderId = Number(queueEntry?.linkedRender?.id || 0);
              const linkedRenderStatus = String(queueEntry?.linkedRender?.status || "").trim().toLowerCase();
              if (
                typeof onDeleteRender === "function"
                && Number.isFinite(linkedRenderId)
                && linkedRenderId > 0
                && linkedRenderStatus === "queued"
              ) {
                const deletedLinkedRender = await Promise.resolve(
                  onDeleteRender(linkedRenderId, queueEntry?.linkedRender)
                );
                if (deletedLinkedRender === false) return false;
              }
              return onDeleteTask(taskId);
            } : null}
          />

          <RendersListPanel
            {...listPanelProps}
            sortedDisplayedRenders={activeListRenders}
            renderForms={renderForms}
            onDeleteRender={onDeleteRender}
            onRequestOpenRenderEditor={requestOpenRenderEditor}
            onNavigateToProject={onNavigateToProject}
            onNavigateToRenderForm={onNavigateToRenderForm}
            projectLabelByRef={projectLabelByRef}
            emptyLabel={safeT(t, "postprod.renders.active.empty", "Aucun rendu.")}
          />

          {showHistory ? (
            <RendersListPanel
              {...listPanelProps}
              sortedDisplayedRenders={historyListRenders}
              renderForms={renderForms}
              onDeleteRender={onDeleteRender}
              onRequestOpenRenderEditor={requestOpenRenderEditor}
              onNavigateToProject={onNavigateToProject}
              onNavigateToRenderForm={onNavigateToRenderForm}
              projectLabelByRef={projectLabelByRef}
              title={safeT(t, "postprod.renders.history.title", "Liste des rendus validés")}
              emptyLabel={safeT(t, "postprod.renders.history.empty", "Aucun rendu validé.")}
            />
          ) : null}
        </>
      ) : null}

      <RenderDetailModal
        {...detailModalProps}
        onGenerateProxy={onGenerateProxy}
        allRenders={Array.isArray(renders) ? renders : []}
        projectLabelByRef={projectLabelByRef}
        onNavigateToProject={onNavigateToProject}
        onNavigateToRenderForm={onNavigateToRenderForm}
        onRequestOpenRenderEditor={requestOpenRenderEditor}
        tasks={tasks}
        renderForms={renderForms}
        onLoadRenderFormFields={onLoadRenderFormFields}
        renderExportDestinationOptions={renderExportDestinationOptions}
        onUpdateRenderExportDestinations={onUpdateRenderExportDestinations}
        embedded={hasRenderDetailPage}
      />
    </section>
  );
}

export {
  RendersValidationCard,
};
