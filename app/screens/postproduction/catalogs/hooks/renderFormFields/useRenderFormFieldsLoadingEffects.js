import { useEffect } from "react";
import { safeT } from "../../../shared/helpers";

function buildLiveDefaultsFromFields(listRaw) {
  const list = Array.isArray(listRaw) ? listRaw : [];
  const defaults = {};
  for (const field of list) {
    const key = String(field?.fieldKey || "").trim();
    if (!key) continue;
    defaults[key] = field?.defaultValue ?? "";
  }
  return defaults;
}

function useRenderFormFieldsLoadingEffects({
  t,
  selectedFormId = 0,
  onLoadRenderFormFields = null,
  fields = [],
  fieldsRef = null,
  setFields,
  setFieldsLoading,
  setFieldsError,
  setFieldsDraftText,
  setFieldsImportError,
  setFieldsImportInfo,
  setFieldsSaveError,
  setFieldsSaveInfo,
  setLiveValues,
}) {
  useEffect(() => {
    const formId = Number(selectedFormId || 0);
    if (!Number.isFinite(formId) || formId <= 0) {
      setFields([]);
      setFieldsDraftText("[]");
      setFieldsLoading(false);
      setFieldsError("");
      setFieldsImportError("");
      setFieldsImportInfo("");
      setFieldsSaveError("");
      setFieldsSaveInfo("");
      setLiveValues({});
      return;
    }
    let cancelled = false;
    setFieldsLoading(true);
    setFieldsError("");
    setFieldsImportError("");
    setFieldsImportInfo("");
    setFieldsSaveError("");
    setFieldsSaveInfo("");

    (async () => {
      try {
        const loaded = await Promise.resolve(onLoadRenderFormFields?.(formId));
        if (cancelled) return;
        const list = Array.isArray(loaded) ? loaded : [];
        setFields(list);
        setLiveValues(buildLiveDefaultsFromFields(list));
      } catch (e) {
        if (cancelled) return;
        setFields([]);
        setFieldsDraftText("[]");
        setFieldsError(
          String(
            e?.message
            || safeT(t, "postprod.data.forms.error.loadFields", "Impossible de charger les champs du formulaire.")
          )
        );
      } finally {
        if (!cancelled) setFieldsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    selectedFormId,
    onLoadRenderFormFields,
    t,
    setFields,
    setFieldsLoading,
    setFieldsError,
    setFieldsDraftText,
    setFieldsImportError,
    setFieldsImportInfo,
    setFieldsSaveError,
    setFieldsSaveInfo,
    setLiveValues,
  ]);

  useEffect(() => {
    try {
      setFieldsDraftText(JSON.stringify(Array.isArray(fields) ? fields : [], null, 2));
    } catch {
      setFieldsDraftText("[]");
    }
  }, [fields, setFieldsDraftText]);

  useEffect(() => {
    if (!fieldsRef || typeof fieldsRef !== "object") return;
    fieldsRef.current = Array.isArray(fields) ? fields : [];
  }, [fields, fieldsRef]);
}

export {
  useRenderFormFieldsLoadingEffects,
};
