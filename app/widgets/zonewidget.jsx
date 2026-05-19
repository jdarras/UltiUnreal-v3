// app/widgets/zonewidget.jsx
import { useEffect, useRef } from 'react';
import './zonewidget.css';
import { getWidgetT } from './widgetTranslator.js';

function buildZoneHeaderStyle(headerColor) {
  return { backgroundColor: headerColor };
}

function buildZoneBodyStyle(bodyColor) {
  return { backgroundColor: bodyColor };
}

/**
 * Widget visuel de Zone
 * - Pas de binding WRC
 * - Sert uniquement à organiser visuellement le layout
 */
export default function ZoneWidget({
  label,
  note,
  color,
  editMode,
  onDelete,
  onDuplicate,
  onHeaderHeightChange
}) {

  const t = getWidgetT();
  const headerColor = color || '#1F2937';

    const headerRef = useRef(null);

  useEffect(() => {
    if (!headerRef.current || !onHeaderHeightChange) return;

    const el = headerRef.current;

    const notify = () => {
      const rect = el.getBoundingClientRect();
      const h = Math.round(rect.height);
      if (!Number.isFinite(h) || h <= 0) return;
      onHeaderHeightChange(h);
    };

    // mesure initiale
    notify();

    // mise à jour auto si le header change de taille
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => {
        notify();
      });
      observer.observe(el);
      return () => observer.disconnect();
    }

    // petit fallback si pas de ResizeObserver
    window.addEventListener('resize', notify);
    return () => window.removeEventListener('resize', notify);
  }, [onHeaderHeightChange, note, label]);

  function hexToRgba(hex, alpha) {
    if (!hex || typeof hex !== 'string') {
      return `rgba(31, 41, 55, ${alpha})`;
    }
    let h = hex.replace('#', '');
    if (h.length === 3) {
      h = h.split('').map((c) => c + c).join('');
    }
    const num = parseInt(h, 16);
    if (Number.isNaN(num)) {
      return `rgba(31, 41, 55, ${alpha})`;
    }
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

    const bodyColor = hexToRgba(color || '#1F2937', 0.18);

  return (
    <div className="uu-zone-widget">
      <div className="uu-zone">
        <div
          ref={headerRef}
          className="uu-zone-header"
          style={buildZoneHeaderStyle(headerColor)}
        >
          <div className="uu-zone-header-main">
            <div className="uu-zone-title-block">
              <div className="uu-zone-title">{label || t('production.widgets.zoneLabel')}</div>
              {note && note.trim() !== '' && (
                <div className="uu-zone-note">{note}</div>
              )}
            </div>

            <div className="uu-zone-header-actions">
              {editMode && onDuplicate && (
                <button
                  type="button"
                  className="uu-btn uu-btn-square"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate();
                  }}
                  aria-label={t('widgets.common.duplicateWidget')}
                  title={t('widgets.common.duplicateWidget')}
                >
                  D
                </button>
              )}
              {editMode && onDelete && (
                <button
                  type="button"
                  className="uu-btn-delete uu-zone-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  aria-label={t('widgets.common.deleteWidget')}
                  title={t('widgets.common.deleteWidget')}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        <div
          className="uu-zone-body"
          style={buildZoneBodyStyle(bodyColor)}
        >
          {/* Les widgets "enfants" sont gérés par le layout global,
              ici c'est juste le fond visuel de la zone */}
        </div>
      </div>
    </div>
  );
}

/**
 * Colonne droite : Label + Couleur
 */
export function ZoneEditorRight({ selected, updateSelected }) {
  const ui = selected.ui || {};
  const color = ui.color || '#1F2937';
  const t = getWidgetT()

  function handleLabelChange(e) {
    updateSelected?.({ label: e.target.value });
  }

  function handleColorChange(e) {
    const hex = e.target.value || '#1F2937';
    updateSelected?.({
      ui: {
        ...ui,
        color: hex
      }
    });
  }

  return (
    <>
      <div className="uu-row">
        <div className="uu-label w-160">{t('widgets.common.label')}</div>
        <div className="uu-col">
          <input
            className="uu-input"
            type="text"
            value={selected.label || ''}
            onChange={handleLabelChange}
          />
        </div>
      </div>

      <div className="uu-row mt-8">
        <label className="uu-label w-160">{t('widgets.zone.colorLabel')}</label>
        <input
          type="color"
          className="uu-input-color"
          value={color}
          onChange={handleColorChange}
        />
      </div>

    </>
  );
}

/**
 * Colonne gauche : Note (textarea auto-height)
 */
export function ZoneNoteEditor({ selected, updateSelected }) {
  const textareaRef = useRef(null);
  const note = selected.note || '';
  const t = getWidgetT();

  useEffect(() => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, [note]);

  function handleChange(e) {
    const value = e.target.value;
    updateSelected?.({ note: value });
  }

  return (
    <div className="uu-zone-note-editor">
      <div className="uu-label">{t('widgets.zone.noteLabel')}</div>
      <textarea
        ref={textareaRef}
        className="uu-input uu-zone-note-input"
        value={note}
        onChange={handleChange}
        rows={1}
      />
    </div>
  );
}

