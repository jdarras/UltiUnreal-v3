import { pickString } from "./resources-helpers";

function isFabListingUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return false;
  try {
    const parsed = new URL(raw);
    return /\.fab\.com$/i.test(parsed.hostname) || parsed.hostname.toLowerCase().endsWith("fab.com");
  } catch {
    return raw.toLowerCase().includes("fab.com");
  }
}

function buildLauncherLibraryLink() {
  return "com.epicgames.launcher://ue/library";
}

function buildFabLauncherUrl(item) {
  const uid = String(item?.uid || "").trim();
  if (uid) return `https://www.fab.com/plugins/egl/listings/${uid}`;

  const rawUrl = String(item?.listingUrl || "").trim();
  if (!rawUrl) return "";

  try {
    const parsed = new URL(rawUrl);
    const host = String(parsed.hostname || "").toLowerCase();
    if (!host.endsWith("fab.com")) return rawUrl;

    const segments = String(parsed.pathname || "")
      .split("/")
      .filter(Boolean);
    const idx = segments.indexOf("listings");
    const listingId = idx >= 0 ? segments[idx + 1] : segments[segments.length - 1];
    if (!listingId) return rawUrl;
    return `https://www.fab.com/plugins/egl/listings/${listingId}`;
  } catch {
    return rawUrl;
  }
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
}

function pickBestListingSlug(item) {
  const candidates = [
    item?.entitlementUid,
    item?.entitlementId,
    item?.listingRaw?.slug,
    item?.listingRaw?.urlSlug,
    item?.listingRaw?.slugName,
    item?.listingRaw?.id,
    item?.listingRaw?.uid,
    item?.listingRaw?.catalogItemId,
    item?.listingSlug,
    item?.slug,
    item?.uid,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  return candidates[0] || "";
}

function buildLauncherMarketplaceLink(slug, useProductContent = false) {
  if (!slug) return "";
  const path = useProductContent ? "productcontent" : "product";
  return `com.epicgames.launcher://ue/marketplace/${path}/${encodeURIComponent(slug)}`;
}

function toProductContentId(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^[0-9a-f]{32}$/i.test(raw)) return raw;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) {
    return raw.replace(/-/g, "");
  }
  return "";
}

function buildFromAnyId(value) {
  const pc = toProductContentId(value);
  if (pc) return buildLauncherMarketplaceLink(pc, true);
  return buildLauncherMarketplaceLink(String(value || "").trim(), false);
}

function buildLauncherDeepLink(item) {
  const rawUrl = String(item?.listingUrl || "").trim();
  const title = String(item?.title || "").trim();
  if (!rawUrl && !title) return "";

  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl);
      const host = String(parsed.host || "").toLowerCase();
      const segments = String(parsed.pathname || "")
        .split("/")
        .filter(Boolean);
      const last = segments.pop() || "";
      const secondLast = segments.pop() || "";
      const slugFromUrl =
        parsed.searchParams.get("id") ||
        parsed.searchParams.get("offerId") ||
        parsed.searchParams.get("slug") ||
        last ||
        secondLast;

      if (host.includes("fab.com")) {
        const directSlug = pickString(
          item?.listingRaw?.marketplaceSlug,
          item?.listingRaw?.ueMarketplaceSlug,
          item?.listingRaw?.unrealMarketplaceSlug,
          item?.listingRaw?.urlSlug,
          item?.listingRaw?.slug,
          item?.listingSlug,
          item?.slug
        );
        if (directSlug) return buildLauncherMarketplaceLink(directSlug);
        return "";
      }

      if (
        (host.includes("unrealengine.com") || host.includes("epicgames.com")) &&
        slugFromUrl
      ) {
        return buildLauncherMarketplaceLink(slugFromUrl);
      }
    } catch {
      // ignore parsing issues and continue with fallback logic
    }
  }

  const candidate = pickBestListingSlug(item);
  if (candidate) return buildFromAnyId(candidate);

  const fallbackSlug = slugify(title);
  return buildLauncherMarketplaceLink(fallbackSlug);
}

export {
  isFabListingUrl,
  buildLauncherLibraryLink,
  buildFabLauncherUrl,
  buildLauncherDeepLink,
};

