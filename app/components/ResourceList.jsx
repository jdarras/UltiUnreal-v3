// app/components/ResourceList.jsx
import React from 'react';
import { FixedSizeList } from 'react-window';

const CARD_VIRTUAL_THRESHOLD = 100000; // désactive la virtualisation pour éviter les barres de scroll internes
const CARD_ROW_HEIGHT = 260;

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

  React.useEffect(() => {
    setSrcIndex(0);
  }, [srcList.join('|')]);

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
        const compatLabel = t('resources.versionIncompatible');
        const compatText = compatLabel && compatLabel !== 'resources.versionIncompatible'
          ? compatLabel
          : 'Version non compatible';

        return (
          <div key={key} className="uu-card uu-resource-thumb-card" style={{ height: '100%' }}>
            {thumbCandidates.length > 0 ? (
              <ResourceThumbImage
                className="uu-resource-thumb-lg"
                candidates={thumbCandidates}
                alt={title}
                style={{ flexShrink: 0 }}
              />
            ) : (
              <div className="uu-resource-thumb-lg placeholder" style={{ flexShrink: 0 }}>
                {t('resources.noThumbnail') || 'No preview'}
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
                style={{ gap: '5px', flexWrap: 'nowrap' }}
              >
                <button
                  className="uu-btn"
                  style={{ padding: '6px 6px', whiteSpace: 'nowrap', flexShrink: 0 }}
                  onClick={() => onOpenDetail(item)}
                >
                  {t('resources.edit') || 'Edit'}
                </button>
                {typeof onToggleFavorite === 'function' ? (
                  <button
                    type="button"
                    className={`uu-fav-btn ${isFav ? 'active' : ''}`}
                    onClick={() => onToggleFavorite(item)}
                    aria-pressed={isFav ? 'true' : 'false'}
                    title={t('resources.detail.labels.favorite') || 'Favoris'}
                    aria-label={t('resources.detail.labels.favorite') || 'Favoris'}
                  >
                    ★
                  </button>
                ) : null}
                {item?.listingUrl ? (
                  <button
                    className="uu-btn"
                    style={{ padding: '6px 6px', whiteSpace: 'nowrap', flexShrink: 0 }}
                    onClick={() => onOpenExternal(item.listingUrl)}
                  >
                    {t('resources.openFab') || 'Open'}
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
  const usage = item?.user?.usage ? String(item.user.usage).trim() : '';
  const style = item?.user?.style ? String(item.user.style).trim() : '';
  const ambiance = item?.user?.ambiance ? String(item.user.ambiance).trim() : '';
  const type = item?.listingType ? String(item.listingType).trim() : '';
  const distribution = item?.distribution
    ? String(item.distribution).trim()
    : (item?.listingRaw?.distribution ? String(item.listingRaw.distribution).trim() : '');
  const ue = item?.ueVersions?.length ? toListStringLocal(item.ueVersions) : '';

  const line1 = [];
  if (usage) line1.push(`${t('resources.detail.labels.usage') || 'Usage'}: ${usage}`);
  if (style) line1.push(`${t('resources.detail.labels.style') || 'Style'}: ${style}`);
  if (ambiance) line1.push(`${t('resources.detail.labels.ambiance') || 'Ambiance'}: ${ambiance}`);
  if (type) line1.push(`${t('resources.type') || 'Type'}: ${type}`);

  const line2 = [];
  if (distribution) line2.push(`${t('resources.detail.distribution') || 'Distribution'}: ${distribution}`);
  if (ue) line2.push(`${t('resources.ueVersions') || 'UE'}: ${ue}`);

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
      return { value: opt, label: t(`resources.detail.${keyPrefix}.${opt}`) || opt };
    }
    const v = String(opt?.value || '').trim();
    const label = opt?.label || t(`resources.detail.${keyPrefix}.${v}`) || v;
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
  const compatLabel = t('resources.versionIncompatible');
  const compatText = compatLabel && compatLabel !== 'resources.versionIncompatible'
    ? compatLabel
    : 'Version non compatible';

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
          {t('resources.noThumbnail') || 'No preview'}
        </div>
      )}
      <div className="uu-col" style={{ gap: '8px', minHeight: '110px', flex: 1, minWidth: 0 }}>
        <div className="uu-row uu-align-center uu-gap-8" style={{ flexWrap: 'wrap' }}>
          <div className="uu-resource-title" style={{ flex: '0 1 auto' }}>{title}</div>
          {incompatible ? (
            <div className="uu-resource-compat" style={{ marginLeft: '4px', marginTop: '2px' }}>
              <span className="uu-dot fail" aria-hidden="true" />
              <span>{compatText}</span>
            </div>
          ) : null}
        </div>
        {metaLines && metaLines.line1 ? <div className="uu-resource-meta">{metaLines.line1}</div> : null}
        {metaLines && metaLines.line2 ? <div className="uu-resource-meta">{metaLines.line2}</div> : null}
        <div className="uu-resource-indexing">
          <div className="uu-index-field">
            <label className="uu-label-sm">{t('resources.detail.labels.usage') || 'Usage'}</label>
            <select
              className="uu-select"
              value={usageVal}
              onChange={(e) => onSetUsage && onSetUsage(item, e.target.value)}
            >
              <option value="">{t('common.none') || 'None'}</option>
              {usageOpts.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="uu-index-field">
            <label className="uu-label-sm">{t('resources.detail.labels.style') || 'Style'}</label>
            <select
              className="uu-select"
              value={styleVal}
              onChange={(e) => onSetStyle && onSetStyle(item, e.target.value)}
            >
              <option value="">{t('common.none') || 'None'}</option>
              {styleOpts.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="uu-index-field">
            <label className="uu-label-sm">{t('resources.detail.labels.ambiance') || 'Ambiance'}</label>
            <select
              className="uu-select"
              value={ambianceVal}
              onChange={(e) => onSetAmbiance && onSetAmbiance(item, e.target.value)}
            >
              <option value="">{t('common.none') || 'None'}</option>
              {ambianceOpts.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="uu-index-field">
            <label className="uu-label-sm">{t('resources.detail.labels.license') || 'License'}</label>
            <select
              className="uu-select"
              value={licenseVal}
              onChange={(e) => onSetLicense && onSetLicense(item, e.target.value)}
            >
              <option value="">{t('common.none') || 'None'}</option>
              {licenseOpts.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="uu-index-field rating">
            <span className="uu-label-sm">{t('resources.detail.labels.quality') || 'Quality'}</span>
            <div className="uu-rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={`q-${n}`}
                  type="button"
                  className={`uu-rating-btn ${ratingQuality >= n ? 'active' : ''}`}
                  onClick={() => onSetQuality && onSetQuality(item, ratingQuality === n ? 0 : n)}
                  aria-pressed={ratingQuality >= n ? 'true' : 'false'}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <div className="uu-index-field rating">
            <span className="uu-label-sm">{t('resources.detail.labels.performance') || 'Performance'}</span>
            <div className="uu-rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={`p-${n}`}
                  type="button"
                  className={`uu-rating-btn ${ratingPerformance >= n ? 'active' : ''}`}
                  onClick={() => onSetPerformance && onSetPerformance(item, ratingPerformance === n ? 0 : n)}
                  aria-pressed={ratingPerformance >= n ? 'true' : 'false'}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
        </div>
        <div
          className="uu-resource-actions"
          style={{ flexWrap: 'wrap', rowGap: '6px', columnGap: '12px', alignItems: 'center', width: '100%', marginTop: 'auto' }}
        >
          <button className="uu-btn" onClick={() => onOpenDetail(item)}>
            {t('resources.edit') || 'Edit'}
          </button>
          {typeof onToggleFavorite === 'function' ? (
            <button
              type="button"
              className={`uu-fav-btn ${isFav ? 'active' : ''}`}
              onClick={() => onToggleFavorite(item)}
              aria-pressed={isFav ? 'true' : 'false'}
              title={t('resources.detail.labels.favorite') || 'Favoris'}
              aria-label={t('resources.detail.labels.favorite') || 'Favoris'}
            >
              ★
            </button>
          ) : null}
          {item?.listingUrl ? (
            <button className="uu-btn" onClick={() => onOpenExternal(item.listingUrl)}>
              {t('resources.openFab') || 'Open'}
            </button>
          ) : null}
          {typeof onTogglePurchased === 'function' ? (
            <label className="uu-check uu-row uu-gap-4 uu-align-center" style={{ whiteSpace: 'nowrap' }}>
              <input
                type="checkbox"
                checked={isPurchased}
                onChange={() => onTogglePurchased(item)}
              />
              <span>{t('resources.detail.labels.purchased') || 'Acheté'}</span>
            </label>
          ) : null}
          {typeof onToggleTested === 'function' ? (
            <label className="uu-check uu-row uu-gap-4 uu-align-center" style={{ whiteSpace: 'nowrap' }}>
              <input
                type="checkbox"
                checked={isTested}
                onChange={() => onToggleTested(item)}
              />
              <span>{t('resources.detail.labels.tested') || 'Testé'}</span>
            </label>
          ) : null}
          {typeof onAddKeyword === 'function' ? (
            <div
              className="uu-row uu-gap-8 uu-align-center"
              style={{ flex: '0 0 auto', marginLeft: '12px' }}
            >
              <input
                className="uu-input"
                style={{ width: '240px' }}
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
                placeholder={t('resources.detail.labels.addKeyword') || 'Ajouter mot-clé'}
              />
            </div>
          ) : null}
        </div>

        {keywords.length ? (
          <div className="uu-resource-tags" aria-label={t('resources.detail.labels.tags') || 'Mots-clés'}>
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
          style={{ marginBottom: '12px' }}
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

  const itemKey = React.useCallback((index, data) => {
    const it = data.items[index];
    return it?.uid || `${index}-${it?.title || 'item'}`;
  }, []);

  return (
    <FixedSizeList
      height={listHeight}
      itemCount={items.length}
      itemSize={CARD_ROW_HEIGHT}
      width="100%"
      itemKey={itemKey}
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
          <div style={{ ...style, paddingRight: 8, paddingBottom: 12 }}>
            <ResourceCardItem
              item={item}
              idx={index}
              keywordValue={keywordVal}
              onKeywordChange={data.handleKeywordChange}
              onKeywordSubmit={data.handleKeywordSubmit}
              {...data.handlers}
              style={{ height: '100%' }}
            />
          </div>
        );
      }}
    </FixedSizeList>
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
