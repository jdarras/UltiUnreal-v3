export default function ResourcesDetailVendorDescriptionCard({
  t,
  text = '',
}) {
  if (!text) return null;

  return (
    <div className="uu-card uu-col uu-gap-12">
      <strong className="uu-block-title">
        {t('resources.detail.vendorDescription')}
      </strong>
      <div className="uu-resource-detail-text">{text}</div>
    </div>
  );
}
