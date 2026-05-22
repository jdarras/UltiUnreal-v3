export default function ResourcesDetailInfoCard({
  t,
  rows = [],
}) {
  return (
    <div className="uu-card uu-col uu-gap-12">
      <strong className="uu-block-title">
        {t('resources.detail.infoTitle')}
      </strong>
      <div className="uu-col uu-gap-8">
        {rows.map((row, idx) => (
          <div key={`${row.label}-${idx}`} className="uu-row uu-gap-8">
            <div className="uu-label w-160">{row.label}</div>
            <div className="uu-value uu-muted">{row.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
