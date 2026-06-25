import test from "node:test";
import assert from "node:assert/strict";

import {
  getAllowedTabs,
  getLiveAccountTabs,
} from "../../app/utils/postprodPermissionsHelpers.js";

test("getLiveAccountTabs hides account tabs for Live clients", () => {
  const tabs = getLiveAccountTabs({
    authenticated: true,
    canManageUsers: true,
    canManageRoles: true,
    role: "client",
    appMode: "live",
  });

  assert.deepEqual(tabs, []);
});

test("getLiveAccountTabs keeps account tabs for Live servers", () => {
  const tabs = getLiveAccountTabs({
    authenticated: true,
    canManageUsers: true,
    canManageRoles: true,
    role: "server",
    appMode: "live",
  });

  assert.deepEqual(tabs, ["Profils", "Utilisateurs"]);
});

test("getAllowedTabs omits account tabs when Live client receives none", () => {
  const liveAccountTabs = getLiveAccountTabs({
    authenticated: true,
    canManageUsers: true,
    canManageRoles: true,
    role: "client",
    appMode: "live",
  });

  const tabs = getAllowedTabs({
    role: "client",
    appMode: "live",
    clientSyncEnabled: false,
    resourcesAvailable: true,
    liveAccountTabs,
  });

  assert.deepEqual(tabs, ["Setup", "Projets", "Logs"]);
});
