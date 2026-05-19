import {
  isAutoRenderFormFieldMissing,
  normalizeAutoRenderFormFieldValue,
} from "./autoRenderFieldNormalization";

export function buildSelectedFormData({
  autoRenderFormFields = [],
  autoRenderFormValues = {},
} = {}) {
  const selectedFormFieldsList = Array.isArray(autoRenderFormFields) ? autoRenderFormFields : [];
  const selectedFormData = {};
  let invalidFormField = null;
  let missingRequiredField = null;

  for (const field of selectedFormFieldsList) {
    const fieldKey = String(field?.fieldKey || "").trim();
    if (!fieldKey) continue;
    const payloadKey = String(field?.payloadKey || fieldKey).trim() || fieldKey;
    const hasManualValue = Object.prototype.hasOwnProperty.call(autoRenderFormValues || {}, fieldKey);
    const rawValue = hasManualValue
      ? autoRenderFormValues[fieldKey]
      : (field?.defaultValue ?? "");
    const normalizedFieldValue = normalizeAutoRenderFormFieldValue(field, rawValue);

    if ((normalizedFieldValue === "__invalid_json__" || normalizedFieldValue === "__invalid_vector__") && !invalidFormField) {
      invalidFormField = field;
    }
    if (isAutoRenderFormFieldMissing(field, normalizedFieldValue) && !missingRequiredField) {
      missingRequiredField = field;
    }
    if (normalizedFieldValue === "__invalid_json__" || normalizedFieldValue === "__invalid_vector__") continue;

    selectedFormData[payloadKey] = normalizedFieldValue;
  }

  return {
    selectedFormData,
    invalidFormField,
    missingRequiredField,
  };
}
