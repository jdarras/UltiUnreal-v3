export function toSortTimestamp(value) {
  const ms = Date.parse(String(value || "").trim());
  return Number.isFinite(ms) ? ms : 0;
}

export default {
  toSortTimestamp,
};
