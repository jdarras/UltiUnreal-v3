import test from "node:test";
import assert from "node:assert/strict";

import { createLatestRequestTracker } from "../../app/utils/latestRequestTracker.js";

test("only the latest request of a key is current", () => {
  const tracker = createLatestRequestTracker();
  const first = tracker.begin("tasks");
  const second = tracker.begin("tasks");

  assert.equal(first(), false);
  assert.equal(second(), true);
});

test("keys are tracked independently", () => {
  const tracker = createLatestRequestTracker();
  const tasks = tracker.begin("tasks");
  tracker.begin("projects");

  assert.equal(tasks(), true);
});

test("a session change invalidates requests started before it", () => {
  const tracker = createLatestRequestTracker();
  tracker.setSession("token-user-1");
  const pending = tracker.begin("tasks");
  tracker.setSession("");

  assert.equal(pending(), false);
});

test("setting the same session again keeps requests current", () => {
  const tracker = createLatestRequestTracker();
  tracker.setSession("token");
  const pending = tracker.begin("tasks");
  tracker.setSession("token");

  assert.equal(pending(), true);
});
