import { useCallback } from 'react';
import { clearMessagePair } from './projectDetailFeedbackHelpers';

export function useProjectDetailResetState({
  resetHttpBind,
  projectVersionTimer,
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
    resetHttpBind();
    clearMessagePair(setIndexationMsg, setIndexationMsgType);
    setRenderBridgeStatus(null);
    clearMessagePair(setRenderBridgeMsg, setRenderBridgeMsgType);
    setRenderBridgeBusy(false);
    clearMessagePair(setIntervenantsMsg, setIntervenantsMsgType);
    if (projectVersionTimer.current) clearTimeout(projectVersionTimer.current);
    setProjectVersion('');
    clearMessagePair(setProjectVersionMsg, setProjectVersionMsgType);
    setProjectVersionBusy(false);
    setSnapshotOpen(null);
    setSnapshotBusy(false);
    clearMessagePair(setSnapshotMsg, setSnapshotMsgType);
    clearMessagePair(setMapsMsg, setMapsMsgType);
    setMapsBusy(false);
    clearMessagePair(setVpMsg, setVpMsgType);
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
