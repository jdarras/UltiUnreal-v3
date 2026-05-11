import {
  POSTPROD_TAB_USERS,
  POSTPROD_TAB_PROFILES,
  POSTPROD_TAB_RENDERS_CREATE,
} from "../../utils/appConstants";

const preloadPostproductionShell = () => import("../postproduction.jsx");
const preloadPostproductionUsers = () => import("./users");
const preloadPostproductionEditor = () => import("./renderEditor");
const preloadPostproductionCatalogs = () => import("./catalogs");
const preloadPostproductionRenders = () => import("./renders");

function resolvePostproductionChunkGroup(tabKey = "") {
  const key = String(tabKey || "").trim();
  if (!key) return "";
  if (key === POSTPROD_TAB_USERS || key === POSTPROD_TAB_PROFILES) return "users";
  if (key === POSTPROD_TAB_RENDERS_CREATE || key === "Historique") return "editor";
  if (key === "Rendus") return "renders";
  if (key === "Projets" || key === "Ressources" || key === "Datas") return "catalogs";
  return "";
}

function preloadPostproductionGroup(group = "") {
  const normalized = String(group || "").trim();
  if (normalized === "users") return preloadPostproductionUsers();
  if (normalized === "editor") return preloadPostproductionEditor();
  if (normalized === "catalogs") return preloadPostproductionCatalogs();
  if (normalized === "renders") return preloadPostproductionRenders();
  return Promise.resolve();
}

function preloadPostproductionTab(tabKey = "") {
  const group = resolvePostproductionChunkGroup(tabKey);
  if (!group) return Promise.resolve();
  return Promise.allSettled([
    preloadPostproductionShell(),
    preloadPostproductionGroup(group),
  ]).then(() => undefined);
}

function preloadPostproductionTabs(tabKeys = []) {
  const keys = Array.isArray(tabKeys) ? tabKeys : [];
  return Promise.allSettled(keys.map((key) => preloadPostproductionTab(key))).then(() => undefined);
}

export {
  preloadPostproductionShell,
  preloadPostproductionTab,
  preloadPostproductionTabs,
};
