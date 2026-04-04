const path = require('path');

const LOCAL_DATA_DIR = path.resolve(__dirname, '..', 'data');

function resolveElectronApp() {
  try {
    const { app } = require('electron');
    return app || null;
  } catch {
    return null;
  }
}

function getDataDir() {
  if (process.env.UU_DATA_DIR) return process.env.UU_DATA_DIR;

  const app = resolveElectronApp();
  const userData = app && typeof app.getPath === 'function' ? app.getPath('userData') : '';
  const isPackaged = !!(app && app.isPackaged);

  if (userData && (isPackaged || process.env.UU_FORCE_USERDATA)) {
    return path.join(userData, 'data');
  }

  return LOCAL_DATA_DIR;
}

function setProcessDataDir() {
  if (!process.env.UU_DATA_DIR) {
    process.env.UU_DATA_DIR = getDataDir();
  }
  return process.env.UU_DATA_DIR;
}

module.exports = {
  getDataDir,
  setProcessDataDir,
};
