import test from "node:test";
import assert from "node:assert/strict";

import { fitWithin, isOversizedThumb, shrinkImageDataUrl, THUMB_MAX_DATA_URL_LENGTH } from "../../app/utils/imageThumb.js";

test("a stored thumbnail larger than the limit is detected", () => {
  assert.equal(isOversizedThumb(`data:image/png;base64,${"A".repeat(THUMB_MAX_DATA_URL_LENGTH)}`), true);
  assert.equal(isOversizedThumb("data:image/png;base64,AAAA"), false);
  assert.equal(isOversizedThumb("D:/images/photo.png"), false);
  assert.equal(isOversizedThumb(null), false);
});

test("a thumbnail keeps its proportions within the maximum side", () => {
  assert.deepEqual(fitWithin(3840, 2160, 480), { width: 480, height: 270 });
  assert.deepEqual(fitWithin(1080, 1920, 480), { width: 270, height: 480 });
  assert.deepEqual(fitWithin(200, 100, 480), { width: 200, height: 100 });
});

test("outside a browser, the image is returned unchanged", async () => {
  const dataUrl = "data:image/png;base64,AAAA";
  assert.equal(await shrinkImageDataUrl(dataUrl), dataUrl);
  assert.equal(await shrinkImageDataUrl("not-an-image"), "not-an-image");
});
