function buildSyncServerGroupsMessages({ isRenderMode, t }) {
  return {
    syncHostsTitle: t('sync.server.section.syncHosts'),
    localProjectTitle: isRenderMode
      ? t('sync.server.render.localProjectTitle', 'Stations non configurees pour la synchronisation')
      : t('sync.server.section.localProject'),
    localProjectMessage: isRenderMode
      ? t(
          'sync.server.render.localProjectMessage',
          'Synchronisation desactivee sur cette station. Active-la pour comparer et copier les projets rendu.'
        )
      : t('sync.server.msg.localProjectMode'),
    excludedTitle: isRenderMode
      ? t('sync.server.render.excludedTitle', 'Stations exclues de la synchronisation')
      : t('sync.server.section.excluded'),
    excludedMessage: isRenderMode
      ? t('sync.server.render.excludedMessage', 'Cette station est exclue du rendu/synchronisation.')
      : t('sync.server.msg.excluded'),
  };
}

export { buildSyncServerGroupsMessages };
