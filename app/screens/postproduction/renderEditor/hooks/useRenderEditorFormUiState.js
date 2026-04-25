import { useEffect, useRef, useState } from "react";

function useRenderEditorFormUiState({
  defaultAssigneeUserId = null,
  onFormModeChange = null,
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeUserId, setAssigneeUserId] = useState(defaultAssigneeUserId);
  const [selectedResourceRefs, setSelectedResourceRefs] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(0);
  const [formError, setFormError] = useState("");
  const editAutosaveStateRef = useRef({ signature: "", inFlight: false, pending: false });

  useEffect(() => {
    if (typeof onFormModeChange !== "function") return;
    onFormModeChange(showCreateForm === true);
  }, [showCreateForm, onFormModeChange]);

  useEffect(() => {
    editAutosaveStateRef.current = { signature: "", inFlight: false, pending: false };
  }, [editingTaskId, showCreateForm]);

  useEffect(() => {
    setAssigneeUserId((prev) => {
      const prevNum = Number(prev || 0);
      const prevId = Number.isFinite(prevNum) && prevNum > 0 ? Math.trunc(prevNum) : null;
      if (prevId === defaultAssigneeUserId) return prev;
      return defaultAssigneeUserId;
    });
  }, [defaultAssigneeUserId]);

  const isEditingTask = Number.isFinite(Number(editingTaskId)) && Number(editingTaskId) > 0;

  return {
    title,
    setTitle,
    description,
    setDescription,
    assigneeUserId,
    setAssigneeUserId,
    selectedResourceRefs,
    setSelectedResourceRefs,
    showCreateForm,
    setShowCreateForm,
    editingTaskId,
    setEditingTaskId,
    formError,
    setFormError,
    editAutosaveStateRef,
    isEditingTask,
  };
}

export { useRenderEditorFormUiState };
