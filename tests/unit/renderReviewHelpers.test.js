import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRenderReviewTransitionSteps,
  isSameReviewStatus,
} from '../../app/screens/postproduction/renders/hooks/renderReviewHelpers.js';

test('isSameReviewStatus compares canonical review status values', () => {
  assert.equal(isSameReviewStatus('rejected', 'to_modify'), true);
  assert.equal(isSameReviewStatus('cancelled', 'canceled'), true);
  assert.equal(isSameReviewStatus('validated', 'to_validate'), false);
});

test('buildRenderReviewTransitionSteps treats rejected as to_modify transition', () => {
  const steps = buildRenderReviewTransitionSteps(
    { status: 'Queued' },
    'rejected',
    { rejectionReason: 'bad framing' }
  );

  assert.deepEqual(steps, [
    {
      toStatus: 'Done',
      comment: 'Preparation au rejet',
    },
    {
      action: 'reject',
      toStatus: 'Done',
      rejectionReason: 'bad framing',
    },
  ]);
});

test('buildRenderReviewTransitionSteps keeps canceled transition unchanged', () => {
  const steps = buildRenderReviewTransitionSteps({ status: 'Done' }, 'canceled');
  assert.deepEqual(steps, [
    {
      toStatus: 'Canceled',
      comment: 'Validation annulee',
    },
  ]);
});
