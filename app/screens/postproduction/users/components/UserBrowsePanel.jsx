import { UserListTable } from "../UserListTable";
import { UserThumbGroups } from "../UserThumbGroups";

function UserBrowsePanel({
  t,
  viewMode = "list",
  sortedUsersForList = [],
  handleListSort = null,
  listSortArrowFor = null,
  groupedUsersByProfile = [],
  openEdit = null,
  usersLoading = false,
  manageableSet = new Set(),
}) {
  return (
    <div className="mt-12">
      {viewMode === "list" ? (
        <UserListTable
          t={t}
          sortedUsersForList={sortedUsersForList}
          handleListSort={handleListSort}
          listSortArrowFor={listSortArrowFor}
          openEdit={openEdit}
          usersLoading={usersLoading}
          manageableSet={manageableSet}
        />
      ) : (
        <UserThumbGroups
          t={t}
          groupedUsersByProfile={groupedUsersByProfile}
          openEdit={openEdit}
          usersLoading={usersLoading}
          manageableSet={manageableSet}
        />
      )}
    </div>
  );
}

export { UserBrowsePanel };
