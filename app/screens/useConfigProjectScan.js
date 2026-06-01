import { useEffect, useState } from 'react';
import { postProjectsScan, postProjectsImport } from '../utils/agent';
import { normalizePathKey, normalizeProjectRoots } from './configurationHelpers';
import { useTransientInfo } from './hooks/useTransientInfo';

function deriveNameFromPath(p) {
  const file = String(p || '').split(/[\\/]/).pop() || '';
  return file.replace(/\.uproject$/i, '');
}

function useConfigProjectScan({ t, projectRootsRef, refreshCatalogStats, onNavigate }) {
  const {
    infoMsg: projectScanMsg,
    infoMsgType: projectScanMsgType,
    showInfo: showProjectScanMsg,
    clearInfo: clearProjectScanMsg,
  } = useTransientInfo({ defaultType: 'error', clearAfterMs: 3000 });
  const [projectScanBusy, setProjectScanBusy] = useState(false);
  const [projectScanRecursive, setProjectScanRecursive] = useState(true);
  const [projectScanResults, setProjectScanResults] = useState([]);
  const [projectImportBusy, setProjectImportBusy] = useState(false);
  const [hideImportedProjects, setHideImportedProjects] = useState(() => {
    try {
      const stored = localStorage.getItem('uu_hide_imported_projects');
      if (stored === 'true') return true;
      if (stored === 'false') return false;
    } catch {}
    return false;
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        'uu_hide_imported_projects',
        hideImportedProjects ? 'true' : 'false'
      );
    } catch {}
  }, [hideImportedProjects]);

  async function handleProjectScan() {
    const cleaned = normalizeProjectRoots(projectRootsRef.current);
    if (cleaned.length === 0) {
      showProjectScanMsg(t('setup.server.projectRoots.empty'), 'error', 2500);
      setProjectScanResults([]);
      return;
    }

    setProjectScanBusy(true);
    clearProjectScanMsg();

    try {
      const res = await postProjectsScan({
        project_roots: cleaned,
        recursive: projectScanRecursive,
      });
      const items = Array.isArray(res?.items) ? res.items : [];
      const normalized = items.map((it) => {
        const up = String(it?.uprojectPath || it?.uproject || it?.path || '').trim();
        const name = String(it?.name || '').trim() || deriveNameFromPath(up);
        const exists = !!it?.exists;
        return {
          name,
          uprojectPath: up,
          exists,
          selected: !exists,
        };
      });

      const found = normalized.length;
      const existing = normalized.filter((it) => it.exists).length;
      setProjectScanResults(normalized);
      showProjectScanMsg(
        t('setup.server.projectRoots.scanResult', { found, existing }),
        'ok'
      );
    } catch {
      setProjectScanResults([]);
      showProjectScanMsg(t('setup.server.projectRoots.scanError'), 'error');
    } finally {
      setProjectScanBusy(false);
    }
  }

  async function handleProjectImport() {
    const selected = projectScanResults.filter((it) => it.selected && !it.exists);
    if (selected.length === 0) {
      showProjectScanMsg(t('setup.server.projectRoots.noSelection'), 'error', 2500);
      return;
    }

    setProjectImportBusy(true);
    clearProjectScanMsg();

    try {
      const res = await postProjectsImport({
        uprojectPaths: selected.map((it) => it.uprojectPath),
      });
      const imported = Number(res?.imported || 0);
      const skipped = Number(res?.skipped || 0);
      const importedSet = new Set(
        (Array.isArray(res?.importedPaths) ? res.importedPaths : [])
          .map((p) => normalizePathKey(p))
          .filter(Boolean)
      );
      const skippedSet = new Set(
        (Array.isArray(res?.skippedPaths) ? res.skippedPaths : [])
          .map((p) => normalizePathKey(p))
          .filter(Boolean)
      );
      setProjectScanResults((prev) =>
        prev.map((it) => {
          const key = normalizePathKey(it.uprojectPath);
          if (importedSet.has(key) || skippedSet.has(key)) {
            return { ...it, exists: true, selected: false };
          }
          return it;
        })
      );
      showProjectScanMsg(
        t('setup.server.projectRoots.importResult', { imported, skipped }),
        'ok'
      );
      refreshCatalogStats?.();
      if (imported > 0 && typeof onNavigate === 'function') {
        onNavigate('Projets', { force: true });
      }
    } catch {
      showProjectScanMsg(t('setup.server.projectRoots.importError'), 'error');
    } finally {
      setProjectImportBusy(false);
    }
  }

  const selectableScanCount = projectScanResults.filter((it) => !it.exists).length;
  const allSelectableSelected =
    selectableScanCount > 0 &&
    projectScanResults.every((it) => it.exists || it.selected);
  const visibleScanResults = hideImportedProjects
    ? projectScanResults.filter((it) => !it.exists)
    : projectScanResults;

  return {
    projectScanMsg,
    projectScanMsgType,
    projectScanBusy,
    projectScanRecursive,
    setProjectScanRecursive,
    projectScanResults,
    setProjectScanResults,
    projectImportBusy,
    hideImportedProjects,
    setHideImportedProjects,
    handleProjectScan,
    handleProjectImport,
    selectableScanCount,
    allSelectableSelected,
    visibleScanResults,
  };
}

export { useConfigProjectScan };
