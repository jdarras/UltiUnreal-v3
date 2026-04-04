import { useEffect, useRef, useState } from "react";

function useTasksFormUiState({
  onFormModeChange = null,
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedResourceRefs, setSelectedResourceRefs] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(0);
  const [formError, setFormError] = useState("");
  const editAutosaveStateRef = useRef({ signature: "", inFlight: false, pending: false });

  useEffect(() => {
    if (typeof onFormModeChange !== "function") return undefined;
    onFormModeChange(showCreateForm === true);
    return () => {
      onFormModeChange(false);
    };
  }, [showCreateForm, onFormModeChange]);

  useEffect(() => {
    editAutosaveStateRef.current = { signature: "", inFlight: false, pending: false };
  }, [editingTaskId, showCreateForm]);

  const isEditingTask = Number.isFinite(Number(editingTaskId)) && Number(editingTaskId) > 0;

  return {
    title,
    setTitle,
    description,
    setDescription,
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

export { useTasksFormUiState };
