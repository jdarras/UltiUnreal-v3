import { useCallback } from "react";
import {
  postprodListMyActivity,
  postprodListAudit,
  postprodGetRenderHealthAuditMaintenance,
  postprodPurgeRenderHealthAudit,
  postprodPurgeAudit,
  postprodExportAuditCsv,
  postprodExportAuditJson,
  postprodExportAuditNdjson,
} from "../utils/agent";
import {
  resolvePostprodActivityError,
  resolvePostprodAuditError,
} from "../utils/postprodErrorHelpers";

function usePostprodAuditApi({
  postprodAuth,
  postprodCanManageRoles,
  postprodAudit,
  t,
  showNotice,
  setPostprodMyActivity,
  setPostprodAudit,
  setPostprodRenderHealthAuditMaintenance,
}) {
  const loadPostprodMyActivity = useCallback(async (options = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) {
      setPostprodMyActivity({
        activities: [],
        summary: { total: 0, actions: {}, projects: [] },
        loading: false,
        error: '',
      });
      return;
    }
    setPostprodMyActivity((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await postprodListMyActivity(token, 50, options);
      const activities = Array.isArray(res?.activities) ? res.activities : [];
      const summary = res?.summary && typeof res.summary === 'object'
        ? res.summary
        : { total: activities.length, actions: {}, projects: [] };
      setPostprodMyActivity({
        activities,
        summary,
        loading: false,
        error: '',
      });
    } catch (e) {
      setPostprodMyActivity((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodActivityError(e, t),
      }));
    }
  }, [postprodAuth.token, t, setPostprodMyActivity]);

  const loadPostprodAudit = useCallback(async (options = {}) => {
    const token = String(postprodAuth.token || '').trim();
    const nextActorUserIdRaw = Number(options?.actorUserId);
    const nextActorUserId = Number.isFinite(nextActorUserIdRaw) && nextActorUserIdRaw > 0
      ? Math.trunc(nextActorUserIdRaw)
      : null;
    const nextAction = String(options?.action || '').trim();
    const nextScopeType = String(options?.scopeType || '').trim();
    const nextFromAt = String(options?.fromAt || '').trim();
    const nextToAt = String(options?.toAt || '').trim();
    const requestedPageSize = Number(options?.pageSize ?? options?.limit);
    const pageSize = Number.isFinite(requestedPageSize)
      ? Math.max(1, Math.min(500, Math.trunc(requestedPageSize)))
      : 100;
    const requestedPage = Number(options?.page);
    const page = Number.isFinite(requestedPage)
      ? Math.max(1, Math.trunc(requestedPage))
      : 1;

    if (!token) {
      setPostprodAudit({
        entries: [],
        loading: false,
        error: '',
        total: 0,
        page,
        pageSize,
        hasMore: false,
        filters: {
          actorUserId: nextActorUserId,
          action: nextAction,
          scopeType: nextScopeType,
          fromAt: nextFromAt,
          toAt: nextToAt,
        },
      });
      return;
    }
    setPostprodAudit((prev) => ({
      ...prev,
      loading: true,
      error: '',
      page,
      pageSize,
      filters: {
        actorUserId: nextActorUserId,
        action: nextAction,
        scopeType: nextScopeType,
        fromAt: nextFromAt,
        toAt: nextToAt,
      },
    }));
    try {
      const res = await postprodListAudit(token, {
        page,
        pageSize,
        actorUserId: nextActorUserId,
        action: nextAction,
        scopeType: nextScopeType,
        fromAt: nextFromAt,
        toAt: nextToAt,
      });
      const entries = Array.isArray(res?.entries) ? res.entries : [];
      const pagination = res?.pagination && typeof res.pagination === 'object'
        ? res.pagination
        : {};
      const totalRaw = Number(pagination?.total);
      const total = Number.isFinite(totalRaw) ? Math.max(0, Math.trunc(totalRaw)) : entries.length;
      const pageOutRaw = Number(pagination?.page);
      const pageOut = Number.isFinite(pageOutRaw) ? Math.max(1, Math.trunc(pageOutRaw)) : page;
      const pageSizeOutRaw = Number(pagination?.limit);
      const pageSizeOut = Number.isFinite(pageSizeOutRaw)
        ? Math.max(1, Math.min(500, Math.trunc(pageSizeOutRaw)))
        : pageSize;
      const hasMore = pagination?.hasMore === true
        || (pageOut * pageSizeOut) < total;
      const auditLogStore = res?.auditLogStore && typeof res.auditLogStore === 'object'
        ? res.auditLogStore
        : null;
      setPostprodAudit({
        entries,
        loading: false,
        error: '',
        total,
        page: pageOut,
        pageSize: pageSizeOut,
        hasMore,
        auditLogStore,
        filters: {
          actorUserId: nextActorUserId,
          action: nextAction,
          scopeType: nextScopeType,
          fromAt: nextFromAt,
          toAt: nextToAt,
        },
      });
    } catch (e) {
      setPostprodAudit((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodAuditError(e, t),
      }));
    }
  }, [postprodAuth.token, t, setPostprodAudit]);

  const loadPostprodRenderHealthAuditMaintenance = useCallback(async () => {
    const token = String(postprodAuth.token || '').trim();
    if (!token || !postprodCanManageRoles) {
      setPostprodRenderHealthAuditMaintenance({
        data: null,
        loading: false,
        error: '',
        purging: false,
        purgeError: '',
        lastPurge: null,
      });
      return null;
    }
    setPostprodRenderHealthAuditMaintenance((prev) => ({
      ...prev,
      loading: true,
      error: '',
    }));
    try {
      const res = await postprodGetRenderHealthAuditMaintenance(token);
      const data = res?.maintenance && typeof res.maintenance === 'object'
        ? res.maintenance
        : null;
      setPostprodRenderHealthAuditMaintenance((prev) => ({
        ...prev,
        data,
        loading: false,
        error: '',
      }));
      return data;
    } catch (e) {
      setPostprodRenderHealthAuditMaintenance((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodAuditError(e, t),
      }));
      return null;
    }
  }, [postprodAuth.token, postprodCanManageRoles, t, setPostprodRenderHealthAuditMaintenance]);

  const handlePostprodPurgeRenderHealthAudit = useCallback(async () => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) {
      const err = new Error('missing_token');
      err.code = 'missing_token';
      err.status = 401;
      throw err;
    }
    if (!postprodCanManageRoles) {
      const err = new Error('forbidden');
      err.code = 'forbidden';
      err.status = 403;
      throw err;
    }
    setPostprodRenderHealthAuditMaintenance((prev) => ({
      ...prev,
      purging: true,
      purgeError: '',
    }));
    try {
      const res = await postprodPurgeRenderHealthAudit(token);
      const maintenance = res?.maintenance && typeof res.maintenance === 'object'
        ? res.maintenance
        : null;
      const purge = res?.purge && typeof res.purge === 'object'
        ? res.purge
        : null;
      setPostprodRenderHealthAuditMaintenance((prev) => ({
        ...prev,
        data: maintenance || prev.data,
        purging: false,
        purgeError: '',
        lastPurge: purge,
      }));
      const deletedCount = Math.max(0, Math.trunc(Number(purge?.deleted || 0)));
      showNotice(
        deletedCount > 0
          ? `Purge audit: ${deletedCount} evenement(s) supprime(s)`
          : 'Purge audit: aucune entree supprimee',
        deletedCount > 0 ? 'ok' : 'info'
      );
      return res;
    } catch (e) {
      const errorText = resolvePostprodAuditError(e, t);
      setPostprodRenderHealthAuditMaintenance((prev) => ({
        ...prev,
        purging: false,
        purgeError: errorText,
      }));
      throw e;
    }
  }, [postprodAuth.token, postprodCanManageRoles, showNotice, t, setPostprodRenderHealthAuditMaintenance]);

  const handlePostprodPurgeAudit = useCallback(async () => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return;
    if (!postprodCanManageRoles) return;
    try {
      const res = await postprodPurgeAudit(token);
      const deletedCount = Math.max(0, Math.trunc(Number(res?.purge?.deleted || 0)));
      showNotice(
        deletedCount > 0
          ? t('postprod.audit.purge.successCount', { count: deletedCount })
          : t('postprod.audit.purge.successEmpty'),
        deletedCount > 0 ? 'ok' : 'info'
      );
      await loadPostprodAudit?.({ page: 1 });
    } catch {
      showNotice(t('postprod.audit.purge.error'), 'error');
    }
  }, [postprodAuth.token, postprodCanManageRoles, loadPostprodAudit, showNotice, t]);

  const collectPostprodAuditEntries = useCallback(async ({
    token = '',
    actorUserId = null,
    action = '',
    scopeType = '',
    fromAt = '',
    toAt = '',
    pageSize = 500,
  } = {}) => {
    const entries = [];
    let page = 1;
    let guard = 0;
    let hasMore = true;

    while (hasMore) {
      guard += 1;
      if (guard > 500) break;
      const res = await postprodListAudit(token, {
        page,
        pageSize,
        actorUserId,
        action,
        scopeType,
        fromAt,
        toAt,
      });
      const chunk = Array.isArray(res?.entries) ? res.entries : [];
      if (chunk.length > 0) entries.push(...chunk);

      const pagination = res?.pagination && typeof res.pagination === 'object'
        ? res.pagination
        : {};
      const pageOutRaw = Number(pagination?.page);
      const pageOut = Number.isFinite(pageOutRaw)
        ? Math.max(1, Math.trunc(pageOutRaw))
        : page;
      const limitOutRaw = Number(pagination?.limit);
      const limitOut = Number.isFinite(limitOutRaw)
        ? Math.max(1, Math.min(500, Math.trunc(limitOutRaw)))
        : pageSize;
      const totalOutRaw = Number(pagination?.total);
      const totalOut = Number.isFinite(totalOutRaw)
        ? Math.max(0, Math.trunc(totalOutRaw))
        : entries.length;
      const hasMoreOut = pagination?.hasMore === true
        || (pageOut * limitOut) < totalOut;

      if (!hasMoreOut || chunk.length <= 0) {
        hasMore = false;
        break;
      }
      page = pageOut + 1;
    }

    return entries;
  }, []);

  const exportPostprodAuditAll = useCallback(async (options = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) {
      const err = new Error('missing_token');
      err.code = 'missing_token';
      throw err;
    }

    const baseFilters = postprodAudit?.filters && typeof postprodAudit.filters === 'object'
      ? postprodAudit.filters
      : {};
    const actorRaw = Number(options?.actorUserId ?? baseFilters.actorUserId);
    const actorUserId = Number.isFinite(actorRaw) && actorRaw > 0
      ? Math.trunc(actorRaw)
      : null;
    const action = String(options?.action ?? baseFilters.action ?? '').trim();
    const scopeType = String(options?.scopeType ?? baseFilters.scopeType ?? '').trim();
    const fromAt = String(options?.fromAt ?? baseFilters.fromAt ?? '').trim();
    const toAt = String(options?.toAt ?? baseFilters.toAt ?? '').trim();
    const query = String(options?.query ?? options?.q ?? '').trim();
    const pageSizeRaw = Number(options?.pageSize ?? options?.limit ?? 500);
    const pageSize = Number.isFinite(pageSizeRaw)
      ? Math.max(1, Math.min(500, Math.trunc(pageSizeRaw)))
      : 500;

    try {
      const csvRes = await postprodExportAuditCsv(token, {
        actorUserId,
        action,
        scopeType,
        fromAt,
        toAt,
        query,
        batch: pageSize,
      });
      return {
        csvText: String(csvRes?.csv || ''),
        filters: { actorUserId, action, scopeType, fromAt, toAt, query },
      };
    } catch (e) {
      const status = Number(e?.status || 0);
      const code = String(e?.code || '').trim().toLowerCase();
      const canFallback =
        status === 404 ||
        status === 405 ||
        code === 'not_found' ||
        code === 'method_not_allowed';
      if (!canFallback) throw e;
    }

    const entries = await collectPostprodAuditEntries({
      token, actorUserId, action, scopeType, fromAt, toAt, pageSize,
    });
    return {
      entries,
      filters: { actorUserId, action, scopeType, fromAt, toAt, query },
    };
  }, [collectPostprodAuditEntries, postprodAuth.token, postprodAudit.filters]);

  const exportPostprodAuditAllJson = useCallback(async (options = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) {
      const err = new Error('missing_token');
      err.code = 'missing_token';
      throw err;
    }

    const baseFilters = postprodAudit?.filters && typeof postprodAudit.filters === 'object'
      ? postprodAudit.filters
      : {};
    const actorRaw = Number(options?.actorUserId ?? baseFilters.actorUserId);
    const actorUserId = Number.isFinite(actorRaw) && actorRaw > 0
      ? Math.trunc(actorRaw)
      : null;
    const action = String(options?.action ?? baseFilters.action ?? '').trim();
    const scopeType = String(options?.scopeType ?? baseFilters.scopeType ?? '').trim();
    const fromAt = String(options?.fromAt ?? baseFilters.fromAt ?? '').trim();
    const toAt = String(options?.toAt ?? baseFilters.toAt ?? '').trim();
    const query = String(options?.query ?? options?.q ?? '').trim();
    const pageSizeRaw = Number(options?.pageSize ?? options?.limit ?? 500);
    const pageSize = Number.isFinite(pageSizeRaw)
      ? Math.max(1, Math.min(500, Math.trunc(pageSizeRaw)))
      : 500;

    try {
      const jsonRes = await postprodExportAuditJson(token, {
        actorUserId, action, scopeType, fromAt, toAt, query, batch: pageSize,
      });
      return {
        data: jsonRes && typeof jsonRes === 'object'
          ? jsonRes
          : { ok: true, entries: [] },
      };
    } catch (e) {
      const status = Number(e?.status || 0);
      const code = String(e?.code || '').trim().toLowerCase();
      const canFallback =
        status === 404 ||
        status === 405 ||
        code === 'not_found' ||
        code === 'method_not_allowed';
      if (!canFallback) throw e;
    }

    const entries = await collectPostprodAuditEntries({
      token, actorUserId, action, scopeType, fromAt, toAt, pageSize,
    });
    return {
      data: {
        ok: true,
        exportedAt: new Date().toISOString(),
        filters: { actorUserId, action, scopeType, fromAt, toAt, query },
        total: entries.length,
        entries,
      },
    };
  }, [collectPostprodAuditEntries, postprodAuth.token, postprodAudit.filters]);

  const exportPostprodAuditAllNdjson = useCallback(async (options = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) {
      const err = new Error('missing_token');
      err.code = 'missing_token';
      throw err;
    }

    const baseFilters = postprodAudit?.filters && typeof postprodAudit.filters === 'object'
      ? postprodAudit.filters
      : {};
    const actorRaw = Number(options?.actorUserId ?? baseFilters.actorUserId);
    const actorUserId = Number.isFinite(actorRaw) && actorRaw > 0
      ? Math.trunc(actorRaw)
      : null;
    const action = String(options?.action ?? baseFilters.action ?? '').trim();
    const scopeType = String(options?.scopeType ?? baseFilters.scopeType ?? '').trim();
    const fromAt = String(options?.fromAt ?? baseFilters.fromAt ?? '').trim();
    const toAt = String(options?.toAt ?? baseFilters.toAt ?? '').trim();
    const query = String(options?.query ?? options?.q ?? '').trim();
    const pageSizeRaw = Number(options?.pageSize ?? options?.limit ?? 500);
    const pageSize = Number.isFinite(pageSizeRaw)
      ? Math.max(1, Math.min(500, Math.trunc(pageSizeRaw)))
      : 500;

    try {
      const ndjsonRes = await postprodExportAuditNdjson(token, {
        actorUserId, action, scopeType, fromAt, toAt, query, batch: pageSize,
      });
      return {
        ndjsonText: String(ndjsonRes?.ndjson || ''),
      };
    } catch (e) {
      const status = Number(e?.status || 0);
      const code = String(e?.code || '').trim().toLowerCase();
      const canFallback =
        status === 404 ||
        status === 405 ||
        code === 'not_found' ||
        code === 'method_not_allowed';
      if (!canFallback) throw e;
    }

    const entries = await collectPostprodAuditEntries({
      token, actorUserId, action, scopeType, fromAt, toAt, pageSize,
    });
    return {
      entries,
      filters: { actorUserId, action, scopeType, fromAt, toAt, query },
    };
  }, [collectPostprodAuditEntries, postprodAuth.token, postprodAudit.filters]);

  return {
    loadPostprodMyActivity,
    loadPostprodAudit,
    loadPostprodRenderHealthAuditMaintenance,
    handlePostprodPurgeRenderHealthAudit,
    handlePostprodPurgeAudit,
    exportPostprodAuditAll,
    exportPostprodAuditAllJson,
    exportPostprodAuditAllNdjson,
  };
}

export { usePostprodAuditApi };
