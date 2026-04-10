import { safeT } from "./shared/helpers";
import { useRendersCardController } from "./renders/hooks/useRendersCardController";
import { RenderDetailModal } from "./renders/components/RenderDetailModal";
import { RendersListPanel } from "./renders/components/RendersListPanel";
import { RendersQueuePanel } from "./renders/components/RendersQueuePanel";
import { RenderJobsQueuePanel } from "./renders/components/RenderJobsQueuePanel";
import { RendersToolbar } from "./renders/components/RendersToolbar";

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

          <RenderJobsQueuePanel
            t={t}
            renders={renders}
            rendersLoading={rendersLoading}
            onScheduleRender={onScheduleRender}
            onReorderRenders={onReorderRenders}
          />

          <RendersQueuePanel {...queuePanelProps} />

          {rendersLoading ? (
            <div className="uu-muted mt-12">{safeT(t, "postprod.renders.loading", "Chargement des rendus...")}</div>
          ) : null}

          <RendersListPanel {...listPanelProps} />
        </>
      ) : null}

      <RenderDetailModal {...detailModalProps} embedded={hasRenderDetailPage} />
    </section>
  );
}

export {
  RendersValidationCard,
};
