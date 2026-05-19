import { TimelineWidgetEditorPanel } from './timelineeditor-widgeteditor.jsx';
import {
  getTimelineCompanionBodyLabel,
  getTimelineCompanionCopyLabel,
  getTimelineCompanionUrlLabel
} from './timelineInspectorI18n.js';

const INSPECTOR_COMPANION_BUTTONS_STYLE = { gap: 8 };

export function TimelineInspectorWidgetDetails({
  t,
  selectedWidget,
  selectedTrack,
  presetData,
  updateSelectedBinding,
  updateSelectedWidget,
  hosts,
  hasSelectedTargets,
  selectedTargets,
  syncTimelineWidgetTargets,
  colorClass,
  companionUrl,
  handleCopy,
}) {
  const companionUrlLabel = getTimelineCompanionUrlLabel(t);
  const companionCopyLabel = getTimelineCompanionCopyLabel(t);
  const companionBodyLabel = getTimelineCompanionBodyLabel(t);

  return (
    <>
      <div className="uu-timeline-widget-block uu-timeline-desc-block">
        <div className="uu-timeline-widget-grid">
          <div className="uu-timeline-widget-left uu-list">
            <div className="uu-row">
              <label className="uu-label w-160">{t('widgets.common.label')}</label>
              <input
                className="uu-input uu-input-label"
                value={selectedWidget.label ?? ''}
                onChange={(e) => updateSelectedWidget({ label: e.target.value })}
              />
            </div>

            <div className="uu-row mt-8">
              <div
                className={`uu-label w-160 ${
                  hasSelectedTargets ? '' : 'uu-label-error'
                }`}
              >
                {t('production.targets.label')}
              </div>
              <div className="uu-col">
                {hosts.length === 0 && (
                  <div className="uu-muted">{t('production.targets.noHosts')}</div>
                )}
                <div className="uu-list">
                  {hosts.map((host, idx) => {
                    const ip = String(host?.ip || '');
                    if (!ip) return null;
                    const checked = Boolean(selectedTargets[ip]);
                    const label = host?.name
                      ? `${host.name} - ${ip}`
                      : `${t('production.targets.defaultMachineName')} ${idx + 1} - ${ip}`;
                    return (
                      <label key={ip} className="uu-row uu-align-center uu-gap-8">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            updateSelectedWidget({
                              targets: {
                                ...syncTimelineWidgetTargets(selectedWidget, hosts)
                                  .targets,
                                [ip]: e.target.checked
                              }
                            });
                          }}
                        />
                        <span className={`uu-pastille ${colorClass(host.color)}`} />
                        <span>{label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="uu-timeline-widget-right uu-list">
            <TimelineWidgetEditorPanel
              selectedWidget={selectedWidget}
              selectedTrack={selectedTrack}
              presetData={presetData}
              updateSelectedBinding={updateSelectedBinding}
              updateSelectedWidget={updateSelectedWidget}
            />
          </div>
        </div>
      </div>

      {selectedWidget?.id && (
        <div className="uu-timeline-widget-block uu-timeline-desc-block uu-list mt-8">
          <div className="uu-row">
            <label className="uu-label w-160">
              {companionUrlLabel}
            </label>
            <div className="uu-value uu-buttons-row">
              <button
                type="button"
                className="uu-btn-secondary"
                onClick={() => handleCopy(companionUrl)}
                title={companionUrl}
              >
                {companionCopyLabel}
              </button>
            </div>
          </div>
          <div className="uu-row">
            <label className="uu-label w-160">
              {companionBodyLabel}
            </label>
            <div
              className="uu-value uu-buttons-row"
              style={INSPECTOR_COMPANION_BUTTONS_STYLE}
            >
              {['cue', 'play', 'pause', 'resume'].map((action) => (
                <button
                  key={action}
                  type="button"
                  className="uu-btn-secondary"
                  onClick={() => handleCopy(JSON.stringify({ action }))}
                  title={JSON.stringify({ action })}
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
