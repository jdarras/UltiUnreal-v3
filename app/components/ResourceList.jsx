// app/components/ResourceList.jsx
import React from 'react';
import { VariableSizeList } from 'react-window';
import RatingStars from './RatingStars.jsx';
import { safeT } from '../utils/i18nSafe.js';
import {
  getAddKeywordLabel,
  getAmbianceLabel,
  getDistributionLabel,
  getFavoriteLabel,
  getLicenseLabel,
  getNoPreviewLabel,
  getNoneOptionLabel,
  getPerformanceLabel,
  getPurchasedLabel,
  getQualityLabel,
  getResourceEditLabel,
  getResourceOpenLabel,
  getStyleLabel,
  getTagsLabel,
  getTestedLabel,
  getTypeLabel,
  getUsageLabel,
  getUeVersionsLabel,
  getVersionIncompatibleLabel,
} from './componentI18n';

const CARD_VIRTUAL_THRESHOLD = 90;
const CARD_ESTIMATED_ROW_HEIGHT = 520;
const CARD_MIN_ROW_HEIGHT = 320;
const RESOURCE_LIST_CARD_FULL_HEIGHT_STYLE = { height: '100%' };
const RESOURCE_LIST_THUMB_SHRINK_STYLE = { flexShrink: 0 };
const RESOURCE_LIST_THUMB_ACTIONS_STYLE = { gap: '5px', flexWrap: 'nowrap' };
const RESOURCE_LIST_THUMB_ACTION_BUTTON_STYLE = { padding: '6px 6px', whiteSpace: 'nowrap', flexShrink: 0 };
const RESOURCE_LIST_CARD_BODY_STYLE = { gap: '8px', minHeight: '110px', flex: 1, minWidth: 0 };
const RESOURCE_LIST_CARD_TITLE_ROW_STYLE = { flexWrap: 'wrap' };
const RESOURCE_LIST_CARD_TITLE_STYLE = { flex: '0 1 auto' };
const RESOURCE_LIST_COMPAT_BADGE_STYLE = { marginLeft: '4px', marginTop: '2px' };
const RESOURCE_LIST_ACTIONS_STYLE = {
  flexWrap: 'wrap',
  rowGap: '6px',
  columnGap: '12px',
  alignItems: 'center',
  width: '100%',
  marginTop: 'auto',
};
const RESOURCE_LIST_CHECK_LABEL_STYLE = { whiteSpace: 'nowrap' };
const RESOURCE_LIST_KEYWORD_WRAP_STYLE = { flex: '0 0 auto', marginLeft: '12px' };
const RESOURCE_LIST_KEYWORD_INPUT_STYLE = { width: '240px' };
const RESOURCE_LIST_CARD_MARGIN_BOTTOM_STYLE = { marginBottom: '12px' };
const RESOURCE_LIST_VIRTUAL_ROW_OUTER_BASE_STYLE = { boxSizing: 'border-box', paddingRight: 8 };
const RESOURCE_LIST_VIRTUAL_ROW_INNER_STYLE = { paddingBottom: 12 };
const RESOURCE_LIST_CARD_MARGIN_ZERO_STYLE = { marginBottom: 0 };

function buildResourceListVirtualRowOuterStyle(style) {
  return { ...style, ...RESOURCE_LIST_VIRTUAL_ROW_OUTER_BASE_STYLE };
}

function normalizeThumbCandidates(candidates = []) {
  const list = Array.isArray(candidates) ? candidates : [candidates];
  const out = [];
  const seen = new Set();
  for (const entry of list) {
    const value = String(entry || '').trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function ResourceThumbImage({ candidates = [], alt = '', className = '', style = {} }) {
  const srcList = React.useMemo(() => normalizeThumbCandidates(candidates), [candidates]);
  const [srcIndex, setSrcIndex] = React.useState(0);
  const src = srcList[srcIndex] || '';

  const srcListKey = srcList.join('|');
  React.useEffect(() => {
    setSrcIndex(0);
  }, [srcListKey]);

  if (!src) return null;

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      style={style}
      onError={() => {
        setSrcIndex((prev) => Math.min(prev + 1, srcList.length));
      }}
    />
  );
}

function ResourceListThumbs({
  items,
  onOpenDetail,
  onOpenExternal,
  onToggleFavorite,
  getThumbSrc,
  getThumbCandidates,
  isUeIncompatible,
  t,
}) {
  const noPreviewLabel = getNoPreviewLabel(t);
  const editLabel = getResourceEditLabel(t);
  const favoriteLabel = getFavoriteLabel(t);
  const openLabel = getResourceOpenLabel(t);
  const versionIncompatibleLabel = getVersionIncompatibleLabel(t);
  return (
    <div className="uu-resource-grid thumbs">
      {items.map((item, idx) => {
        const thumbCandidates = normalizeThumbCandidates(
          typeof getThumbCandidates === 'function'
            ? getThumbCandidates(item)
            : (typeof getThumbSrc === 'function' ? [getThumbSrc(item)] : [])
        );
        const key = item?.uid || `${item?.title || 'item'}-${idx}`;
        const title = item?.title || item?.uid || '?';
        const seller = item?.seller ? String(item.seller).trim() : '';
        const kind = item?.listingType ? String(item.listingType).trim() : '';
        const meta = [seller, kind].filter(Boolean).join(' | ');
        const isFav = item?.user?.favorite === true;
        const incompatible = typeof isUeIncompatible === 'function' ? isUeIncompatible(item) : false;
        const compatText = versionIncompatibleLabel;

        return (
          <div key={key} className="uu-card uu-resource-thumb-card" style={RESOURCE_LIST_CARD_FULL_HEIGHT_STYLE}>
            {thumbCandidates.length > 0 ? (
              <ResourceThumbImage
                className="uu-resource-thumb-lg"
                candidates={thumbCandidates}
                alt={title}
                style={RESOURCE_LIST_THUMB_SHRINK_STYLE}
              />
            ) : (
              <div className="uu-resource-thumb-lg placeholder" style={RESOURCE_LIST_THUMB_SHRINK_STYLE}>
                {noPreviewLabel}
              </div>
            )}
            <div className="uu-resource-thumb-body">
              <div className="uu-resource-title-sm">{title}</div>
              {meta ? <div className="uu-resource-meta-sm">{meta}</div> : null}
              {incompatible ? (
                <div className="uu-resource-compat">
                  <span className="uu-dot fail" aria-hidden="true" />
                  <span>{compatText}</span>
                </div>
              ) : null}
              <div
                className="uu-resource-actions uu-resource-actions-sticky"
                style={RESOURCE_LIST_THUMB_ACTIONS_STYLE}
              >
                <button
                  className="uu-btn"
                  style={RESOURCE_LIST_THUMB_ACTION_BUTTON_STYLE}
                  onClick={() => onOpenDetail(item)}
                >
                  {editLabel}
                </button>
                {typeof onToggleFavorite === 'function' ? (
                  <button
                    type="button"
                    className={`uu-fav-btn ${isFav ? 'active' : ''}`}
                    onClick={() => onToggleFavorite(item)}
                    aria-pressed={isFav ? 'true' : 'false'}
                    title={favoriteLabel}
                    aria-label={favoriteLabel}
                  >
                    ★
                  </button>
                ) : null}
                {item?.listingUrl ? (
                  <button
                    className="uu-btn"
                    style={RESOURCE_LIST_THUMB_ACTION_BUTTON_STYLE}
                    onClick={() => onOpenExternal(item.listingUrl)}
                  >
                    {openLabel}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function toListStringLocal(list) {
  return (Array.isArray(list) ? list : [])
    .map((val) => String(val || '').trim())
    .filter(Boolean)
    .join(', ');
}

function buildMetaLineCards(item, t) {
  const usageLabel = getUsageLabel(t);
  const styleLabel = getStyleLabel(t);
  const ambianceLabel = getAmbianceLabel(t);
  const typeLabel = getTypeLabel(t);
  const distributionLabel = getDistributionLabel(t);
  const ueVersionsLabel = getUeVersionsLabel(t);
  const usage = item?.user?.usage ? String(item.user.usage).trim() : '';
  const style = item?.user?.style ? String(item.user.style).trim() : '';
  const ambiance = item?.user?.ambiance ? String(item.user.ambiance).trim() : '';
  const type = item?.listingType ? String(item.listingType).trim() : '';
  const distribution = item?.distribution
    ? String(item.distribution).trim()
    : (item?.listingRaw?.distribution ? String(item.listingRaw.distribution).trim() : '');
  const ue = item?.ueVersions?.length ? toListStringLocal(item.ueVersions) : '';

  const line1 = [];
  if (usage) line1.push(`${usageLabel}: ${usage}`);
  if (style) line1.push(`${styleLabel}: ${style}`);
  if (ambiance) line1.push(`${ambianceLabel}: ${ambiance}`);
  if (type) line1.push(`${typeLabel}: ${type}`);

  const line2 = [];
  if (distribution) line2.push(`${distributionLabel}: ${distribution}`);
  if (ue) line2.push(`${ueVersionsLabel}: ${ue}`);

  return { line1: line1.join(' | '), line2: line2.join(' | ') };
}

function ResourceCardItem({
  item,
  idx,
  keywordValue,
  onKeywordChange,
  onKeywordSubmit,
  onOpenDetail,
  onOpenExternal,
  onToggleFavorite,
  onTogglePurchased,
  onToggleTested,
  onAddKeyword,
  onSetUsage,
  onSetStyle,
  onSetAmbiance,
  onSetLicense,
  onSetQuality,
  onSetPerformance,
  usageOptions = [],
  styleOptions = [],
  ambianceOptions = [],
  licenseOptions = [],
  getThumbSrc,
  getThumbCandidates,
  isUeIncompatible,
  t,
  style = {},
}) {
  if (!item) return null;
  const noPreviewLabel = getNoPreviewLabel(t);
  const editLabel = getResourceEditLabel(t);
  const favoriteLabel = getFavoriteLabel(t);
  const openLabel = getResourceOpenLabel(t);
  const noneLabel = getNoneOptionLabel(t);
  const usageLabel = getUsageLabel(t);
  const styleLabel = getStyleLabel(t);
  const ambianceLabel = getAmbianceLabel(t);
  const licenseLabel = getLicenseLabel(t);
  const qualityLabel = getQualityLabel(t);
  const performanceLabel = getPerformanceLabel(t);
  const purchasedLabel = getPurchasedLabel(t);
  const testedLabel = getTestedLabel(t);
  const addKeywordLabel = getAddKeywordLabel(t);
  const tagsLabel = getTagsLabel(t);
  const versionIncompatibleLabel = getVersionIncompatibleLabel(t);
  const thumbCandidates = normalizeThumbCandidates(
    typeof getThumbCandidates === 'function'
      ? getThumbCandidates(item)
      : (typeof getThumbSrc === 'function' ? [getThumbSrc(item)] : [])
  );
  const metaLines = buildMetaLineCards(item, t);
  const key = item?.uid || `${item?.title || 'item'}-${idx}`;
  const title = item?.title || item?.uid || '?';
  const isFav = item?.user?.favorite === true;
  const isPurchased = item?.user?.purchased === true;
  const isTested = item?.user?.tested === true;
  const userKeywords = Array.isArray(item?.user?.keywords)
    ? item.user.keywords.map((k) => String(k || '').trim()).filter(Boolean)
    : [];
  const baseKeywords = Array.isArray(item?.tags || item?.keywords)
    ? (item.tags || item.keywords).map((k) => String(k || '').trim()).filter(Boolean)
    : [];
  const keywords = Array.from(new Set([...baseKeywords, ...userKeywords])).filter(Boolean);
  const normalizeUsageLocal = (val) => {
    const raw = String(val || '').trim();
    const l = raw.toLowerCase();
    if (l === 'augmented_reality' || l === 'augmented reality' || l === 'augmented-reality' || l === 'réalité augmentée' || l === 'realite augmentee' || l === 'ar' || l === 'ra') {
      return 'augmented_reality';
    }
    return raw;
  };
  const optValLabel = (opt, keyPrefix) => {
    if (typeof opt === 'string') {
      return { value: opt, label: safeT(t, `resources.detail.${keyPrefix}.${opt}`, opt) };
    }
    const v = String(opt?.value || '').trim();
    const label = opt?.label || safeT(t, `resources.detail.${keyPrefix}.${v}`, v);
    return { value: v, label };
  };

  const usageOpts = usageOptions.map((o) => optValLabel(o, 'usage'));
  const styleOpts = styleOptions.map((o) => optValLabel(o, 'style'));
  const ambianceOpts = ambianceOptions.map((o) => optValLabel(o, 'ambiance'));
  const licenseOpts = licenseOptions.map((o) => optValLabel(o, 'license'));

  const usageValRaw = normalizeUsageLocal(item?.user?.usage);
  const usageVal = usageOpts.some((o) => o.value === usageValRaw) ? usageValRaw : '';
  const styleVal = styleOpts.some((o) => o.value === String(item?.user?.style || '').trim())
    ? String(item?.user?.style || '').trim()
    : '';
  const ambianceVal = ambianceOpts.some((o) => o.value === String(item?.user?.ambiance || '').trim())
    ? String(item?.user?.ambiance || '').trim()
    : '';
  const licenseVal = licenseOpts.some((o) => o.value === String(item?.user?.license || '').trim())
    ? String(item?.user?.license || '').trim()
    : '';
  const ratingQuality = Math.max(0, Math.min(5, Math.round(Number(item?.user?.ratingQuality) || 0)));
  const ratingPerformance = Math.max(0, Math.min(5, Math.round(Number(item?.user?.ratingPerformance) || 0)));
  const incompatible = typeof isUeIncompatible === 'function' ? isUeIncompatible(item) : false;
  const compatText = versionIncompatibleLabel;

  const handleKeywordSubmit = () => {
    if (typeof onKeywordSubmit === 'function') {
      onKeywordSubmit(item, key);
    }
  };

  return (
    <div className="uu-card uu-resource-card" style={style}>
      {thumbCandidates.length > 0 ? (
        <ResourceThumbImage
          className="uu-resource-thumb"
          candidates={thumbCandidates}
          alt={title}
        />
      ) : (
        <div className="uu-resource-thumb placeholder">
          {noPreviewLabel}
        </div>
      )}
      <div className="uu-col" style={RESOURCE_LIST_CARD_BODY_STYLE}>
        <div className="uu-row uu-align-center uu-gap-8" style={RESOURCE_LIST_CARD_TITLE_ROW_STYLE}>
          <div className="uu-resource-title" style={RESOURCE_LIST_CARD_TITLE_STYLE}>{title}</div>
          {incompatible ? (
            <div className="uu-resource-compat" style={RESOURCE_LIST_COMPAT_BADGE_STYLE}>
              <span className="uu-dot fail" aria-hidden="true" />
              <span>{compatText}</span>
            </div>
          ) : null}
        </div>
        {metaLines && metaLines.line1 ? <div className="uu-resource-meta">{metaLines.line1}</div> : null}
        {metaLines && metaLines.line2 ? <div className="uu-resource-meta">{metaLines.line2}</div> : null}
        <div className="uu-resource-indexing">
          <div className="uu-index-field">
            <label className="uu-label-sm">{usageLabel}</label>
            <select
              className="uu-select"
              value={usageVal}
              onChange={(e) => onSetUsage && onSetUsage(item, e.target.value)}
            >
              <option value="">{noneLabel}</option>
              {usageOpts.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="uu-index-field">
            <label className="uu-label-sm">{styleLabel}</label>
            <select
              className="uu-select"
              value={styleVal}
              onChange={(e) => onSetStyle && onSetStyle(item, e.target.value)}
            >
              <option value="">{noneLabel}</option>
              {styleOpts.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="uu-index-field">
            <label className="uu-label-sm">{ambianceLabel}</label>
            <select
              className="uu-select"
              value={ambianceVal}
              onChange={(e) => onSetAmbiance && onSetAmbiance(item, e.target.value)}
            >
              <option value="">{noneLabel}</option>
              {ambianceOpts.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="uu-index-field">
            <label className="uu-label-sm">{licenseLabel}</label>
            <select
              className="uu-select"
              value={licenseVal}
              onChange={(e) => onSetLicense && onSetLicense(item, e.target.value)}
            >
              <option value="">{noneLabel}</option>
              {licenseOpts.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="uu-index-field rating">
            <span className="uu-label-sm">{qualityLabel}</span>
            <RatingStars
              idPrefix={`q-${key}`}
              value={ratingQuality}
              onChange={(nextValue) => onSetQuality && onSetQuality(item, nextValue)}
            />
          </div>
          <div className="uu-index-field rating">
            <span className="uu-label-sm">{performanceLabel}</span>
            <RatingStars
              idPrefix={`p-${key}`}
              value={ratingPerformance}
              onChange={(nextValue) => onSetPerformance && onSetPerformance(item, nextValue)}
            />
          </div>
        </div>
        <div
          className="uu-resource-actions"
          style={RESOURCE_LIST_ACTIONS_STYLE}
        >
          <button className="uu-btn" onClick={() => onOpenDetail(item)}>
            {editLabel}
          </button>
          {typeof onToggleFavorite === 'function' ? (
            <button
              type="button"
              className={`uu-fav-btn ${isFav ? 'active' : ''}`}
              onClick={() => onToggleFavorite(item)}
              aria-pressed={isFav ? 'true' : 'false'}
              title={favoriteLabel}
              aria-label={favoriteLabel}
            >
              ★
            </button>
          ) : null}
          {item?.listingUrl ? (
            <button className="uu-btn" onClick={() => onOpenExternal(item.listingUrl)}>
              {openLabel}
            </button>
          ) : null}
          {typeof onTogglePurchased === 'function' ? (
            <label className="uu-check uu-row uu-gap-4 uu-align-center" style={RESOURCE_LIST_CHECK_LABEL_STYLE}>
              <input
                type="checkbox"
                checked={isPurchased}
                onChange={() => onTogglePurchased(item)}
              />
              <span>{purchasedLabel}</span>
            </label>
          ) : null}
          {typeof onToggleTested === 'function' ? (
            <label className="uu-check uu-row uu-gap-4 uu-align-center" style={RESOURCE_LIST_CHECK_LABEL_STYLE}>
              <input
                type="checkbox"
                checked={isTested}
                onChange={() => onToggleTested(item)}
              />
              <span>{testedLabel}</span>
            </label>
          ) : null}
          {typeof onAddKeyword === 'function' ? (
            <div
              className="uu-row uu-gap-8 uu-align-center"
              style={RESOURCE_LIST_KEYWORD_WRAP_STYLE}
            >
              <input
                className="uu-input"
                style={RESOURCE_LIST_KEYWORD_INPUT_STYLE}
                value={keywordValue || ''}
                onChange={(e) => {
                  if (typeof onKeywordChange === 'function') onKeywordChange(key, e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    handleKeywordSubmit();
                  }
                }}
                placeholder={addKeywordLabel}
              />
            </div>
          ) : null}
        </div>

        {keywords.length ? (
          <div className="uu-resource-tags" aria-label={tagsLabel}>
            {keywords.map((tag, i) => (
              <span key={`${key}-tag-${i}`} className="uu-tag">{tag}</span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ResourceListCards(props) {
  const {
    items,
    onOpenDetail,
    onOpenExternal,
    onToggleFavorite,
    onTogglePurchased,
    onToggleTested,
    onAddKeyword,
    onSetUsage,
    onSetStyle,
    onSetAmbiance,
    onSetLicense,
    onSetQuality,
    onSetPerformance,
    usageOptions = [],
    styleOptions = [],
    ambianceOptions = [],
    licenseOptions = [],
    getThumbSrc,
    getThumbCandidates,
    isUeIncompatible,
    t,
  } = props;

  const [keywordInputs, setKeywordInputs] = React.useState({});

  const handleKeywordChange = (key, value) => {
    setKeywordInputs((prev) => ({ ...prev, [key]: value }));
  };

  const handleKeywordSubmit = (item, key) => {
    const raw = String(keywordInputs[key] || '').trim();
    if (!raw) return;
    if (typeof onAddKeyword === 'function') {
      onAddKeyword(item, raw);
    }
    setKeywordInputs((prev) => ({ ...prev, [key]: '' }));
  };

  return (
    <div className="uu-list">
      {items.map((item, idx) => {
        const key = item?.uid || `${item?.title || 'item'}-${idx}`;
        const keywordVal = keywordInputs[key] || '';
        return (
          <ResourceCardItem
            key={key}
            item={item}
            idx={idx}
            keywordValue={keywordVal}
            onKeywordChange={handleKeywordChange}
            onKeywordSubmit={handleKeywordSubmit}
            onOpenDetail={onOpenDetail}
            onOpenExternal={onOpenExternal}
          onToggleFavorite={onToggleFavorite}
          onTogglePurchased={onTogglePurchased}
          onToggleTested={onToggleTested}
          onAddKeyword={onAddKeyword}
          onSetUsage={onSetUsage}
          onSetStyle={onSetStyle}
          onSetAmbiance={onSetAmbiance}
          onSetLicense={onSetLicense}
          onSetQuality={onSetQuality}
          onSetPerformance={onSetPerformance}
          usageOptions={usageOptions}
          styleOptions={styleOptions}
          ambianceOptions={ambianceOptions}
          licenseOptions={licenseOptions}
          getThumbSrc={getThumbSrc}
          getThumbCandidates={getThumbCandidates}
          isUeIncompatible={isUeIncompatible}
          t={t}
          style={RESOURCE_LIST_CARD_MARGIN_BOTTOM_STYLE}
        />
        );
      })}
    </div>
  );
}

function VirtualizedResourceListCards(props) {
  const {
    items,
    onOpenDetail,
    onOpenExternal,
    onToggleFavorite,
    onTogglePurchased,
    onToggleTested,
    onAddKeyword,
    onSetUsage,
    onSetStyle,
    onSetAmbiance,
    onSetLicense,
    onSetQuality,
    onSetPerformance,
    usageOptions = [],
    styleOptions = [],
    ambianceOptions = [],
    licenseOptions = [],
    getThumbSrc,
    getThumbCandidates,
    isUeIncompatible,
    t,
  } = props;

  const [keywordInputs, setKeywordInputs] = React.useState({});
  const handleKeywordChange = React.useCallback((key, value) => {
    setKeywordInputs((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleKeywordSubmit = React.useCallback((item, key) => {
    const raw = String(keywordInputs[key] || '').trim();
    if (!raw) return;
    if (typeof onAddKeyword === 'function') onAddKeyword(item, raw);
    setKeywordInputs((prev) => ({ ...prev, [key]: '' }));
  }, [keywordInputs, onAddKeyword]);

  const computeHeight = () => {
    if (typeof window === 'undefined') return 720;
    return Math.max(360, Math.min(900, window.innerHeight - 260));
  };
  const [listHeight, setListHeight] = React.useState(computeHeight);

  React.useEffect(() => {
    const onResize = () => setListHeight(computeHeight());
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }
    return () => {};
  }, []);

  const listRef = React.useRef(null);
  const itemHeightsRef = React.useRef(new Map());
  const resizeObserversRef = React.useRef(new Map());
  const rowRefCallbacksRef = React.useRef(new Map());

  const setMeasuredHeight = React.useCallback((index, nextHeight) => {
    if (!Number.isFinite(nextHeight) || nextHeight <= 0) return;
    const normalized = Math.max(CARD_MIN_ROW_HEIGHT, Math.ceil(nextHeight));
    const previous = Number(itemHeightsRef.current.get(index) || 0);
    if (Math.abs(previous - normalized) < 1) return;
    itemHeightsRef.current.set(index, normalized);
    if (listRef.current && typeof listRef.current.resetAfterIndex === 'function') {
      listRef.current.resetAfterIndex(index, false);
    }
  }, []);

  const disconnectRowObserver = React.useCallback((index) => {
    const observer = resizeObserversRef.current.get(index);
    if (observer) {
      try { observer.disconnect(); } catch {}
      resizeObserversRef.current.delete(index);
    }
  }, []);

  const bindRowNode = React.useCallback((index, node) => {
    disconnectRowObserver(index);
    if (!node) return;
    const measure = () => {
      const rectHeight = Number(node.getBoundingClientRect?.().height || 0);
      if (!Number.isFinite(rectHeight) || rectHeight <= 0) return;
      setMeasuredHeight(index, rectHeight + 12);
    };
    measure();
    if (typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver(() => measure());
      try {
        observer.observe(node);
        resizeObserversRef.current.set(index, observer);
      } catch {}
    }
  }, [disconnectRowObserver, setMeasuredHeight]);

  const getRowRefCallback = React.useCallback((index) => {
    if (rowRefCallbacksRef.current.has(index)) {
      return rowRefCallbacksRef.current.get(index);
    }
    const callback = (node) => bindRowNode(index, node);
    rowRefCallbacksRef.current.set(index, callback);
    return callback;
  }, [bindRowNode]);

  React.useEffect(() => {
    for (const index of resizeObserversRef.current.keys()) {
      if (index >= items.length) disconnectRowObserver(index);
    }
    for (const index of rowRefCallbacksRef.current.keys()) {
      if (index >= items.length) rowRefCallbacksRef.current.delete(index);
    }
  }, [items.length, disconnectRowObserver]);

  React.useEffect(() => {
    // Même Map pendant toute la vie du composant.
    const observers = resizeObserversRef.current;
    return () => {
      for (const observer of observers.values()) {
        try { observer.disconnect(); } catch {}
      }
      observers.clear();
    };
  }, []);

  const getItemSize = React.useCallback((index) => {
    const measured = Number(itemHeightsRef.current.get(index) || 0);
    if (Number.isFinite(measured) && measured > 0) return measured;
    return CARD_ESTIMATED_ROW_HEIGHT;
  }, []);

  const itemKey = React.useCallback((index, data) => {
    const it = data.items[index];
    return it?.uid || `${index}-${it?.title || 'item'}`;
  }, []);

  return (
    <VariableSizeList
      ref={listRef}
      height={listHeight}
      itemCount={items.length}
      itemSize={getItemSize}
      width="100%"
      itemKey={itemKey}
      overscanCount={3}
      itemData={{
        items,
        keywordInputs,
        handleKeywordChange,
        handleKeywordSubmit,
        handlers: {
          onOpenDetail,
          onOpenExternal,
          onToggleFavorite,
          onTogglePurchased,
          onToggleTested,
          onAddKeyword,
          onSetUsage,
          onSetStyle,
          onSetAmbiance,
          onSetLicense,
          onSetQuality,
          onSetPerformance,
          usageOptions,
          styleOptions,
          ambianceOptions,
          licenseOptions,
          getThumbSrc,
          getThumbCandidates,
          isUeIncompatible,
          t,
        },
      }}
    >
      {({ index, style, data }) => {
        const item = data.items[index];
        const key = item?.uid || `${item?.title || 'item'}-${index}`;
        const keywordVal = data.keywordInputs[key] || '';
        return (
          <div style={buildResourceListVirtualRowOuterStyle(style)}>
            <div ref={getRowRefCallback(index)} style={RESOURCE_LIST_VIRTUAL_ROW_INNER_STYLE}>
              <ResourceCardItem
                item={item}
                idx={index}
                keywordValue={keywordVal}
                onKeywordChange={data.handleKeywordChange}
                onKeywordSubmit={data.handleKeywordSubmit}
                {...data.handlers}
                style={RESOURCE_LIST_CARD_MARGIN_ZERO_STYLE}
              />
            </div>
          </div>
        );
      }}
    </VariableSizeList>
  );
}

export default function ResourceList({
  items = [],
  viewMode = 'cards',
  onOpenDetail,
  onOpenExternal,
  onToggleFavorite,
  onTogglePurchased,
  onToggleTested,
  onAddKeyword,
  getThumbSrc,
  getThumbCandidates,
  isUeIncompatible,
  t,
  usageOptions = [],
  styleOptions = [],
  ambianceOptions = [],
  licenseOptions = [],
  onSetUsage,
  onSetStyle,
  onSetAmbiance,
  onSetLicense,
  onSetQuality,
  onSetPerformance,
}) {
  if (!items.length) return null;

  if (viewMode === 'thumbs') {
    return (
      <ResourceListThumbs
        items={items}
        onOpenDetail={onOpenDetail}
        onOpenExternal={onOpenExternal}
        onToggleFavorite={onToggleFavorite}
        getThumbSrc={getThumbSrc}
        getThumbCandidates={getThumbCandidates}
        isUeIncompatible={isUeIncompatible}
        t={t}
      />
    );
  }

  if (viewMode === 'cards') {
    const useVirtual = items.length > CARD_VIRTUAL_THRESHOLD;
    const CardsComponent = useVirtual ? VirtualizedResourceListCards : ResourceListCards;
    return (
      <CardsComponent
        items={items}
        onOpenDetail={onOpenDetail}
        onOpenExternal={onOpenExternal}
        onToggleFavorite={onToggleFavorite}
        onTogglePurchased={onTogglePurchased}
        onToggleTested={onToggleTested}
        onAddKeyword={onAddKeyword}
        onSetUsage={onSetUsage}
        onSetStyle={onSetStyle}
        onSetAmbiance={onSetAmbiance}
        onSetLicense={onSetLicense}
        onSetQuality={onSetQuality}
        onSetPerformance={onSetPerformance}
        usageOptions={usageOptions}
        styleOptions={styleOptions}
        ambianceOptions={ambianceOptions}
        licenseOptions={licenseOptions}
        getThumbSrc={getThumbSrc}
        getThumbCandidates={getThumbCandidates}
        isUeIncompatible={isUeIncompatible}
        t={t}
      />
    );
  }

  return (
    null
  );
}
