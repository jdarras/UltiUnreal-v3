import { safeT } from "../../../shared/helpers";

function validateTaskPayloadInputs({
  t,
  title = "",
  renderOutputDir = "",
  filteredAutoRenderForms = [],
  autoRenderFormId = "",
  selectedForm = null,
  requireCompleteAutoRenderConfig = true,
} = {}) {
  const normalizedTitle = String(title || "").trim();
  if (!normalizedTitle) {
    return safeT(t, "postprod.tasks.error.missingTitle", "Le titre de la tache est obligatoire.");
  }
  if (requireCompleteAutoRenderConfig !== true) {
    return "";
  }
  if (!String(renderOutputDir || "").trim()) {
    return safeT(
      t,
      "postprod.tasks.form.autoRenderOutputDir.required",
      "Configure d'abord le dossier de sortie des rendus dans Configuration."
    );
  }
  if (filteredAutoRenderForms.length > 0 && !String(autoRenderFormId || "").trim()) {
    return safeT(
      t,
      "postprod.tasks.form.autoRenderForm.required",
      "Selectionne un formulaire de rendu."
    );
  }
  if (!selectedForm || Number(selectedForm?.id || 0) <= 0) {
    return safeT(
      t,
      "postprod.tasks.form.autoRenderForm.required",
      "Selectionne un formulaire de rendu."
    );
  }
  return "";
}

function validateResolvedAutoRenderContext({
  t,
  formProjectRef = "",
  effectiveTemplateName = "",
  effectiveProjectPath = "",
  effectiveMapName = "",
  effectiveSequenceName = "",
  effectiveOutputProfile = "",
  requireCompleteAutoRenderConfig = true,
} = {}) {
  if (requireCompleteAutoRenderConfig !== true) {
    return "";
  }
  if (!formProjectRef) {
    return safeT(
      t,
      "postprod.tasks.form.autoRenderProjectSelect.required",
      "Le formulaire selectionne ne reference pas de projet."
    );
  }
  if (!effectiveTemplateName) {
    return safeT(
      t,
      "postprod.tasks.form.autoRenderTemplate.required",
      "Selectionne un mode de rendu."
    );
  }
  if (!effectiveProjectPath) {
    return safeT(
      t,
      "postprod.tasks.form.autoRenderProjectPath.required",
      "Le projet de rendu n'a pas de chemin .uproject configure."
    );
  }
  if (!effectiveMapName) {
    return safeT(
      t,
      "postprod.tasks.form.autoRenderMap.required",
      "Le formulaire de rendu doit definir un level (map)."
    );
  }
  if (!effectiveSequenceName) {
    return safeT(
      t,
      "postprod.tasks.form.autoRenderSequence.required",
      "Le formulaire de rendu doit definir une level sequence."
    );
  }
  if (!effectiveOutputProfile) {
    return safeT(
      t,
      "postprod.tasks.form.autoRenderOutputProfile.required",
      "Le formulaire de rendu doit definir un mode de rendu."
    );
  }
  return "";
}

function buildInvalidFormFieldError(t, invalidFormField = null) {
  return safeT(
    t,
    "postprod.tasks.form.autoRenderForm.error.invalidFieldValue",
    "Le champ \"{value}\" contient une valeur invalide.",
    { value: String(invalidFormField?.fieldLabel || invalidFormField?.fieldKey || "-") }
  );
}

function buildMissingRequiredFieldError(t, missingRequiredField = null) {
  return safeT(
    t,
    "postprod.tasks.form.autoRenderForm.error.requiredField",
    "Le champ \"{value}\" est obligatoire.",
    { value: String(missingRequiredField?.fieldLabel || missingRequiredField?.fieldKey || "-") }
  );
}

export {
  buildInvalidFormFieldError,
  buildMissingRequiredFieldError,
  validateResolvedAutoRenderContext,
  validateTaskPayloadInputs,
};

export default validateTaskPayloadInputs;
