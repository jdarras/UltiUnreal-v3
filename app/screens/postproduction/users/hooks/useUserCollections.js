import { useMemo } from "react";
import { USER_LIST_SORT_COLUMNS } from "../userSharedHelpers";
import { roleLabel, resolveUserDisplayName, resolveUserPhoneValue } from "../roleHelpers";

function useUserCollections({
  users = [],
  searchQuery = "",
  t,
  rolesByKey,
  listSortMode = "lastName",
  listSortDir = "asc",
}) {
  const orderedUsers = useMemo(() => {
    const list = Array.isArray(users) ? users : [];
    return [...list].sort((a, b) =>
      resolveUserDisplayName(a).localeCompare(resolveUserDisplayName(b))
    );
  }, [users]);

  const filteredUsers = useMemo(() => {
    const query = String(searchQuery || "").trim().toLowerCase();
    if (!query) return orderedUsers;
    return orderedUsers.filter((entry) => {
      const username = String(entry?.username || "").toLowerCase();
      const displayName = String(entry?.displayName || "").toLowerCase();
      const firstName = String(entry?.firstName || "").toLowerCase();
      const lastName = String(entry?.lastName || "").toLowerCase();
      const email = String(entry?.email || "").toLowerCase();
      const email2 = String(entry?.email2 || "").toLowerCase();
      const phone = String(entry?.phone || "").toLowerCase();
      const phone2 = String(entry?.phone2 || "").toLowerCase();
      const employmentType = String(entry?.employmentType || "").toLowerCase();
      const publicId = String(entry?.publicId || "").toLowerCase();
      const note = String(entry?.note || "").toLowerCase();
      const role = String(entry?.role || "").toLowerCase();
      const fullName = `${firstName} ${lastName}`.trim();
      return username.includes(query)
        || displayName.includes(query)
        || firstName.includes(query)
        || lastName.includes(query)
        || email.includes(query)
        || email2.includes(query)
        || phone.includes(query)
        || phone2.includes(query)
        || employmentType.includes(query)
        || publicId.includes(query)
        || note.includes(query)
        || role.includes(query)
        || fullName.includes(query);
    });
  }, [orderedUsers, searchQuery]);

  const groupedUsersByProfile = useMemo(() => {
    const buckets = new Map();
    for (const entry of filteredUsers) {
      const roleKey = String(entry?.role || "").trim();
      const profileLabel = roleKey
        ? roleLabel(t, roleKey, rolesByKey)
        : String(entry?.profile || "").trim();
      const normalizedProfile = String(profileLabel || "-").trim() || "-";
      const bucketKey = roleKey || normalizedProfile.toLowerCase();
      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, {
          key: bucketKey,
          label: normalizedProfile,
          items: [],
        });
      }
      buckets.get(bucketKey).items.push(entry);
    }
    return Array.from(buckets.values()).sort((a, b) => String(a?.label || "").localeCompare(String(b?.label || "")));
  }, [filteredUsers, rolesByKey, t]);

  const sortedUsersForList = useMemo(() => {
    const rows = [...filteredUsers];
    const sortMode = USER_LIST_SORT_COLUMNS.includes(String(listSortMode || "").trim())
      ? String(listSortMode || "").trim()
      : "username";
    const direction = String(listSortDir || "").toLowerCase() === "desc" ? -1 : 1;
    const compareText = (a, b) => String(a || "").localeCompare(String(b || ""), undefined, {
      numeric: true,
      sensitivity: "base",
    });
    rows.sort((a, b) => {
      let compare = 0;
      if (sortMode === "isActive") {
        const aActive = a?.isActive !== false ? 1 : 0;
        const bActive = b?.isActive !== false ? 1 : 0;
        compare = aActive - bActive;
      } else if (sortMode === "username") {
        compare = compareText(a?.username || resolveUserDisplayName(a), b?.username || resolveUserDisplayName(b));
      } else if (sortMode === "lastName") {
        compare = compareText(a?.lastName, b?.lastName);
      } else if (sortMode === "firstName") {
        compare = compareText(a?.firstName, b?.firstName);
      } else if (sortMode === "phone") {
        compare = compareText(resolveUserPhoneValue(a), resolveUserPhoneValue(b));
      } else if (sortMode === "email") {
        compare = compareText(a?.email, b?.email);
      }
      if (compare === 0) {
        compare = compareText(a?.username || resolveUserDisplayName(a), b?.username || resolveUserDisplayName(b));
      }
      return compare * direction;
    });
    return rows;
  }, [filteredUsers, listSortMode, listSortDir]);

  return {
    orderedUsers,
    filteredUsers,
    groupedUsersByProfile,
    sortedUsersForList,
  };
}

export { useUserCollections };
