import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeExportDestinationOptions,
  normalizeExportDestinationValues,
  normalizeExportDestinationIds,
} from "../../app/utils/exportDestinationHelpers.js";

test("destination options are deduplicated, lowercased and labelled", () => {
  assert.deepEqual(normalizeExportDestinationOptions([
    { id: "NAS", name: "Serveur NAS" },
    { value: "nas", label: "Doublon" },
    { value: "ftp" },
    { value: "" },
  ]), [
    { value: "nas", label: "Serveur NAS" },
    { value: "ftp", label: "ftp" },
  ]);
});

test("selected values accept a single value or a list", () => {
  assert.deepEqual(normalizeExportDestinationValues("NAS"), ["nas"]);
  assert.deepEqual(normalizeExportDestinationValues(["NAS", "nas", " ftp ", ""]), ["nas", "ftp"]);
});

test("stored ids accept a list or a separated string", () => {
  assert.deepEqual(normalizeExportDestinationIds("NAS, ftp;\nnas"), ["nas", "ftp"]);
  assert.deepEqual(normalizeExportDestinationIds(["A", "a"]), ["a"]);
  assert.deepEqual(normalizeExportDestinationIds(42), []);
});
