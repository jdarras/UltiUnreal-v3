import { wrcGetPreset } from '../../utils/agent';

function scheduleWrcProbe({
  launchMode,
  commonCfgRef,
  startRequestedRef,
  wrcProbeCancelRef,
  wrcReadyRef,
  wrcAttemptsRef,
  wrcProbeTimerRef,
  resolveWrcTarget,
  emitStartLayoutLog,
  t,
  setStatusMsg,
  setWrcReadyTick,
  useStartLayoutRef,
  hasStartLayoutRef,
}) {
  if (launchMode !== 'production') return;
  wrcProbeCancelRef.current = false;
  if (wrcProbeTimerRef.current) {
    clearTimeout(wrcProbeTimerRef.current);
    wrcProbeTimerRef.current = null;
  }

  const maxAttempts = Math.max(1, Number(commonCfgRef.current?.wrcMaxAttempts || 10));
  const retryDelayMs = Math.max(500, Number(commonCfgRef.current?.wrcRetryDelaySec || 3) * 1000);

  const probe = async (attempt = 1) => {
    if (!startRequestedRef.current) return;
    if (launchMode !== 'production') return;
    if (wrcProbeCancelRef.current || wrcReadyRef.current) return;
    wrcAttemptsRef.current = attempt;

    if (attempt > maxAttempts) {
      const target = resolveWrcTarget();
      emitStartLayoutLog({
        level: 'warn',
        action: 'start_layout_probe',
        message: t('launch.logs.startLayout.probeExhausted'),
        value: {
          attempt,
          maxAttempts,
          ok: false,
          error: 'max_attempts_reached',
          durationMs: 0,
          target: {
            ip: String(target?.ip || ''),
            port: Number(target?.port || 0),
            preset: String(target?.preset || ''),
          },
        },
      });
      setStatusMsg(t('launch.status.wrcAborted', { attempts: maxAttempts }));
      console.warn('[LaunchControl][WRC] aborted after max attempts (no Start Layout will be sent)');
      startRequestedRef.current = false;
      return;
    }

    const target = resolveWrcTarget();
    const probeStartedAt = Date.now();
    let probeOk = false;
    let probeStatus = 0;
    let probeError = '';
    setStatusMsg(t('launch.status.wrcTrying', { attempt }));
    try {
      const result = await wrcGetPreset(target.ip, target.port, target.preset);
      probeStatus = Number(result?.status || 0);
      if (result?.ok) {
        probeOk = true;
        wrcReadyRef.current = true;
        setWrcReadyTick((n) => n + 1);
        if (useStartLayoutRef.current && hasStartLayoutRef.current) {
          setStatusMsg(t('launch.status.startLayoutPending', { preset: target.preset }));
        } else {
          setStatusMsg(t('launch.status.wrcConnected', { preset: target.preset }));
        }
        wrcProbeCancelRef.current = true;
        if (wrcProbeTimerRef.current) {
          clearTimeout(wrcProbeTimerRef.current);
          wrcProbeTimerRef.current = null;
        }
      } else {
        probeError = String(result?.error || (probeStatus ? `HTTP ${probeStatus}` : 'wrc_probe_failed'));
      }
    } catch (error) {
      probeError = String(error?.message || error || 'wrc_probe_error');
    } finally {
      emitStartLayoutLog({
        level: probeOk ? 'success' : 'warn',
        action: 'start_layout_probe',
        message: probeOk
          ? t('launch.logs.startLayout.probeOk')
          : t('launch.logs.startLayout.probeKo'),
        value: {
          attempt,
          maxAttempts,
          ok: probeOk,
          status: probeStatus || undefined,
          error: probeOk ? '' : probeError || (probeStatus ? `HTTP ${probeStatus}` : 'wrc_probe_failed'),
          durationMs: Math.max(0, Date.now() - probeStartedAt),
          target: {
            ip: String(target?.ip || ''),
            port: Number(target?.port || 0),
            preset: String(target?.preset || ''),
          },
        },
      });
    }
    if (probeOk) return;
    if (!wrcProbeCancelRef.current) {
      wrcProbeTimerRef.current = setTimeout(() => probe(attempt + 1), retryDelayMs);
    }
  };

  wrcProbeTimerRef.current = setTimeout(() => probe(1), retryDelayMs);
}

export { scheduleWrcProbe };
