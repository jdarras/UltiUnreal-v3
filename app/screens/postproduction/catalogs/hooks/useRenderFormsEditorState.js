import { useCallback, useState } from "react";

export function useRenderFormsEditorState({ onResetCreateDraft = null } = {}) {
  const [mode, setMode] = useState("edit");
  const [showEditor, setShowEditor] = useState(false);
  const [editorIntent, setEditorIntent] = useState("edit");
  const [selectedFormId, setSelectedFormId] = useState(0);

  const startCreate = useCallback(() => {
    setMode("edit");
    setEditorIntent("create");
    setSelectedFormId(0);
    if (typeof onResetCreateDraft === "function") onResetCreateDraft();
    setShowEditor(true);
  }, [onResetCreateDraft]);

  const startEdit = useCallback((form) => {
    const id = Number(form?.id || 0);
    if (id > 0) setSelectedFormId(id);
    setMode("edit");
    setEditorIntent("edit");
    setShowEditor(true);
  }, []);

  const selectFormFromChips = useCallback((id) => {
    setSelectedFormId(Number(id || 0));
    setEditorIntent("edit");
  }, []);

  const backToList = useCallback(() => setShowEditor(false), []);

  return {
    mode,
    setMode,
    showEditor,
    setShowEditor,
    editorIntent,
    setEditorIntent,
    selectedFormId,
    setSelectedFormId,
    startCreate,
    startEdit,
    selectFormFromChips,
    backToList,
  };
}
