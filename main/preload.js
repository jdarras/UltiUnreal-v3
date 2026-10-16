const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  startAgent: (port) => ipcRenderer.invoke('start-agent', port),

  httpGet: (url, headers = {}, timeoutMs = 8000) =>
    ipcRenderer.invoke('http-get', { url, headers, timeoutMs }),
  openExecutable: (opts = {}) => ipcRenderer.invoke('open-executable', opts),
  saveLocalEditor: (exePath) =>
    ipcRenderer.invoke('save-local-editor', { exePath }),
  chooseUproject: (opts = {}) => ipcRenderer.invoke('choose-uproject', opts),
  exportFile: (payload) => ipcRenderer.invoke('export-file', payload),
  openPath: (p) => p ? ipcRenderer.invoke('open-path', p) : null,
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  openLauncherUrl: (exePath, url) =>
    ipcRenderer.invoke('open-launcher-url', { exePath, url }),
  openNetworkCenter: () => ipcRenderer.invoke('open-network-center'),
  runProcess: (opts = {}) => ipcRenderer.invoke('run-process', opts),
  checkPidAlive: (pid) => ipcRenderer.invoke('check-pid-alive', { pid }),
  checkFileExists: (p) => ipcRenderer.invoke('check-file-exists', p),
  findRenderOutputs: (opts = {}) => ipcRenderer.invoke('find-render-outputs', opts),
  readRenderPid: (pidTag) => ipcRenderer.invoke('read-render-pid', pidTag),
  deleteRenderPid: (pidTag) => ipcRenderer.invoke('delete-render-pid', pidTag),
  terminateRenderProcess: (pidTag) => ipcRenderer.invoke('terminate-render-process', pidTag),
  reconcileRenderProcesses: (opts = {}) => ipcRenderer.invoke('reconcile-render-processes', opts),
  readRenderExit: (pidTag) => ipcRenderer.invoke('read-render-exit', pidTag),
  readRenderJob: (pidTag) => ipcRenderer.invoke('read-render-job', pidTag),
  stopRenderJob: (pidTag) => ipcRenderer.invoke('stop-render-job', pidTag),
  supportsRenderJobs: () => ipcRenderer.invoke('supports-render-jobs'),
  fabAuthStatus: () => ipcRenderer.invoke('fab-auth-status'),
  fabLogin: () => ipcRenderer.invoke('fab-login'),
  fabLogout: () => ipcRenderer.invoke('fab-logout'),

  chooseFolder: () => ipcRenderer.invoke('choose-folder'),
  chooseFile: (opts = {}) => ipcRenderer.invoke('choose-file', opts),
  readFileAsDataUrl: (p) => p ? ipcRenderer.invoke('read-file-dataurl', p) : null,
  readFileText: (p) => p ? ipcRenderer.invoke('read-file-text', p) : null,
  copyImageToClipboard: (source) => ipcRenderer.invoke('copy-image-to-clipboard', source),
  showImageContextMenu: (source) => ipcRenderer.invoke('show-image-context-menu', { source }),
  getLocalIps: (opts = {}) => ipcRenderer.invoke('get-local-ips', opts),

  loadProjects: () => ipcRenderer.invoke('load-projects'),
  quitApp: () => ipcRenderer.invoke('app:quit'),
  onAppQuitRequested: (handler) => {
    if (typeof handler !== 'function') return () => {};
    const listener = () => {
      try {
        handler();
      } catch {}
    };
    ipcRenderer.on('app:quit-requested', listener);
    return () => {
      ipcRenderer.removeListener('app:quit-requested', listener);
    };
  },
  onTimelineCompanionCommand: (handler) => {
    if (typeof handler !== 'function') return () => {};
    const listener = (_evt, payload) => {
      try {
        handler(payload || {});
      } catch {}
    };
    ipcRenderer.on('timeline:companion-command', listener);
    return () => {
      ipcRenderer.removeListener('timeline:companion-command', listener);
    };
  },
  licenseGetStatus: () => ipcRenderer.invoke('license:get-status'),
  licenseGetCodeId: () => ipcRenderer.invoke('license:get-codeid'),
  licenseSave: (license) => ipcRenderer.invoke('license:save', { license }),
  licenseClear: () => ipcRenderer.invoke('license:clear'),
  saveProjects: (projects, activeByHost, activeName) =>
    ipcRenderer.invoke('save-projects', { projects, activeByHost, activeName }),
  httpJson: async (url, opts = {}) => {
    const { method = 'GET', headers = {}, body = undefined, timeout } = opts || {};
    const payload =
      body != null && typeof body !== 'string' ? JSON.stringify(body) : body;
    return await ipcRenderer.invoke('http-json', {
      url,
      method,
      headers,
      body: payload,
      timeout
    });
  }
});
