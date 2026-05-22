import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeRenderReviewStatus,
  renderReviewStatusClassName,
  isRenderReviewToModify,
} from '../../app/screens/postproduction/shared/reviewStatusHelpers.js';

test('normalizeRenderReviewStatus canonicalizes legacy aliases', () => {
  assert.equal(normalizeRenderReviewStatus('rejected'), 'to_modify');
  assert.equal(normalizeRenderReviewStatus('to_modify'), 'to_modify');
  assert.equal(normalizeRenderReviewStatus('cancelled'), 'canceled');
  assert.equal(normalizeRenderReviewStatus('validated'), 'validated');
  assert.equal(normalizeRenderReviewStatus('to_validate'), 'to_validate');
  assert.equal(normalizeRenderReviewStatus('unknown'), '');
});

test('renderReviewStatusClassName maps normalized states to expected UI class', () => {
  assert.equal(renderReviewStatusClassName('validated'), 'status-validated');
  assert.equal(renderReviewStatusClassName('rejected'), 'status-rejected');
  assert.equal(renderReviewStatusClassName('to_modify'), 'status-rejected');
  assert.equal(renderReviewStatusClassName('canceled'), 'status-rejected');
  assert.equal(renderReviewStatusClassName('to_validate'), 'status-to-validate');
});

test('isRenderReviewToModify matches both canonical and legacy rejected value', () => {
  assert.equal(isRenderReviewToModify('to_modify'), true);
  assert.equal(isRenderReviewToModify('rejected'), true);
  assert.equal(isRenderReviewToModify('canceled'), false);
});
