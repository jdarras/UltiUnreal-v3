import React from 'react';
import { normalizeValue, normalizeSearch, normalizeList } from './normalize';

function stripHtml(value) {
  const raw = String(value || '');
  if (!raw) return '';
  return raw
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|ul|ol|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractVendorDescription(item) {
  const cached = typeof item?.vendorDescription === 'string'
    ? item.vendorDescription
    : '';
  if (cached) return stripHtml(cached);
  const listing = item?.listingRaw || {};
  const raw = listing.description ||
    listing.longDescription ||
    listing.shortDescription ||
    listing.summary ||
    listing?.details?.description ||
    '';
  return stripHtml(raw);
}

function listIncludes(list, term) {
  const t = normalizeSearch(term);
  if (!t) return true;
  return normalizeList(list).some((val) => normalizeSearch(val).includes(t));
}

function matchMulti(selected, candidateList, normalizeFn = normalizeValue) {
  const sel = Array.isArray(selected) ? selected : (selected ? [selected] : []);
  if (sel.length === 0) return true;
  const candList = Array.isArray(candidateList) ? candidateList : [candidateList];
  const candSet = new Set(
    candList
      .map((v) => normalizeFn(v))
      .filter(Boolean)
      .map((v) => v.toLowerCase())
  );
  return sel.some((v) => {
    const n = normalizeFn(v);
    if (!n) return false;
    return candSet.has(n.toLowerCase());
  });
}

export default function useFilteredResources(items, searchQuery, searchAdvanced, quickFilters, options = {}) {
  const filteredResources = React.useMemo(() => {
    const q = normalizeSearch(searchQuery);
    const adv = searchAdvanced || {};
    const quick = quickFilters || {};
    const isCompatible = typeof options.isCompatible === 'function' ? options.isCompatible : null;
    const list = Array.isArray(items) ? items : [];

    return list.filter((item) => {
      const user = item?.user && typeof item.user === 'object' ? item.user : {};
      if (normalizeValue(user?.status) === 'deleted') return false;
      const tags = normalizeList(item?.tags);
      const userKeywords = normalizeList(user?.keywords);
      const vendorDescription = extractVendorDescription(item);
      const ueVersions = normalizeList(item?.ueVersions);
      const listingType = normalizeValue(item?.listingType);
      const distribution = normalizeValue(item?.distribution || item?.listingRaw?.distribution);

      const hay = normalizeSearch([
        item?.title,
        user?.note,
        vendorDescription,
        ...tags,
        ...userKeywords,
      ].join(' '));

      if (q && !hay.includes(q)) return false;

      if (!matchMulti(adv.usage, user?.usage, normalizeValue)) return false;
      if (!matchMulti(adv.style, user?.style, normalizeValue)) return false;
      if (!matchMulti(adv.ambiance, user?.ambiance, normalizeValue)) return false;
      if (!matchMulti(adv.license, user?.license, normalizeValue)) return false;
      if (!matchMulti(adv.seller, item?.seller, normalizeValue)) return false;
      if (!matchMulti(adv.type, listingType, normalizeValue)) return false;
      if (!matchMulti(adv.distribution, distribution, normalizeValue)) return false;
      if (!matchMulti(adv.ueVersion, ueVersions, normalizeValue)) return false;
      const epicList = item?.epicAccounts || (item?.epicAccount ? [item.epicAccount] : []);
      if (!matchMulti(adv.epicAccount, epicList, normalizeValue)) return false;
      if (adv.tags && !listIncludes([...tags, ...userKeywords], adv.tags)) return false;

      if (adv.quality) {
        const minQuality = Number(adv.quality);
        const quality = Number(user?.ratingQuality || 0);
        if (!Number.isFinite(minQuality) || quality < minQuality) return false;
      }
      if (adv.performance) {
        const minPerformance = Number(adv.performance);
        const performance = Number(user?.ratingPerformance || 0);
        if (!Number.isFinite(minPerformance) || performance < minPerformance) return false;
      }

      if (quick.tested && user?.tested !== true) return false;
      if (quick.favorite && user?.favorite !== true) return false;
      if (quick.compatibleOnly && isCompatible && !isCompatible(item)) return false;

      return true;
    });
  }, [items, searchQuery, searchAdvanced, quickFilters, options]);

  return { filteredResources };
}
