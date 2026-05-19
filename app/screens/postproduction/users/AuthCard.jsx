import { useEffect, useState } from "react";
import { safeT } from "../shared/helpers";

const AUTH_CARD_SUBTITLE_STYLE = { marginTop: "8px", marginBottom: "14px" };

export function AuthCard({ t, busy = false, error = "", onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!error) return;
    setPassword("");
  }, [error]);

  return (
    <section className="uu-section">
      <h2 className="uu-h3 uu-block-title">
        {safeT(t, "postprod.auth.title", "Connexion Post-production")}
      </h2>
      <p className="uu-muted" style={AUTH_CARD_SUBTITLE_STYLE}>
        {safeT(t, "postprod.auth.subtitle", "Connecte-toi pour acceder aux onglets post-production.")}
      </p>

      <div className="uu-grid-field uu-maxw-420">
        <label className="uu-label">{safeT(t, "postprod.auth.username", "Identifiant, email ou nom affiche")}</label>
        <input
          className="uu-input"
          type="text"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={busy}
        />
      </div>

      <div className="uu-grid-field uu-maxw-420 mt-12">
        <label className="uu-label">{safeT(t, "postprod.auth.password", "Mot de passe")}</label>
        <input
          className="uu-input"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={busy}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !busy) onLogin?.({ username, password });
          }}
        />
      </div>

      <div className="mt-12">
        <button
          className="uu-btn"
          type="button"
          disabled={busy}
          onClick={() => onLogin?.({ username, password })}
        >
          {busy
            ? safeT(t, "common.loading", "Chargement…")
            : safeT(t, "postprod.auth.login", "Se connecter")}
        </button>
      </div>

      {error ? (
        <div className="uu-msg error mt-12">{error}</div>
      ) : null}
    </section>
  );
}


