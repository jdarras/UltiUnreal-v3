import test from "node:test";
import assert from "node:assert/strict";

import {
  extractMovieNameArg,
  buildExpectedOutputStems,
  resolveRenderOutputArtifact,
} from "../../app/utils/renderOutputArtifact.js";

const START = 1_800_000_000_000;
const isMedia = (p) => /\.(mov|mp4|exr|png)$/i.test(p);

function resolve({ direct = {}, scan = [], expectedStems = ["shot_r12"], dir = "D:/out" } = {}) {
  return resolveRenderOutputArtifact({
    directCandidates: Object.keys(direct),
    outputDirForSearch: dir,
    expectedStems,
    processStartMs: START,
    checkFileExists: async (p) => direct[p] || { exists: false },
    findRenderOutputs: async ({ minMtimeMs }) => ({
      files: scan.filter((entry) => entry.mtimeMs >= minMtimeMs),
    }),
    isLikelyRenderOutputMedia: isMedia,
  });
}

test("another job's media in the shared folder does not validate the render", async () => {
  const result = await resolve({
    direct: { "D:/out/shot_r12.mov": { exists: false } },
    scan: [{ path: "D:/out/another-job.mov", mtimeMs: START + 60_000 }],
  });

  assert.equal(result.path, "");
  assert.equal(result.mismatchPath, "D:/out/another-job.mov");
});

test("a media written before the process started is rejected", async () => {
  const result = await resolve({
    direct: { "D:/out/shot_r12.mov": { exists: true, mtimeMs: START - 3_600_000 } },
    scan: [{ path: "D:/out/shot_r12.mov", mtimeMs: START - 3_600_000 }],
  });

  assert.equal(result.path, "");
});

test("the expected file written after start is accepted", async () => {
  const result = await resolve({
    direct: { "D:/out/shot_r12.mov": { exists: true, mtimeMs: START + 5_000 } },
  });

  assert.equal(result.path, "D:/out/shot_r12.mov");
});

test("an image sequence with the expected name is found by scanning", async () => {
  const result = await resolve({
    scan: [
      { path: "D:/out/other.0001.exr", mtimeMs: START + 9_000 },
      { path: "D:/out/sub/Shot_R12.0001.exr", mtimeMs: START + 8_000 },
    ],
  });

  assert.equal(result.path, "D:/out/sub/Shot_R12.0001.exr");
});

test("a name that only shares a prefix is not accepted", async () => {
  const result = await resolve({
    scan: [{ path: "D:/out/shot_r12_v2.mov", mtimeMs: START + 9_000 }],
  });

  assert.equal(result.path, "");
});

test("a direct candidate without modification time is not trusted", async () => {
  const result = await resolve({
    direct: { "D:/out/shot_r12.mov": { exists: true } },
    dir: "",
  });

  assert.equal(result.path, "");
});

test("without any expected name, a fresh media is still accepted", async () => {
  const result = await resolve({
    expectedStems: [],
    scan: [{ path: "D:/out/render.mov", mtimeMs: START + 1_000 }],
  });

  assert.equal(result.path, "D:/out/render.mov");
});

test("MovieName argument is read, quoted or not, and ignored while tokenized", () => {
  assert.equal(extractMovieNameArg(["-game", "-MovieName=Shot_R12"]), "Shot_R12");
  assert.equal(extractMovieNameArg(['-MovieName="Shot R12"']), "Shot R12");
  assert.equal(extractMovieNameArg(["-MovieName={{expectedrendername}}"]), "");
});

test("expected stems combine MovieName, expected name and output path", () => {
  assert.deepEqual(
    buildExpectedOutputStems({
      args: ["-MovieName=Custom"],
      expectedName: "Shot_R12",
      outputPath: "D:/out/Shot_R12.mov",
    }),
    ["custom", "shot_r12"],
  );
});
