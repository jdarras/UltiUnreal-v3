import { safeT } from "../../../shared/helpers";

function buildFieldInputKindOptions(t) {
  return [
    { value: "text", label: safeT(t, "postprod.data.forms.field.input.text", "Texte") },
    { value: "multiline", label: safeT(t, "postprod.data.forms.field.input.multiline", "Texte multiligne") },
    { value: "number", label: safeT(t, "postprod.data.forms.field.input.number", "Nombre") },
    { value: "integer", label: safeT(t, "postprod.data.forms.field.input.integer", "Entier") },
    { value: "vector2", label: safeT(t, "postprod.data.forms.field.input.vector2", "Vecteur 2") },
    { value: "vector3", label: safeT(t, "postprod.data.forms.field.input.vector3", "Vecteur 3") },
    { value: "checkbox", label: safeT(t, "postprod.data.forms.field.input.checkbox", "Case a cocher") },
    { value: "select", label: safeT(t, "postprod.data.forms.field.input.select", "Liste") },
    { value: "color", label: safeT(t, "postprod.data.forms.field.input.color", "Couleur") },
    { value: "date", label: safeT(t, "postprod.data.forms.field.input.date", "Date/heure") },
    { value: "image", label: safeT(t, "postprod.data.forms.field.input.image", "Image") },
    { value: "video", label: safeT(t, "postprod.data.forms.field.input.video", "Video") },
    { value: "json", label: safeT(t, "postprod.data.forms.field.input.json", "JSON") },
  ];
}

export { buildFieldInputKindOptions };
