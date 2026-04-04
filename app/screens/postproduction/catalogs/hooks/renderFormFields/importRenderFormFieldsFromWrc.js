import { safeT } from "../../../shared/helpers";

async function importRenderFormFieldsFromWrc({
  t,
  canManageRenderTemplates = false,
  onLoadProjectWrcFields = null,
  onReplaceRenderFormFields = null,
  formId = 0,
  projectRef = "",
  presetName = "",
}) {
  if (
    !canManageRenderTemplates ||
    typeof onLoadProjectWrcFields !== "function" ||
    typeof onReplaceRenderFormFields !== "function"
  ) {
    return { ok: false, kind: "forbidden", error: "" };
  }
  if (!Number.isFinite(Number(formId)) || Number(formId) <= 0) {
    return {
      ok: false,
      kind: "invalid_form",
      error: safeT(t, "postprod.data.forms.error.import.noForm", "Selectionne un formulaire."),
    };
  }
  if (!String(projectRef || "").trim()) {
    return {
      ok: false,
      kind: "invalid_project",
      error: safeT(t, "postprod.data.forms.error.import.noProject", "Selectionne un projet."),
    };
  }
  if (!String(presetName || "").trim()) {
    return {
      ok: false,
      kind: "invalid_preset",
      error: safeT(t, "postprod.data.forms.error.import.noPreset", "Renseigne le preset WRC du formulaire."),
    };
  }

  const imported = await Promise.resolve(onLoadProjectWrcFields(String(projectRef).trim(), String(presetName).trim()));
  const importedFields = Array.isArray(imported) ? imported : [];
  if (importedFields.length <= 0) {
    return {
      ok: false,
      kind: "empty",
      error: safeT(t, "postprod.data.forms.msg.import.empty", "Aucun champ importable trouve dans le preset WRC."),
    };
  }
  const saved = await Promise.resolve(onReplaceRenderFormFields(Number(formId), importedFields));
  const savedFields = Array.isArray(saved) ? saved : importedFields;
  return {
    ok: true,
    fields: savedFields,
    info: safeT(t, "postprod.data.forms.msg.import.success", "Import WRC termine ({count} champs).", {
      count: savedFields.length,
    }),
  };
}

export { importRenderFormFieldsFromWrc };
