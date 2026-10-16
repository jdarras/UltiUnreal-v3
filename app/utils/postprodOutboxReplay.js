// Rejeu des files hors ligne : la boucle ne produit qu'un constat par identifiant
// (entrées retirées, entrées modifiées). Ce constat est ensuite appliqué à l'état
// courant de la file, pour conserver les entrées ajoutées pendant le rejeu.

function entryIdOf(entry) {
  return String(entry?.id || '');
}

function buildFailedAttemptPatch(entry, err, extra = {}) {
  const attempts = Number(entry?.attempts || 0);
  return {
    ...extra,
    attempts: Number.isFinite(attempts) ? Math.max(0, Math.trunc(attempts)) + 1 : 1,
    lastAttemptAt: new Date().toISOString(),
    lastError: String(err?.message || err?.code || 'network_error').trim().slice(0, 200),
  };
}

function applyOutboxReplayOutcome(current = [], { removedIds = new Set(), patchesById = new Map() } = {}) {
  const list = Array.isArray(current) ? current : [];
  const out = [];
  for (const entry of list) {
    const id = entryIdOf(entry);
    if (removedIds.has(id)) continue;
    const patch = patchesById.get(id);
    out.push(patch ? { ...entry, ...patch } : entry);
  }
  return out;
}

async function runOfflineOutboxReplay({
  token = '',
  currentUserId = null,
  outbox = [],
  createRender,
  isRecoverableError,
} = {}) {
  const removedIds = new Set();
  const patchesById = new Map();
  let replayed = 0;
  let dropped = 0;
  let stoppedOnRecoverableError = false;
  for (const entry of Array.isArray(outbox) ? outbox : []) {
    if (entry?.kind !== 'create_render') continue;
    if (currentUserId != null && entry?.userId != null && Number(entry.userId) !== currentUserId) {
      continue;
    }
    const id = entryIdOf(entry);
    try {
      await createRender(token, entry.payload || {});
      replayed += 1;
      removedIds.add(id);
    } catch (err) {
      if (isRecoverableError(err)) {
        stoppedOnRecoverableError = true;
        patchesById.set(id, buildFailedAttemptPatch(entry, err));
        break;
      }
      dropped += 1;
      removedIds.add(id);
    }
  }
  return { replayed, dropped, stoppedOnRecoverableError, removedIds, patchesById };
}

async function runWorkerCompletionOutboxReplay({
  token = '',
  workerKey = '',
  entries = [],
  getRenderJob,
  completeRenderJob,
  canReplay,
  buildReplayPayload,
  isRecoverableError,
} = {}) {
  const removedIds = new Set();
  const patchesById = new Map();
  let replayed = 0;
  let dropped = 0;
  let stoppedOnRecoverableError = false;
  for (const entry of Array.isArray(entries) ? entries : []) {
    const renderId = Number(entry?.renderId || 0);
    if (!Number.isFinite(renderId) || renderId <= 0) continue;
    const id = entryIdOf(entry);
    let completionPayload = entry?.payload && typeof entry.payload === 'object'
      ? entry.payload
      : {};
    try {
      const renderRes = await getRenderJob(token, renderId, 8000);
      const renderJob = renderRes?.render && typeof renderRes.render === 'object'
        ? renderRes.render
        : (renderRes?.renderJob && typeof renderRes.renderJob === 'object' ? renderRes.renderJob : null);
      if (!canReplay(renderJob, workerKey)) {
        dropped += 1;
        removedIds.add(id);
        continue;
      }
      completionPayload = buildReplayPayload(completionPayload, renderJob, workerKey);
      await completeRenderJob(token, renderId, completionPayload);
      replayed += 1;
      removedIds.add(id);
    } catch (err) {
      if (isRecoverableError(err)) {
        stoppedOnRecoverableError = true;
        patchesById.set(id, buildFailedAttemptPatch(entry, err, { payload: completionPayload }));
        break;
      }
      dropped += 1;
      removedIds.add(id);
    }
  }
  return { replayed, dropped, stoppedOnRecoverableError, removedIds, patchesById };
}

export {
  applyOutboxReplayOutcome,
  runOfflineOutboxReplay,
  runWorkerCompletionOutboxReplay,
};
