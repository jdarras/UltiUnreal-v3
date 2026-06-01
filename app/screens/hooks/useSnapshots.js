import { useState, useCallback } from 'react';
import { getAgentBaseUrl, setProjectAutoScreenshot } from '../../utils/agent';
import { formatDateTime } from '../../utils/projects-helpers';
import { useTransientInfo } from './useTransientInfo';

export function useSnapshots({ t, detailId, setDetailMeta, setProjects }) {
  const [snapshotOpen, setSnapshotOpen] = useState(null); // { rel, path, mtime }
  const [snapshotBusy, setSnapshotBusy] = useState(false);
  const {
    infoMsg: snapshotMsg,
    setInfoMsg: setSnapshotMsg,
    infoMsgType: snapshotMsgType,
    setInfoMsgType: setSnapshotMsgType,
    showInfo: showSnapshotMsg,
    clearInfo: clearSnapshotFeedback,
  } = useTransientInfo({ defaultType: 'error', clearAfterMs: 0 });

  const openSnapshotViewer = useCallback((payload) => {
    clearSnapshotFeedback();
    setSnapshotOpen(payload);
  }, [clearSnapshotFeedback]);

  const closeSnapshotViewer = useCallback(() => {
    if (snapshotBusy) return;
    setSnapshotOpen(null);
    clearSnapshotFeedback();
  }, [snapshotBusy, clearSnapshotFeedback]);

  const snapshotSrc = useCallback((projectId, relPath, mtime = '') => {
    const base = getAgentBaseUrl();
    if (!base || !projectId || !relPath) return '';
    const pid = encodeURIComponent(projectId);
    const file = encodeURIComponent(relPath);
    const tParam = mtime ? `&mtime=${encodeURIComponent(mtime)}` : '';
    return `${base}/agent/project-snapshot?projectId=${pid}&file=${file}${tParam}`;
  }, []);

  const getSnapshotErrorMessage = useCallback(
    (err, stage = 'unknown') => {
      const http = Number(err?.http || err?.status);
      const msg = String(err?.msg || err?.message || '').trim();
      if (stage === 'fetch') {
        if (msg === 'snapshot_url_missing') return t('projects.snapshots.errors.fetch.urlMissing');
        if (http === 404) return t('projects.snapshots.errors.fetch.notFound');
        if (http === 415) return t('projects.snapshots.errors.fetch.unsupported');
        if (http === 400) return t('projects.snapshots.errors.fetch.badRequest');
        if (http >= 500) return t('projects.snapshots.errors.fetch.serverError');
        return t('projects.snapshots.errors.fetch.failed');
      }
      if (stage === 'process') {
        if (msg === 'canvas_unavailable') return t('projects.snapshots.errors.process.canvasUnavailable');
        if (msg === 'invalid_image') return t('projects.snapshots.errors.process.invalidImage');
        if (msg === 'encode_failed') return t('projects.snapshots.errors.process.encodeFailed');
        return t('projects.snapshots.errors.process.failed');
      }
      if (stage === 'save') {
        if (http === 400) return t('projects.snapshots.errors.save.badRequest');
        if (http >= 500) return t('projects.snapshots.errors.save.serverError');
        return t('projects.snapshots.errors.save.failed');
      }
      return t('projects.snapshots.thumbnailUpdateError');
    },
    [t]
  );

  const setAutoScreenshotFromSnapshot = useCallback(
    async (relPath, mtime = '') => {
      const pid = String(detailId || '').trim();
      const rel = String(relPath || '').trim();
      if (!pid || !rel) return;

      let stage = 'fetch';
      setSnapshotBusy(true);
      clearSnapshotFeedback();
      try {
        const url = snapshotSrc(pid, rel, String(mtime || '').trim());
        if (!url) throw new Error('snapshot_url_missing');

        const r = await fetch(url);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const blob = await r.blob();

        stage = 'process';
        const canvas = document.createElement('canvas');
        canvas.width = 192;
        canvas.height = 192;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('canvas_unavailable');

        if (typeof createImageBitmap === 'function') {
          const bmp = await createImageBitmap(blob);
          const side = Math.min(bmp.width || 0, bmp.height || 0) || 0;
          if (!side) throw new Error('invalid_image');
          const sx = Math.floor((bmp.width - side) / 2);
          const sy = Math.floor((bmp.height - side) / 2);
          ctx.drawImage(bmp, sx, sy, side, side, 0, 0, 192, 192);
          if (typeof bmp.close === 'function') bmp.close();
        } else {
          const img = new Image();
          const objectUrl = URL.createObjectURL(blob);
          img.src = objectUrl;
          await img.decode();
          URL.revokeObjectURL(objectUrl);
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;
          const side = Math.min(w || 0, h || 0) || 0;
          if (!side) throw new Error('invalid_image');
          const sx = Math.floor((w - side) / 2);
          const sy = Math.floor((h - side) / 2);
          ctx.drawImage(img, sx, sy, side, side, 0, 0, 192, 192);
        }

        const dataUrl = canvas.toDataURL('image/png');
        const b64 = String(dataUrl.split(',')[1] || '').trim();
        if (!b64) throw new Error('encode_failed');

        stage = 'save';
        const res = await setProjectAutoScreenshot(pid, b64);
        if (!res || res.ok === false) throw new Error(res?.error || 'save_failed');

        setDetailMeta?.((prev) => ({
          ...(prev || {}),
          thumbnailUrl: dataUrl,
          thumbnailUpdatedAt: formatDateTime(Date.now())
        }));

        // Rafraîchir la liste localement immédiatement (évite d'attendre un redémarrage)
        if (setProjects) {
          setProjects((prev = []) =>
            prev.map((p) => {
              if (String(p.id || '').trim() !== pid) return p;
              return {
                ...p,
                thumbnail: dataUrl,
                thumbnailUpdatedAt: formatDateTime(Date.now()),
              };
            })
          );
        }

        showSnapshotMsg(t('projects.snapshots.thumbnailUpdated'), 'ok', 0);
      } catch (err) {
        showSnapshotMsg(getSnapshotErrorMessage(err, stage), 'error', 0);
      } finally {
        setSnapshotBusy(false);
      }
    },
    [
      clearSnapshotFeedback,
      detailId,
      getSnapshotErrorMessage,
      setDetailMeta,
      showSnapshotMsg,
      snapshotSrc,
      setProjects,
      t,
    ]
  );

  return {
    snapshotOpen,
    snapshotBusy,
    snapshotMsg,
    snapshotMsgType,
    setSnapshotOpen,
    setSnapshotBusy,
    setSnapshotMsg,
    setSnapshotMsgType,
    snapshotSrc,
    clearSnapshotFeedback,
    openSnapshotViewer,
    closeSnapshotViewer,
    setAutoScreenshotFromSnapshot,
    getSnapshotErrorMessage
  };
}
