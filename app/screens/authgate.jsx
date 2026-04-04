import { useEffect, useState } from "react";

function safeT(t, key, fallback, params) {
  if (typeof t !== "function") return fallback;
  const value = t(key, params);
  if (!value || value === key) return fallback;
  return value;
}

export default function AuthGateScreen({
  t,
  busy = false,
  error = "",
  onLogin = null,
}) {
  const [username, setUsername] = useState("maintenance");
  const [password, setPassword] = useState("admin");

  useEffect(() => {
    if (!error) return;
    setPassword("");
  }, [error]);

  return (
    <div className="uu-page uu-page-compact">
      <section className="uu-section uu-maxw-420" style={{ margin: "24px auto" }}>
        <h2 className="uu-h3">
          {safeT(t, "app.auth.title", "Connexion utilisateur")}
        </h2>

        <div className="uu-grid-field">
          <label className="uu-label">{safeT(t, "app.auth.username", "Identifiant")}</label>
          <input
            className="uu-input"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={busy}
          />
        </div>

        <div className="uu-grid-field mt-12">
          <label className="uu-label">{safeT(t, "app.auth.password", "Mot de passe")}</label>
          <input
            className="uu-input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !busy) {
                onLogin?.({ username, password });
              }
            }}
          />
        </div>

        <div className="mt-12">
          <button
            type="button"
            className="uu-btn"
            disabled={busy}
            onClick={() => onLogin?.({ username, password })}
          >
            {busy
              ? safeT(t, "common.loading", "Chargement…")
              : safeT(t, "app.auth.login", "Se connecter")}
          </button>
        </div>

        {error ? <div className="uu-msg error mt-12">{error}</div> : null}
      </section>
    </div>
  );
}
