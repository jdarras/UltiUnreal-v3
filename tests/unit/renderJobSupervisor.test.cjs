const test = require('node:test');
const assert = require('node:assert/strict');

const {
  quoteWindowsArg,
  buildWindowsCommandLine,
  interpretJobState,
} = require('../../main/render-job-supervisor.cjs');

test('Windows arguments are quoted following CommandLineToArgvW rules', () => {
  assert.equal(quoteWindowsArg('simple'), 'simple');
  assert.equal(quoteWindowsArg(''), '""');
  assert.equal(quoteWindowsArg('a b'), '"a b"');
  assert.equal(quoteWindowsArg('say "hi"'), String.raw`"say \"hi\""`);
  assert.equal(quoteWindowsArg('C:\\dir with space\\'), '"C:\\dir with space\\\\"');
  assert.equal(quoteWindowsArg('C:\\no_space\\'), 'C:\\no_space\\');
});

test('the program path is quoted only when needed', () => {
  assert.equal(
    buildWindowsCommandLine(String.raw`C:\Program Files\UE\UnrealEditor-Cmd.exe`, ['-game', 'a b']),
    String.raw`"C:\Program Files\UE\UnrealEditor-Cmd.exe" -game "a b"`,
  );
});

test('job phases are derived from the supervisor state and presence', () => {
  assert.deepEqual(interpretJobState({ state: 'exited', rootExitCode: 0 }, {}), { phase: 'exited', rootExitCode: 0, stopped: false });
  assert.deepEqual(interpretJobState({ state: 'exited', rootExitCode: -1, stopped: true }, {}), { phase: 'exited', rootExitCode: null, stopped: true });
  assert.deepEqual(interpretJobState({ state: 'failed', error: 'x' }, {}), { phase: 'failed', error: 'x' });
  assert.deepEqual(interpretJobState({ state: 'running', rootPid: 9 }, { supervisorAlive: true }), { phase: 'running', rootPid: 9 });
  assert.deepEqual(interpretJobState(null, { supervisorAlive: true }), { phase: 'unknown' });
  assert.deepEqual(interpretJobState({ state: 'running' }, { supervisorAlive: false }), { phase: 'lost' });
  assert.deepEqual(interpretJobState({ state: 'running' }, { supervisorAlive: null }), { phase: 'unknown' });
});
