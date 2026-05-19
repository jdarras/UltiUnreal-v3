import React from 'react';
import { readIdentity } from '../utils/identity';
import { createT } from '../i18n';
import { formatLicenseDate } from './configurationHelpers';

export default function LicenseScreen({
  licenseStatus,
  onRefresh,
  onStatusChange,
  onBack,
  onContinue,
}) {
  const identity = React.useMemo(readIdentity, []);
  const lang = String(identity?.lang || 'fr').trim();
  const t = React.useMemo(() => createT(lang), [lang]);

  const status = licenseStatus || {};
  const licenseOk = status.ok === true;
  const codeId = String(status.codeId || '');
  const expDate = formatLicenseDate(status.exp, lang);

  const [licenseInput, setLicenseInput] = React.useState('');
  const [msg, setMsg] = React.useState('');
  const [msgKind, setMsgKind] = React.useState('info');
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (onRefresh) onRefresh();
  }, [onRefresh]);

  function getStatusLabel() {
    if (status.status === 'ok') return t('license.status.ok');
    if (status.status === 'missing') return t('license.status.missing');
    if (status.status === 'invalid') return t('license.status.invalid');
    if (status.status === 'expired') return t('license.status.expired');
    if (status.status === 'clock') return t('license.status.clock');
    if (status.status === 'machine_id') return t('license.status.machineId');
    if (status.status === 'key_missing') return t('license.status.keyMissing');
    if (status.status === 'unavailable') return t('license.status.unavailable');
    if (status.status === 'loading') return t('license.status.loading');
    return t('license.status.error');
  }

  async function handleCopyCodeId() {
    if (!codeId) {
      setMsg(t('license.copy.unavailable'));
      setMsgKind('error');
      return;
    }
    try {
      await navigator.clipboard.writeText(codeId);
      setMsg(t('license.copy.ok'));
      setMsgKind('ok');
    } catch {
      setMsg(t('license.copy.fail'));
      setMsgKind('error');
    }
  }

  async function handleSave() {
    if (busy) return;
    setBusy(true);
    setMsg('');
    try {
      if (!window.electron?.licenseSave) {
        setMsg(t('license.save.unavailable'));
        setMsgKind('error');
        setBusy(false);
        return;
      }
      const res = await window.electron.licenseSave(licenseInput);
      if (onStatusChange && res) onStatusChange(res);
      if (res && res.ok) {
        setMsg(t('license.save.ok'));
        setMsgKind('ok');
      } else {
        setMsg(t('license.save.invalid'));
        setMsgKind('error');
      }
    } catch {
      setMsg(t('license.save.error'));
      setMsgKind('error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="uu-page license-page">
      <div className="uu-section license-card">
        <div className="license-header">
          <h3 className="uu-h3 uu-block-title">{t('license.title')}</h3>
          <div className={`license-status ${licenseOk ? 'ok' : 'bad'}`}>
            {getStatusLabel()}
          </div>
        </div>

        <p className="uu-muted">{t('license.subtitle')}</p>

        <div className="license-field">
          <label className="uu-label">{t('license.codeId.label')}</label>
          <div className="license-code-row">
            <input
              className="uu-input license-code"
              type="text"
              value={codeId || t('license.codeId.unavailable')}
              readOnly
            />
            <button className="uu-btn" onClick={handleCopyCodeId} disabled={!codeId}>
              {t('license.codeId.copy')}
            </button>
          </div>
        </div>

        {expDate && (
          <div className="license-expiration">
            {t('license.exp.label').replace('{date}', expDate)}
          </div>
        )}

        <div className="license-field">
          <label className="uu-label">{t('license.key.label')}</label>
          <textarea
            className="uu-input license-key"
            value={licenseInput}
            onChange={(e) => setLicenseInput(e.target.value)}
            placeholder={t('license.key.placeholder')}
            rows={4}
          />
        </div>

        <div className="license-actions">
          <button className="uu-btn" onClick={handleSave} disabled={busy || !licenseInput.trim()}>
            {busy ? '...' : t('license.key.save')}
          </button>
          <button className="uu-btn" onClick={onBack}>
            {t('common.back')}
          </button>
          <button className="uu-btn" onClick={onContinue} disabled={!licenseOk}>
            {t('common.continue')}
          </button>
          {msg ? <div className={`uu-msg ${msgKind}`}>{msg}</div> : null}
        </div>
      </div>
    </div>
  );
}

