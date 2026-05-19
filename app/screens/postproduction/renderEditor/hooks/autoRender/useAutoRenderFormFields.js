import { useEffect, useRef, useState } from "react";
import { safeT } from "../../../shared/helpers";

export function useAutoRenderFormFields({
  t,
  autoRenderFormId = "",
  renderForms = [],
  onLoadRenderFormFields = null,
  setAutoRenderFormValues = null,
} = {}) {
  const [autoRenderFormFields, setAutoRenderFormFields] = useState([]);
  const [autoRenderFormFieldsLoading, setAutoRenderFormFieldsLoading] = useState(false);
  const [autoRenderFormFieldsError, setAutoRenderFormFieldsError] = useState("");
  const loadRenderFormFieldsRef = useRef(onLoadRenderFormFields);
  const autoRenderFormFieldsCacheRef = useRef(new Map());

  useEffect(() => {
    loadRenderFormFieldsRef.current = onLoadRenderFormFields;
    autoRenderFormFieldsCacheRef.current.clear();
  }, [onLoadRenderFormFields]);

  useEffect(() => {
    autoRenderFormFieldsCacheRef.current.clear();
  }, [renderForms]);

  useEffect(() => {
    const formId = Number(autoRenderFormId || 0);
    const loader = loadRenderFormFieldsRef.current;
    if (!Number.isFinite(formId) || formId <= 0 || typeof loader !== "function") {
      setAutoRenderFormFields([]);
      setAutoRenderFormFieldsLoading(false);
      setAutoRenderFormFieldsError("");
      if (typeof setAutoRenderFormValues === "function") {
        setAutoRenderFormValues({});
      }
      return;
    }
    const cacheKey = Math.trunc(formId);
    const cached = autoRenderFormFieldsCacheRef.current.get(cacheKey);
    if (Array.isArray(cached)) {
      setAutoRenderFormFields(cached);
      setAutoRenderFormFieldsLoading(false);
      setAutoRenderFormFieldsError("");
      const defaults = {};
      for (const field of cached) {
        const key = String(field?.fieldKey || "").trim();
        if (!key) continue;
        defaults[key] = field?.defaultValue ?? "";
      }
      if (typeof setAutoRenderFormValues === "function") {
        setAutoRenderFormValues((prev) => ({
          ...defaults,
          ...(prev && typeof prev === "object" && !Array.isArray(prev) ? prev : {}),
        }));
      }
      return;
    }
    let cancelled = false;
    setAutoRenderFormFieldsLoading(true);
    setAutoRenderFormFieldsError("");
    (async () => {
      try {
        const loaded = await Promise.resolve(loader(formId));
        if (cancelled) return;
        const list = Array.isArray(loaded) ? loaded : [];
        autoRenderFormFieldsCacheRef.current.set(cacheKey, list);
        setAutoRenderFormFields(list);
        const defaults = {};
        for (const field of list) {
          const key = String(field?.fieldKey || "").trim();
          if (!key) continue;
          defaults[key] = field?.defaultValue ?? "";
        }
        if (typeof setAutoRenderFormValues === "function") {
          setAutoRenderFormValues((prev) => ({
            ...defaults,
            ...(prev && typeof prev === "object" && !Array.isArray(prev) ? prev : {}),
          }));
        }
      } catch (e) {
        if (cancelled) return;
        setAutoRenderFormFields([]);
        if (typeof setAutoRenderFormValues === "function") {
          setAutoRenderFormValues({});
        }
        setAutoRenderFormFieldsError(String(
          e?.message || safeT(t, "postprod.tasks.form.autoRenderForm.error.load", "Impossible de charger les champs du formulaire.")
        ));
      } finally {
        if (!cancelled) setAutoRenderFormFieldsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [autoRenderFormId, setAutoRenderFormValues, t]);

  return {
    autoRenderFormFields,
    autoRenderFormFieldsLoading,
    autoRenderFormFieldsError,
  };
}
