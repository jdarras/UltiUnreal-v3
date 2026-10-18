import { useCallback } from "react";
import {
  postprodCreateRenderTemplate,
  postprodUpdateRenderTemplate,
  postprodDeleteRenderTemplate,
  postprodCreateRenderForm,
  postprodUpdateRenderForm,
  postprodDeleteRenderForm,
  postprodListRenderFormFields,
  postprodReplaceRenderFormFields,
} from "../utils/agent";
import { resolvePostprodRendersError } from "../utils/postprodErrorHelpers";

function usePostprodRenderTemplateMutations({
  postprodAuth,
  t,
  showNotice,
  postprodCanManageRenderTemplates,
  loadPostprodRenderTemplates,
  loadPostprodRenderForms,
  setPostprodRenderTemplates,
  setPostprodRenderForms,
}) {
  const handlePostprodCreateRenderTemplate = useCallback(async (payload = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return false;
    if (!postprodCanManageRenderTemplates) {
      showNotice(t('postprod.renders.error.forbiddenTemplateManage'), 'warn');
      return false;
    }
    setPostprodRenderTemplates((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await postprodCreateRenderTemplate(token, payload);
      await loadPostprodRenderTemplates();
      showNotice(t('postprod.renders.msg.templateCreated'), 'ok');
      return res?.template && typeof res.template === 'object' ? res.template : true;
    } catch (e) {
      setPostprodRenderTemplates((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodRendersError(e, t),
      }));
      return false;
    }
  }, [postprodAuth.token, postprodCanManageRenderTemplates, loadPostprodRenderTemplates, showNotice, t, setPostprodRenderTemplates]);

  const handlePostprodUpdateRenderTemplate = useCallback(async (templateId, payload = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return false;
    if (!postprodCanManageRenderTemplates) {
      showNotice(t('postprod.renders.error.forbiddenTemplateManage'), 'warn');
      return false;
    }
    setPostprodRenderTemplates((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await postprodUpdateRenderTemplate(token, templateId, payload);
      await loadPostprodRenderTemplates();
      showNotice(t('postprod.renders.msg.templateUpdated'), 'info');
      return res?.template && typeof res.template === 'object' ? res.template : true;
    } catch (e) {
      setPostprodRenderTemplates((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodRendersError(e, t),
      }));
      return false;
    }
  }, [postprodAuth.token, postprodCanManageRenderTemplates, loadPostprodRenderTemplates, showNotice, t, setPostprodRenderTemplates]);

  const handlePostprodDeleteRenderTemplate = useCallback(async (templateId) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return false;
    if (!postprodCanManageRenderTemplates) {
      showNotice(t('postprod.renders.error.forbiddenTemplateManage'), 'warn');
      return false;
    }
    setPostprodRenderTemplates((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      await postprodDeleteRenderTemplate(token, templateId);
      await loadPostprodRenderTemplates();
      showNotice(t('postprod.renders.msg.templateDeleted'), 'info');
      return true;
    } catch (e) {
      setPostprodRenderTemplates((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodRendersError(e, t),
      }));
      return false;
    }
  }, [postprodAuth.token, postprodCanManageRenderTemplates, loadPostprodRenderTemplates, showNotice, t, setPostprodRenderTemplates]);

  const handlePostprodCreateRenderForm = useCallback(async (payload = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return false;
    if (!postprodCanManageRenderTemplates) {
      showNotice(t('postprod.renders.error.forbiddenTemplateManage'), 'warn');
      return false;
    }
    setPostprodRenderForms((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await postprodCreateRenderForm(token, payload);
      await loadPostprodRenderForms();
      showNotice(t('postprod.data.forms.msg.renderFormCreated'), 'ok');
      return res?.form && typeof res.form === 'object' ? res.form : true;
    } catch (e) {
      setPostprodRenderForms((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodRendersError(e, t),
      }));
      return false;
    }
  }, [postprodAuth.token, postprodCanManageRenderTemplates, loadPostprodRenderForms, showNotice, t, setPostprodRenderForms]);

  const handlePostprodUpdateRenderForm = useCallback(async (formId, payload = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return false;
    if (!postprodCanManageRenderTemplates) {
      showNotice(t('postprod.renders.error.forbiddenTemplateManage'), 'warn');
      return false;
    }
    setPostprodRenderForms((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await postprodUpdateRenderForm(token, formId, payload);
      await loadPostprodRenderForms();
      showNotice(t('postprod.data.forms.msg.renderFormUpdated'), 'ok');
      return res?.form && typeof res.form === 'object' ? res.form : true;
    } catch (e) {
      setPostprodRenderForms((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodRendersError(e, t),
      }));
      return false;
    }
  }, [postprodAuth.token, postprodCanManageRenderTemplates, loadPostprodRenderForms, showNotice, t, setPostprodRenderForms]);

  const handlePostprodDeleteRenderForm = useCallback(async (formId) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return false;
    if (!postprodCanManageRenderTemplates) {
      showNotice(t('postprod.renders.error.forbiddenTemplateManage'), 'warn');
      return false;
    }
    setPostprodRenderForms((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      await postprodDeleteRenderForm(token, formId);
      const formIdNum = Number(formId);
      if (Number.isFinite(formIdNum) && formIdNum > 0) {
        const normalizedId = Math.trunc(formIdNum);
        setPostprodRenderForms((prev) => {
          const currentItems = Array.isArray(prev?.items) ? prev.items : [];
          return {
            ...prev,
            items: currentItems.filter((entry) => Number(entry?.id || 0) !== normalizedId),
          };
        });
      }
      await loadPostprodRenderForms();
      showNotice(t('postprod.data.forms.msg.renderFormDeleted'), 'info');
      return true;
    } catch (e) {
      setPostprodRenderForms((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodRendersError(e, t),
      }));
      return false;
    }
  }, [postprodAuth.token, postprodCanManageRenderTemplates, loadPostprodRenderForms, showNotice, t, setPostprodRenderForms]);

  const handlePostprodLoadRenderFormFields = useCallback(async (formId) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return [];
    try {
      const res = await postprodListRenderFormFields(token, formId);
      return Array.isArray(res?.fields) ? res.fields : [];
    } catch {
      return [];
    }
  }, [postprodAuth.token]);

  const handlePostprodReplaceRenderFormFields = useCallback(async (formId, fields = [], wrcFile = '') => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return [];
    if (!postprodCanManageRenderTemplates) {
      showNotice(t('postprod.renders.error.forbiddenTemplateManage'), 'warn');
      return [];
    }
    const res = await postprodReplaceRenderFormFields(token, formId, fields, wrcFile);
    await loadPostprodRenderForms();
    return Array.isArray(res?.fields) ? res.fields : [];
  }, [postprodAuth.token, postprodCanManageRenderTemplates, loadPostprodRenderForms, showNotice, t]);

  return {
    handlePostprodCreateRenderTemplate,
    handlePostprodUpdateRenderTemplate,
    handlePostprodDeleteRenderTemplate,
    handlePostprodCreateRenderForm,
    handlePostprodUpdateRenderForm,
    handlePostprodDeleteRenderForm,
    handlePostprodLoadRenderFormFields,
    handlePostprodReplaceRenderFormFields,
  };
}

export { usePostprodRenderTemplateMutations };
