import { stringifyNotificationPrefs } from "../userSharedHelpers";

function buildProfileUpdatePayload({
  displayName = "",
  firstName = "",
  lastName = "",
  email = "",
  phone = "",
  note = "",
  avatarPath = "",
  notificationPrefs = null,
  password = "",
}) {
  const payload = {
    displayName,
    firstName,
    lastName,
    email,
    phone,
    note,
    avatarPath,
    notificationPrefsJson: stringifyNotificationPrefs(notificationPrefs),
  };
  if (String(password || "").trim()) {
    payload.password = password;
  }
  return payload;
}

export { buildProfileUpdatePayload };
