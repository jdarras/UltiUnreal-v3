import { safeT } from "./shared/helpers";
import { useRendersCardController } from "./renders/hooks/useRendersCardController";
import { RenderDetailModal } from "./renders/components/RenderDetailModal";
import { RendersListPanel } from "./renders/components/RendersListPanel";
import { RendersQueuePanel } from "./renders/components/RendersQueuePanel";
import { RendersAdvancedSearchPanel, RendersToolbar } from "./renders/components/RendersToolbar";

function RendersValidationCard({
  t,
  user = null,
  renders = [],
  rendersLoading = false,
  rendersError = "",
  tasks = [],
  tasksLoading = false,
  renderWorkers = [],
  onScanDetectedRenders = null,
  onTransitionRender = null,
  onLoadRenderTransitions = null,
  onCreateRender = null,
  onDispatchRenders = null,
  onScheduleRender = null,
  onReorderRenders = null,
  onDeleteTask = null,
  onDeleteRender = null,
  onRequestOpenTasks = null,
  onNavigateToProject = null,
}) {
  const {
    canReviewRenders,
    toolbarProps,
    queuePanelProps,
    listPanelProps,
    detailModalProps,
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

  const hasRenderDetailPage = Boolean(detailModalProps?.render);

  return (
    <section className="uu-section">
      {!hasRenderDetailPage ? (
        <>
          <RendersToolbar {...toolbarProps} />
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
            onRequestOpenTasks={onRequestOpenTasks}
            onReorderRenders={onReorderRenders}
            onEditQueueTask={(task) => {
              const taskId = Number(task?.id || 0);
              if (typeof onRequestOpenTasks !== "function") return;
              if (!Number.isFinite(taskId) || taskId <= 0) return;
              onRequestOpenTasks({
                type: "task",
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
            onDeleteRender={onDeleteRender}
            onRequestOpenTasks={onRequestOpenTasks}
            onNavigateToProject={onNavigateToProject}
          />
        </>
      ) : null}

      <RenderDetailModal {...detailModalProps} embedded={hasRenderDetailPage} />
    </section>
  );
}

export {
  RendersValidationCard,
};
