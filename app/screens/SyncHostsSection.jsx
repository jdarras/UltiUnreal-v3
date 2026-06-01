function SyncHostsSection({ hosts, title, sectionTitleStyle, renderHostCard }) {
  if (!hosts.length) return null;
  return (
    <div className="uu-section">
      <h3 className="uu-h3 uu-block-title" style={sectionTitleStyle}>
        {title}
      </h3>
      <div className="uu-list">{hosts.map((host, index) => renderHostCard(host, index))}</div>
    </div>
  );
}

export default SyncHostsSection;
