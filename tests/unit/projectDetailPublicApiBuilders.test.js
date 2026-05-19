import test from 'node:test';
import assert from 'node:assert/strict';

import { buildProjectDetailPublicApi } from '../../app/screens/hooks/buildProjectDetailPublicApi.js';
import { buildProjectDetailPublicApiCore } from '../../app/screens/hooks/buildProjectDetailPublicApiCore.js';
import { buildProjectDetailPublicApiSnapshot } from '../../app/screens/hooks/buildProjectDetailPublicApiSnapshot.js';
import { buildProjectDetailPublicApiHttpBind } from '../../app/screens/hooks/buildProjectDetailPublicApiHttpBind.js';

const coreKeys = [
  'detailId',
  'setDetailId',
  'detailName',
  'setDetailName',
  'detailPath',
  'setDetailPath',
  'detailWrcNames',
  'setDetailWrcNames',
  'detailMeta',
  'setDetailMeta',
  'detailMetaRef',
  'detailInsights',
  'setDetailInsights',
  'detailLoading',
  'detailIsNew',
  'setDetailIsNew',
  'detailNoteRef',
  'projectDropdownDirtyRef',
  'projectVersion',
  'setProjectVersion',
  'projectVersionMsg',
  'setProjectVersionMsg',
  'projectVersionMsgType',
  'setProjectVersionMsgType',
  'projectVersionBusy',
  'indexationMsg',
  'indexationMsgType',
  'intervenantsMsg',
  'intervenantsMsgType',
  'renderBridgeStatus',
  'renderBridgeBusy',
  'renderBridgeMsg',
  'renderBridgeMsgType',
  'mapsMsg',
  'mapsMsgType',
  'mapsBusy',
  'keywordsInput',
  'setKeywordsInput',
  'detailKeywordsList',
  'isRenderBridgeUsage',
  'loadRenderBridgeStatus',
  'installRenderBridgeForDetail',
  'updateDetailField',
  'scheduleSave',
  'scheduleProjectVersionSave',
  'applyDefaultMapsPatch',
  'openDetails',
  'closeDetailAndSave',
  'resetDetailState',
  'addKeywordToDraft',
  'removeKeywordFromDraft',
  'handleKeywordKeyDown',
  'httpBindVisible',
  'vpDraft',
  'setVpDraft',
  'vpBusy',
  'scheduleVpSave',
];

const snapshotKeys = [
  'snapshotOpen',
  'snapshotBusy',
  'snapshotMsg',
  'snapshotMsgType',
  'setSnapshotOpen',
  'setSnapshotMsg',
  'setSnapshotMsgType',
  'snapshotSrc',
  'clearSnapshotFeedback',
  'openSnapshotViewer',
  'closeSnapshotViewer',
  'setAutoScreenshotFromSnapshot',
];

const httpBindKeys = [
  'httpBindBusy',
  'httpBindEditing',
  'httpBindDraft',
  'setHttpBindDraft',
  'httpBindDisplay',
  'httpBindDisplayClass',
  'httpBindDraftValid',
  'httpBindInlineMsg',
  'httpBindInlineClass',
  'canEditHttpBind',
  'startHttpBindEdit',
  'cancelHttpBindEdit',
  'saveHttpBindAddress',
];

function sortedKeys(obj) {
  return Object.keys(obj).sort();
}

function makeArgs(allKeys) {
  const args = {};
  allKeys.forEach((key) => {
    args[key] = { marker: key };
  });
  return args;
}

test('buildProjectDetailPublicApiCore exposes expected keys and values', () => {
  const args = makeArgs(coreKeys);
  const result = buildProjectDetailPublicApiCore(args);

  assert.deepEqual(sortedKeys(result), [...coreKeys].sort());
  coreKeys.forEach((key) => {
    assert.equal(result[key], args[key]);
  });
});

test('buildProjectDetailPublicApiSnapshot exposes expected keys and values', () => {
  const args = makeArgs(snapshotKeys);
  const result = buildProjectDetailPublicApiSnapshot(args);

  assert.deepEqual(sortedKeys(result), [...snapshotKeys].sort());
  snapshotKeys.forEach((key) => {
    assert.equal(result[key], args[key]);
  });
});

test('buildProjectDetailPublicApiHttpBind exposes expected keys and values', () => {
  const args = makeArgs(httpBindKeys);
  const result = buildProjectDetailPublicApiHttpBind(args);

  assert.deepEqual(sortedKeys(result), [...httpBindKeys].sort());
  httpBindKeys.forEach((key) => {
    assert.equal(result[key], args[key]);
  });
});

test('buildProjectDetailPublicApi merges core + snapshot + httpBind without drift', () => {
  const allKeys = [...new Set([...coreKeys, ...snapshotKeys, ...httpBindKeys])];
  const args = makeArgs(allKeys);

  const core = buildProjectDetailPublicApiCore(args);
  const snapshot = buildProjectDetailPublicApiSnapshot(args);
  const httpBind = buildProjectDetailPublicApiHttpBind(args);
  const full = buildProjectDetailPublicApi(args);

  assert.deepEqual(sortedKeys(full), [...allKeys].sort());
  assert.deepEqual(full, { ...core, ...snapshot, ...httpBind });
});
