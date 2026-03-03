import { useEffect, useState, useCallback } from "react";
import api from "../api";
import "./AdminBackup.css";

// ════════════════════════════════════════════════════════════
//  FONCTIONS UTILITAIRES
// ════════════════════════════════════════════════════════════

// Formate une date ISO en format lisible français
function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ════════════════════════════════════════════════════════════
//  COMPOSANT PRINCIPAL : ADMIN BACKUP
// ════════════════════════════════════════════════════════════

export default function AdminBackup() {
  // ── États ──────────────────────────────────────────────
  const [history, setHistory] = useState([]);          // historique des backups
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [banner, setBanner] = useState({ type: "", text: "" }); // succès/erreur
  const [actionLoading, setActionLoading] = useState(""); // action en cours

  // ── Chargement de l'historique des backups ─────────────
  const loadHistory = useCallback(() => {
    setLoadingHistory(true);
    api
      .get("/admin/backups/history")
      .then((r) => setHistory(r.data || []))
      .catch(() => setHistory([]))
      .finally(() => setLoadingHistory(false));
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // ── Affiche un banner temporaire (disparaît après 5s) ──
  const showBanner = (type, text) => {
    setBanner({ type, text });
    setTimeout(() => setBanner({ type: "", text: "" }), 5000);
  };

  // ── Sauvegarde complète ────────────────────────────────
  const handleFull = async () => {
    if (!window.confirm("Lancer une sauvegarde complète de la base de données ?")) return;
    setActionLoading("full");
    setBanner({ type: "loading", text: "Sauvegarde complète en cours…" });
    try {
      const res = await api.post("/admin/backups/full");
      showBanner("success", `✓ Sauvegarde complète réussie — ${res.data.file}`);
      loadHistory();
    } catch (err) {
      showBanner("error", `✗ ${err.response?.data?.message || "Erreur lors de la sauvegarde complète."}`);
    } finally {
      setActionLoading("");
    }
  };

  // ── Sauvegarde incrémentale ────────────────────────────
  const handleIncremental = async () => {
    setActionLoading("incremental");
    setBanner({ type: "loading", text: "Sauvegarde incrémentale en cours…" });
    try {
      const res = await api.post("/admin/backups/incremental");
      showBanner("success", `✓ Incrémental réussi — ${res.data.file} (depuis ${res.data.since})`);
      loadHistory();
    } catch (err) {
      showBanner("error", `✗ ${err.response?.data?.message || "Erreur lors de la sauvegarde incrémentale."}`);
    } finally {
      setActionLoading("");
    }
  };

  // ── Restauration ───────────────────────────────────────
  const handleRestore = async () => {
    if (!window.confirm(
      "⚠️ Attention ! La restauration va écraser les données actuelles avec le dernier backup.\n\nContinuer ?"
    )) return;

    setActionLoading("restore");
    setBanner({ type: "loading", text: "Restauration en cours…" });
    try {
      const res = await api.post("/admin/backups/restore");
      showBanner(
        "success",
        `✓ Restauration réussie depuis ${res.data.restored_from} (${res.data.type}) du ${formatDate(res.data.backup_date)}`
      );
      loadHistory();
    } catch (err) {
      showBanner("error", `✗ ${err.response?.data?.message || "Erreur lors de la restauration."}`);
    } finally {
      setActionLoading("");
    }
  };

  // ── Calcul des statistiques ────────────────────────────
  const totalBackups = history.length;
  const successCount = history.filter((b) => b.status === "success").length;
  const lastBackup   = history.find((b) => b.status === "success");

  // ════════════════════════════════════════════════════════
  //  RENDU
  // ════════════════════════════════════════════════════════
  return (
    <div className="ab">

      {/* ── EN-TÊTE ── */}
      <div className="ab__header">
        <div>
          <h1 className="ab__title">Sauvegarde & Restauration</h1>
          <p className="ab__subtitle">Gestion des backups de la base de données Moustass</p>
        </div>
        <button
          className="ab__back"
          onClick={() => (window.location.href = "/admin/users")}
        >
          ← Retour utilisateurs
        </button>
      </div>

      <div className="ab__grid">

        {/* ── COLONNE GAUCHE : ACTIONS ── */}
        <div className="ab__card">
          <p className="ab__card-title">Actions</p>

          {/* Bannière succès / erreur / chargement */}
          {banner.text && (
            <div className={`ab__banner ab__banner--${banner.type}`}>
              {banner.type === "loading" && <span className="ab__spinner" />}
              {banner.text}
            </div>
          )}

          <div className="ab__actions">
            {/* Sauvegarde complète */}
            <button
              className="ab__action-btn ab__action-btn--full"
              onClick={handleFull}
              disabled={!!actionLoading}
            >
              <span className="ab__action-icon">🗄️</span>
              <div className="ab__action-text">
                <strong>Sauvegarde complète</strong>
                <span>mysqldump — toutes les tables</span>
              </div>
              {actionLoading === "full" && <span className="ab__spinner" style={{ marginLeft: "auto" }} />}
            </button>

            {/* Sauvegarde incrémentale */}
            <button
              className="ab__action-btn ab__action-btn--incremental"
              onClick={handleIncremental}
              disabled={!!actionLoading}
            >
              <span className="ab__action-icon">📦</span>
              <div className="ab__action-text">
                <strong>Sauvegarde incrémentale</strong>
                <span>Changements depuis le dernier backup</span>
              </div>
              {actionLoading === "incremental" && <span className="ab__spinner" style={{ marginLeft: "auto" }} />}
            </button>

            {/* Restauration */}
            <button
              className="ab__action-btn ab__action-btn--restore"
              onClick={handleRestore}
              disabled={!!actionLoading || totalBackups === 0}
            >
              <span className="ab__action-icon">♻️</span>
              <div className="ab__action-text">
                <strong>Restaurer</strong>
                <span>
                  {lastBackup
                    ? `Depuis : ${lastBackup.file} (${lastBackup.type})`
                    : "Aucun backup disponible"}
                </span>
              </div>
              {actionLoading === "restore" && <span className="ab__spinner" style={{ marginLeft: "auto" }} />}
            </button>
          </div>
        </div>

        {/* ── COLONNE DROITE : STATISTIQUES ── */}
        <div className="ab__card">
          <p className="ab__card-title">Statistiques</p>
          <div className="ab__stats">
            <div className="ab__stat">
              <div className="ab__stat-value">{totalBackups}</div>
              <div className="ab__stat-label">Total</div>
            </div>
            <div className="ab__stat">
              <div className="ab__stat-value">{successCount}</div>
              <div className="ab__stat-label">Réussis</div>
            </div>
            <div className="ab__stat">
              <div className="ab__stat-value">{totalBackups - successCount}</div>
              <div className="ab__stat-label">Échoués</div>
            </div>
          </div>

          {/* Dernier backup réussi */}
          {lastBackup && (
            <div style={{
              marginTop: "1rem",
              padding: "0.85rem",
              background: "var(--green-soft)",
              border: "1px solid var(--green-border)",
              borderRadius: "var(--radius-sm)",
            }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--green)", marginBottom: "0.3rem" }}>
                DERNIER BACKUP RÉUSSI
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontFamily: "'IBM Plex Mono', monospace" }}>
                {lastBackup.file}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                {formatDate(lastBackup.created_at)}
              </div>
            </div>
          )}
        </div>

        {/* ── HISTORIQUE COMPLET ── */}
        <div className="ab__card ab__grid--full">
          <p className="ab__card-title">
            Historique des sauvegardes
            <button
              onClick={loadHistory}
              style={{
                marginLeft: "0.75rem",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted)",
                fontSize: "0.85rem",
              }}
              title="Actualiser"
            >
              ↻
            </button>
          </p>

          <div className="ab__table-wrap">
            <table className="ab__table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Type</th>
                  <th>Statut</th>
                  <th>Fichier</th>
                  <th>Notes</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {loadingHistory ? (
                  <tr>
                    <td colSpan={6} className="ab__empty">
                      Chargement…
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="ab__empty">
                      Aucun backup enregistré pour l'instant.
                    </td>
                  </tr>
                ) : (
                  history.map((b) => (
                    <tr key={b.id}>
                      <td style={{ color: "var(--text-muted)", fontFamily: "'IBM Plex Mono', monospace", fontSize: "0.78rem" }}>
                        #{b.id}
                      </td>
                      <td>
                        <span className={`ab__badge ab__badge--${b.type}`}>
                          {b.type === "full" ? "🗄️ Full" : "📦 Incrémental"}
                        </span>
                      </td>
                      <td>
                        <span className={`ab__badge ab__badge--${b.status}`}>
                          {b.status === "success" ? "✓ Réussi" : "✗ Échoué"}
                        </span>
                      </td>
                      <td>
                        <div className="ab__filename">{b.file || "—"}</div>
                      </td>
                      <td style={{ fontSize: "0.8rem", color: "var(--text-secondary)", maxWidth: "200px" }}>
                        {b.notes || "—"}
                      </td>
                      <td>
                        <div className="ab__date">{formatDate(b.created_at)}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}