import { useCallback } from 'react';

export function useProjectDetailResetState({
  resetHttpBind,
  projectVersionTimer,
  setDetailMsg,
  setIndexationMsg,
  setIndexationMsgType,
  setRenderBridgeStatus,
  setRenderBridgeMsg,
  setRenderBridgeMsgType,
  setRenderBridgeBusy,
  setIntervenantsMsg,
  setIntervenantsMsgType,
  setProjectVersion,
  setProjectVersionMsg,
  setProjectVersionMsgType,
  setProjectVersionBusy,
  setSnapshotOpen,
  setSnapshotBusy,
  setSnapshotMsg,
  setSnapshotMsgType,
  setMapsMsg,
  setMapsMsgType,
  setMapsBusy,
  setVpMsg,
  setVpMsgType,
  setVpBusy,
  setVpDraft,
  setDetailMeta,
  setDetailInsights,
  keywordsDirtyRef,
  projectDropdownDirtyRef,
  detailNoteDirtyRef,
} = {}) {
  const resetDetailState = useCallback(() => {
    setDetailMsg('');
    resetHttpBind();
    setIndexationMsg('');
    setIndexationMsgType('');
    setRenderBridgeStatus(null);
    setRenderBridgeMsg('');
    setRenderBridgeMsgType('');
    setRenderBridgeBusy(false);
    setIntervenantsMsg('');
    setIntervenantsMsgType('');
    if (projectVersionTimer.current) clearTimeout(projectVersionTimer.current);
    setProjectVersion('');
    setProjectVersionMsg('');
    setProjectVersionMsgType('');
    setProjectVersionBusy(false);
    setSnapshotOpen(null);
    setSnapshotBusy(false);
    setSnapshotMsg('');
    setSnapshotMsgType('');
    setMapsMsg('');
    setMapsMsgType('');
    setMapsBusy(false);
    setVpMsg('');
    setVpMsgType('');
    setVpBusy(false);
    setVpDraft(null);
    setDetailMeta(null);
    setDetailInsights(null);
    keywordsDirtyRef.current = false;
    projectDropdownDirtyRef.current = false;
    detailNoteDirtyRef.current = false;
  }, [
    detailNoteDirtyRef,
    keywordsDirtyRef,
    projectDropdownDirtyRef,
    projectVersionTimer,
    resetHttpBind,
    setDetailInsights,
    setDetailMeta,
    setDetailMsg,
    setIndexationMsg,
    setIndexationMsgType,
    setIntervenantsMsg,
    setIntervenantsMsgType,
    setMapsBusy,
    setMapsMsg,
    setMapsMsgType,
    setProjectVersion,
    setProjectVersionBusy,
    setProjectVersionMsg,
    setProjectVersionMsgType,
    setRenderBridgeBusy,
    setRenderBridgeMsg,
    setRenderBridgeMsgType,
    setRenderBridgeStatus,
    setSnapshotBusy,
    setSnapshotMsg,
    setSnapshotMsgType,
    setSnapshotOpen,
    setVpBusy,
    setVpDraft,
    setVpMsg,
    setVpMsgType,
  ]);

  return { resetDetailState };
}

export default useProjectDetailResetState;
