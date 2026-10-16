import test from "node:test";
import assert from "node:assert/strict";

import { createLatestRequestTracker } from "../../app/utils/latestRequestTracker.js";

function trackerWithSession(session) {
  const tracker = createLatestRequestTracker();
  tracker.setSession(session);
  return tracker;
}

test("only the latest request of a key is current", () => {
  const tracker = trackerWithSession("token");
  const first = tracker.begin("tasks", "token");
  const second = tracker.begin("tasks", "token");

  assert.equal(first(), false);
  assert.equal(second(), true);
});

test("keys are tracked independently", () => {
  const tracker = trackerWithSession("token");
  const tasks = tracker.begin("tasks", "token");
  tracker.begin("projects", "token");

  assert.equal(tasks(), true);
});

test("a session change invalidates requests started before it", () => {
  const tracker = trackerWithSession("token-user-1");
  const pending = tracker.begin("tasks", "token-user-1");
  tracker.setSession("");

  assert.equal(pending(), false);
});

test("setting the same session again keeps requests current", () => {
  const tracker = trackerWithSession("token");
  const pending = tracker.begin("tasks", "token");
  tracker.setSession("token");

  assert.equal(pending(), true);
});

test("an old callback started after logout with its old token is never current", () => {
  const tracker = trackerWithSession("");

  assert.equal(tracker.isSessionCurrent("token-user-1"), false);
  assert.equal(tracker.begin("tasks", "token-user-1")(), false);
});

test("an old callback started after a new login is not current either", () => {
  const tracker = trackerWithSession("token-user-2");

  assert.equal(tracker.begin("tasks", "token-user-1")(), false);
  assert.equal(tracker.isSessionCurrent("token-user-2"), true);
});
