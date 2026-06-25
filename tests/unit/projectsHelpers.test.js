import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeThumbnailPath } from '../../app/utils/projects-helpers.js';

test('normalizeThumbnailPath serves Windows local thumbnails through uu-media', () => {
  assert.equal(
    normalizeThumbnailPath('D:\\OneDrive - VladaJu\\Unreal_Project\\AbandonedFactory 4.27\\Saved\\AutoScreenshot.png'),
    'uu-media:///D:/OneDrive%20-%20VladaJu/Unreal_Project/AbandonedFactory%204.27/Saved/AutoScreenshot.png'
  );
});

test('normalizeThumbnailPath converts local file URLs to uu-media without double encoding', () => {
  assert.equal(
    normalizeThumbnailPath('file:///D:/OneDrive%20-%20VladaJu/Project%20A/Saved/AutoScreenshot.png'),
    'uu-media:///D:/OneDrive%20-%20VladaJu/Project%20A/Saved/AutoScreenshot.png'
  );
});

test('normalizeThumbnailPath keeps data, remote, and UNC URLs unchanged where needed', () => {
  assert.equal(
    normalizeThumbnailPath('data:image/png;base64,abc'),
    'data:image/png;base64,abc'
  );
  assert.equal(
    normalizeThumbnailPath('https://example.com/thumb.png'),
    'https://example.com/thumb.png'
  );
  assert.equal(
    normalizeThumbnailPath('\\\\server\\share\\thumb.png'),
    'file://server/share/thumb.png'
  );
});
