import { safeT } from "../shared/helpers";

function UserToolbar({
  t,
  inEditor = false,
  usersLoading = false,
  canCreate = false,
  openCreate,
  searchQuery = "",
  setSearchQuery,
  viewMode = "list",
  setViewMode,
}) {
  if (inEditor) return null;

  return (
    <div className="uu-row uu-align-center uu-gap-8" style={{ flexWrap: "nowrap", alignItems: "center" }}>
      <button
        className="uu-btn"
        type="button"
        onClick={() => openCreate?.()}
        disabled={usersLoading || !canCreate}
      >
        {safeT(t, "postprod.users.add", "+ Ajouter un utilisateur")}
      </button>
      <div className="uu-row uu-gap-4 uu-align-center" style={{ flex: "0 0 auto" }}>
        <input
          className="uu-input"
          style={{ width: "320px", maxWidth: "360px", height: "36px", lineHeight: "36px" }}
          placeholder={safeT(t, "postprod.users.search.placeholder", "Rechercher un utilisateur")}
          value={searchQuery}
          onChange={(e) => setSearchQuery?.(e.target.value)}
        />
        <button
          type="button"
          className="uu-btn uu-btn-icon"
          onClick={() => setSearchQuery?.("")}
          disabled={!String(searchQuery || "").trim()}
          title={safeT(t, "postprod.users.search.clear", "Effacer la recherche")}
          style={{
            width: "36px",
            minWidth: "36px",
            height: "36px",
            padding: "0 6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ✕
        </button>
      </div>
      <div className="uu-row" style={{ marginLeft: "auto", gap: "6px" }}>
        <button
          type="button"
          className={`uu-btn ${viewMode === "thumbs" ? "prod-toggle-active" : ""}`}
          onClick={() => setViewMode?.("thumbs")}
        >
          {safeT(t, "postprod.users.view.thumbs", "Miniatures")}
        </button>
        <button
          type="button"
          className={`uu-btn ${viewMode === "list" ? "prod-toggle-active" : ""}`}
          onClick={() => setViewMode?.("list")}
        >
          {safeT(t, "postprod.users.view.list", "Liste")}
        </button>
      </div>
    </div>
  );
}

export { UserToolbar };
