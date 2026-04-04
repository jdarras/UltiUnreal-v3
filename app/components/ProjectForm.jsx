export default function ProjectForm({
  t,
  form,
  setForm,
  formError,
  onSubmit,
  onCancel,
  editingIndex,
  noteRef,
  onBrowse,
  normalizePath,
  clearFormError,
}) {
  return (
    <form className="uu-form mt-12" onSubmit={onSubmit}>
      {formError ? (
        <div className="uu-msg error" style={{ marginBottom: '8px' }}>
          {formError}
        </div>
      ) : null}

      {/* Ligne unique : Nom + Chemin + Parcourir ferré à droite */}
      <div className="uu-row wrap">
        <div className="uu-label w-160">
          {t('projects.server.form.nameLabel')}
        </div>
        <div className="uu-value">
          <div className="uu-project-row">
            {/* Nom du projet */}
            <div className="uu-project-name">
              <input
                className="uu-input"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder={t('projects.server.form.namePlaceholder')}
                onFocus={clearFormError}
              />
            </div>

            {/* Chemin + bouton Parcourir */}
            <div className="uu-project-path">
              <div className="uu-project-path-inner">
                <input
                  className="uu-input"
                  value={form.projectPath}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, projectPath: e.target.value }))
                  }
                  onBlur={(e) =>
                    setForm((f) => ({
                      ...f,
                      projectPath: normalizePath(e.target.value),
                    }))
                  }
                  placeholder="D:\\Projets\\MonJeu\\MonJeu.uproject"
                  onFocus={clearFormError}
                />
                <button
                  type="button"
                  className="uu-btn"
                  onClick={onBrowse}
                >
                  {t('common.browse')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Note en dessous, large, auto-agrandissement en hauteur */}
      <div className="uu-row wrap mt-8">
        <div className="uu-label w-160">{t('projects.server.form.noteLabel')}</div>
        <div className="uu-value">
          <textarea
            ref={noteRef}
            className="uu-input uu-textarea-note"
            rows={1}
            value={form.note || ''}
            onChange={(e) => {
              const el = e.target;
              el.style.height = '0px';
              el.style.height = el.scrollHeight + 'px';
              setForm((f) => ({ ...f, note: el.value }));
            }}
            placeholder={t('projects.server.form.notePlaceholder')}
          />
        </div>
      </div>

      <div className="uu-row mt-8">
        <button type="submit" className="uu-btn">
          {editingIndex !== null
            ? t('projects.server.form.submitEdit')
            : t('projects.server.form.submitCreate')}
        </button>
        <button type="button" className="uu-btn" onClick={onCancel}>
          {t('projects.server.form.cancel')}
        </button>
      </div>
    </form>
  );
}
