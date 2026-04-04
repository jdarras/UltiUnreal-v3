import { stringifyNotificationPrefs } from "../userSharedHelpers";

function buildProfileUpdatePayload({
  displayName = "",
  firstName = "",
  lastName = "",
  email = "",
  phone = "",
  employmentType = "",
  note = "",
  avatarPath = "",
  appLang = "fr",
  notificationPrefs = null,
  password = "",
}) {
  const payload = {
    displayName,
    firstName,
    lastName,
    email,
    phone,
    employmentType,
    note,
    avatarPath,
    language: String(appLang || "fr").trim().toLowerCase() === "en" ? "en" : "fr",
    notificationPrefsJson: stringifyNotificationPrefs(notificationPrefs),
  };
  if (String(password || "").trim()) {
    payload.password = password;
  }
  return payload;
}

export { buildProfileUpdatePayload };
