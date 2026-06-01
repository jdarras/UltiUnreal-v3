const MACHINE_ARGS_TOP_GRID_STYLE = { columnGap: '24px', gridTemplateColumns: '260px 260px 260px' };
const MACHINE_ARGS_SECOND_GRID_STYLE = {
  columnGap: '24px',
  alignItems: 'center',
  gridTemplateColumns: '260px 200px 200px 220px',
};
const CHECK_ALIGN_CENTER_STYLE = { alignItems: 'center' };
const MACHINE_ARGS_BOTTOM_GRID_STYLE = { gridTemplateColumns: '0.3fr 0.7fr' };
const FRAME_RATE_OPTIONS = ['23.98', '24', '25', '29.97', '30', '47.95', '48', '50', '59.94', '60'];

function MachineArgsPanel({ machine, args, t, presetOptions, updateMachineArgs }) {
  return (
    <div className="uu-args">
      <div className="uu-args-title">{t('setup.server.argsTitle')}</div>
      <div
        className="uu-grid-3"
        style={MACHINE_ARGS_TOP_GRID_STYLE}
      >
        <div className="uu-grid-field">
          <label className="uu-label w-160">{t('setup.server.resPresetLabel')}</label>
          <select
            className="uu-input"
            value={args.resPreset || 'manual'}
            onChange={(e) => {
              const value = e.target.value || 'manual';
              const preset = presetOptions.find((entry) => entry.k === value);
              if (preset && preset.x && preset.y) {
                updateMachineArgs(machine._idx, {
                  resPreset: value,
                  resx: preset.x,
                  resy: preset.y,
                });
              } else {
                updateMachineArgs(machine._idx, { resPreset: 'manual' });
              }
            }}
          >
            {presetOptions.map((preset) => (
              <option key={preset.k} value={preset.k}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>
        <div className="uu-grid-field">
          <label className="uu-label w-160">{t('setup.server.resx')}</label>
          <input
            type="number"
            className="uu-input"
            value={args.resx ?? ''}
            disabled={args.resPreset && args.resPreset !== 'manual'}
            onChange={(e) =>
              updateMachineArgs(machine._idx, { resx: e.target.value, resPreset: 'manual' })
            }
          />
        </div>
        <div className="uu-grid-field">
          <label className="uu-label w-160">{t('setup.server.resy')}</label>
          <input
            type="number"
            className="uu-input"
            value={args.resy ?? ''}
            disabled={args.resPreset && args.resPreset !== 'manual'}
            onChange={(e) =>
              updateMachineArgs(machine._idx, { resy: e.target.value, resPreset: 'manual' })
            }
          />
        </div>
        <div
          className="uu-grid-3 mt-12"
          style={MACHINE_ARGS_SECOND_GRID_STYLE}
        >
          <div className="uu-grid-field">
            <label className="uu-label w-160">{t('setup.server.frameRateLimit')}</label>
            <select
              className="uu-input"
              value={args.frameRateLimit ?? ''}
              onChange={(e) =>
                updateMachineArgs(machine._idx, { frameRateLimit: e.target.value })
              }
            >
              <option value="">{'—'}</option>
              {FRAME_RATE_OPTIONS.map((fps) => (
                <option key={fps} value={fps}>
                  {fps} fps
                </option>
              ))}
            </select>
          </div>
          <div className="uu-grid-field">
            <label className="uu-check" style={CHECK_ALIGN_CENTER_STYLE}>
              <input
                type="checkbox"
                checked={!!args.renderOffscreen}
                onChange={(e) =>
                  updateMachineArgs(machine._idx, { renderOffscreen: !!e.target.checked })
                }
              />
              {t('setup.server.renderOffscreen')}
            </label>
          </div>
          <div className="uu-grid-field">
            <label className="uu-check" style={CHECK_ALIGN_CENTER_STYLE}>
              <input
                type="checkbox"
                checked={!!args.noScreenMessages}
                onChange={(e) =>
                  updateMachineArgs(machine._idx, { noScreenMessages: !!e.target.checked })
                }
              />
              {t('setup.server.noScreenMessages')}
            </label>
          </div>
        </div>
      </div>
      <div
        className="uu-grid-2 mt-12"
        style={MACHINE_ARGS_BOTTOM_GRID_STYLE}
      >
        <div className="uu-grid-field">
          <label className="uu-label w-160">{t('setup.server.videoCard')}</label>
          <select
            className="uu-input"
            value={args.videoCard || ''}
            onChange={(e) =>
              updateMachineArgs(machine._idx, { videoCard: e.target.value })
            }
          >
            <option value="">{t('setup.server.videoCard.none')}</option>
            <option value="AJA">{t('setup.server.videoCard.aja')}</option>
            <option value="BlackMagic">{t('setup.server.videoCard.blackmagic')}</option>
          </select>
        </div>
        <div className="uu-grid-field">
          <label>{t('setup.server.execCmds')}</label>
          <input
            className="uu-input"
            value={args.execCmds || ''}
            onChange={(e) =>
              updateMachineArgs(machine._idx, { execCmds: e.target.value })
            }
          />
        </div>
      </div>
    </div>
  );
}

export { MachineArgsPanel };
