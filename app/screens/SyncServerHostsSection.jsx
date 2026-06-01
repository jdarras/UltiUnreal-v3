import { safeStr } from './synchronisationHelpers';
import SyncHostsSection from './SyncHostsSection';

function SyncServerHostsSection({
  hosts,
  title,
  sectionTitleStyle,
  HostCardComponent,
  hostCardProps,
}) {
  return (
    <SyncHostsSection
      hosts={hosts}
      title={title}
      sectionTitleStyle={sectionTitleStyle}
      renderHostCard={(host, index) => (
        <HostCardComponent
          key={`${safeStr(host?.ip || host?.address, index)}-${index}`}
          host={host}
          index={index}
          {...hostCardProps}
        />
      )}
    />
  );
}

export default SyncServerHostsSection;
