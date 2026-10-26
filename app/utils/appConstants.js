// Fourni par Vite (app/vite.config.mjs) depuis le champ « version » de package.json.
const APP_VERSION = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "";
const APP_MODE_LIVE = 'live';
const APP_MODE_POSTPROD = 'postprod';
const POSTPROD_TAB_USERS = "Utilisateurs";
const POSTPROD_TAB_PROFILES = "Profils";
const POSTPROD_TAB_RENDERS_CREATE = "RendusCreate";
const POSTPROD_TABS_BASE = [
  POSTPROD_TAB_USERS,
  "Projets",
  "Synchronisation",
  "Ressources",
  "Datas",
  "Rendus",
  POSTPROD_TAB_RENDERS_CREATE,
];

export {
  APP_VERSION,
  APP_MODE_LIVE,
  APP_MODE_POSTPROD,
  POSTPROD_TAB_USERS,
  POSTPROD_TAB_PROFILES,
  POSTPROD_TAB_RENDERS_CREATE,
  POSTPROD_TABS_BASE,
};
