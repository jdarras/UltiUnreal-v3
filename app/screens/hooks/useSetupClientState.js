import React from 'react';

const LS_EDITORS_KEY = 'uu_client_unrealEditors';
const LS_SYNC_KEY = 'uu_client_syncEnabled';
const LS_VERSIONS_KEY = 'uu_client_unrealVersions';
const LS_CLIENT_ASSOC = 'uu_client_project_assoc';

function safeReadEditors() {
  try {
    const raw = localStorage.getItem(LS_EDITORS_KEY) || '{}';
    const obj = JSON.parse(raw);
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

function safeReadVersions() {
  try {
    const raw = localStorage.getItem(LS_VERSIONS_KEY) || '[]';
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      return arr.map((v) => String(v || '').trim()).filter(Boolean);
    }
  } catch {}
  return [];
}

function safeReadSync() {
  try {
    const raw = localStorage.getItem(LS_SYNC_KEY);
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return null;
  } catch {
    return null;
  }
}

function safeReadAssoc() {
  try {
    return String(localStorage.getItem(LS_CLIENT_ASSOC) || '');
  } catch {
    return '';
  }
}

function useSetupClientState({ clientSyncEnabled }) {
  const versionsFromCache = React.useMemo(() => {
    const editors = safeReadEditors();
    const editorKeys = Object.keys(editors).filter(Boolean);
    if (editorKeys.length) return editorKeys;
    return safeReadVersions();
  }, []);

  const readCachedEditors = React.useCallback(() => safeReadEditors(), []);
  const readCachedSync = React.useCallback(() => safeReadSync(), []);
  const readCachedAssoc = React.useCallback(() => safeReadAssoc(), []);
  const readCachedVersions = React.useCallback(() => safeReadVersions(), []);

  const writeCachedEditors = React.useCallback((obj) => {
    try {
      localStorage.setItem(LS_EDITORS_KEY, JSON.stringify(obj || {}, null, 2));
    } catch {}
  }, []);

  const writeCachedSync = React.useCallback((val) => {
    try {
      localStorage.setItem(LS_SYNC_KEY, String(!!val));
    } catch {}
  }, []);

  const writeCachedVersions = React.useCallback((arr) => {
    try {
      const list = Array.isArray(arr) ? arr : [];
      localStorage.setItem(
        LS_VERSIONS_KEY,
        JSON.stringify(list.map((v) => String(v || '').trim()).filter(Boolean))
      );
    } catch {}
  }, []);

  const [clientVersions, setClientVersions] = React.useState(versionsFromCache);
  const [clientEditors, setClientEditors] = React.useState(() => safeReadEditors());
  const [clientHostExists, setClientHostExists] = React.useState(false);
  const [clientMsg, setClientMsg] = React.useState('');
  const [clientMsgType, setClientMsgType] = React.useState('');
  const [clientSyncState, setClientSyncState] = React.useState(() => {
    const cached = safeReadSync();
    return cached !== null ? cached : !!clientSyncEnabled;
  });
  const [versionsLoaded, setVersionsLoaded] = React.useState(false);

  const lastClientSaveSigRef = React.useRef('');
  const clientMsgTimerRef = React.useRef(null);
  const clientSaveTimerRef = React.useRef(null);
  const clientSaveReadyRef = React.useRef(false);

  const clearClientMessage = React.useCallback(() => {
    if (clientMsgTimerRef.current) {
      clearTimeout(clientMsgTimerRef.current);
      clientMsgTimerRef.current = null;
    }
    setClientMsg('');
    setClientMsgType('');
  }, []);

  const scheduleClientMessageClear = React.useCallback((delayMs = 2500) => {
    if (clientMsgTimerRef.current) {
      clearTimeout(clientMsgTimerRef.current);
      clientMsgTimerRef.current = null;
    }
    const rawDelay = Number(delayMs);
    const timeoutMs = Number.isFinite(rawDelay) && rawDelay >= 0 ? Math.trunc(rawDelay) : 0;
    if (timeoutMs <= 0) return;
    clientMsgTimerRef.current = setTimeout(() => {
      clientMsgTimerRef.current = null;
      clearClientMessage();
    }, timeoutMs);
  }, [clearClientMessage]);

  const showClientTransientMessage = React.useCallback((message, type = 'info', delayMs = 2500) => {
    const msg = String(message || '').trim();
    if (!msg) {
      clearClientMessage();
      return;
    }
    setClientMsg(msg);
    setClientMsgType(type);
    scheduleClientMessageClear(delayMs);
  }, [clearClientMessage, scheduleClientMessageClear]);

  const clearScheduledClientAutosave = React.useCallback(() => {
    if (clientSaveTimerRef.current) {
      clearTimeout(clientSaveTimerRef.current);
      clientSaveTimerRef.current = null;
    }
  }, []);

  const markClientAutosaveReady = React.useCallback(() => {
    if (!clientSaveReadyRef.current) {
      clientSaveReadyRef.current = true;
      return false;
    }
    return true;
  }, []);

  const scheduleClientAutosave = React.useCallback((saveFn, delayMs = 600) => {
    clearScheduledClientAutosave();
    const rawDelay = Number(delayMs);
    const timeoutMs = Number.isFinite(rawDelay) && rawDelay >= 0 ? Math.trunc(rawDelay) : 0;
    clientSaveTimerRef.current = setTimeout(() => {
      clientSaveTimerRef.current = null;
      if (typeof saveFn === 'function') saveFn();
    }, timeoutMs);
  }, [clearScheduledClientAutosave]);

  React.useEffect(() => {
    return () => {
      if (clientMsgTimerRef.current) {
        clearTimeout(clientMsgTimerRef.current);
        clientMsgTimerRef.current = null;
      }
      if (clientSaveTimerRef.current) {
        clearTimeout(clientSaveTimerRef.current);
        clientSaveTimerRef.current = null;
      }
    };
  }, []);

  React.useEffect(() => {
    setClientSyncState(!!clientSyncEnabled);
  }, [clientSyncEnabled]);

  return {
    readCachedEditors,
    writeCachedEditors,
    readCachedSync,
    readCachedAssoc,
    writeCachedSync,
    readCachedVersions,
    writeCachedVersions,
    clientVersions,
    setClientVersions,
    clientEditors,
    setClientEditors,
    clientHostExists,
    setClientHostExists,
    clientMsg,
    clientMsgType,
    clientSyncState,
    setClientSyncState,
    versionsLoaded,
    setVersionsLoaded,
    lastClientSaveSigRef,
    showClientTransientMessage,
    markClientAutosaveReady,
    scheduleClientAutosave,
    clearScheduledClientAutosave,
  };
}

export { useSetupClientState };
