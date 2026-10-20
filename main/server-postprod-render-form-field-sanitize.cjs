// Normalisation des attributs d'un champ de formulaire de rendu (clé, libellé,
// chemin source, type de saisie, type de valeur, groupe, clé de charge utile).
const {
  MAX_RENDER_TEMPLATE_FIELD_GROUP_NAME_LEN,
  MAX_RENDER_TEMPLATE_FIELD_HELP_TEXT_LEN,
  MAX_RENDER_TEMPLATE_FIELD_INPUT_KIND_LEN,
  MAX_RENDER_TEMPLATE_FIELD_KEY_LEN,
  MAX_RENDER_TEMPLATE_FIELD_LABEL_LEN,
  MAX_RENDER_TEMPLATE_FIELD_PAYLOAD_KEY_LEN,
  MAX_RENDER_TEMPLATE_FIELD_PLACEHOLDER_LEN,
  MAX_RENDER_TEMPLATE_FIELD_SOURCE_PATH_LEN,
  MAX_RENDER_TEMPLATE_FIELD_VALUE_TYPE_LEN,
  RENDER_FORM_SOURCE_TYPES,
  RENDER_TEMPLATE_FIELD_INPUT_KINDS,
  RENDER_TEMPLATE_FIELD_VALUE_TYPES,
} = require('./server-postprod-auth-constants.cjs');

function sanitizeRenderFormFieldKey(value, fallback = '') {
  const raw = String(value || '').trim();
  const normalized = raw
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_.:-]+/g, '_');
  const safe = normalized || String(fallback || '').trim();
  return safe.slice(0, MAX_RENDER_TEMPLATE_FIELD_KEY_LEN);
}

function sanitizeRenderFormFieldLabel(value, fallback = '') {
  const raw = String(value || '').replace(/\s+/g, ' ').trim();
  const safe = raw || String(fallback || '').replace(/\s+/g, ' ').trim();
  return safe.slice(0, MAX_RENDER_TEMPLATE_FIELD_LABEL_LEN);
}

function sanitizeRenderFormFieldSourcePath(value) {
  return String(value || '').trim().slice(0, MAX_RENDER_TEMPLATE_FIELD_SOURCE_PATH_LEN);
}

function normalizeRenderFormFieldSourceType(value, fallback = 'preset_property') {
  const raw = String(value || '').trim().toLowerCase().slice(0, MAX_RENDER_TEMPLATE_FIELD_INPUT_KIND_LEN);
  if (RENDER_FORM_SOURCE_TYPES.has(raw)) return raw;
  return RENDER_FORM_SOURCE_TYPES.has(fallback) ? fallback : 'preset_property';
}

function normalizeRenderFormFieldInputKind(value, fallback = 'text') {
  const raw = String(value || '').trim().toLowerCase().slice(0, MAX_RENDER_TEMPLATE_FIELD_INPUT_KIND_LEN);
  if (RENDER_TEMPLATE_FIELD_INPUT_KINDS.has(raw)) return raw;
  return RENDER_TEMPLATE_FIELD_INPUT_KINDS.has(fallback) ? fallback : 'text';
}

function normalizeRenderFormFieldValueType(value, fallback = 'string') {
  const raw = String(value || '').trim().toLowerCase().slice(0, MAX_RENDER_TEMPLATE_FIELD_VALUE_TYPE_LEN);
  if (RENDER_TEMPLATE_FIELD_VALUE_TYPES.has(raw)) return raw;
  return RENDER_TEMPLATE_FIELD_VALUE_TYPES.has(fallback) ? fallback : 'string';
}

function sanitizeRenderFormFieldGroupName(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, MAX_RENDER_TEMPLATE_FIELD_GROUP_NAME_LEN);
}

function sanitizeRenderFormFieldPayloadKey(value, fallback = '') {
  return sanitizeRenderFormFieldKey(value, fallback).slice(0, MAX_RENDER_TEMPLATE_FIELD_PAYLOAD_KEY_LEN);
}

function sanitizeRenderFormFieldPlaceholder(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, MAX_RENDER_TEMPLATE_FIELD_PLACEHOLDER_LEN);
}

function sanitizeRenderFormFieldHelpText(value) {
  return String(value || '').trim().slice(0, MAX_RENDER_TEMPLATE_FIELD_HELP_TEXT_LEN);
}

module.exports = {
  sanitizeRenderFormFieldKey,
  sanitizeRenderFormFieldLabel,
  sanitizeRenderFormFieldSourcePath,
  normalizeRenderFormFieldSourceType,
  normalizeRenderFormFieldInputKind,
  normalizeRenderFormFieldValueType,
  sanitizeRenderFormFieldGroupName,
  sanitizeRenderFormFieldPayloadKey,
  sanitizeRenderFormFieldPlaceholder,
  sanitizeRenderFormFieldHelpText,
};
