import { safeT } from "../../shared/helpers";
import { RenderFormsLiveFieldInput } from "./live/RenderFormsLiveFieldInput";
import { getVisibleLiveFields } from "./live/renderFormsLiveFieldHelpers";

const FORMS_LIVE_PREVIEW_TITLE_STYLE = { fontWeight: 600 };

function RenderFormsLivePreviewCard({
  t,
  selectedForm = null,
  fields = [],
  liveValues = {},
  onSetLiveValues = null,
  normalizeVectorDefaultForInput = null,
  normalizeLiveOptionList = null,
}) {
  const visibleFields = getVisibleLiveFields(fields);

  const setFieldValue = (key, next) => {
    if (typeof onSetLiveValues === "function") {
      onSetLiveValues((prev) => ({ ...(prev || {}), [key]: next }));
    }
  };

  return (
    <div className="uu-card mt-12">
      <div style={FORMS_LIVE_PREVIEW_TITLE_STYLE}>{safeT(t, "postprod.data.forms.livePreview", "Apercu live du formulaire")}</div>
      {!selectedForm ? (
        <div className="uu-muted mt-8">{safeT(t, "postprod.data.forms.empty", "Aucun formulaire pour ce projet.")}</div>
      ) : visibleFields.length <= 0 ? (
        <div className="uu-muted mt-8">{safeT(t, "postprod.data.forms.noFields", "Aucun champ defini pour ce formulaire.")}</div>
      ) : (
        <div className="uu-grid-2 mt-12">
          {visibleFields.map((field, index) => {
            const key = String(field?.fieldKey || `field-${index}`);
            const label = String(field?.fieldLabel || key);
            const currentValue = liveValues[key] ?? field?.defaultValue ?? "";
            return (
              <div key={`render-form-live-${key}`} className="uu-grid-field">
                <label className="uu-label">{label}</label>
                <RenderFormsLiveFieldInput
                  t={t}
                  field={field}
                  label={label}
                  currentValue={currentValue}
                  onChange={(next) => setFieldValue(key, next)}
                  normalizeVectorDefaultForInput={normalizeVectorDefaultForInput}
                  normalizeLiveOptionList={normalizeLiveOptionList}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { RenderFormsLivePreviewCard };
