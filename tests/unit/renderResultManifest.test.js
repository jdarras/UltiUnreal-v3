import test from "node:test";
import assert from "node:assert/strict";

import {
  chooseRenderOutputFromFiles,
  evaluateRenderResultManifest,
  sequencePatternOf,
} from "../../app/utils/renderResultManifest.js";

const present = (manifest) => ({ state: "present", manifest });

test("an Unreal-reported failure fails the render, whatever files exist", () => {
  const result = evaluateRenderResultManifest(present({ schema: 1, jobId: "42.1000", success: false, files: ["E:/R/42/a.mp4"] }), { expectedJobId: "42.1000" });
  assert.deepEqual(result, { decision: "failure", error: "unreal_reported_failure" });
});

test("a successful render uses the exact video listed by Unreal, not its audio track", () => {
  const result = evaluateRenderResultManifest(
    present({ schema: 1, jobId: "42.1000", success: true, files: ["E:\\R\\42\\audio.wav", "E:\\R\\42\\shot.mp4"] }),
    { expectedJobId: "42.1000" },
  );
  assert.equal(result.decision, "success");
  assert.equal(result.outputPath, "E:\\R\\42\\shot.mp4");
  assert.equal(chooseRenderOutputFromFiles(["E:/R/42/audio.wav"]), "E:/R/42/audio.wav");
});

test("an image sequence is designated by its pattern", () => {
  const files = ["E:/R/42/Shot.0001.exr", "E:/R/42/Shot.0002.exr", "E:/R/42/Shot.0003.exr"];
  assert.equal(sequencePatternOf(files), "E:/R/42/Shot.####.exr");
  assert.equal(chooseRenderOutputFromFiles(files), "E:/R/42/Shot.####.exr");
  assert.equal(sequencePatternOf(["E:/R/a.0001.exr", "E:/R/b.0001.exr"]), "");
});

test("without a usable manifest, the current search method is kept", () => {
  const cases = [
    [{ state: "absent" }, "manifest_absent"],
    [{ state: "invalid" }, "manifest_invalid"],
    [present({ schema: 2, jobId: "42.1000", success: true, files: ["a.mp4"] }), "manifest_schema"],
    [present({ schema: 1, jobId: "42.999", success: true, files: ["a.mp4"] }), "manifest_other_job"],
    [present({ schema: 1, jobId: "42.1000", success: true, files: [] }), "manifest_no_files"],
    [null, "manifest_absent"],
  ];
  for (const [status, reason] of cases) {
    assert.deepEqual(evaluateRenderResultManifest(status, { expectedJobId: "42.1000" }), { decision: "unknown", reason });
  }
});
