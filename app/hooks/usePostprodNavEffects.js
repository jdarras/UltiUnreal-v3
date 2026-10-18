import { useEffect, useRef } from "react";
import { getHosts } from "../utils/agent";
import { getAllowedTabs, resolveDefaultTab } from "../utils/postprodPermissionsHelpers";
import {
  APP_MODE_POSTPROD,
  APP_MODE_LIVE,
  POSTPROD_TAB_USERS,
  POSTPROD_TAB_RENDERS_CREATE,
} from "../utils/appConstants";

const LS_SYNC_KEY = 'uu_client_syncEnabled';

function usePostprodNavEffects({
  current, appMode, postprodAuthenticated, role,
  clientSyncEnabled, resourcesTabAvailable, postprodVisibleTabs,
  postprodCanManageMachines, liveAccountTabs, postprodLockedTabs,
  postprodTaskFormOpen, postprodRenderEditorRequest,
  showWelcome, initialClientNavDone, safeIdentity,
  setCurrent, setPostprodTaskFormOpen, setPostprodUserEditorOpen,
  setClientSyncEnabled, setInitialClientNavDone,
}) {
  const postprodRenderEditorWasOpenRef = useRef(false);

  useEffect(() => {
    if (current !== POSTPROD_TAB_RENDERS_CREATE) {
      setPostprodTaskFormOpen(false);
    }
    if (current !== POSTPROD_TAB_USERS) {
      setPostprodUserEditorOpen(false);
    }
  }, [current, setPostprodTaskFormOpen, setPostprodUserEditorOpen]);

  useEffect(() => {
    if (current !== POSTPROD_TAB_RENDERS_CREATE) {
      postprodRenderEditorWasOpenRef.current = postprodTaskFormOpen === true;
      return;
    }

    const wasOpen = postprodRenderEditorWasOpenRef.current === true;
    const isOpen = postprodTaskFormOpen === true;
    postprodRenderEditorWasOpenRef.current = isOpen;

    // Retour auto vers "Rendus" uniquement quand l'utilisateur ferme un formulaire déjà ouvert.
    if (wasOpen && !isOpen && !postprodRenderEditorRequest) {
      setCurrent("Rendus");
    }
  }, [current, postprodTaskFormOpen, postprodRenderEditorRequest, setCurrent]);

  // Garde un onglet valide quand le rôle change
  useEffect(() => {
    const allowed = getAllowedTabs({
      role,
      appMode,
      clientSyncEnabled,
      resourcesAvailable: resourcesTabAvailable,
      postprodTabs: postprodVisibleTabs,
      postprodCanManageMachines,
      liveAccountTabs,
    });
    if (!allowed.includes(current)) {
      setCurrent(resolveDefaultTab(allowed, appMode));
    }
  }, [role, appMode, current, clientSyncEnabled, resourcesTabAvailable, postprodVisibleTabs, postprodCanManageMachines, liveAccountTabs, setCurrent]);

  useEffect(() => {
    if (appMode !== APP_MODE_POSTPROD || postprodAuthenticated) return;
    if (postprodLockedTabs.includes(current)) {
      const allowed = getAllowedTabs({
        role,
        appMode,
        clientSyncEnabled,
        resourcesAvailable: resourcesTabAvailable,
        postprodTabs: postprodVisibleTabs,
        postprodCanManageMachines,
        liveAccountTabs,
      });
      setCurrent(resolveDefaultTab(allowed, appMode));
    }
  }, [
    appMode,
    postprodAuthenticated,
    postprodLockedTabs,
    current,
    role,
    clientSyncEnabled,
    resourcesTabAvailable,
    postprodVisibleTabs,
    postprodCanManageMachines,
    liveAccountTabs,
    setCurrent,
  ]);

  useEffect(() => {
    if (appMode !== APP_MODE_POSTPROD) return;
    if (current === "Validations") {
      setCurrent("Rendus");
      return;
    }
    if (current === "Historique") {
      setCurrent("Logs");
    }
  }, [appMode, current, setCurrent]);

  // Côté client : déterminer dès que possible l'onglet par défaut selon syncEnabled (depuis le serveur ou l'unique host)
  useEffect(() => {
    if (role !== "client" || appMode !== APP_MODE_LIVE || showWelcome || initialClientNavDone) return;
    let cancelled = false;
    (async () => {
      // On reste sur Setup au démarrage client ; on ne force pas de changement d'onglet si l'utilisateur est déjà sur Setup
      if (current === "Setup") {
        setInitialClientNavDone(true);
        return;
      }
      let sync = (() => {
        try {
          const raw = localStorage.getItem(LS_SYNC_KEY);
          if (raw === 'true') return true;
          if (raw === 'false') return false;
        } catch {}
        return false;
      })();
      try {
        const hosts = await getHosts().catch(() => []);
        const list = Array.isArray(hosts) ? hosts : [];
        const ip = String(safeIdentity.localIp || "").trim().toLowerCase();
        let host =
          list.find(
            (h) =>
              h &&
              String(h.ip || "")
                .trim()
                .toLowerCase() === ip
          ) || null;
        if (!host && list.length === 1) host = list[0];
        if (host) {
          sync =
            typeof host.syncEnabled === "boolean"
              ? host.syncEnabled
              : !!host.syncRoot;
          setClientSyncEnabled(sync);
          try { localStorage.setItem(LS_SYNC_KEY, String(!!sync)); } catch {}
        }
      } catch {
        // on garde sync = false par défaut
      }
      if (!cancelled) {
        setCurrent("Projets");
        setInitialClientNavDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role, appMode, showWelcome, initialClientNavDone, safeIdentity.localIp, current, setClientSyncEnabled, setCurrent, setInitialClientNavDone]);
}

export { usePostprodNavEffects };
