import { useCallback } from 'react';
import {
  isFabListingUrl,
  buildLauncherLibraryLink,
  buildFabLauncherUrl,
  buildLauncherDeepLink,
} from '../../utils/resources-launcher';

export function useResourceDetailLaunchActions({
  detailItem,
  unrealLauncherPath,
  refreshUserVersions,
} = {}) {
  const handleOpen = useCallback((url) => {
    const target = String(url || '').trim();
    if (!target) return;
    if (typeof window.electron?.openExternal === 'function') {
      window.electron.openExternal(target);
      return;
    }
    window.open(target, '_blank', 'noopener,noreferrer');
  }, []);

  const handleLaunchInUnreal = useCallback(async () => {
    if (!detailItem) return;
    const listingUrl = String(detailItem?.listingUrl || '').trim();
    const isFab = isFabListingUrl(listingUrl);

    if (isFab) {
      const deeplink = buildLauncherDeepLink(detailItem);
      if (deeplink) {
        if (typeof window.electron?.openExternal === 'function') {
          window.electron.openExternal(deeplink);
        } else {
          window.location.assign(deeplink);
        }
        return;
      }
      const fabUrl = buildFabLauncherUrl(detailItem);
      let exe = String(unrealLauncherPath || '').trim();
      if (!exe && typeof refreshUserVersions === 'function') {
        exe = await refreshUserVersions();
      }
      if (exe && fabUrl && typeof window.electron?.openLauncherUrl === 'function') {
        window.electron.openLauncherUrl(exe, fabUrl);
        return;
      }
      const libraryLink = buildLauncherLibraryLink();
      if (typeof window.electron?.openExternal === 'function') {
        window.electron.openExternal(libraryLink);
      } else {
        window.location.assign(libraryLink);
      }
      return;
    }

    const deeplink = buildLauncherDeepLink(detailItem);
    if (deeplink) {
      if (typeof window.electron?.openExternal === 'function') {
        window.electron.openExternal(deeplink);
      } else {
        window.location.assign(deeplink);
      }
      return;
    }

    let exe = String(unrealLauncherPath || '').trim();
    if (!exe && typeof refreshUserVersions === 'function') {
      exe = await refreshUserVersions();
    }
    if (!exe) {
      const fallbackUrl = String(detailItem?.listingUrl || '').trim();
      if (fallbackUrl) handleOpen(fallbackUrl);
      return;
    }
    if (typeof window.electron?.openExternal === 'function') {
      window.electron.openExternal(exe);
    } else {
      window.location.assign(exe);
    }
  }, [detailItem, unrealLauncherPath, refreshUserVersions, handleOpen]);

  const handleResourceImageContextMenu = useCallback((event, source) => {
    const src = String(source || '').trim();
    if (!src) return;
    event.preventDefault();
    event.stopPropagation();
    if (typeof window.electron?.showImageContextMenu === 'function') {
      void window.electron.showImageContextMenu(src);
      return;
    }
    if (typeof window.electron?.copyImageToClipboard === 'function') {
      void window.electron.copyImageToClipboard(src);
    }
  }, []);

  return {
    handleOpen,
    handleLaunchInUnreal,
    handleResourceImageContextMenu,
  };
}

export default useResourceDetailLaunchActions;
