import { useCallback } from "react";
import {
  postprodListRenders,
  postprodListRemoteJobsByStation,
  postprodListUserAlerts,
  postprodRegenerateAllProxies,
  postprodListRenderTemplates,
  postprodListRenderForms,
  postprodGetHealth,
  getHosts,
} from "../utils/agent";
import { resolvePostprodRendersError } from "../utils/postprodErrorHelpers";

function usePostprodRendersApi({
  postprodAuth,
  t,
  showNotice,
  postprodRendersRequestSeqRef,
  current,
  hostsCfg,
  localIp,
  safeIdentity,
  setPostprodRenders,
  setPostprodUserAlerts,
  setPostprodRenderTemplates,
  setPostprodRenderForms,
  setPostprodRenderHealth,
}) {
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

  return {
    loadPostprodRenders,
    loadPostprodUserAlerts,
    handlePostprodScanDetectedRenders,
    handlePostprodGenerateRenderProxy,
    loadPostprodRenderTemplates,
    loadPostprodRenderForms,
    loadPostprodRenderHealth,
  };
}

export { usePostprodRendersApi };
