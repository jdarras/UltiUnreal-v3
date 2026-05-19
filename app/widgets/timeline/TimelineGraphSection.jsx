import { TimelineTimecodeBar } from './TimelineTimecodeBar.jsx';
import { TimelineTracks } from './TimelineTracks.jsx';

export function TimelineGraphSection({
  timecodeBarProps,
  tracksProps,
}) {
  return (
    <div className="uu-timeline-graph">
      <TimelineTimecodeBar {...timecodeBarProps} />
      <TimelineTracks {...tracksProps} />
    </div>
  );
}
