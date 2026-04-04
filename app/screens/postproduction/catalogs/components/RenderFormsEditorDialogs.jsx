import { safeT } from "../../shared/helpers";
import { RenderFormsConfirmDialog } from "./RenderFormsConfirmDialog";

function RenderFormsEditorDialogs({
  t,
  deleteDialog = null,
  reimportDialog = null,
  metaBusy = false,
  fieldsImportBusy = false,
  onDeleteForm = null,
  onImportFieldsFromWrcPreset = null,
}) {
  return (
    <>
      <RenderFormsConfirmDialog
        t={t}
        open={deleteDialog?.open === true}
        title={safeT(t, "postprod.data.forms.deleteDialog.title", "Confirmation")}
        message={safeT(
          t,
          "postprod.data.forms.deleteDialog.message",
          "Supprimer ce formulaire ? Cette action est irreversible."
        )}
        busy={metaBusy}
        cancelLabel={safeT(t, "common.cancel", "Annuler")}
        confirmLabel={metaBusy ? safeT(t, "common.loading", "Chargement…") : safeT(t, "common.delete", "Supprimer")}
        onCancel={() => deleteDialog?.closeDialog?.()}
        onConfirm={() => {
          deleteDialog?.closeDialog?.();
          void onDeleteForm?.();
        }}
        confirmRef={deleteDialog?.confirmRef || null}
        width="min(460px, calc(100vw - 32px))"
      />

      <RenderFormsConfirmDialog
        t={t}
        open={reimportDialog?.open === true}
        title={safeT(t, "postprod.data.forms.reimportDialog.title", "Confirmation")}
        message={safeT(
          t,
          "postprod.data.forms.reimportDialog.message",
          "Attention, vos modifications vont etre reinitialisees. Continuer ?"
        )}
        busy={fieldsImportBusy}
        cancelLabel={safeT(t, "common.cancel", "Annuler")}
        confirmLabel={
          fieldsImportBusy
            ? safeT(t, "common.loading", "Chargement…")
            : safeT(t, "postprod.data.forms.reimportDialog.continue", "Continuer")
        }
        onCancel={() => reimportDialog?.closeDialog?.()}
        onConfirm={async () => {
          reimportDialog?.setOpen?.(false);
          await onImportFieldsFromWrcPreset?.();
        }}
        confirmRef={reimportDialog?.confirmRef || null}
        width="min(560px, calc(100vw - 32px))"
      />
    </>
  );
}

export { RenderFormsEditorDialogs };
