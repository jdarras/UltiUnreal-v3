import { useCallback } from "react";
import {
  postprodCreateTask,
  postprodUpdateTask,
  postprodDeleteTask,
  postprodTransitionTask,
} from "../utils/agent";
import { resolvePostprodTasksError } from "../utils/postprodErrorHelpers";

function usePostprodTaskMutations({
  postprodAuth,
  t,
  showNotice,
  loadPostprodTasks,
  setPostprodTasks,
}) {
  const handlePostprodCreateTask = useCallback(async (payload = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return false;
    setPostprodTasks((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await postprodCreateTask(token, payload);
      await loadPostprodTasks();
      showNotice(t('postprod.tasks.msg.created'), 'ok');
      return res?.task && typeof res.task === 'object' ? res.task : true;
    } catch (e) {
      setPostprodTasks((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodTasksError(e, t),
      }));
      return false;
    }
  }, [postprodAuth.token, loadPostprodTasks, showNotice, t, setPostprodTasks]);

  const handlePostprodUpdateTask = useCallback(async (taskId, payload = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return false;
    setPostprodTasks((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await postprodUpdateTask(token, taskId, payload);
      await loadPostprodTasks();
      showNotice(t('postprod.tasks.msg.updated'), 'info');
      return res?.task && typeof res.task === 'object' ? res.task : true;
    } catch (e) {
      setPostprodTasks((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodTasksError(e, t),
      }));
      return false;
    }
  }, [postprodAuth.token, loadPostprodTasks, showNotice, t, setPostprodTasks]);

  const handlePostprodDeleteTask = useCallback(async (taskId) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return false;
    setPostprodTasks((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      await postprodDeleteTask(token, taskId);
      await loadPostprodTasks();
      showNotice(t('postprod.tasks.msg.deleted'), 'info');
      return true;
    } catch (e) {
      setPostprodTasks((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodTasksError(e, t),
      }));
      return false;
    }
  }, [postprodAuth.token, loadPostprodTasks, showNotice, t, setPostprodTasks]);

  const handlePostprodTransitionTask = useCallback(async (taskId, payload = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return;
    setPostprodTasks((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      await postprodTransitionTask(token, taskId, payload);
      await loadPostprodTasks();
      showNotice(t('postprod.tasks.msg.transitionOk'), 'info');
    } catch (e) {
      setPostprodTasks((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodTasksError(e, t),
      }));
    }
  }, [postprodAuth.token, loadPostprodTasks, showNotice, t, setPostprodTasks]);

  return {
    handlePostprodCreateTask,
    handlePostprodUpdateTask,
    handlePostprodDeleteTask,
    handlePostprodTransitionTask,
  };
}

export { usePostprodTaskMutations };
