import { formatDate, safeT } from "../../../shared/helpers";

function ProjectOpsSummary({
  t,
  opState = {},
}) {
  const hasCounts = Number.isFinite(Number(opState?.templatesCount))
    || Number.isFinite(Number(opState?.tablesCount));
  const syncedAt = String(opState?.syncedAt || "").trim();
  const errorMessage = String(opState?.error || "").trim();

  return (
    <>
      {hasCounts ? (
        <div className="uu-muted mt-8">
          {safeT(t, "postprod.projects.action.summary", "Templates: {templates} - Tables: {tables}", {
            templates: Number.isFinite(Number(opState?.templatesCount)) ? String(opState.templatesCount) : "-",
            tables: Number.isFinite(Number(opState?.tablesCount)) ? String(opState.tablesCount) : "-",
          })}
        </div>
      ) : null}
      {syncedAt ? (
        <div className="uu-muted mt-8">
          {safeT(t, "postprod.projects.action.syncedAt", "Derniere synchro: {value}", {
            value: formatDate(syncedAt),
          })}
        </div>
      ) : null}
      {errorMessage ? (
        <div className="uu-msg warn mt-8">{errorMessage}</div>
      ) : null}
    </>
  );
}

export { ProjectOpsSummary };
