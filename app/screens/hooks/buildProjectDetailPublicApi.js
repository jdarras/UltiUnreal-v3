import { buildProjectDetailPublicApiCore } from './buildProjectDetailPublicApiCore.js';
import { buildProjectDetailPublicApiSnapshot } from './buildProjectDetailPublicApiSnapshot.js';
import { buildProjectDetailPublicApiHttpBind } from './buildProjectDetailPublicApiHttpBind.js';

export function buildProjectDetailPublicApi(args = {}) {
  return {
    ...buildProjectDetailPublicApiCore(args),
    ...buildProjectDetailPublicApiSnapshot(args),
    ...buildProjectDetailPublicApiHttpBind(args),
  };
}
