import { safeT } from "../../../shared/helpers";

const HUB_HEALTH_AUDIT_ACTION = "render_health_event";

function hubEventStateLabel(t, value) {
  const key = String(value || "").trim().toLowerCase();
  if (key === "online") return safeT(t, "postprod.renders.health.events.state.online", "En ligne");
  if (key === "warn") return safeT(t, "postprod.renders.health.events.state.warn", "Degrade");
  if (key === "offline") return safeT(t, "postprod.renders.health.events.state.offline", "Hors ligne");
  if (key === "loading") return safeT(t, "postprod.renders.health.events.state.loading", "Initialisation");
  return key || "-";
}

function hubEventKindLabel(t, value) {
  const key = String(value || "").trim().toLowerCase();
  if (!key || key === "online" || key === "offline" || key === "loading" || key === "general") return "";
  if (key === "security") return safeT(t, "postprod.renders.health.events.kind.security", "Securite");
  if (key === "worker") return safeT(t, "postprod.renders.health.events.kind.worker", "Station de rendu");
  if (key === "mixed") return safeT(t, "postprod.renders.health.events.kind.mixed", "Mixte");
  return key;
}

function formatRetentionDurationMs(value) {
  const raw = Number(value);
  if (!Number.isFinite(raw) || raw <= 0) return "-";
  const ms = Math.max(1000, Math.trunc(raw));
  const sec = Math.trunc(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.trunc(sec / 60);
  if (min < 60) return `${min} min`;
  const hours = Math.trunc(min / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.trunc(hours / 24);
  return `${days} j`;
}

export { HUB_HEALTH_AUDIT_ACTION, hubEventKindLabel, hubEventStateLabel, formatRetentionDurationMs };
