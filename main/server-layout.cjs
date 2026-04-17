// main/server-layout.cjs
// Layout helpers & routes (extraits de server.cjs)

const { loadProjects, findProjectId, readProjectDoc, writeProjectDoc } = require('./server-projects.cjs');

const MAX_LAYOUTS = 8;
const LAYOUT_NAME_MAX = 24;

function layoutDefaultName(index) {
  return `Layout ${index}`;
}

function normalizeLayoutName(name, fallback) {
  const trimmed = String(name || '').trim().slice(0, LAYOUT_NAME_MAX);
  if (trimmed) return trimmed;
  if (fallback !== undefined) return fallback;
  return layoutDefaultName(1);
}

function createLayoutId(used) {
  let n = 1;
  while (used.has(`layout-${n}`)) n += 1;
  return `layout-${n}`;
}

function normalizeLayouts(rawLayouts, fallbackLayout) {
  const list = Array.isArray(rawLayouts) ? rawLayouts : [];
  const used = new Set();
  const layouts = list.map((l, idx) => {
    let id = String(l?.id || '').trim();
    if (!id || used.has(id)) {
      id = createLayoutId(used);
    }
    used.add(id);
    const fallbackName = layoutDefaultName(idx + 1);
    const name = normalizeLayoutName(l?.name, fallbackName);
    const layout = Array.isArray(l?.layout) ? l.layout : [];
    const color = String(l?.color || '#1F2937').trim() || '#1F2937';
    const isStart = !!l?.isStart;
    return { id, name, layout, color, isStart };
  });

  if (!layouts.length) {
    const fallback = Array.isArray(fallbackLayout) ? fallbackLayout : [];
    const id = createLayoutId(used);
    layouts.push({
      id,
      name: layoutDefaultName(1),
      layout: fallback,
      color: '#1F2937',
      isStart: false,
    });
  }

  return layouts;
}

function resolveActiveLayoutId(rawId, layouts) {
  const val = String(rawId || '').trim();
  if (val && layouts.some((l) => l.id === val)) return val;
  return layouts[0]?.id || '';
}

function normalizeLayoutDoc(doc = {}) {
  const layouts = normalizeLayouts(doc.layouts, doc.layout);
  const activeLayoutId = resolveActiveLayoutId(
    doc.activeLayoutId || doc.layoutId,
    layouts
  );
  return { layouts, activeLayoutId };
}

function ensureSingleStartLayout(layouts, requestedId, requestedValue) {
  let found = false;
  const targetId = String(requestedId || '').trim();
  const wantStart = requestedValue === true;
  const next = layouts.map((l) => {
    let isStart = !!l.isStart;
    if (targetId && l.id === targetId) {
      // Demande explicite sur ce layout
      if (wantStart) {
        isStart = true;
      } else if (requestedValue === false) {
        isStart = false;
      }
    }
    if (isStart) {
      if (found && wantStart) {
        isStart = false;
      } else {
        found = true;
      }
    }
    return { ...l, isStart };
  });

  if (!found && next.length > 0 && wantStart && targetId) {
    return next.map((l) => (l.id === targetId ? { ...l, isStart: true } : { ...l, isStart: false }));
  }
  return next;
}

function isDuplicateLayoutName(layouts, name, ignoreId = '') {
  const target = String(name || '').trim().toLowerCase();
  if (!target) return false;
  return layouts.some((l) => {
    if (!l || String(l.id || '') === String(ignoreId || '')) return false;
    const n = String(l.name || '').trim().toLowerCase();
    return n === target;
  });
}

function pickActiveLayout(layouts, activeLayoutId) {
  return (
    layouts.find((l) => l.id === activeLayoutId) ||
    layouts[0] || { id: '', name: '', layout: [] }
  );
}


async function handleLayoutRoutes(req, res, url, ctx = {}) {
  const { sendJSON, parseBody, logLine, tinyHash } = ctx;
  // Routes layout extraites de server.cjs

  // ---- Layout GET/POST (fichiers data/production/<projectId>.json) ----
  if (url.pathname === '/agent/layout') {
    const pj = loadProjects();

    // GET /agent/layout?projectId=<id|name>
    if (req.method === 'GET') {
      let q = String(url.searchParams.get('projectId') || '').trim();
      let pid = q ? findProjectId(pj, q) : '';
      if (!pid) pid = pj.activeId || '';

      // Pas de projet actif → on renvoie un layout vide
      if (!pid) {
        return sendJSON(res, 200, {
          ok: true,
          projectId: '',
          name: '',
          layout: [],
          layouts: [],
          activeLayoutId: '',
          preset: null,
        });
      }

      const proj = pj.projects.find(p => p.id === pid);
      const doc = readProjectDoc(pid) || {};
      const { layouts, activeLayoutId } = normalizeLayoutDoc(doc);
      const preset = (doc.preset && typeof doc.preset === 'object') ? doc.preset : null;

      return sendJSON(res, 200, {
        ok: true,
        projectId: pid,
        name: proj?.name || doc.nameAtSave || '',
        layoutId: activeLayoutId,
        activeLayoutId,
        layout: [],
        layouts,
        preset,
      });
    }

    // POST /agent/layout?projectId=<id|name>
    if (req.method === 'POST') {
      const started = Date.now();
      const body = await parseBody(req);
      let q = String(url.searchParams.get('projectId') || '').trim();
      let pid = q ? findProjectId(pj, q) : '';
      if (!pid) pid = pj.activeId || '';

      if (!pid) {
        return sendJSON(res, 400, { ok: false, error: 'unknown or missing projectId' });
      }

      const prevDoc = readProjectDoc(pid) || {};
      const proj = pj.projects.find(p => p.id === pid);
      const { layouts, activeLayoutId } = normalizeLayoutDoc(prevDoc);
      let nextLayouts = layouts.map((l) => ({
        ...l,
        layout: Array.isArray(l.layout) ? l.layout : [],
        color: String(l.color || '#1F2937').trim() || '#1F2937',
        isStart: !!l.isStart,
      }));
      let nextActiveId = activeLayoutId;

      const action = String(body?.action || '').trim().toLowerCase();
      const queryLayoutId = String(url.searchParams.get('layoutId') || '').trim();
      let targetLayoutId = String(body?.layoutId || body?.id || queryLayoutId || '').trim();

      const findLayoutIndex = (id) =>
        nextLayouts.findIndex((l) => String(l.id || '').trim() === id);

      const pickLayoutById = (id) => {
        const idx = findLayoutIndex(id);
        return idx >= 0 ? nextLayouts[idx] : null;
      };

      logLine({
        level: 'info',
        src: 'projects',
        action: 'layout_save_request',
        message: `Layout save request for project ${pid}`,
        data: {
          projectId: pid,
          action,
          targetLayoutId,
          layoutLen: Array.isArray(body?.layout) ? body.layout.length : null
        }
      });

      if (action === 'add') {
        if (nextLayouts.length >= MAX_LAYOUTS) {
          return sendJSON(res, 400, { ok: false, error: 'max_layouts' });
        }
        const used = new Set(nextLayouts.map((l) => l.id));
        const id = createLayoutId(used);
        const fallbackName = layoutDefaultName(nextLayouts.length + 1);
        const name = normalizeLayoutName(body?.name, fallbackName);
        if (isDuplicateLayoutName(nextLayouts, name)) {
          return sendJSON(res, 400, { ok: false, error: 'duplicate_layout_name' });
        }
        nextLayouts.push({ id, name, layout: [], color: '#1F2937', isStart: false });
        nextActiveId = id;
      } else if (action === 'duplicate') {
        if (nextLayouts.length >= MAX_LAYOUTS) {
          return sendJSON(res, 400, { ok: false, error: 'max_layouts' });
        }
        const sourceId = targetLayoutId || nextActiveId;
        const source = pickLayoutById(sourceId);
        if (!source) {
          return sendJSON(res, 400, { ok: false, error: 'unknown_layout' });
        }
        const used = new Set(nextLayouts.map((l) => l.id));
        const id = createLayoutId(used);
        const fallbackName = layoutDefaultName(nextLayouts.length + 1);
        const name = normalizeLayoutName(body?.name, fallbackName);
        if (isDuplicateLayoutName(nextLayouts, name)) {
          return sendJSON(res, 400, { ok: false, error: 'duplicate_layout_name' });
        }
        const cloneLayout = Array.isArray(source.layout)
          ? JSON.parse(JSON.stringify(source.layout))
          : [];
        const insertAt = findLayoutIndex(source.id);
        const nextEntry = { id, name, layout: cloneLayout, color: source.color || '#1F2937', isStart: false };
        if (insertAt >= 0) {
          nextLayouts.splice(insertAt + 1, 0, nextEntry);
        } else {
          nextLayouts.push(nextEntry);
        }
        nextActiveId = id;
      } else if (action === 'delete') {
        if (nextLayouts.length <= 1) {
          return sendJSON(res, 400, { ok: false, error: 'min_layouts' });
        }
        const id = targetLayoutId || nextActiveId;
        const idx = findLayoutIndex(id);
        if (idx < 0) {
          return sendJSON(res, 400, { ok: false, error: 'unknown_layout' });
        }
        nextLayouts.splice(idx, 1);
        if (id === nextActiveId) {
          const fallback =
            nextLayouts[idx] || nextLayouts[idx - 1] || nextLayouts[0];
          nextActiveId = fallback ? fallback.id : '';
        }
      } else if (action === 'rename') {
        const id = targetLayoutId;
        const nextName = normalizeLayoutName(body?.name, '');
        if (!id || !nextName) {
          return sendJSON(res, 400, { ok: false, error: 'invalid_layout_name' });
        }
        const entry = pickLayoutById(id);
        if (!entry) {
          return sendJSON(res, 400, { ok: false, error: 'unknown_layout' });
        }
        if (isDuplicateLayoutName(nextLayouts, nextName, id)) {
          return sendJSON(res, 400, { ok: false, error: 'duplicate_layout_name' });
        }
        entry.name = nextName;
      } else if (action === 'update-meta') {
        const id = targetLayoutId;
        const entry = pickLayoutById(id);
        if (!entry) {
          return sendJSON(res, 400, { ok: false, error: 'unknown_layout' });
        }
        if (Object.prototype.hasOwnProperty.call(body || {}, 'name')) {
          const nextName = normalizeLayoutName(body?.name, entry.name);
          if (isDuplicateLayoutName(nextLayouts, nextName, id)) {
            return sendJSON(res, 400, { ok: false, error: 'duplicate_layout_name' });
          }
          entry.name = nextName;
        }
        if (Object.prototype.hasOwnProperty.call(body || {}, 'color')) {
          const nextColor = String(body.color || '#1F2937').trim() || '#1F2937';
          entry.color = nextColor;
        }
        if (Object.prototype.hasOwnProperty.call(body || {}, 'isStart')) {
          const wantStart = !!body.isStart;
      nextLayouts = ensureSingleStartLayout(nextLayouts, id, wantStart);
    }
  } else if (action === 'reorder') {
    const order = Array.isArray(body?.order) ? body.order : [];
    const map = new Map(nextLayouts.map((l) => [l.id, l]));
        const next = [];
        for (const rawId of order) {
          const id = String(rawId || '').trim();
          if (!id || !map.has(id)) continue;
          next.push(map.get(id));
          map.delete(id);
        }
        for (const l of nextLayouts) {
          if (map.has(l.id)) next.push(l);
        }
        if (next.length) nextLayouts = next;
      } else if (action === 'set-active') {
        const id = targetLayoutId;
        if (!id || !pickLayoutById(id)) {
          return sendJSON(res, 400, { ok: false, error: 'unknown_layout' });
        }
        nextActiveId = id;
      } else {
        const hasLayout = Array.isArray(body?.layout);
        if (!hasLayout) {
          return sendJSON(res, 400, { ok: false, error: 'missing_layout' });
        }
        if (!targetLayoutId || !pickLayoutById(targetLayoutId)) {
          targetLayoutId = nextActiveId || nextLayouts[0]?.id || '';
        }
        const entry = pickLayoutById(targetLayoutId);
        if (!entry) {
          return sendJSON(res, 400, { ok: false, error: 'unknown_layout' });
        }
        entry.layout = body.layout;
        if (Object.prototype.hasOwnProperty.call(body || {}, 'color')) {
          entry.color = String(body.color || '#1F2937').trim() || '#1F2937';
        }
        if (Object.prototype.hasOwnProperty.call(body || {}, 'isStart')) {
          entry.isStart = !!body.isStart;
        }
        nextActiveId = entry.id;
      }

      nextActiveId = resolveActiveLayoutId(nextActiveId, nextLayouts);
      nextLayouts = ensureSingleStartLayout(nextLayouts);
      const baseDoc = prevDoc && typeof prevDoc === 'object' ? prevDoc : {};
      const nextDoc = {
        ...baseDoc,
        projectId: pid,
        nameAtSave: proj?.name || baseDoc.nameAtSave || '',
        layouts: nextLayouts,
        activeLayoutId: nextActiveId
      };
      // On supprime le champ legacy "layout" pour ne garder que "layouts"
      delete nextDoc.layout;

      try {
        writeProjectDoc(pid, nextDoc);
        // Pas de log succès pour éviter le bruit ; on garde uniquement les erreurs
      } catch (e) {
        logLine({
          level: 'error',
          src: 'projects',
          action: 'save_layout',
          message: `Failed to save production layout for project ${pid}`,
          data: { error: String(e?.message || e) }
        });
      }

      logLine({
        level: 'info',
        src: 'projects',
        action: 'layout_save_response',
        message: `Layout save response for project ${pid}`,
        data: {
          projectId: pid,
          action,
          durationMs: Date.now() - started,
          layoutId: nextActiveId,
          layoutsCount: nextLayouts.length
        }
      });

      return sendJSON(res, 200, {
        ok: true,
        projectId: pid,
        name: proj?.name || baseDoc.nameAtSave || '',
        layoutId: nextActiveId,
        activeLayoutId: nextActiveId,
        layout: [],
        layouts: nextLayouts
      });
    }
  }

  // ---- Snapshot du preset (stocké dans le même fichier que le layout)
  // POST /agent/layout/preset-snapshot?projectId=<id|name>&ip=...&port=...&preset=...
  if (url.pathname === '/agent/layout/preset-snapshot' && req.method === 'POST') {
    const pj = loadProjects();
    const q = String(url.searchParams.get('projectId') || '').trim();
    const pid = findProjectId(pj, q);
    if (!pid) return sendJSON(res, 400, { ok:false, error:'unknown or missing projectId' });

    const ip = String(url.searchParams.get('ip') || '').trim();
    const port = String(url.searchParams.get('port') || '').trim();
    const presetName = String(url.searchParams.get('preset') || '').trim();
    if (!ip || !port || !presetName) {
      return sendJSON(res, 400, { ok:false, error:'missing ip|port|preset' });
    }

    const wrcUrl = `http://${ip}:${port}/remote/preset/${encodeURIComponent(presetName)}`;
    const r = await fetch(wrcUrl);
    if (!r.ok) return sendJSON(res, 502, { ok:false, error:`WRC ${r.status}` });
    const data = await r.json().catch(()=> ({}));
    const hash = tinyHash(JSON.stringify(data || {}));

    const prev = readProjectDoc(pid) || {};
    const proj = pj.projects.find(p => p.id === pid);
    const { layouts, activeLayoutId } = normalizeLayoutDoc(prev);
    const activeLayout = pickActiveLayout(layouts, activeLayoutId);
    const baseDoc = prev && typeof prev === 'object' ? prev : {};
    const prevPresets = baseDoc.presets && typeof baseDoc.presets === 'object' ? baseDoc.presets : {};
    const ts = new Date().toISOString();
    const doc = {
      ...baseDoc,
      projectId: pid,
      nameAtSave: proj?.name || baseDoc.nameAtSave || '',
      layouts,
      activeLayoutId,
      layout: Array.isArray(activeLayout?.layout) ? activeLayout.layout : [],
      presets: { ...prevPresets, [presetName]: { presetName, ts, presetHash: hash, data } }
    };
    try {
      writeProjectDoc(pid, doc);
    } catch (e) {
      logLine({ level: 'error', src: 'projects', action: 'preset_snapshot', message: `Failed to save preset snapshot for project ${pid}`, data: { error: String(e?.message || e) } });
    }
    return sendJSON(res, 200, { ok:true, projectId: pid, ts, presetHash: hash });
  }

  return false;
}

module.exports = { handleLayoutRoutes, normalizeLayoutDoc, pickActiveLayout };
