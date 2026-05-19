import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyTimelinePickedPath,
  handleTimelineBoolChange,
  handleTimelineBrowseInputChange,
  handleTimelineBrowseTextBlur,
  handleTimelineBrowseTextChange,
  handleTimelineEnumChange,
  handleTimelineTextBlur,
  handleTimelineTextChange,
  handleTimelineTextKeyDown
} from '../../app/widgets/timeline/timelineInspectorValueInputHandlers.js';

test('applyTimelinePickedPath returns false for empty path and true for valid path', () => {
  const picked = [];
  const changed = [];

  assert.equal(
    applyTimelinePickedPath('', (v) => picked.push(v), (v) => changed.push(v)),
    false
  );
  assert.deepEqual(picked, []);
  assert.deepEqual(changed, []);

  assert.equal(
    applyTimelinePickedPath('C:/media/file.mp4', (v) => picked.push(v), (v) => changed.push(v)),
    true
  );
  assert.deepEqual(picked, ['C:/media/file.mp4']);
  assert.deepEqual(changed, ['C:/media/file.mp4']);
});

test('enum and browse text handlers sync draft + value change', () => {
  const drafted = [];
  const changed = [];
  const event = { target: { value: 'foo' } };

  handleTimelineEnumChange(event, (v) => drafted.push(v), (v) => changed.push(v));
  handleTimelineBrowseTextChange(event, (v) => drafted.push(v), (v) => changed.push(v));
  handleTimelineBrowseTextBlur(event, (v) => changed.push(v));

  assert.deepEqual(drafted, ['foo', 'foo']);
  assert.deepEqual(changed, ['foo', 'foo', 'foo']);
});

test('handleTimelineBrowseInputChange resolves file path and forwards selected path', () => {
  const paths = [];
  const event = {
    target: {
      value: 'C:/fallback/value.mov',
      files: [{ name: 'value.mov', path: 'C:/media/value.mov' }]
    }
  };

  const ok = handleTimelineBrowseInputChange(event, (path) => {
    paths.push(path);
    return true;
  });

  assert.equal(ok, true);
  assert.deepEqual(paths, ['C:/media/value.mov']);
});

test('handleTimelineBrowseInputChange returns false when no file or callback', () => {
  assert.equal(
    handleTimelineBrowseInputChange({ target: { value: '', files: [] } }, () => true),
    false
  );
  assert.equal(
    handleTimelineBrowseInputChange({ target: { value: '', files: [] } }, null),
    false
  );
});

test('bool handler forwards checked value', () => {
  const values = [];
  handleTimelineBoolChange({ target: { checked: true } }, (v) => values.push(v));
  handleTimelineBoolChange({ target: { checked: false } }, (v) => values.push(v));
  assert.deepEqual(values, [true, false]);
});

test('text change handler commits only for non-numeric mode', () => {
  const drafted = [];
  const changed = [];

  handleTimelineTextChange(
    { target: { value: '12.5' } },
    true,
    (v) => drafted.push(v),
    (v) => changed.push(v)
  );
  handleTimelineTextChange(
    { target: { value: 'hello' } },
    false,
    (v) => drafted.push(v),
    (v) => changed.push(v)
  );

  assert.deepEqual(drafted, ['12.5', 'hello']);
  assert.deepEqual(changed, ['hello']);
});

test('text blur and keydown handlers commit as expected', () => {
  const committed = [];
  handleTimelineTextBlur(
    { target: { value: 'a' } },
    (v) => committed.push(`blur:${v}`)
  );

  let prevented = false;
  let blurred = false;
  const enterResult = handleTimelineTextKeyDown(
    {
      key: 'Enter',
      preventDefault: () => {
        prevented = true;
      },
      currentTarget: {
        value: 'b',
        blur: () => {
          blurred = true;
        }
      }
    },
    (v) => committed.push(`enter:${v}`)
  );

  const tabResult = handleTimelineTextKeyDown(
    {
      key: 'Tab',
      preventDefault: () => {
        throw new Error('should not run');
      },
      currentTarget: {
        value: 'c',
        blur: () => {
          throw new Error('should not run');
        }
      }
    },
    (v) => committed.push(`tab:${v}`)
  );

  assert.equal(enterResult, true);
  assert.equal(tabResult, false);
  assert.equal(prevented, true);
  assert.equal(blurred, true);
  assert.deepEqual(committed, ['blur:a', 'enter:b']);
});
