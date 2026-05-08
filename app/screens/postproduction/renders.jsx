import { useMemo } from "react";
import { safeT } from "./shared/helpers";
import { useRendersCardController } from "./renders/hooks/useRendersCardController";
import { RenderDetailModal } from "./renders/components/RenderDetailModal";
import { RenderRejectDialog } from "./renders/components/RenderRejectDialog";
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
    canReviewRenders,
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

          {!canReviewRenders ? (
            <div className="uu-msg info mt-12">
              {safeT(
                t,
                "postprod.renders.review.readOnly",
                "Validation en lecture seule pour ton role."
              )}
            </div>
          ) : null}

          {rendersError ? <div className="uu-msg error mt-12">{rendersError}</div> : null}
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
            onDeleteQueueTask={async (task, queueEntry = null) => {
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
            }}
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
