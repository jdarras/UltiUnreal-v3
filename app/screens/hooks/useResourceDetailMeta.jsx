import { useMemo } from 'react';
import {
  normalizeValue,
  normalizeUeVersion,
  pickString,
  formatDate,
  toListString,
} from '../../utils/resources-helpers';

export function useResourceDetailMeta({
  detailItem,
  userUeVersionSet,
  t,
  lang,
} = {}) {
  const detailEpicAccount = useMemo(
    () =>
      pickString(
        detailItem?.user?.displayName,
        detailItem?.user?.name,
        detailItem?.epicAccount,
        detailItem?.accountName
      ),
    [detailItem]
  );

  const detailForumUrl = useMemo(
    () =>
      pickString(
        detailItem?.forumUrl,
        detailItem?.comments_url,
        detailItem?.commentsUrl
      ),
    [detailItem]
  );

  const detailCreatedAt = useMemo(
    () => (detailItem?.createdAt ? formatDate(detailItem.createdAt, lang) : ''),
    [detailItem?.createdAt, lang]
  );

  const detailUeBadges = useMemo(() => {
    const list = Array.isArray(detailItem?.ueVersions) ? detailItem.ueVersions : [];
    if (!list.length) return null;
    const hasUserVersions = userUeVersionSet && userUeVersionSet.size > 0;
    const nodes = list.map((ver, idx) => {
      const norm = normalizeUeVersion(ver);
      const isCompat = norm && hasUserVersions ? userUeVersionSet.has(norm) : false;
      const status = hasUserVersions ? (isCompat ? 'ok' : 'bad') : 'neutral';
      const color =
        status === 'ok'
          ? '#2ecc71'
          : status === 'bad'
            ? '#e74c3c'
            : 'var(--uu-color-text)';
      const border =
        status === 'ok'
          ? '#2ecc71'
          : status === 'bad'
            ? '#e74c3c'
            : 'var(--uu-color-border)';
      return (
        <span
          key={`${norm || ver}-${idx}`}
          className="uu-chip"
          style={{
            borderColor: border,
            color,
            padding: '4px 8px',
            background: 'transparent',
            opacity: 1,
            fontWeight: 600,
          }}
        >
          {ver}
        </span>
      );
    });
    return <div className="uu-row uu-gap-6 uu-wrap">{nodes}</div>;
  }, [detailItem?.ueVersions, userUeVersionSet]);

  const detailInfoLines = useMemo(() => {
    if (!detailItem) return [];
    return [
      { label: t('resources.seller'), value: normalizeValue(detailItem?.seller) },
      { label: t('resources.type'), value: normalizeValue(detailItem?.listingType) },
      { label: t('resources.ueVersions'), value: detailUeBadges || toListString(detailItem?.ueVersions) },
      { label: t('resources.targets'), value: toListString(detailItem?.targetPlatforms) },
      { label: t('resources.formats'), value: toListString(detailItem?.assetFormats) },
      { label: t('resources.detail.distribution'), value: normalizeValue(detailItem?.distribution) },
      { label: t('resources.detail.labels.epicAccount'), value: detailEpicAccount },
      detailForumUrl
        ? {
            label: 'Forum Epic',
            value: (
              <a href={detailForumUrl} target="_blank" rel="noreferrer">
                Ouvrir
              </a>
            ),
          }
        : null,
      { label: t('resources.detail.addedAt'), value: detailCreatedAt },
    ].filter((row) => row && row.value);
  }, [detailCreatedAt, detailEpicAccount, detailForumUrl, detailItem, detailUeBadges, t]);

  return {
    detailUeBadges,
    detailInfoLines,
  };
}

export default useResourceDetailMeta;
