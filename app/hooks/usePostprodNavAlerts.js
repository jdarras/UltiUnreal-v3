import { useCallback, useEffect, useMemo, useRef } from "react";
import { APP_MODE_POSTPROD } from "../utils/appConstants";

function usePostprodNavAlerts({
  appMode, postprodAuthenticated, t, showNotice,
  logsStorageSummary, postprodAudit, postprodUserAlerts,
}) {
  const logsAlertPrevRef = useRef({ initialized: false, byIp: {} });

  const logsNavAlert = useMemo(() => {
    if (appMode === APP_MODE_POSTPROD) {
      const store = postprodAudit?.auditLogStore && typeof postprodAudit.auditLogStore === 'object'
        ? postprodAudit.auditLogStore
        : null;
      const count = Number(store?.count || 0);
      const warnAt = Number(store?.warnAt || 1500);
      const hardLimit = Number(store?.hardLimit || 2000);
      const saturated = !!store?.saturated || (Number.isFinite(hardLimit) && hardLimit > 0 && count >= hardLimit);
      const warnReached = !!store?.warnReached
        || saturated
        || (Number.isFinite(warnAt) && warnAt > 0 && count >= warnAt);
      if (saturated) {
        return {
          level: 'error',
          tooltip: t('postprod.audit.store.saturated'),
          entries: [],
        };
      }
      if (warnReached) {
        return {
          level: 'warn',
          tooltip: t('postprod.audit.store.warn'),
          entries: [],
        };
      }
      return { level: '', tooltip: '', entries: [] };
    }

    const items = Array.isArray(logsStorageSummary?.items) ? logsStorageSummary.items : [];
    const warnItems = [];
    const saturatedItems = [];

    for (const it of items) {
      const state = String(it?.state || '').trim().toLowerCase();
      if (state === 'saturated') saturatedItems.push(it);
      else if (state === 'warn') warnItems.push(it);
    }

    const level = saturatedItems.length > 0 ? 'error' : (warnItems.length > 0 ? 'warn' : '');
    if (!level) {
      return { level: '', tooltip: '', entries: [] };
    }

    const describe = (entry, state) => {
      const name = String(entry?.name || entry?.ip || 'Station').trim();
      const count = Number(entry?.logStore?.lineCount || 0);
      const warnAt = Number(entry?.logStore?.warnAt || 1500);
      const hardLimit = Number(entry?.logStore?.hardLimit || 2000);
      const text = state === 'saturated'
        ? t('logs.storage.saturated', { count, limit: hardLimit })
        : t('logs.storage.warn', { count, warnAt, limit: hardLimit });
      return `${name}: ${text}`;
    };

    const tooltipLines = [
      ...saturatedItems.map((it) => describe(it, 'saturated')),
      ...warnItems.map((it) => describe(it, 'warn')),
    ];

    return {
      level,
      tooltip: tooltipLines.join('\n'),
      entries: [
        ...saturatedItems.map((it) => ({ ...it, __state: 'saturated' })),
        ...warnItems.map((it) => ({ ...it, __state: 'warn' })),
      ],
    };
  }, [appMode, logsStorageSummary, postprodAudit?.auditLogStore, t]);

  const usersNavAlert = useMemo(() => {
    if (appMode !== APP_MODE_POSTPROD) return null;
    const store = postprodAudit?.auditLogStore && typeof postprodAudit.auditLogStore === 'object'
      ? postprodAudit.auditLogStore
      : null;
    if (!store) return null;
    const count = Number(store?.count || 0);
    const warnAt = Number(store?.warnAt || 5000);
    const hardLimit = Number(store?.hardLimit || 10000);
    const saturated = !!store?.saturated || (Number.isFinite(hardLimit) && hardLimit > 0 && count >= hardLimit);
    const warnReached = !!store?.warnReached
      || saturated
      || (Number.isFinite(warnAt) && warnAt > 0 && count >= warnAt);
    if (saturated) return { level: 'error', tooltip: t('postprod.users.audit.store.saturated') };
    if (warnReached) return { level: 'warn', tooltip: t('postprod.users.audit.store.warn') };
    return null;
  }, [appMode, postprodAudit?.auditLogStore, t]);

  const resolveRendersToModifyNotice = useCallback((countValue = 0) => {
    const countRaw = Number(countValue || 0);
    const count = Number.isFinite(countRaw) && countRaw > 0 ? Math.trunc(countRaw) : 0;
    if (count <= 0) return '';
    if (count === 1) {
      return t(
        'postprod.renders.toModify.noticeSingular',
        '1 rendu à modifier vous est assigné ou vous appartient.'
      );
    }
    return t(
      'postprod.renders.toModify.noticePlural',
      '{count} rendus à modifier vous sont assignés ou vous appartiennent.',
      { count }
    );
  }, [t]);

  const resolveRendersErrorNotice = useCallback((countValue = 0) => {
    const countRaw = Number(countValue || 0);
    const count = Number.isFinite(countRaw) && countRaw > 0 ? Math.trunc(countRaw) : 0;
    if (count <= 0) return '';
    if (count === 1) {
      return t(
        'postprod.renders.error.noticeSingular',
        '1 rendu en erreur vous est assigné ou vous appartient.'
      );
    }
    return t(
      'postprod.renders.error.noticePlural',
      '{count} rendus en erreur vous sont assignés ou vous appartiennent.',
      { count }
    );
  }, [t]);

  const resolveRendersAssignmentNotice = useCallback((countValue = 0) => {
    const countRaw = Number(countValue || 0);
    const count = Number.isFinite(countRaw) && countRaw > 0 ? Math.trunc(countRaw) : 0;
    if (count <= 0) return '';
    if (count === 1) {
      return t(
        'postprod.renders.assignment.noticeSingular',
        '1 nouveau rendu vous est assigné.'
      );
    }
    return t(
      'postprod.renders.assignment.noticePlural',
      '{count} nouveaux rendus vous sont assignés.',
      { count }
    );
  }, [t]);

  const rendersNavAlert = useMemo(() => {
    if (appMode !== APP_MODE_POSTPROD || !postprodAuthenticated) return null;
    const summary = postprodUserAlerts?.summary && typeof postprodUserAlerts.summary === 'object'
      ? postprodUserAlerts.summary
      : null;
    const toModifyCountRaw = Number(summary?.toModifyOpen || 0);
    const toModifyCount = Number.isFinite(toModifyCountRaw) && toModifyCountRaw > 0
      ? Math.trunc(toModifyCountRaw)
      : 0;
    const renderErrorCountRaw = Number(summary?.renderErrorOpen || 0);
    const renderErrorCount = Number.isFinite(renderErrorCountRaw) && renderErrorCountRaw > 0
      ? Math.trunc(renderErrorCountRaw)
      : 0;
    const newAssignmentCountRaw = Number(summary?.newAssignmentOpen || 0);
    const newAssignmentCount = Number.isFinite(newAssignmentCountRaw) && newAssignmentCountRaw > 0
      ? Math.trunc(newAssignmentCountRaw)
      : 0;
    const totalCountRaw = Number(summary?.totalOpen || (toModifyCount + renderErrorCount + newAssignmentCount));
    const totalCount = Number.isFinite(totalCountRaw) && totalCountRaw > 0
      ? Math.trunc(totalCountRaw)
      : (toModifyCount + renderErrorCount + newAssignmentCount);
    if (totalCount <= 0) return null;
    const tooltipLines = [];
    if (toModifyCount > 0) tooltipLines.push(resolveRendersToModifyNotice(toModifyCount));
    if (renderErrorCount > 0) tooltipLines.push(resolveRendersErrorNotice(renderErrorCount));
    if (newAssignmentCount > 0) tooltipLines.push(resolveRendersAssignmentNotice(newAssignmentCount));
    let level = 'warn';
    let message = '';
    if (toModifyCount > 0) {
      level = 'warn';
      message = resolveRendersToModifyNotice(toModifyCount);
    } else if (renderErrorCount > 0) {
      level = 'error';
      message = resolveRendersErrorNotice(renderErrorCount);
    } else if (newAssignmentCount > 0) {
      level = 'warn';
      message = resolveRendersAssignmentNotice(newAssignmentCount);
    }
    return {
      level,
      count: totalCount,
      tooltip: tooltipLines.join('\n'),
      message,
      summary: {
        toModifyCount,
        renderErrorCount,
        newAssignmentCount,
        totalCount,
      },
    };
  }, [
    appMode,
    postprodAuthenticated,
    postprodUserAlerts?.summary,
    resolveRendersToModifyNotice,
    resolveRendersErrorNotice,
    resolveRendersAssignmentNotice,
  ]);

  const rendersTopNoticeText = useMemo(() => {
    if (appMode !== APP_MODE_POSTPROD) return '';
    const text = String(rendersNavAlert?.message || '').trim();
    if (text) return text;
    const tooltip = String(rendersNavAlert?.tooltip || '').trim();
    if (!tooltip) return '';
    const [firstLine] = tooltip.split('\n');
    return String(firstLine || '').trim();
  }, [appMode, rendersNavAlert?.message, rendersNavAlert?.tooltip]);

  useEffect(() => {
    const entries = Array.isArray(logsNavAlert?.entries) ? logsNavAlert.entries : [];
    const prev = logsAlertPrevRef.current;
    if (!entries.length) {
      prev.initialized = true;
      prev.byIp = {};
      return;
    }

    const nextByIp = {};
    for (const entry of entries) {
      const ip = String(entry?.ip || '').trim();
      const st = String(entry?.__state || entry?.state || '').trim().toLowerCase();
      if (!ip || (st !== 'warn' && st !== 'saturated')) continue;
      nextByIp[ip] = st;
    }

    if (prev.initialized) {
      const transitions = [];
      for (const entry of entries) {
        const ip = String(entry?.ip || '').trim();
        const st = String(entry?.__state || entry?.state || '').trim().toLowerCase();
        if (!ip || (st !== 'warn' && st !== 'saturated')) continue;
        const prevState = String(prev.byIp?.[ip] || 'ok').trim().toLowerCase();
        if (prevState === st) continue;
        transitions.push({ entry, st, severity: st === 'saturated' ? 2 : 1 });
      }
      transitions.sort((a, b) => b.severity - a.severity);

      const top = transitions[0] || null;
      if (top) {
        const name = String(top.entry?.name || top.entry?.ip || 'Station').trim();
        const count = Number(top.entry?.logStore?.lineCount || 0);
        const warnAt = Number(top.entry?.logStore?.warnAt || 1500);
        const hardLimit = Number(top.entry?.logStore?.hardLimit || 2000);
        const detail = top.st === 'saturated'
          ? t('logs.storage.saturated', { count, limit: hardLimit })
          : t('logs.storage.warn', { count, warnAt, limit: hardLimit });
        showNotice(`${name}: ${detail}`, top.st === 'saturated' ? 'error' : 'warn');
      }
    }

    prev.initialized = true;
    prev.byIp = nextByIp;
  }, [logsNavAlert, showNotice, t]);

  return { logsNavAlert, usersNavAlert, rendersNavAlert, rendersTopNoticeText };
}

export { usePostprodNavAlerts };
