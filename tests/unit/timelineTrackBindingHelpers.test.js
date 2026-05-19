import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isEmptyTextValue,
  hasMissingBinding,
} from '../../app/widgets/timeline/timelineTrackBindingHelpers.js';

test('isEmptyTextValue handles empty and non-empty values', () => {
  assert.equal(isEmptyTextValue(''), true);
  assert.equal(isEmptyTextValue('   '), true);
  assert.equal(isEmptyTextValue(null), true);
  assert.equal(isEmptyTextValue('abc'), false);
});

test('hasMissingBinding for button/function bindings', () => {
  assert.equal(
    hasMissingBinding({
      type: 'button',
      binding: { path: '', displayName: '' },
    }),
    true
  );

  assert.equal(
    hasMissingBinding({
      type: 'button',
      binding: { path: '/Game/MyPath', displayName: '' },
    }),
    false
  );

  assert.equal(
    hasMissingBinding({
      type: 'slider',
      binding: { kind: 'function', path: '', displayName: '' },
    }),
    true
  );
});

test('hasMissingBinding for browse button requires browse arg', () => {
  assert.equal(
    hasMissingBinding({
      type: 'browse',
      binding: {
        kind: 'function',
        path: '/Game/MyPath',
        displayName: '',
        browseArgName: '',
      },
    }),
    true
  );

  assert.equal(
    hasMissingBinding({
      type: 'browse',
      binding: {
        kind: 'function',
        path: '/Game/MyPath',
        displayName: '',
        browseArgName: 'MediaPath',
      },
    }),
    false
  );
});

test('hasMissingBinding for joystick manual and linked modes', () => {
  assert.equal(
    hasMissingBinding({
      type: 'joystick',
      ui: { linkType: 'manual' },
      joystickBindings: {
        x: { path: '/Game/X' },
        y: { path: '' },
      },
    }),
    true
  );

  assert.equal(
    hasMissingBinding({
      type: 'joystick',
      ui: { linkType: 'manual' },
      joystickBindings: {
        x: { path: '/Game/X' },
        y: { path: '/Game/Y' },
      },
    }),
    false
  );

  assert.equal(
    hasMissingBinding({
      type: 'joystick',
      binding: { path: '' },
    }),
    true
  );
});

test('hasMissingBinding for property/default binding kind', () => {
  assert.equal(
    hasMissingBinding({
      type: 'slider',
      binding: { kind: 'property', path: '' },
    }),
    true
  );

  assert.equal(
    hasMissingBinding({
      type: 'slider',
      binding: { kind: 'property', path: '/Game/Value' },
    }),
    false
  );

  assert.equal(
    hasMissingBinding({
      type: 'slider',
      binding: { path: '' },
    }),
    true
  );
});
