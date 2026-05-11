import { useEffect, useRef } from 'react';

export function useResourceDetailRefs() {
  const aliveRef = useRef(true);
  const detailNoteRef = useRef(null);
  const detailNoteDirtyRef = useRef(false);
  const detailNoteFocusedRef = useRef(false);
  const detailTagsRef = useRef(null);
  const detailTagsDirtyRef = useRef(false);
  const detailSavedRef = useRef('');
  const detailSavedNoteRef = useRef('');
  const detailSaveTimer = useRef(null);
  const detailPendingRef = useRef(null);
  const detailSavingRef = useRef(false);
  const detailInitRef = useRef('');
  const detailDropdownDirtyRef = useRef(false);
  const deleteConfirmTriggerRef = useRef(null);
  const deleteConfirmOkRef = useRef(null);

  useEffect(() => () => {
    aliveRef.current = false;
  }, []);

  return {
    aliveRef,
    detailNoteRef,
    detailNoteDirtyRef,
    detailNoteFocusedRef,
    detailTagsRef,
    detailTagsDirtyRef,
    detailSavedRef,
    detailSavedNoteRef,
    detailSaveTimer,
    detailPendingRef,
    detailSavingRef,
    detailInitRef,
    detailDropdownDirtyRef,
    deleteConfirmTriggerRef,
    deleteConfirmOkRef,
  };
}

export default useResourceDetailRefs;
