import { useState } from "react";
import api from "../api";
import "./Login.css";

export default function Login() {
  // ── Mode : "login" ou "register" ──────────────────────
  const [mode, setMode] = useState("login");

  // ── Champs communs ─────────────────────────────────────
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(""); // message succès inscription

  // ── Bascule entre login et register ───────────────────
  const switchMode = (newMode) => {
    setMode(newMode);
    setError("");
    setSuccess("");
    setEmail("");
    setPassword("");
  };

  // ── Connexion ──────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", res.data.access_token);

      const me = await api.get("/auth/me");

      if (me.data.role === "ADMIN") {
        window.location.href = "/admin/users";
      } else {
        window.location.href = "/client";
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Identifiants incorrects. Réessayez."
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Inscription ────────────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/register", { email, password });

      // Sauvegarde le client_secret retourné UNE SEULE FOIS
      if (res.data.client_secret) {
        localStorage.setItem("client_secret", res.data.client_secret);
      }

      setSuccess("Compte créé avec succès ! Vous pouvez maintenant vous connecter.");
      setEmail("");
      setPassword("");

      // Bascule vers le login après 2 secondes
      setTimeout(() => switchMode("login"), 2000);
    } catch (err) {
      // Gestion des erreurs de validation Laravel
      const data = err.response?.data;
      if (data?.errors) {
        const firstError = Object.values(data.errors)[0]?.[0];
        setError(firstError || "Erreur lors de l'inscription.");
      } else {
        setError(data?.message || "Erreur lors de l'inscription.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">

        {/* ── En-tête ── */}
        <div className="login-card-header">
          <h1 className="login-title">
            {mode === "login" ? "Connexion" : "Créer un compte"}
          </h1>
          <p className="login-subtitle">
            {mode === "login"
              ? "Accédez à votre espace Moustass"
              : "Rejoignez Moustass en tant que client"}
          </p>
        </div>

        {/* ── Onglets login / register ── */}
        <div className="login-tabs">
          <button
            type="button"
            className={`login-tab ${mode === "login" ? "login-tab--active" : ""}`}
            onClick={() => switchMode("login")}
          >
            Se connecter
          </button>
          <button
            type="button"
            className={`login-tab ${mode === "register" ? "login-tab--active" : ""}`}
            onClick={() => switchMode("register")}
          >
            S'inscrire
          </button>
        </div>

        {/* ── Formulaire ── */}
        <form
          onSubmit={mode === "login" ? handleLogin : handleRegister}
          className="login-form"
        >
          {/* Bannière erreur */}
          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}

          {/* Bannière succès */}
          {success && (
            <div className="login-success" role="status">
              {success}
            </div>
          )}

          {/* Champ email */}
          <div className="login-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="vous@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          {/* Champ mot de passe */}
          <div className="login-field">
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
            />
            {/* Indication des règles en mode inscription */}
            {mode === "register" && (
              <span className="login-hint">
                12 caractères min. avec majuscule, minuscule, chiffre et caractère spécial
              </span>
            )}
          </div>

          <button type="submit" className="login-submit" disabled={loading}>
            {loading
              ? mode === "login" ? "Connexion…" : "Création…"
              : mode === "login" ? "Se connecter" : "Créer mon compte"}
          </button>
        </form>

        {/* ── Lien de bascule en bas ── */}
        <p className="login-switch">
          {mode === "login" ? (
            <>
              Pas encore de compte ?{" "}
              <button
                type="button"
                className="login-switch-btn"
                onClick={() => switchMode("register")}
              >
                S'inscrire
              </button>
            </>
          ) : (
            <>
              Déjà un compte ?{" "}
              <button
                type="button"
                className="login-switch-btn"
                onClick={() => switchMode("login")}
              >
                Se connecter
              </button>
            </>
          )}
        </p>

      </div>
    </div>
  );
}