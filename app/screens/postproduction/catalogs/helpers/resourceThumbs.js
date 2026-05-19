import { normalizeThumbnailPath } from "../../../../utils/projects-helpers";

function pickThumbValue(val) {
  if (!val) return "";
  if (typeof val === "string" || typeof val === "number") return String(val).trim();
  if (typeof val !== "object") return "";
  return String(
    val.url ||
    val.src ||
    val.href ||
    val.imageUrl ||
    val.thumbnailUrl ||
    val.mediaUrl ||
    val.path ||
    val.uri ||
    ""
  ).trim();
}

function buildResourceThumbCandidates(item) {
  const source = item && typeof item === "object" ? item : {};
  const listingRaw = source?.listingRaw && typeof source.listingRaw === "object"
    ? source.listingRaw
    : {};
  const out = [];
  const seen = new Set();
  const push = (value, normalizeLocal = false) => {
    const raw = normalizeLocal ? normalizeThumbnailPath(value) : String(value || "").trim();
    const src = String(raw || "").trim();
    if (!src) return;
    const key = src.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(src);
  };

  const remoteThumbLists = [
    source?.thumbnails,
    source?.images,
    listingRaw?.thumbnails,
    listingRaw?.images,
    listingRaw?.medias,
  ];
  for (const list of remoteThumbLists) {
    const arr = Array.isArray(list) ? list : [];
    for (const val of arr) {
      push(pickThumbValue(val), true);
    }
  }

  const remoteSingles = [
    source?.thumbnailUrl,
    source?.thumbUrl,
    source?.thumbnail,
    source?.thumb,
    source?.imageUrl,
    listingRaw?.thumbnailUrl,
    listingRaw?.thumbUrl,
    listingRaw?.thumbnail,
    listingRaw?.thumb,
    listingRaw?.imageUrl,
  ];
  for (const val of remoteSingles) {
    push(val, true);
  }

  const localCandidates = [
    source?.thumbLocal,
    source?.thumbnailLocal,
    source?.thumbPath,
    source?.thumbnailPath,
    source?.localThumbPath,
    listingRaw?.thumbLocal,
    listingRaw?.thumbnailLocal,
  ];
  for (const val of localCandidates) {
    push(val, true);
  }

  return out;
}

export {
  buildResourceThumbCandidates,
};
