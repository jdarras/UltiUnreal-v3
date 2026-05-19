import { safeT } from "../../shared/helpers";
import { RenderFormsFieldDefaultValueInput } from "./RenderFormsFieldDefaultValueInput";

const FIELD_ROW_CELL_CENTER_STYLE = { textAlign: "center" };
const FIELD_ROW_CHECK_CENTER_STYLE = { display: "inline-flex", alignItems: "center", justifyContent: "center" };
const FIELD_ROW_REQUIRED_CHECK_STYLE = { ...FIELD_ROW_CHECK_CENTER_STYLE, gap: "6px" };
const FIELD_ROW_VALUE_TYPE_STYLE = { textTransform: "lowercase", textAlign: "center" };
const FIELD_ROW_ACTIONS_STYLE = { gap: "6px" };
const FIELD_ROW_ACTION_ICON_STYLE = { width: "30px", minWidth: "30px", height: "30px", padding: "0" };

function RenderFormsFieldRow({
  t,
  field = {},
  index = 0,
  rowCount = 0,
  selectedForm = null,
  canManageRenderTemplates = false,
  fieldsImportBusy = false,
  fieldsSaveBusy = false,
  fieldInputKindOptions = [],
  normalizeLiveOptionList = null,
  normalizeVectorDefaultForInput = null,
  inferFieldValueTypeFromInputKind = null,
  onUpdateEditableField = null,
  onPersistEditableFields = null,
  onMoveEditableField = null,
  onRemoveEditableField = null,
}) {
  const fieldKey = String(field?.fieldKey || "").trim();
  const inputKind = String(field?.inputKind || "text")
    .trim()
    .toLowerCase();
  const options = typeof normalizeLiveOptionList === "function" ? normalizeLiveOptionList(field) : [];
  const defaultValueRaw = field?.defaultValue;
  const canEdit = !!selectedForm && canManageRenderTemplates && !fieldsImportBusy && !fieldsSaveBusy;
  const vector2Default =
    typeof normalizeVectorDefaultForInput === "function"
      ? normalizeVectorDefaultForInput(defaultValueRaw, 2)
      : { x: "0", y: "0" };
  const vector3Default =
    typeof normalizeVectorDefaultForInput === "function"
      ? normalizeVectorDefaultForInput(defaultValueRaw, 3)
      : { x: "0", y: "0", z: "0" };
  const inferredValueType =
    typeof inferFieldValueTypeFromInputKind === "function"
      ? inferFieldValueTypeFromInputKind(inputKind)
      : "string";

  return (
    <tr>
      <td style={FIELD_ROW_CELL_CENTER_STYLE}>
        <label className="uu-check" style={FIELD_ROW_CHECK_CENTER_STYLE}>
          <input
            type="checkbox"
            checked={field?.isVisible !== false}
            disabled={!canEdit}
            onChange={(e) => {
              if (typeof onUpdateEditableField === "function") {
                onUpdateEditableField(fieldKey, { isVisible: e.target.checked }, { saveNow: true });
              }
            }}
          />
        </label>
      </td>
      <td>
        <input
          className="uu-input"
          type="text"
          value={String(field?.fieldLabel || "")}
          disabled={!canEdit}
          onChange={(e) => {
            if (typeof onUpdateEditableField === "function") {
              onUpdateEditableField(fieldKey, { fieldLabel: e.target.value });
            }
          }}
          onBlur={() => {
            if (typeof onPersistEditableFields === "function") {
              void onPersistEditableFields();
            }
          }}
        />
      </td>
      <td>
        <select
          className="uu-input"
          value={inputKind || "text"}
          disabled={!canEdit}
          onChange={(e) => {
            const nextInputKind = String(e.target.value || "text")
              .trim()
              .toLowerCase();
            if (typeof onUpdateEditableField === "function") {
              onUpdateEditableField(
                fieldKey,
                {
                  inputKind: nextInputKind,
                  valueType:
                    typeof inferFieldValueTypeFromInputKind === "function"
                      ? inferFieldValueTypeFromInputKind(nextInputKind)
                      : "string",
                },
                { saveNow: true }
              );
            }
          }}
        >
          {(Array.isArray(fieldInputKindOptions) ? fieldInputKindOptions : []).map((entry) => (
            <option key={`render-form-field-input-kind-${entry.value}`} value={entry.value}>
              {entry.label}
            </option>
          ))}
        </select>
      </td>
      <td style={FIELD_ROW_CELL_CENTER_STYLE}>
        <div className="uu-muted" style={FIELD_ROW_VALUE_TYPE_STYLE}>
          {String(field?.valueType || inferredValueType || "string")}
        </div>
      </td>
      <td style={FIELD_ROW_CELL_CENTER_STYLE}>
        <label className="uu-check" style={FIELD_ROW_REQUIRED_CHECK_STYLE}>
          <input
            type="checkbox"
            checked={field?.isRequired === true}
            disabled={!canEdit}
            onChange={(e) => {
              if (typeof onUpdateEditableField === "function") {
                onUpdateEditableField(fieldKey, { isRequired: e.target.checked }, { saveNow: true });
              }
            }}
          />
        </label>
      </td>
      <td>
        <RenderFormsFieldDefaultValueInput
          t={t}
          fieldKey={fieldKey}
          inputKind={inputKind}
          defaultValueRaw={defaultValueRaw}
          canEdit={canEdit}
          options={options}
          vector2Default={vector2Default}
          vector3Default={vector3Default}
          onUpdateEditableField={onUpdateEditableField}
          onPersistEditableFields={onPersistEditableFields}
        />
      </td>
      <td>
        <div className="uu-row" style={FIELD_ROW_ACTIONS_STYLE}>
          <button
            type="button"
            className="uu-btn uu-btn-icon"
            title={safeT(t, "common.moveUp", "Monter")}
            disabled={!canEdit || index <= 0}
            onClick={() => {
              if (typeof onMoveEditableField === "function") onMoveEditableField(fieldKey, -1);
            }}
            style={FIELD_ROW_ACTION_ICON_STYLE}
          >
            ↑
          </button>
          <button
            type="button"
            className="uu-btn uu-btn-icon"
            title={safeT(t, "common.moveDown", "Descendre")}
            disabled={!canEdit || index >= rowCount - 1}
            onClick={() => {
              if (typeof onMoveEditableField === "function") onMoveEditableField(fieldKey, 1);
            }}
            style={FIELD_ROW_ACTION_ICON_STYLE}
          >
            ↓
          </button>
          <button
            type="button"
            className="uu-btn-ghost"
            disabled={!canEdit}
            onClick={() => {
              if (typeof onRemoveEditableField === "function") onRemoveEditableField(fieldKey);
            }}
          >
            {safeT(t, "common.delete", "Supprimer")}
          </button>
        </div>
      </td>
    </tr>
  );
}

export { RenderFormsFieldRow };
