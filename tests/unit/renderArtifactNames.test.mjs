import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

import * as ui from "../../app/utils/renderArtifactNames.js";

const require = createRequire(import.meta.url);
const server = require("../../main/render-artifact-names.cjs");

test("artifact names keep the full source name; frame numbering is removed only for image sequences", () => {
  assert.equal(server.proxyFileName("D:/out/Shot_12.mov"), "Shot_12.mov.proxy.mp4");
  assert.equal(server.proxyAlphaFileName("D:/out/Shot_12.mov"), "Shot_12.mov.proxy_alpha.mp4");
  assert.equal(server.thumbnailFileName("D:\\out\\Shot_12.mov"), "Shot_12.mov.thumbnail.jpg");
  assert.equal(server.renderArtifactBaseName("D:/out/shot.%04d.exr"), "shot.exr");
  assert.equal(server.renderArtifactBaseName("D:/out/shot.####.exr"), "shot.exr");
  assert.equal(server.renderArtifactBaseName("D:/out/shot.{frame_number}.exr"), "shot.exr");
  assert.equal(server.renderArtifactBaseName("D:/out/shot.0001.exr"), "shot.exr");
  assert.equal(server.renderArtifactBaseName("D:/out/Shot.12.mov"), "Shot.12.mov");
  assert.equal(server.renderArtifactBaseName(""), "render");
});

// V2 : collisions relevées par Codex (chemins finaux complets).
test("distinct sources never share a proxy, alpha proxy or thumbnail path", () => {
  const pairs = [
    ["D:/out/Shot.12.mov", "D:/out/Shot.13.mov"],
    ["D:/out/Shot.mov", "D:/out/Shot.mp4"],
    ["D:/out/Shot_12.mov", "D:/out/Shot_13.mov"],
    ["D:/out/Shot.0001.exr", "D:/out/Shot.0001.png"],
    ["D:/out/A.mov", "D:/out/B.mov"],
  ];
  for (const [a, b] of pairs) {
    for (const fn of ["proxyFileName", "proxyAlphaFileName", "thumbnailFileName"]) {
      assert.notEqual(server[fn](a), server[fn](b), `${fn}: ${a} / ${b}`);
    }
  }
});

test("all frames of one image sequence share the sequence proxy", () => {
  assert.equal(server.proxyFileName("D:/out/shot.0001.exr"), server.proxyFileName("D:/out/shot.0042.exr"));
  assert.equal(server.proxyFileName("D:/out/shot.0001.exr"), server.proxyFileName("D:/out/shot.%04d.exr"));
});

test("two renders in the same folder get distinct proxies", () => {
  assert.notEqual(server.proxyFileName("D:/out/A.mov"), server.proxyFileName("D:/out/B.mov"));
  // Le numéro de rendu dans le nom n'est pas pris pour un numéro d'image.
  assert.notEqual(server.proxyFileName("D:/out/Shot_12.mov"), server.proxyFileName("D:/out/Shot_13.mov"));
  assert.notEqual(server.proxyFileName("D:/out/Shot-12.mov"), server.proxyFileName("D:/out/Shot-13.mov"));
});

test("new and legacy artifact names are recognised, real renders are not", () => {
  for (const name of ["proxy.mp4", "PROXY_ALPHA.mp4", "thumbnail.jpg", "Shot.proxy.mp4", "Shot.proxy_alpha.mp4", "Shot.thumbnail.jpg"]) {
    assert.equal(server.isRenderArtifactFileName(name), true, name);
  }
  for (const name of ["Shot.mov", "proxy_shot.mp4", "thumbnail.png", "Shot.0001.exr", ""]) {
    assert.equal(server.isRenderArtifactFileName(name), false, name);
  }
});

test("interface and server name artifacts identically", () => {
  const sources = ["D:/out/Shot_12.mov", "D:/out/shot.%04d.exr", "a/b/c.v2.mp4", "", "x.####.png", "weird:name?.mov"];
  for (const source of sources) {
    for (const fn of ["renderArtifactBaseName", "proxyFileName", "proxyAlphaFileName", "thumbnailFileName"]) {
      assert.equal(ui[fn](source), server[fn](source), `${fn}(${source})`);
    }
  }
  for (const name of ["proxy.mp4", "Shot.proxy.mp4", "Shot.thumbnail.jpg", "Shot.mov", "thumbnail.png"]) {
    assert.equal(ui.isRenderArtifactFileName(name), server.isRenderArtifactFileName(name), name);
  }
});
