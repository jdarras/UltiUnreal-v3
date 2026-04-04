import { safeT } from "./shared/helpers";
import { useRendersCardController } from "./renders/hooks/useRendersCardController";
import { RenderDetailModal } from "./renders/components/RenderDetailModal";
import { RendersListPanel } from "./renders/components/RendersListPanel";
import { RendersQueuePanel } from "./renders/components/RendersQueuePanel";
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
  });

  return (
    <section className="uu-section">
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

      <RendersQueuePanel {...queuePanelProps} />

      {rendersLoading ? (
        <div className="uu-muted mt-12">{safeT(t, "postprod.renders.loading", "Chargement des rendus...")}</div>
      ) : null}

      <RendersListPanel {...listPanelProps} />
      <RenderDetailModal {...detailModalProps} />
    </section>
  );
}

export {
  RendersValidationCard,
};

