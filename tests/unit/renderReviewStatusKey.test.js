import test from 'node:test';
import assert from 'node:assert/strict';

import { renderReviewStatusKey } from '../../app/screens/postproduction/renders/helpers.js';

test('renderReviewStatusKey normalizes explicit legacy rejected to to_modify', () => {
  assert.equal(renderReviewStatusKey({ reviewStatus: 'rejected', status: 'Done' }), 'to_modify');
});

test('renderReviewStatusKey resolves canceled from render status', () => {
  assert.equal(renderReviewStatusKey({ status: 'Canceled' }), 'canceled');
});

test('renderReviewStatusKey resolves validated from done + validator id', () => {
  assert.equal(
    renderReviewStatusKey({ status: 'Done', validatedByUserId: 42 }),
    'validated'
  );
});
