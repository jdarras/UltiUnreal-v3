const TITLE_ROW_STYLE = { marginBottom: '12px' };

export default function ProjectsDetailSetupUnrealCard({
  t,
  suRenderer = [],
  suWin = [],
  suLinux = [],
  suMac = [],
  suHw = [],
}) {
  if (!suRenderer.length && !suWin.length && !suLinux.length && !suMac.length && !suHw.length) {
    return null;
  }

  const hasPlatformData = suWin.length || suLinux.length || suMac.length || suHw.length;

  return (
    <div className="uu-card">
      <div className="uu-row uu-align-center uu-gap-8" style={TITLE_ROW_STYLE}>
        <strong className="uu-block-title">{t('projects.detail.blocks.setupUnreal')}</strong>
      </div>
      <div className="uu-col uu-gap-16">
        {suRenderer.length ? (
          <div className="uu-row wrap">
            <div className="uu-label w-160">{t('projects.detail.setupUnreal.renderer')}</div>
            <div className="uu-value uu-muted">
              {suRenderer.map((it, idx) => (
                <div key={`${it.key}-${idx}`}>{it.key}={it.value}</div>
              ))}
            </div>
          </div>
        ) : null}

        {hasPlatformData ? (
          <div className="uu-row wrap">
            <div className="uu-label w-160">{t('projects.detail.setupUnreal.platform')}</div>
            <div className="uu-value uu-muted">
              {suWin.length ? (
                <>
                  <div><strong>{t('projects.detail.setupUnreal.platform.windows')}</strong></div>
                  {suWin.map((it, idx) => <div key={`win-${it.key}-${idx}`}>{it.key}={it.value}</div>)}
                </>
              ) : null}
              {suLinux.length ? (
                <>
                  <div className="mt-8"><strong>{t('projects.detail.setupUnreal.platform.linux')}</strong></div>
                  {suLinux.map((it, idx) => <div key={`linux-${it.key}-${idx}`}>{it.key}={it.value}</div>)}
                </>
              ) : null}
              {suMac.length ? (
                <>
                  <div className="mt-8"><strong>{t('projects.detail.setupUnreal.platform.mac')}</strong></div>
                  {suMac.map((it, idx) => <div key={`mac-${it.key}-${idx}`}>{it.key}={it.value}</div>)}
                </>
              ) : null}
              {suHw.length ? (
                <>
                  <div className="mt-8"><strong>{t('projects.detail.setupUnreal.platform.hardware')}</strong></div>
                  {suHw.map((it, idx) => <div key={`hw-${it.key}-${idx}`}>{it.key}={it.value}</div>)}
                </>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
