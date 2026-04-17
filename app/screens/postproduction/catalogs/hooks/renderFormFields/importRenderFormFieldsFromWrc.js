import { safeT } from "../../../shared/helpers";

async function importRenderFormFieldsFromWrc({
  t,
  canManageRenderTemplates = false,
  onLoadProjectWrcFields = null,
  onReplaceRenderFormFields = null,
  formId = 0,
  projectRef = "",
  wrcFile = "",
  loadOptions = null,
}) {
  const safeWrcFile = String(wrcFile || "").trim();
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
  if (!String(wrcFile || "").trim()) {
    return {
      ok: false,
      kind: "invalid_wrc_file",
      error: safeT(t, "postprod.data.forms.error.import.noWrcFile", "Fichier WRC non specifie."),
    };
  }

  const imported = await onLoadProjectWrcFields(
    String(projectRef).trim(),
    String(wrcFile).trim(),
    loadOptions && typeof loadOptions === "object" && !Array.isArray(loadOptions)
      ? loadOptions
      : undefined
  );
  const importedFields = Array.isArray(imported) ? imported : [];
  if (importedFields.length <= 0) {
    return {
      ok: false,
      kind: "empty",
      error: safeT(
        t,
        "postprod.data.forms.msg.import.empty",
        "Aucun champ importable trouvé dans le preset WRC '{wrcFile}'.",
        { wrcFile: safeWrcFile || "-" }
      ),
    };
  }
  const saved = await onReplaceRenderFormFields(Number(formId), importedFields, String(wrcFile).trim());
  const savedFields = Array.isArray(saved) ? saved : importedFields;
  return {
    ok: true,
    fields: savedFields,
    info: safeT(
      t,
      "postprod.data.forms.msg.import.success",
      "Import WRC '{wrcFile}' terminé ({count} champs).",
      {
        wrcFile: safeWrcFile || "-",
        count: savedFields.length,
      }
    ),
  };
}

export { importRenderFormFieldsFromWrc };
