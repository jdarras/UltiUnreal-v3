// Toute clé de traduction utilisée dans l'interface doit exister en français
// et en anglais : une clé absente affichait du français dans l'interface
// anglaise, voire la clé brute (« postprod.xxx ») dans les deux langues.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const fr = JSON.parse(fs.readFileSync("app/i18n/fr.json", "utf8"));
const en = JSON.parse(fs.readFileSync("app/i18n/en.json", "utf8"));

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(jsx?|mjs)$/.test(entry.name)) out.push(full);
  }
  return out;
}

// Appels littéraux : safeT(t, "clé", ...) et t("clé", ...).
function usedKeys() {
  const keys = new Map();
  const patterns = [
    /safeT\(\s*\w+\s*,\s*["']([a-zA-Z0-9_.-]+)["']/g,
    /\bt\(\s*["']([a-zA-Z0-9_-]+\.[a-zA-Z0-9_.-]+)["']/g,
  ];
  for (const file of walk("app")) {
    const source = fs.readFileSync(file, "utf8");
    for (const pattern of patterns) {
      for (const match of source.matchAll(pattern)) {
        if (!keys.has(match[1])) keys.set(match[1], file.split(path.sep).join("/"));
      }
    }
  }
  return keys;
}

test("every translation key used in the interface exists in French and English", () => {
  const missing = [...usedKeys()]
    .filter(([key]) => !(key in fr) || !(key in en))
    .map(([key, file]) => `${key} (${file})${key in fr ? "" : " [fr]"}${key in en ? "" : " [en]"}`);

  assert.deepEqual(missing, []);
});

test("French and English dictionaries define the same keys", () => {
  assert.deepEqual(Object.keys(fr).filter((key) => !(key in en)), []);
  assert.deepEqual(Object.keys(en).filter((key) => !(key in fr)), []);
});

test("placeholders are identical in both languages", () => {
  const placeholders = (text) => [...String(text).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
  const mismatched = Object.keys(fr).filter((key) => key in en && placeholders(fr[key]) !== placeholders(en[key]));

  assert.deepEqual(mismatched, []);
});
