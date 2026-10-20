import { activityActionTypeFromAction, activityTypeChipLevel } from "../../../users/shared/activityHelpers";

function entryLevel(entry) {
  const chipLevel = activityTypeChipLevel(activityActionTypeFromAction(entry?.action, entry));
  if (chipLevel === "lvl-success") return "success";
  if (chipLevel === "lvl-warn") return "warn";
  if (chipLevel === "lvl-error") return "error";
  if (chipLevel === "lvl-debug") return "debug";
  return "info";
}

export { entryLevel };
