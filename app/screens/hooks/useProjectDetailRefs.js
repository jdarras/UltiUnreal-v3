import { useRef } from 'react';

export function useProjectDetailRefs() {
  const detailMetaRef = useRef(null);
  const detailNoteRef = useRef(null);
  const detailSavedNoteRef = useRef('');
  const detailNoteDirtyRef = useRef(false);
  const keywordsDirtyRef = useRef(false);
  const projectDropdownDirtyRef = useRef(false);
  const renderBridgeAutoInstallAttemptRef = useRef(new Set());
  const saveTimer = useRef(null);
  const projectVersionTimer = useRef(null);

  return {
    detailMetaRef,
    detailNoteRef,
    detailSavedNoteRef,
    detailNoteDirtyRef,
    keywordsDirtyRef,
    projectDropdownDirtyRef,
    renderBridgeAutoInstallAttemptRef,
    saveTimer,
    projectVersionTimer,
  };
}

export default useProjectDetailRefs;
