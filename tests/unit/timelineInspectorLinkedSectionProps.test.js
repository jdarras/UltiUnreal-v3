import test from 'node:test';
import assert from 'node:assert/strict';

import { buildTimelineInspectorLinkedSectionCommonProps } from '../../app/widgets/timeline/timelineInspectorLinkedSectionProps.js';

function sortedKeys(obj) {
  return Object.keys(obj).sort();
}

test('buildTimelineInspectorLinkedSectionCommonProps preserves references', () => {
  const t = () => '';
  const bundleValueDrafts = { tx: '1' };
  const setBundleValueDrafts = () => {};
  const commitBundleValueDraft = () => {};
  const removeChannelKeyframeAt = () => {};
  const addChannelKeyframeAt = () => {};

  const result = buildTimelineInspectorLinkedSectionCommonProps({
    t,
    bundleValueDrafts,
    setBundleValueDrafts,
    commitBundleValueDraft,
    removeChannelKeyframeAt,
    addChannelKeyframeAt
  });

  assert.deepEqual(sortedKeys(result), [
    'addChannelKeyframeAt',
    'bundleValueDrafts',
    'commitBundleValueDraft',
    'removeChannelKeyframeAt',
    'setBundleValueDrafts',
    't'
  ]);
  assert.equal(result.t, t);
  assert.equal(result.bundleValueDrafts, bundleValueDrafts);
  assert.equal(result.setBundleValueDrafts, setBundleValueDrafts);
  assert.equal(result.commitBundleValueDraft, commitBundleValueDraft);
  assert.equal(result.removeChannelKeyframeAt, removeChannelKeyframeAt);
  assert.equal(result.addChannelKeyframeAt, addChannelKeyframeAt);
});
