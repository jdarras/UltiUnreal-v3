import { formatFixed2 } from '../utils/projects-helpers';

const TITLE_ROW_STYLE = { marginBottom: '12px' };
const WIDTH_180_STYLE = { width: '180px' };
const WIDTH_120_STYLE = { width: '120px' };
const WIDTH_48_STYLE = { width: '48px' };

export default function ProjectsDetailSetupVideoProductionCard({
  t,
  hasSetupVP = false,
  vpDraft,
  setVpDraft,
  scheduleVpSave,
  vpBusy = false,
  vpTimecode,
  vpAnim,
  vpSeq,
}) {
  const applyPatch = (patch) => {
    const next = { ...(vpDraft || {}), ...patch };
    setVpDraft(next);
    scheduleVpSave(next);
  };

  const handleNumericChange = (field) => (e) => {
    applyPatch({ [field]: e.target.value });
  };

  const handleNumericBlur = (field) => (e) => {
    const formatted = formatFixed2(e.target.value);
    if (formatted !== String(e.target.value || '')) {
      applyPatch({ [field]: formatted });
    }
  };

  const handleBoolChange = (field) => (e) => {
    applyPatch({ [field]: !!e.target.checked });
  };

  return (
    <div className="uu-card">
      <div className="uu-row uu-align-center uu-gap-8 uu-row-nowrap" style={TITLE_ROW_STYLE}>
        <strong className="uu-block-title">{t('projects.detail.blocks.setupVideoProduction')}</strong>
        {!hasSetupVP ? (
          <div className="uu-muted">{t('projects.detail.vp.noInfo')}</div>
        ) : null}
      </div>

      <div className="uu-col uu-gap-16">
        <div className="uu-row wrap">
          <div className="uu-label w-160">{t('projects.detail.vp.minDesiredFrameRate')}</div>
          <div className="uu-value">
            <input
              className="uu-input"
              style={WIDTH_180_STYLE}
              value={vpDraft?.minDesiredFrameRate ?? ''}
              onChange={handleNumericChange('minDesiredFrameRate')}
              onBlur={handleNumericBlur('minDesiredFrameRate')}
              disabled={vpBusy}
            />
          </div>
        </div>

        <div className="uu-row wrap">
          <div className="uu-label w-160">{t('projects.detail.vp.fixedFrameRate')}</div>
          <div className="uu-value">
            <div className="uu-row uu-align-center uu-gap-12 uu-wrap">
              <label className="uu-check">
                <input
                  type="checkbox"
                  checked={!!vpDraft?.useFixedFrameRate}
                  onChange={handleBoolChange('useFixedFrameRate')}
                  disabled={vpBusy}
                />
                <span>{t('projects.detail.vp.enabled')}</span>
              </label>
              <input
                className="uu-input"
                style={WIDTH_180_STYLE}
                value={vpDraft?.fixedFrameRate ?? ''}
                onChange={handleNumericChange('fixedFrameRate')}
                onBlur={handleNumericBlur('fixedFrameRate')}
                disabled={vpBusy || !vpDraft?.useFixedFrameRate}
              />
            </div>
          </div>
        </div>

        <div className="uu-row wrap">
          <div className="uu-label w-160">{t('projects.detail.vp.smoothFrameRate')}</div>
          <div className="uu-value">
            <div className="uu-row uu-align-center uu-gap-12 uu-wrap">
              <label className="uu-check">
                <input
                  type="checkbox"
                  checked={!!vpDraft?.smoothEnabled}
                  onChange={handleBoolChange('smoothEnabled')}
                  disabled={vpBusy}
                />
                <span>{t('projects.detail.vp.enabled')}</span>
              </label>
              <div className="uu-row uu-align-center uu-gap-8 uu-wrap">
                <div className="uu-label" style={WIDTH_48_STYLE}>{t('projects.detail.vp.min')}</div>
                <input
                  className="uu-input"
                  style={WIDTH_120_STYLE}
                  value={vpDraft?.smoothMin ?? ''}
                  onChange={handleNumericChange('smoothMin')}
                  onBlur={handleNumericBlur('smoothMin')}
                  disabled={vpBusy || !vpDraft?.smoothEnabled}
                />
                <div className="uu-label" style={WIDTH_48_STYLE}>{t('projects.detail.vp.max')}</div>
                <input
                  className="uu-input"
                  style={WIDTH_120_STYLE}
                  value={vpDraft?.smoothMax ?? ''}
                  onChange={handleNumericChange('smoothMax')}
                  onBlur={handleNumericBlur('smoothMax')}
                  disabled={vpBusy || !vpDraft?.smoothEnabled}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="uu-row wrap">
          <div className="uu-label w-160">{t('projects.detail.setupVideoProduction.timecode')}</div>
          <div className="uu-value uu-muted">
            {vpTimecode?.GenerateDefaultTimecodeFrameRate ? (
              <div>GenerateDefaultTimecodeFrameRate={vpTimecode.GenerateDefaultTimecodeFrameRate}</div>
            ) : null}
            {vpTimecode?.TimecodeProviderClassName ? (
              <div>TimecodeProviderClassName={vpTimecode.TimecodeProviderClassName}</div>
            ) : null}
            {vpTimecode?.CustomTimeStepClassName ? (
              <div>CustomTimeStepClassName={vpTimecode.CustomTimeStepClassName}</div>
            ) : null}
            {vpAnim?.DefaultFrameRate ? (
              <div>DefaultFrameRate={vpAnim.DefaultFrameRate}</div>
            ) : null}
            {vpSeq?.DefaultDisplayRate ? (
              <div>LevelSequence.DefaultDisplayRate={vpSeq.DefaultDisplayRate}</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
