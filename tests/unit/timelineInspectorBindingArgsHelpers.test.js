import test from 'node:test';
import assert from 'node:assert/strict';

import {
  classifyTimelineBindingParamType,
  computeTimelineBindingEnumWidth,
  parseTimelineBindingEnumOptions,
  resolveTimelineBindingArgValues,
  resolveTimelineBindingFunction,
  resolveTimelineBindingParamName,
  resolveTimelineBindingParamType
} from '../../app/widgets/timeline/timelineInspectorBindingArgsHelpers.js';

test('resolveTimelineBindingFunction matches by binding displayName', () => {
  const selectedWidget = { binding: { displayName: 'Launch' } };
  const presetData = {
    funcs: [{ displayName: 'Stop' }, { displayName: 'Launch', id: 2 }]
  };
  const result = resolveTimelineBindingFunction(selectedWidget, presetData);
  assert.deepEqual(result, { displayName: 'Launch', id: 2 });

  assert.equal(resolveTimelineBindingFunction({ binding: {} }, presetData), null);
  assert.equal(resolveTimelineBindingFunction(null, presetData), null);
});

test('resolveTimelineBindingArgValues prefers selected keyframe args object', () => {
  const selectedWidget = { binding: { argValues: { a: 1 } } };
  const selectedKeyframeArgs = { a: 2, b: 3 };
  assert.equal(
    resolveTimelineBindingArgValues(selectedKeyframeArgs, selectedWidget),
    selectedKeyframeArgs
  );

  assert.deepEqual(
    resolveTimelineBindingArgValues(null, selectedWidget),
    { a: 1 }
  );
  assert.deepEqual(
    resolveTimelineBindingArgValues(null, { binding: {} }),
    {}
  );
});

test('binding param name and type resolvers apply fallbacks', () => {
  assert.equal(resolveTimelineBindingParamName({ Name: 'N' }, 0), 'N');
  assert.equal(resolveTimelineBindingParamName({ ParameterName: 'P' }, 0), 'P');
  assert.equal(resolveTimelineBindingParamName({ name: 'n' }, 0), 'n');
  assert.equal(resolveTimelineBindingParamName({}, 2), 'Param3');

  assert.equal(resolveTimelineBindingParamType({ Type: 'FColor' }), 'fcolor');
  assert.equal(
    resolveTimelineBindingParamType({ ParameterType: 'Int64' }),
    'int64'
  );
  assert.equal(resolveTimelineBindingParamType({}), '');
});

test('classifyTimelineBindingParamType maps known categories', () => {
  assert.equal(classifyTimelineBindingParamType('myenum'), 'enum');
  assert.equal(classifyTimelineBindingParamType('vector'), 'vector');
  assert.equal(classifyTimelineBindingParamType('rotator'), 'rotator');
  assert.equal(classifyTimelineBindingParamType('transform'), 'transform');
  assert.equal(classifyTimelineBindingParamType('flinearcolor'), 'color');
  assert.equal(classifyTimelineBindingParamType('bool'), 'bool');
  assert.equal(classifyTimelineBindingParamType('uint8'), 'byte');
  assert.equal(classifyTimelineBindingParamType('int64'), 'int64');
  assert.equal(classifyTimelineBindingParamType('int32'), 'int');
  assert.equal(classifyTimelineBindingParamType('double'), 'float');
  assert.equal(classifyTimelineBindingParamType('fname'), 'text');
  assert.equal(classifyTimelineBindingParamType('somethingElse'), 'default');
});

test('parseTimelineBindingEnumOptions handles array/string/metadata input', () => {
  assert.deepEqual(
    parseTimelineBindingEnumOptions({ EnumValues: ['A', 'B'] }),
    ['A', 'B']
  );
  assert.deepEqual(
    parseTimelineBindingEnumOptions({ enumValues: 'A, B,  C' }),
    ['A', 'B', 'C']
  );
  assert.deepEqual(
    parseTimelineBindingEnumOptions({ Metadata: { enumvalues: ['X'] } }),
    ['X']
  );
  assert.deepEqual(parseTimelineBindingEnumOptions({}), []);
});

test('computeTimelineBindingEnumWidth clamps min/max and scales from longest option', () => {
  assert.equal(computeTimelineBindingEnumWidth([]), 160);
  assert.equal(computeTimelineBindingEnumWidth(['A']), 160);
  assert.equal(
    computeTimelineBindingEnumWidth(['12345678901234567890']),
    220
  );
  assert.equal(
    computeTimelineBindingEnumWidth(['x'.repeat(100)]),
    420
  );
});
