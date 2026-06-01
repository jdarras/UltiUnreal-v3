import React from 'react';
import { preloadI18n } from '../i18n';
import {
  normalizeInterfaceLanguage,
  parseNotificationPrefsObject,
  resolveShowFabResourcesPreference,
} from './configurationHelpers';
import { useTransientInfo } from './hooks/useTransientInfo';

function useConfigUserPreferences({
  initialInterfaceLanguage = 'fr',
  notificationPrefs = null,
  onUpdateMe = null,
  t,
  onLanguageChanged = null,
}) {
  const normalizedInitialLanguage = normalizeInterfaceLanguage(initialInterfaceLanguage);
  const [showFabResourcesForUser, setShowFabResourcesForUser] = React.useState(
    () => resolveShowFabResourcesPreference(notificationPrefs)
  );
  const [interfaceLanguageForUser, setInterfaceLanguageForUser] = React.useState(normalizedInitialLanguage);
  const [userPrefsSaving, setUserPrefsSaving] = React.useState(false);
  const {
    infoMsg: userPrefsMsgText,
    infoMsgType: userPrefsMsgType,
    showInfo: showUserPrefsMsg,
    clearInfo: clearUserPrefsMsg,
  } = useTransientInfo({ defaultType: 'info', clearAfterMs: 2500 });
  const userPrefsMsg = React.useMemo(
    () => ({ text: userPrefsMsgText, type: userPrefsMsgType }),
    [userPrefsMsgText, userPrefsMsgType]
  );

  const showUserPrefsFeedback = React.useCallback((text = '', type = '') => {
    const msg = String(text || '').trim();
    if (!msg) {
      clearUserPrefsMsg();
      return;
    }
    showUserPrefsMsg(msg, String(type || '').trim() || 'info', 2500);
  }, [clearUserPrefsMsg, showUserPrefsMsg]);

  const handleToggleFabResourcesForUser = React.useCallback(async (nextValue) => {
    const checked = !!nextValue;
    setShowFabResourcesForUser(checked);
    if (typeof onUpdateMe !== 'function') {
      showUserPrefsFeedback(t('config.userPreferences.authRequired'), 'warn');
      return;
    }
    setUserPrefsSaving(true);
    const currentPrefs = parseNotificationPrefsObject(notificationPrefs);
    const nextPrefs = {
      ...currentPrefs,
      showFabResources: checked,
    };
    let ok = false;
    try {
      const result = await Promise.resolve(onUpdateMe({
        notificationPrefsJson: JSON.stringify(nextPrefs),
      }));
      ok = result !== false;
    } catch {
      ok = false;
    } finally {
      setUserPrefsSaving(false);
    }
    if (ok) {
      showUserPrefsFeedback(t('config.userPreferences.saved'), 'ok');
    } else {
      setShowFabResourcesForUser(resolveShowFabResourcesPreference(notificationPrefs));
      showUserPrefsFeedback(t('config.userPreferences.saveError'), 'error');
    }
  }, [notificationPrefs, onUpdateMe, showUserPrefsFeedback, t]);

  const handleChangeInterfaceLanguageForUser = React.useCallback(async (nextValue) => {
    const normalized = normalizeInterfaceLanguage(nextValue);
    const previous = normalizeInterfaceLanguage(interfaceLanguageForUser);
    if (normalized === previous) return;
    setInterfaceLanguageForUser(normalized);
    if (typeof onUpdateMe !== 'function') {
      showUserPrefsFeedback(t('config.userPreferences.authRequired'), 'warn');
      setInterfaceLanguageForUser(previous);
      return;
    }
    setUserPrefsSaving(true);
    let ok = false;
    try {
      const result = await Promise.resolve(onUpdateMe({
        language: normalized,
      }));
      ok = result !== false;
    } catch {
      ok = false;
    } finally {
      setUserPrefsSaving(false);
    }
    if (ok) {
      await preloadI18n(normalized);
      onLanguageChanged?.(normalized);
      showUserPrefsFeedback(t('config.userPreferences.saved'), 'ok');
    } else {
      setInterfaceLanguageForUser(previous);
      showUserPrefsFeedback(t('config.userPreferences.saveError'), 'error');
    }
  }, [interfaceLanguageForUser, onLanguageChanged, onUpdateMe, showUserPrefsFeedback, t]);

  React.useEffect(() => {
    setShowFabResourcesForUser(resolveShowFabResourcesPreference(notificationPrefs));
  }, [notificationPrefs]);

  return {
    showFabResourcesForUser,
    interfaceLanguageForUser,
    userPrefsSaving,
    userPrefsMsg,
    handleToggleFabResourcesForUser,
    handleChangeInterfaceLanguageForUser,
  };
}

export { useConfigUserPreferences };
