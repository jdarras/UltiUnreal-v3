import React from 'react';
import { normalizeSearch } from './normalize';

function splitCommaValues(value) {
  return normalizeSearch(value)
    .split(/[,;\n]+/)
    .map((val) => String(val || '').trim())
    .filter(Boolean)
    .map((val) => normalizeSearch(val));
}

function listIncludes(list, term) {
  const t = normalizeSearch(term);
  if (!t) return true;
  return (Array.isArray(list) ? list : []).some((val) => normalizeSearch(val).includes(t));
}

function matchMulti(selected, candidate) {
  const sel = Array.isArray(selected) ? selected.filter(Boolean) : (selected ? [selected] : []);
  if (sel.length === 0) return true;
  const candidates = Array.isArray(candidate) ? candidate : [candidate];
  const candSet = new Set(
    candidates
      .map((c) => normalizeSearch(c))
      .filter(Boolean)
  );
  return sel.some((v) => candSet.has(normalizeSearch(v)));
}

export default function useFilteredProjects(projects, sortMode, sortDir, searchQuery, searchAdvanced, quickFilters = {}) {
  const sortedProjects = React.useMemo(() => {
    const arr = [...projects];

    if (sortMode === 'name') {
      arr.sort((a, b) =>
        String(a.name || '').localeCompare(
          String(b.name || ''),
          'fr',
          { sensitivity: 'base' }
        ) * (sortDir === 'desc' ? -1 : 1)
      );
    } else if (sortMode === 'createdAt') {
      arr.sort((a, b) =>
        String(a.createdAt || '').localeCompare(String(b.createdAt || ''))
      );
      if (sortDir === 'desc') arr.reverse();
    } else if (sortMode === 'lastModified') {
      arr.sort((a, b) =>
        String(a.lastModified || '').localeCompare(String(b.lastModified || ''))
      );
      if (sortDir === 'desc') arr.reverse();
    } else if (sortMode === 'engineVersion') {
      arr.sort((a, b) =>
        String(a.engineVersion || '').localeCompare(String(b.engineVersion || ''), 'fr', { sensitivity: 'base' })
      );
      if (sortDir === 'desc') arr.reverse();
    } else if (sortMode === 'status') {
      arr.sort((a, b) =>
        String(a.metaStatus || '').localeCompare(String(b.metaStatus || ''), 'fr', { sensitivity: 'base' })
      );
      if (sortDir === 'desc') arr.reverse();
    } else if (sortMode === 'id') {
      arr.sort((a, b) =>
        String(a.id || '').localeCompare(String(b.id || ''))
      );
      if (sortDir === 'desc') arr.reverse();
    }

    return arr;
  }, [projects, sortMode, sortDir]);

  const filteredProjects = React.useMemo(() => {
    const q = normalizeSearch(searchQuery);
    const adv = searchAdvanced || {};
    const quickFav = !!quickFilters.favorite;
    return sortedProjects.filter((p) => {
      const refs = p.metaReferents || {};
      const kw = Array.isArray(p.metaKeywords) ? p.metaKeywords : [];
      const kwJoined = kw.map((k) => normalizeSearch(k));
      const directorList = splitCommaValues(refs.director);
      const technicianList = splitCommaValues(refs.technician);
      const operatorList = splitCommaValues(refs.operator);
      const journalistList = splitCommaValues(refs.journalist);
      const haystacks = [
        normalizeSearch(p.id),
        normalizeSearch(p.name),
        normalizeSearch(p.engineVersion),
        normalizeSearch(p.note),
        normalizeSearch(p.metaStatus),
        normalizeSearch(p.metaType),
        normalizeSearch(p.metaUsageMode),
        normalizeSearch(p.metaCategory),
        normalizeSearch(p.metaFileVersion),
        normalizeSearch(refs.director),
        normalizeSearch(refs.technician),
        normalizeSearch(refs.operator),
        normalizeSearch(refs.journalist),
        kwJoined.join(' '),
      ];

      if (q) {
        const matchGlobal = haystacks.some((f) => f.includes(q));
        if (!matchGlobal) return false;
      }

      const statusMatch = matchMulti(adv.status, p.metaStatus);
      const typeMatch = matchMulti(adv.type, p.metaType);
      const usageModeMatch = matchMulti(adv.usageMode, p.metaUsageMode);
      const engineVersionMatch = matchMulti(adv.engineVersion, p.engineVersion);
      const directorMatch = !adv.director || listIncludes(directorList, adv.director);
      const techMatch = !adv.technician || listIncludes(technicianList, adv.technician);
      const opMatch = !adv.operator || listIncludes(operatorList, adv.operator);
      const jourMatch = !adv.journalist || listIncludes(journalistList, adv.journalist);
      const tagsMatch = !adv.tags || kwJoined.some((k) => k.includes(normalizeSearch(adv.tags)));

      if (quickFav && p.favorite !== true) return false;

      return statusMatch && typeMatch && usageModeMatch && engineVersionMatch && directorMatch && techMatch && opMatch && jourMatch && tagsMatch;
    });
  }, [sortedProjects, searchQuery, searchAdvanced, quickFilters]);

  return { sortedProjects, filteredProjects };
}
