async function handlePostprodRenderHealthRoutes({
  req,
  res,
  pathname = '',
  parseBody,
  sendJSON,
  requireSession,
  nowIso,
  normalizeRenderHealthEventState,
  normalizeRenderHealthEventKind,
  sanitizeRenderHealthEventLabel,
  sanitizeRenderHealthEventDetail,
  sanitizeRenderHealthEventSource,
  parseIsoDateOrNull,
  audit,
  POSTPROD_RENDER_HEALTH_AUDIT_ACTION,
}) {
  if (pathname !== '/agent/postprod/renders/health-events') return false;

  if (req.method !== 'POST') {
    sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
    return true;
  }
  const auth = requireSession(req, res, sendJSON);
  if (!auth) return true;
  const body = await parseBody(req);
  const now = nowIso();
  const stateRaw = String(body?.state ?? '').trim();
  const state = normalizeRenderHealthEventState(stateRaw, 'info');
  if (stateRaw && !normalizeRenderHealthEventState(stateRaw)) {
    sendJSON(res, 400, { ok: false, error: 'invalid_render_health_event_state' });
    return true;
  }
  const kindRaw = String(body?.kind ?? '').trim();
  const kind = normalizeRenderHealthEventKind(kindRaw, 'general');
  if (kindRaw && !normalizeRenderHealthEventKind(kindRaw)) {
    sendJSON(res, 400, { ok: false, error: 'invalid_render_health_event_kind' });
    return true;
  }
  const label = sanitizeRenderHealthEventLabel(body?.label, state);
  const detail = sanitizeRenderHealthEventDetail(body?.detail);
  const source = sanitizeRenderHealthEventSource(body?.source, 'ui_hub_event');
  const eventId = String(body?.eventId || body?.id || '').trim().slice(0, 160);
  const eventAt = parseIsoDateOrNull(body?.eventAt || body?.at) || now;

  const payload = {
    state,
    kind,
    label,
    detail,
    source,
    eventAt,
    eventId: eventId || null,
  };
  audit(
    auth.session.user_id,
    POSTPROD_RENDER_HEALTH_AUDIT_ACTION,
    payload,
    'render',
    ''
  );
  sendJSON(res, 201, {
    ok: true,
    event: {
      id: eventId || null,
      at: eventAt,
      state,
      kind,
      label,
      detail,
      source,
    },
  });
  return true;
}

module.exports = {
  handlePostprodRenderHealthRoutes,
};
