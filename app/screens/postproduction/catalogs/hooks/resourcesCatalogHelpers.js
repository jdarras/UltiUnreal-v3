import { safeT } from "../../shared/helpers";
import { buildResourceThumbCandidates } from "../helpers/resourceThumbs";

export function resolveResourcesSourceLabel(t, source = "") {
  const resourcesSource = String(source || "").trim().toLowerCase();
  if (resourcesSource === "resources_index") {
    return safeT(
      t,
      "postprod.resources.source.resources_index",
      "Index SQLite dedie (`resources_index`)"
    );
  }
  if (resourcesSource === "library_mirror") {
    return safeT(
      t,
      "postprod.resources.source.library_mirror",
      "Miroir de la brique Ressources existante"
    );
  }
  if (resourcesSource) return resourcesSource;
  return safeT(t, "postprod.resources.source.unknown", "Indeterminee");
}

export function resolveResourcesSyncStateLabel(t, resourcesSync = null, reason = "") {
  const resourcesSyncReason = String(reason || "").trim();
  if (!resourcesSync) {
    return safeT(t, "postprod.resources.sync.none", "Aucune synchro.");
  }
  if (resourcesSync.busy === true) {
    return safeT(t, "postprod.resources.sync.busy", "Synchro en cours...");
  }
  if (resourcesSync.skipped === true && resourcesSyncReason === "interval") {
    return safeT(t, "postprod.resources.sync.interval", "Synchro auto (intervalle).");
  }
  if (resourcesSync.ok === true) {
    return safeT(t, "postprod.resources.sync.ok", "Synchro index OK.");
  }
  return safeT(t, "postprod.resources.sync.error", "Synchro index en erreur.");
}

export function resolveResourcesSyncCountersLabel(t, resourcesSync = null) {
  if (!resourcesSync || resourcesSync.ok !== true) return "";
  const processed = Number.isFinite(Number(resourcesSync?.processed))
    ? Number(resourcesSync.processed)
    : null;
  const inserted = Number.isFinite(Number(resourcesSync?.inserted))
    ? Number(resourcesSync.inserted)
    : null;
  const updated = Number.isFinite(Number(resourcesSync?.updated))
    ? Number(resourcesSync.updated)
    : null;
  if (processed == null || inserted == null || updated == null) return "";
  return safeT(
    t,
    "postprod.resources.sync.counters",
    "Traites: {processed} | Ajoutes: {inserted} | MAJ: {updated}",
    { processed, inserted, updated }
  );
}

function buildLinkedCountsByResourceRef(tasks = []) {
  const linkedCountsByResourceRef = new Map();
  const taskList = Array.isArray(tasks) ? tasks : [];
  for (const task of taskList) {
    const refsRaw = Array.isArray(task?.resourceRefs) ? task.resourceRefs : [];
    if (refsRaw.length === 0) continue;
    const uniqueRefs = new Set(
      refsRaw
        .map((ref) => String(ref || "").trim())
        .filter(Boolean)
    );
    for (const ref of uniqueRefs) {
      linkedCountsByResourceRef.set(
        ref,
        Number(linkedCountsByResourceRef.get(ref) || 0) + 1
      );
    }
  }
  return linkedCountsByResourceRef;
}

export function buildNormalizedResources(resources = [], tasks = []) {
  const linkedCountsByResourceRef = buildLinkedCountsByResourceRef(tasks);
  const list = Array.isArray(resources) ? resources : [];
  return list
    .map((entry) => {
      const uid = String(entry?.uid || entry?.listingUid || "").trim();
      const title = String(entry?.title || entry?.name || entry?.displayName || "").trim();
      const type = String(entry?.type || entry?.listingType || "").trim();
      const sourcePath = String(entry?.sourcePath || entry?.path || "").trim();
      const ref = uid || title;
      return {
        ref,
        uid,
        title,
        type,
        sourcePath,
        listingUrl: String(entry?.listingUrl || "").trim(),
        seller: String(entry?.seller || "").trim(),
        thumbCandidates: buildResourceThumbCandidates(entry),
        linkedTasksCount: (() => {
          let total = 0;
          if (uid) total += Number(linkedCountsByResourceRef.get(uid) || 0);
          if (title && title !== uid) total += Number(linkedCountsByResourceRef.get(title) || 0);
          return total;
        })(),
        raw: entry && typeof entry === "object" ? entry : {},
      };
    })
    .filter((entry) => entry.ref)
    .sort((a, b) => String(a?.title || a?.uid || "").localeCompare(String(b?.title || b?.uid || "")));
}

export function filterResources(resources = [], search = "", linkedTasksFilter = "all") {
  const needle = String(search || "").trim().toLowerCase();
  let list = Array.isArray(resources) ? resources : [];
  if (needle) {
    list = list.filter((entry) => {
      const haystack = [
        entry.ref,
        entry.uid,
        entry.title,
        entry.type,
        entry.sourcePath,
      ].map((part) => String(part || "").toLowerCase());
      return haystack.some((part) => part.includes(needle));
    });
  }
  if (linkedTasksFilter === "with_tasks") {
    list = list.filter((entry) => Number(entry?.linkedTasksCount || 0) > 0);
  } else if (linkedTasksFilter === "without_tasks") {
    list = list.filter((entry) => Number(entry?.linkedTasksCount || 0) <= 0);
  }
  return list;
}

export function buildResourceDetailSnapshot(detail = null, selectedFallback = null) {
  const detailObj = detail && typeof detail === "object" ? detail : (selectedFallback?.raw || null);
  const detailUid = String(detailObj?.uid || detailObj?.listingUid || selectedFallback?.uid || "").trim();
  const detailTitle = String(detailObj?.title || detailObj?.name || detailObj?.displayName || selectedFallback?.title || "").trim();
  const detailType = String(detailObj?.type || detailObj?.listingType || selectedFallback?.type || "").trim();
  const detailSourcePath = String(detailObj?.sourcePath || detailObj?.path || selectedFallback?.sourcePath || "").trim();
  const detailListingUrl = String(detailObj?.listingUrl || "").trim();
  const detailSeller = String(detailObj?.seller || selectedFallback?.seller || "").trim();
  const detailThumbCandidates = (() => {
    if (detailObj && typeof detailObj === "object") {
      const candidates = buildResourceThumbCandidates(detailObj);
      if (candidates.length > 0) return candidates;
    }
    return selectedFallback?.thumbCandidates || [];
  })();
  const detailLinkedTasksCount = Number.isFinite(Number(selectedFallback?.linkedTasksCount))
    ? Number(selectedFallback.linkedTasksCount)
    : 0;

  return {
    detailObj,
    detailUid,
    detailTitle,
    detailType,
    detailSourcePath,
    detailListingUrl,
    detailSeller,
    detailThumbCandidates,
    detailLinkedTasksCount,
  };
}
