import { useEffect, useState } from "react";
import { safeT } from "../utils/i18nSafe";

const AUTH_GATE_OVERLAY_STYLE = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "16px",
  zIndex: 2000,
};

const AUTH_GATE_DIALOG_STYLE = {
  width: "min(460px, calc(100vw - 32px))",
  padding: "16px",
};

const AUTH_GATE_TITLE_STYLE = { marginBottom: "10px" };

export default function AuthGateScreen({
  t,
  busy = false,
  error = "",
  onLogin = null,
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!error) return;
    setPassword("");
  }, [error]);

  return (
    <div style={AUTH_GATE_OVERLAY_STYLE}>
      <section
        className="uu-card"
        role="dialog"
        aria-modal="true"
        aria-label={safeT(t, "app.auth.title", "Connexion utilisateur")}
        style={AUTH_GATE_DIALOG_STYLE}
      >
        <h2 className="uu-h3 uu-block-title" style={AUTH_GATE_TITLE_STYLE}>
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


