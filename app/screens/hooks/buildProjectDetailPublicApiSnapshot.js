export function buildProjectDetailPublicApiSnapshot({
  snapshotOpen,
  snapshotBusy,
  snapshotMsg,
  snapshotMsgType,
  setSnapshotOpen,
  setSnapshotMsg,
  setSnapshotMsgType,
  snapshotSrc,
  clearSnapshotFeedback,
  openSnapshotViewer,
  closeSnapshotViewer,
  setAutoScreenshotFromSnapshot,
} = {}) {
  return {
    snapshotOpen,
    snapshotBusy,
    snapshotMsg,
    snapshotMsgType,
    setSnapshotOpen,
    setSnapshotMsg,
    setSnapshotMsgType,
    snapshotSrc,
    clearSnapshotFeedback,
    openSnapshotViewer,
    closeSnapshotViewer,
    setAutoScreenshotFromSnapshot,
  };
}
