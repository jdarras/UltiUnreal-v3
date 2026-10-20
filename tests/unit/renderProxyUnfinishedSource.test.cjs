// Une vidéo encore en cours de finalisation est reconnue (nouvel essai de
// l'aperçu), une vraie erreur ne l'est pas.
const test = require('node:test');
const assert = require('node:assert/strict');

const { isUnfinishedMediaError } = require('../../main/server-postprod-routes-render-transitions.cjs');

test('an mp4 that is not finalised yet is recognised as unfinished', () => {
  const ffmpegError = '[in#0 @ 000002be72e782c0] moov atom not found\r\n'
    + 'Error opening input: Invalid data found when processing input';
  assert.equal(isUnfinishedMediaError(ffmpegError), true);
});

test('other failures are not retried', () => {
  assert.equal(isUnfinishedMediaError('unsupported_output_type'), false);
  assert.equal(isUnfinishedMediaError('ffmpeg_not_found'), false);
  assert.equal(isUnfinishedMediaError(''), false);
});
