import test from "node:test";
import assert from "node:assert/strict";

import { disambiguateAssigneeLabels } from "../../app/screens/postproduction/renderEditor/hooks/card/assigneeLabels.js";

test("two accounts with the same name are told apart by their login", () => {
  const labels = disambiguateAssigneeLabels([
    { id: 1, label: "Julien Darras", username: "maintenance" },
    { id: 2, label: "Julien Darras", username: "jdarras" },
    { id: 5, label: "Viktor Darras", username: "vdarras" },
  ]).map((option) => option.label);
  assert.deepEqual(labels, ["Julien Darras (maintenance)", "Julien Darras (jdarras)", "Viktor Darras"]);
});

test("without a distinct login, the account number is used; case is ignored", () => {
  const labels = disambiguateAssigneeLabels([
    { id: 3, label: "yani", username: "yani" },
    { id: 4, label: "Yani", username: "" },
  ]).map((option) => option.label);
  assert.deepEqual(labels, ["yani (#3)", "Yani (#4)"]);
});
