// Parité des couleurs entre l'aperçu (interface) et la lecture (serveur) :
// une même valeur de keyframe doit donner la même couleur des deux côtés.
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

import { parseColorChannels, channelsToUnitColor } from "../../app/utils/colorutils.mjs";

const require = createRequire(import.meta.url);
const { parseColorChannels: parseServerColor } = require("../../main/server-timeline-runtime.cjs");

// Composition utilisée par app/utils/timeline.js.
const parsePreviewColor = (raw) => channelsToUnitColor(parseColorChannels(raw));

const CASES = [
  ["#ff8000|0.5", "format standard"],
  ["#FF8000|1", "majuscules"],
  ["#ff8000|0,25", "opacité avec virgule"],
  ["#ff800080", "#rrggbbaa"],
  ["#ff8000", "#rrggbb sans opacité"],
  ["ff8000", "sans #"],
  ["", "vide"],
  ["n'importe quoi", "invalide"],
  ["#zzzzzz|0.5", "hexadécimal invalide avec opacité"],
  ["#ff8000|abc", "opacité invalide"],
  ["#ff8000|7", "opacité hors bornes"],
  [null, "null"],
  [undefined, "undefined"],
  [42, "nombre"],
  [{ R: 1, G: 0.5, B: 0, A: 0.5 }, "objet unitaire"],
  [{ R: 255, G: 128, B: 0, A: 128 }, "objet en octets"],
  [{ R: 1, G: 0.5 }, "objet incomplet"],
  [{ _hex: "#336699", A: 0.75 }, "objet _hex"],
];

for (const [value, label] of CASES) {
  test(`preview and playback give the same color: ${label}`, () => {
    assert.deepEqual(parseServerColor(value), parsePreviewColor(value));
  });
}
