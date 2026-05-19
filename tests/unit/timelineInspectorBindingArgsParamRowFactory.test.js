import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildTimelineBindingParamRowModel,
  buildTimelineBindingParamRowModels
} from '../../app/widgets/timeline/timelineInspectorBindingArgsParamRowFactory.js';

test('buildTimelineBindingParamRowModel builds enum model with width and current value', () => {
  const model = buildTimelineBindingParamRowModel(
    { Name: 'Mode', Type: 'Enum', EnumValues: ['A', 'BBBB'] },
    0,
    { Mode: 'BBBB' }
  );

  assert.equal(model.key, 'Mode');
  assert.equal(model.kind, 'enum');
  assert.deepEqual(model.options, ['A', 'BBBB']);
  assert.equal(model.current, 'BBBB');
  assert.equal(typeof model.widthPx, 'number');
  assert.equal(model.widthPx >= 160, true);
});

test('buildTimelineBindingParamRowModel falls back enum without options to default text kind', () => {
  const model = buildTimelineBindingParamRowModel(
    { Name: 'Mode', Type: 'Enum' },
    0,
    {}
  );

  assert.equal(model.kind, 'default');
  assert.deepEqual(model.options, []);
  assert.equal(model.widthPx, null);
});

test('buildTimelineBindingParamRowModel sets byte bounds and param name fallback', () => {
  const model = buildTimelineBindingParamRowModel(
    { Type: 'byte' },
    2,
    {}
  );

  assert.equal(model.name, 'Param3');
  assert.equal(model.kind, 'byte');
  assert.equal(model.min, 0);
  assert.equal(model.max, 255);
});

test('buildTimelineBindingParamRowModels maps function parameters list', () => {
  const models = buildTimelineBindingParamRowModels(
    {
      parameters: [
        { Name: 'Enabled', Type: 'bool' },
        { Name: 'Comment', Type: 'text' }
      ]
    },
    { Enabled: true, Comment: 'ok' }
  );

  assert.equal(models.length, 2);
  assert.equal(models[0].kind, 'bool');
  assert.equal(models[0].current, true);
  assert.equal(models[1].kind, 'text');
  assert.equal(models[1].current, 'ok');
});

test('buildTimelineBindingParamRowModels returns empty array when parameters are missing', () => {
  assert.deepEqual(buildTimelineBindingParamRowModels(null, {}), []);
  assert.deepEqual(buildTimelineBindingParamRowModels({}, {}), []);
});
