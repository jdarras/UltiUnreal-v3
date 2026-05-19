import React from 'react';
import '../widgets/textwidget.css'; // reuse basic input styles
import './browsewidget.css';
import BindingPicker from './bindingpicker.jsx';
import { getCompanionBaseUrl } from '../utils/agent';
import { getWidgetT } from './widgetTranslator.js';
import {
  getBrowseActionLabel,
  getBrowsePathPlaceholder,
  getBrowsePlaceholderLabel,
  getSendActionLabel
} from './widgetI18n.js';

const ACCEPT = '.jpg,.jpeg,.png,.tga,.mp4,.mov,.hap';
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'tga'];
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'hap'];
const BROWSE_HIDDEN_FILE_INPUT_STYLE = { display: 'none' };

function buildBrowseFilters(preferType = '') {
  const imageFilter = { name: 'Images', extensions: IMAGE_EXTENSIONS };
  const videoFilter = { name: 'Vidéos', extensions: VIDEO_EXTENSIONS };
  const kind = String(preferType || '').trim().toLowerCase();
  if (kind === 'video') return [videoFilter, imageFilter];
  if (kind === 'image') return [imageFilter, videoFilter];
  return [imageFilter, videoFilter];
}

function extToType(path = '') {
  const s = String(path || '').toLowerCase();
  if (/\.(jpg|jpeg|png|tga)$/.test(s)) return 'image';
  if (/\.(mp4|mov|hap)$/.test(s)) return 'video';
  return '';
}

function normalizeMediaPath(input = '') {
  let p = String(input || '').trim();
  if (!p) return '';
  if (
    (p.startsWith('"') && p.endsWith('"')) ||
    (p.startsWith("'") && p.endsWith("'"))
  ) {
    p = p.slice(1, -1).trim();
  }
  if (/^file:\/\//i.test(p)) {
    p = p.replace(/^file:\/\//i, '');
    p = p.replace(/^\/+/, '');
    try {
      p = decodeURIComponent(p);
    } catch {
      // ignore decode errors
    }
  }
  p = p.replace(/\\/g, '/');
  return p;
}

function extractMediaDir(input = '') {
  const norm = normalizeMediaPath(input || '');
  if (!norm) return '';
  const trimmed = norm.replace(/\/+$/, '');
  const idx = trimmed.lastIndexOf('/');
  if (idx <= 0) return '';
  return trimmed.slice(0, idx);
}

function inferBrowseType(preferType = '', ...paths) {
  const preferred = String(preferType || '').trim().toLowerCase();
  if (preferred === 'image' || preferred === 'video') return preferred;
  for (const p of paths) {
    const inferred = extToType(p);
    if (inferred) return inferred;
  }
  return '';
}

function getMediaFileName(input = '') {
  const norm = normalizeMediaPath(input || '');
  if (!norm) return '';
  const parts = String(norm).split('/');
  return parts[parts.length - 1] || '';
}

function toFileUrl(p = '') {
  if (!p) return '';
  const norm = String(p).trim().replace(/\\/g, '/');
  if (/^file:\/\//i.test(norm)) return norm;
  return `file:///${encodeURI(norm)}`;
}

export function BrowseWidget({
  label,
  value,
  onChange,
  onPersist,
  onCommit,
  onSetDefault,
  disabled,
  editMode,
  onDelete,
  onDuplicate,
  rightSlot,
  t,
  defaultValue,
  browseLastDir,
  browsePreferType,
  thumb,
  live,
}) {
  const tt = t || getWidgetT();
  const browsePlaceholder = getBrowsePlaceholderLabel(tt);
  const browsePathPlaceholder = getBrowsePathPlaceholder(tt);
  const browseActionLabel = getBrowseActionLabel(tt);
  const sendActionLabel = getSendActionLabel(tt);
  const fileInputRef = React.useRef(null);
  const [preview, setPreview] = React.useState('');
  const [mediaType, setMediaType] = React.useState(extToType(value));
  const isLive = live === true;
  const rawValue = value ?? '';
  const rawDefault = defaultValue ?? '';

  React.useEffect(() => {
    if (thumb) {
      setPreview(thumb);
      setMediaType('image');
      return;
    }

    const mt = extToType(value);
    setMediaType(mt);
    if (mt === 'image' && value) {
      setPreview(toFileUrl(value));
    } else {
      setPreview('');
    }
  }, [value, thumb]);

  const triggerBrowse = async () => {
    const preferredType = inferBrowseType(
      browsePreferType,
      rawValue,
      rawDefault
    );
    const preferredDir =
      String(browseLastDir || '').trim() ||
      extractMediaDir(rawValue) ||
      extractMediaDir(rawDefault) ||
      '';

    // Si l'API Electron est dispo, on l'utilise pour récupérer le vrai chemin
    if (window.electron?.chooseFile) {
      try {
        const res = await window.electron.chooseFile({
          title: 'Choisir un média',
          filters: buildBrowseFilters(preferredType),
          defaultPath: preferredDir || undefined,
        });
        if (!res) {
          // Cancel explicite: ne pas déclencher le fallback HTML.
          return;
        }
        let p = '';
        if (typeof res === 'string') p = res;
        else if (res && typeof res === 'object') {
          p = res.file || res.path || (Array.isArray(res) ? res[0] : '');
        }
        if (!p) return;
        const norm = normalizeMediaPath(p);
        const mt = extToType(norm);
        let dataUrl = '';
        if (mt === 'image' && window.electron?.readFileAsDataUrl) {
          try {
            dataUrl = await window.electron.readFileAsDataUrl(norm);
          } catch {
            dataUrl = '';
          }
        }

        if (dataUrl) {
          setPreview(dataUrl);
          setMediaType('image');
          onChange?.(norm, dataUrl);
          onPersist?.(norm, dataUrl);
          if (isLive) onCommit?.(norm, dataUrl);
        } else {
          onChange?.(norm);
          onPersist?.(norm);
          if (isLive) onCommit?.(norm);
        }
        return;
      } catch {
        // fallback sur l'input
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const videoLabel = getMediaFileName(rawValue);
  const hasDefault = String(rawDefault || '').trim() !== '';
  const isAtDefault =
    hasDefault && String(rawValue || '').trim() === String(rawDefault || '').trim();
  const canReset = hasDefault && !isAtDefault;
  const canSetDefault =
    !disabled &&
    (!hasDefault || canReset) &&
    String(rawValue || '').trim() !== '';

  const handleReset = async (e) => {
    e.stopPropagation();
    if (!hasDefault) return;
    const next = normalizeMediaPath(rawDefault || '');
    const mt = extToType(next);
    if (mt === 'image' && window.electron?.readFileAsDataUrl) {
      try {
        const dataUrl = await window.electron.readFileAsDataUrl(next);
        if (dataUrl) {
          setPreview(dataUrl);
          setMediaType('image');
          onChange?.(next, dataUrl);
          onPersist?.(next, dataUrl);
          onCommit?.(next, dataUrl);
          return;
        }
      } catch {
        // fallback to plain path
      }
    }
    onChange?.(next);
    onPersist?.(next);
    onCommit?.(next);
  };

  const commitNormalized = (raw, thumb) => {
    const norm = normalizeMediaPath(raw || '');
    if (norm && norm !== raw) {
      onChange?.(norm, thumb);
    }
    onPersist?.(norm, thumb);
    if (isLive) onCommit?.(norm, thumb);
  };

  const handleSetDefault = (e) => {
    e.stopPropagation();
    if (!canSetDefault) return;
    onSetDefault?.(normalizeMediaPath(rawValue || ''));
  };

  const handleSend = (e) => {
    e.stopPropagation();
    if (disabled) return;
    const norm = normalizeMediaPath(rawValue || '');
    const sendThumb =
      mediaType === 'image' &&
      typeof preview === 'string' &&
      preview.startsWith('data:')
        ? preview
        : undefined;
    if (norm && norm !== rawValue) {
      onChange?.(norm, sendThumb);
    }
    onPersist?.(norm, sendThumb);
    onCommit?.(norm, sendThumb);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (!onDelete) return;
    onDelete();
  };

  const handleDuplicate = (e) => {
    e.stopPropagation();
    if (!onDuplicate) return;
    onDuplicate();
  };

  const hasLabelText = String(label || '').trim() !== '';
  const labelDisplay = hasLabelText ? label : tt('widgets.common.noLabel');

  const showTitleRow = hasLabelText || (editMode && onDuplicate);

  return (
    <div className="uu-browse-widget">
      {showTitleRow && (
        <div className="uu-item-title-row">
          <div className="uu-item-title" title={label || ''}>
            {labelDisplay}
          </div>
          {editMode && onDuplicate && (
            <div className="uu-item-title-actions">
              <button
                type="button"
                className="uu-btn uu-btn-square"
                onClick={handleDuplicate}
                title={tt('widgets.common.duplicateWidget')}
                aria-label={tt('widgets.common.duplicateWidget')}
              >
                D
              </button>
            </div>
          )}
        </div>
      )}

      {mediaType === 'image' && preview ? (
        <div className="uu-browse-preview">
          <img
            src={preview}
            alt=""
            className="uu-browse-preview-img"
          />
        </div>
      ) : mediaType === 'video' && rawValue ? (
        <div className="uu-browse-preview uu-browse-preview-video">
          <svg
            className="uu-browse-preview-video-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <rect className="uu-browse-preview-video-outline" x="3.5" y="5.5" width="17" height="13" rx="2" />
            <rect className="uu-browse-preview-video-hole" x="5.5" y="7" width="2" height="2" />
            <rect className="uu-browse-preview-video-hole" x="5.5" y="11" width="2" height="2" />
            <rect className="uu-browse-preview-video-hole" x="5.5" y="15" width="2" height="2" />
            <rect className="uu-browse-preview-video-hole" x="16.5" y="7" width="2" height="2" />
            <rect className="uu-browse-preview-video-hole" x="16.5" y="11" width="2" height="2" />
            <rect className="uu-browse-preview-video-hole" x="16.5" y="15" width="2" height="2" />
            <path className="uu-browse-preview-video-play" d="M10 9.2l4 2.8-4 2.8z" />
          </svg>
          <div className="uu-browse-preview-video-name" title={videoLabel}>
            {videoLabel || browsePlaceholder}
          </div>
        </div>
      ) : (
        <div className="uu-browse-preview uu-browse-preview-empty">
          <span className="uu-muted">
            {browsePlaceholder}
          </span>
        </div>
      )}

      <div className="mt-8">
        <input
          className="uu-input uu-browse-input"
          value={rawValue}
          onChange={(e) => onChange?.(e.target.value)}
          onBlur={(e) => commitNormalized(e.target.value)}
          placeholder={browsePathPlaceholder}
          disabled={disabled}
        />
      </div>

      <div className="uu-row mt-4 uu-align-center uu-browse-actions">
        <button
          type="button"
          className="uu-btn"
          onClick={triggerBrowse}
          disabled={disabled}
        >
          {browseActionLabel}
        </button>

        {!isLive && (
          <button
            type="button"
            className="uu-btn uu-btn-primary uu-btn-sm"
            onClick={handleSend}
            disabled={disabled}
          >
            {sendActionLabel}
          </button>
        )}

        {canReset && (
          <button
            type="button"
            className="uu-reset-btn"
            onClick={handleReset}
            disabled={disabled}
            title={tt('widgets.common.resetDefault')}
          >
            ↺
          </button>
        )}

        {canSetDefault && (
          <button
            type="button"
            className="uu-reset-btn uu-set-default"
            onClick={handleSetDefault}
            disabled={disabled}
            title={tt('widgets.common.setAsDefault')}
          >
            ↓
          </button>
        )}

        {editMode && onDelete && (
          <button
            type="button"
            className="uu-btn-delete"
            onClick={handleDelete}
            title={tt('widgets.common.deleteWidget')}
            aria-label={tt('widgets.common.deleteWidget')}
          >
            ✕
          </button>
        )}

        {rightSlot ? (
          <div className="uu-row uu-row-gap4">
            {rightSlot}
          </div>
        ) : null}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT}
        style={BROWSE_HIDDEN_FILE_INPUT_STYLE}
        onChange={(e) => {
          const file = e.target.files && e.target.files[0];
          const p = file && file.path ? file.path : '';
          if (!p) return;
          const norm = normalizeMediaPath(p);
          const mt = extToType(norm);
          // Lecture base64 pour persister l'aperçu
          if (mt === 'image' && file) {
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = reader.result;
              setPreview(dataUrl);
              setMediaType(mt);
              onChange?.(norm, dataUrl);
              onPersist?.(norm, dataUrl);
              if (isLive) onCommit?.(norm, dataUrl);
            };
            reader.readAsDataURL(file);
          } else {
            onChange?.(norm);
            onPersist?.(norm);
            if (isLive) onCommit?.(norm);
          }
        }}
      />
    </div>
  );
}

export function BrowseEditorLeftExtras({ selected, layoutId = '' }) {
  if (!selected) return null;
  const t = getWidgetT();
  const widgetId = selected?.id;

  let baseUrl = '';
  try {
    baseUrl = getCompanionBaseUrl();
  } catch (e) {
    console.warn('BrowseEditorLeftExtras: getCompanionBaseUrl failed', e);
  }

  const layoutQuery = layoutId
    ? `?layoutId=${encodeURIComponent(String(layoutId).trim())}`
    : '';
  const url = widgetId
    ? `${baseUrl}/agent/ui/widgets/${encodeURIComponent(widgetId)}/press${layoutQuery}`
    : '';
  const exampleBody = '{"value":"C:\\\\path\\\\file.png"}';

  const handleCopy = (text) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        console.warn('Clipboard API not available');
      }
    } catch (e) {
      console.error('Failed to copy Companion snippet', e);
    }
  };

  if (!widgetId) return null;

  return (
    <>
      <div className="uu-row">
        <label className="uu-label w-160">
          {t('widgets.companion.urlLabel')}
        </label>
        <div className="uu-value uu-buttons-row">
          <button
            type="button"
            className="uu-btn-secondary"
            onClick={() => handleCopy(url)}
            title={url}
          >
            {t('widgets.companion.copy')}
          </button>
        </div>
      </div>

      <div className="uu-row">
        <label className="uu-label w-160">
          {t('widgets.companion.bodyLabel')}
        </label>
        <div className="uu-value uu-buttons-row">
          <button
            type="button"
            className="uu-btn-secondary"
            onClick={() => handleCopy('{}')}
            title="{}"
          >
            {t('widgets.common.send')}
          </button>
          <button
            type="button"
            className="uu-btn-secondary"
            onClick={() => handleCopy('{"action":"reset"}')}
            title='{"action":"reset"}'
          >
            Reset
          </button>
          <button
            type="button"
            className="uu-btn-secondary"
            onClick={() => handleCopy(exampleBody)}
            title={exampleBody}
          >
            {t('widgets.companion.example')}
          </button>
        </div>
      </div>
    </>
  );
}

export function BrowseLabelEditor({ selected, updateSelected }) {
  if (!selected) return null;
  const t = getWidgetT();
  const label = selected.label ?? '';
  const hasError = !label.trim();
  const ui = selected.ui || {};
  const live = ui.live === true;
  return (
    <>
      <div className="uu-row">
        <label className={`uu-label w-160 ${hasError ? 'uu-label-error' : ''}`}>
          {t('widgets.common.label')}
        </label>
        <input
          className="uu-input uu-input-label"
          value={label}
          onChange={(e) => updateSelected({ label: e.target.value })}
        />
      </div>

      <div className="uu-row mt-4">
        <label className="uu-label w-160">
          {t('widgets.joystick.liveSendLabel')}
        </label>
        <input
          type="checkbox"
          className="uu-checkbox-inline"
          checked={live}
          onChange={(e) =>
            updateSelected({
              ui: {
                ...ui,
                live: e.target.checked
              }
            })
          }
        />
      </div>
    </>
  );
}

export function BrowseEditorRight({ selected, updateSelected, updateBinding, presetData }) {
  if (!selected) return null;
  const t = getWidgetT();
  const browsePlaceholder = getBrowsePlaceholderLabel(t);
  const browseActionLabel = getBrowseActionLabel(t);
  const bindingKind =
    selected?.binding?.kind === 'function' ? 'function' : 'property';
  const fileInputRef = React.useRef(null);
  const [defaultPreview, setDefaultPreview] = React.useState('');
  const [defaultType, setDefaultType] = React.useState('');
  const defaultLabel = getMediaFileName(selected?.defaultValue || '');

  React.useEffect(() => {
    const raw = String(selected?.defaultValue || '').trim();
    const p = normalizeMediaPath(raw);
    if (raw && p && p !== raw) {
      updateSelected({ defaultValue: p });
    }
    if (!p) {
      setDefaultPreview('');
      setDefaultType('');
      return;
    }

    const mt = extToType(p);
    setDefaultType(mt);
    if (mt !== 'image') {
      setDefaultPreview('');
      return;
    }

    let cancelled = false;
    const loadPreview = async () => {
      let dataUrl = '';
      if (window.electron?.readFileAsDataUrl) {
        try {
          dataUrl = await window.electron.readFileAsDataUrl(p);
        } catch {
          dataUrl = '';
        }
      }

      if (!cancelled) {
        setDefaultPreview(dataUrl || toFileUrl(p));
      }
    };
    loadPreview();

    return () => {
      cancelled = true;
    };
  }, [selected?.defaultValue]);

  const pickDefault = async () => {
    const preferredType = inferBrowseType(
      selected?.browsePreferType,
      selected?.defaultValue,
      selected?.mediaPath
    );
    const preferredDir =
      String(selected?.browseLastDir || '').trim() ||
      extractMediaDir(selected?.defaultValue || '') ||
      extractMediaDir(selected?.mediaPath || '') ||
      '';

    if (window.electron?.chooseFile) {
      try {
        const res = await window.electron.chooseFile({
          title: 'Choisir un média par défaut',
          filters: buildBrowseFilters(preferredType),
          defaultPath: preferredDir || undefined,
        });
        if (!res) return;
        let p = '';
        if (typeof res === 'string') p = res;
        else if (res && typeof res === 'object') {
          p = res.file || res.path || (Array.isArray(res) ? res[0] : '');
        }
        if (!p) return;
        const norm = normalizeMediaPath(p);
        const mt = extToType(norm);
        const dir = extractMediaDir(norm);
        updateSelected({
          defaultValue: norm,
          ...(dir ? { browseLastDir: dir } : {}),
          ...(mt ? { browsePreferType: mt } : {}),
        });
        return;
      } catch {
        // fallback sur l'input file
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  return (
    <div className="uu-list">
      <div className="uu-row uu-binding-row">
        <label className="uu-label w-160">
          {t('widgets.binding.kind')}
        </label>
        <select
          className="uu-input"
          value={bindingKind}
          onChange={(e) => {
            const nextKind = e.target.value === 'function' ? 'function' : 'property';
            if (updateBinding) {
              updateBinding({
                kind: nextKind,
                ownerName: '',
                path: '',
                propertyName: '',
                displayName: '',
                argValues: {},
                paramBools: {},
                browseArgName: '',
                valueType: 'text'
              });
            } else {
              updateSelected({
                binding: {
                  ...(selected.binding || {}),
                  kind: nextKind,
                  ownerName: '',
                  path: '',
                  propertyName: '',
                  displayName: '',
                  argValues: {},
                  paramBools: {},
                  browseArgName: '',
                  valueType: 'text'
                }
              });
            }
          }}
        >
          <option value="property">{t('widgets.binding.property')}</option>
          <option value="function">{t('widgets.binding.function')}</option>
        </select>
      </div>

      <BindingPicker
        kind={bindingKind}
        presetData={presetData}
        value={selected.binding}
        onChange={(b) => {
          if (updateBinding) updateBinding(b);
          else updateSelected({ binding: b });
        }}
        valueMode="browse"
        hideArgs={bindingKind === 'function'}
      />

      <div className="uu-row mt-8 uu-browse-default-row">
        <label className="uu-label w-160">{t('widgets.common.defaultValueLabel')}</label>
        <button type="button" className="uu-btn" onClick={pickDefault}>
          {browseActionLabel}
        </button>
      </div>

      <div className="uu-row uu-browse-default-input-row">
        <div className="uu-label w-160" />
        <input
          className="uu-input"
          value={selected.defaultValue || ''}
          onChange={(e) => updateSelected({ defaultValue: e.target.value })}
          onBlur={(e) => {
            const norm = normalizeMediaPath(e.target.value);
            if (!norm) return;
            const dir = extractMediaDir(norm);
            const mt = extToType(norm);
            updateSelected({
              defaultValue: norm,
              ...(dir ? { browseLastDir: dir } : {}),
              ...(mt ? { browsePreferType: mt } : {}),
            });
          }}
        />
      </div>

      <div className="uu-row uu-browse-default-preview-row">
        <div className="uu-label w-160" />
        {defaultType === 'image' && defaultPreview ? (
          <div className="uu-browse-preview uu-browse-default-preview">
            <img
              src={defaultPreview}
              alt=""
              className="uu-browse-preview-img"
            />
          </div>
        ) : defaultType === 'video' && defaultLabel ? (
          <div className="uu-browse-preview uu-browse-default-preview uu-browse-preview-video">
            <svg
              className="uu-browse-preview-video-icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <rect className="uu-browse-preview-video-outline" x="3.5" y="5.5" width="17" height="13" rx="2" />
              <rect className="uu-browse-preview-video-hole" x="5.5" y="7" width="2" height="2" />
              <rect className="uu-browse-preview-video-hole" x="5.5" y="11" width="2" height="2" />
              <rect className="uu-browse-preview-video-hole" x="5.5" y="15" width="2" height="2" />
              <rect className="uu-browse-preview-video-hole" x="16.5" y="7" width="2" height="2" />
              <rect className="uu-browse-preview-video-hole" x="16.5" y="11" width="2" height="2" />
              <rect className="uu-browse-preview-video-hole" x="16.5" y="15" width="2" height="2" />
              <path className="uu-browse-preview-video-play" d="M10 9.2l4 2.8-4 2.8z" />
            </svg>
            <div className="uu-browse-preview-video-name" title={defaultLabel}>
              {defaultLabel || browsePlaceholder}
            </div>
          </div>
        ) : (
          <div className="uu-browse-preview uu-browse-default-preview uu-browse-preview-empty">
            <span className="uu-muted">
              {browsePlaceholder}
            </span>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT}
        style={BROWSE_HIDDEN_FILE_INPUT_STYLE}
          onChange={(e) => {
            const file = e.target.files && e.target.files[0];
            const p = file && file.path ? file.path : '';
            if (!p) return;
            const norm = normalizeMediaPath(p);
            const dir = extractMediaDir(norm);
            const mt = extToType(norm);
            updateSelected({
              defaultValue: norm,
              ...(dir ? { browseLastDir: dir } : {}),
              ...(mt ? { browsePreferType: mt } : {}),
            });
          }}
        />
      </div>
  );
}

