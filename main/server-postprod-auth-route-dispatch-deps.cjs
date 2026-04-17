'use strict';

function createPostprodRouteDispatchDeps(options = {}) {
  const {
    postprodRouteHandlerDeps = {},
    postprodRouteCoreDeps = {},
    postprodRouteAuthIdentityDeps = {},
    postprodRouteActivityAuditDeps = {},
    postprodRouteUserProfileDeps = {},
    postprodRouteProjectCatalogDeps = {},
    postprodRouteDataDeps = {},
    postprodRouteResourcesDeps = {},
    postprodRouteTaskDeps = {},
    postprodRouteRenderFormsTemplatesDeps = {},
    postprodRouteRenderExecutionDeps = {},
    postprodRouteRenderStateDeps = {},
    postprodRouteUsersRolesDeps = {},
    getRenderDetectedAutoScanBusy = () => false,
    getRolesCache = () => ({}),
  } = options;

  return {
    ...postprodRouteHandlerDeps,
    ...postprodRouteCoreDeps,
    get renderDetectedAutoScanBusy() {
      return getRenderDetectedAutoScanBusy() === true;
    },
    get rolesCache() {
      return getRolesCache();
    },
    ...postprodRouteAuthIdentityDeps,
    ...postprodRouteActivityAuditDeps,
    ...postprodRouteUserProfileDeps,
    ...postprodRouteProjectCatalogDeps,
    ...postprodRouteDataDeps,
    ...postprodRouteResourcesDeps,
    ...postprodRouteTaskDeps,
    ...postprodRouteRenderFormsTemplatesDeps,
    ...postprodRouteRenderExecutionDeps,
    ...postprodRouteRenderStateDeps,
    ...postprodRouteUsersRolesDeps,
  };
}

module.exports = {
  createPostprodRouteDispatchDeps,
};
