import { useEffect, useMemo, useState } from "react";
import api from "../api";
import "./AdminUsers.css";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  // Modal modes : "create" | "edit" | "view"
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [currentUser, setCurrentUser] = useState(null);

  const [formData, setFormData] = useState({
    nom: "", prenom: "", telephone: "",
    email: "", password: "", role: "CLIENT", status: "active",
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = () => {
    setLoading(true);
    setError("");
    api.get("/admin/users")
      .then((res) => setUsers(Array.isArray(res.data) ? res.data : []))
      .catch((err) => setError(err.response?.data?.message || "Impossible de charger les utilisateurs."))
      .finally(() => setLoading(false));
  };

  // ── Ouvrir modal VIEW ──────────────────────────────────
  const openViewModal = (user) => {
    setModalMode("view");
    setCurrentUser(user);
    setShowModal(true);
  };

  // ── Ouvrir modal CREATE ────────────────────────────────
  const openCreateModal = () => {
    setModalMode("create");
    setCurrentUser(null);
    setFormData({ nom: "", prenom: "", telephone: "", email: "", password: "", role: "CLIENT", status: "active" });
    setFormErrors({});
    setShowModal(true);
  };

  // ── Ouvrir modal EDIT ──────────────────────────────────
  const openEditModal = (user) => {
    setModalMode("edit");
    setCurrentUser(user);
    setFormData({
      nom: user.nom || "", prenom: user.prenom || "",
      telephone: user.telephone || "", email: user.email,
      password: "", role: user.role, status: user.status,
    });
    setFormErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setCurrentUser(null);
    setFormErrors({});
  };

  // ── Validation ─────────────────────────────────────────
  const validateForm = () => {
    const errors = {};
    if (!formData.nom.trim())       errors.nom = "Le nom est requis";
    if (!formData.prenom.trim())    errors.prenom = "Le prénom est requis";
    if (!formData.telephone.trim()) errors.telephone = "Le téléphone est requis";
    if (!formData.email.trim()) {
      errors.email = "L'email est requis";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Email invalide";
    }
    if (modalMode === "create" && !formData.password)
      errors.password = "Le mot de passe est requis";
    if (formData.password && formData.password.length < 12)
      errors.password = "12 caractères minimum";
    if (!formData.role) errors.role = "Le rôle est requis";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Soumission formulaire ──────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    setError("");
    try {
      if (modalMode === "create") {
        const res = await api.post("/admin/users", formData);
        setUsers((prev) => [...prev, res.data.user]);
        // Affiche le client_secret si retourné
        if (res.data.client_secret) {
          alert(`Compte créé !\n\nClient Secret (à communiquer une seule fois) :\n${res.data.client_secret}`);
        }
      } else {
        const payload = { ...formData };
        if (!payload.password) delete payload.password;
        const res = await api.put(`/admin/users/${currentUser.id}`, payload);
        setUsers((prev) => prev.map((u) => u.id === currentUser.id ? res.data.user : u));
      }
      closeModal();
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de l'enregistrement.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Suppression ────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cet utilisateur ?")) return;
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      setError(err.response?.data?.message || "Impossible de supprimer.");
    }
  };

  // ── Activer / Désactiver ───────────────────────────────
  const toggleStatus = async (user) => {
    try {
      const endpoint = user.status === "active"
        ? `/admin/users/${user.id}/disable`
        : `/admin/users/${user.id}/enable`;
      await api.patch(endpoint);
      setUsers((prev) => prev.map((u) =>
        u.id === user.id ? { ...u, status: user.status === "active" ? "disabled" : "active" } : u
      ));
    } catch (err) {
      setError(err.response?.data?.message || "Action impossible.");
    }
  };

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.email, u.nom, u.prenom, u.telephone, u.status, u.role]
        .map((v) => String(v || "").toLowerCase())
        .some((v) => v.includes(q))
    );
  }, [query, users]);

  // ── Formate une date ───────────────────────────────────
  const formatDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <div className="admin-users">

      {/* ── EN-TÊTE ── */}
      <header className="admin-users__header">
        <div className="admin-users__titles">
          <h1 className="admin-users__title">Admin</h1>
          <p className="admin-users__subtitle">Gestion des utilisateurs</p>
        </div>
        <div className="admin-users__meta">
          <span className="admin-users__pill">
            {loading ? "Chargement…" : `${filteredUsers.length} utilisateur(s)`}
          </span>
          <button onClick={() => (window.location.href = "/admin/backups")}>
            🗄️ Backups
          </button>
          <button
            className="admin-users__btn admin-users__btn--primary"
            type="button"
            onClick={openCreateModal}
          >
            + Nouvel utilisateur
          </button>
        </div>
      </header>

      {/* ── TABLEAU ── */}
      <section className="admin-users__card">
        <div className="admin-users__toolbar">
          <div className="admin-users__search">
            <label htmlFor="q" className="admin-users__label">Rechercher</label>
            <input
              id="q"
              className="admin-users__input"
              placeholder="nom, email, rôle ou statut…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {error && <div className="admin-users__error" role="alert">{error}</div>}

        <div className="admin-users__tableWrap">
          <table className="admin-users__table">
            <thead>
              <tr>
                <th>Nom complet</th>
                <th>Email</th>
                <th>Téléphone</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th className="admin-users__thActions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="admin-users__empty">Chargement…</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={6} className="admin-users__empty">Aucun utilisateur trouvé.</td></tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td className="admin-users__email">
                      {u.prenom && u.nom ? `${u.prenom} ${u.nom}` : u.email}
                    </td>
                    <td>{u.email}</td>
                    <td>{u.telephone || "—"}</td>
                    <td><span className="admin-users__role">{u.role}</span></td>
                    <td>
                      <span className={`admin-users__badge admin-users__badge--${u.status === "active" ? "active" : "disabled"}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="admin-users__actions">
                      {/* LIRE — affiche les détails complets */}
                      <button
                        className="admin-users__btn admin-users__btn--info"
                        type="button"
                        onClick={() => openViewModal(u)}
                        title="Voir le profil"
                      >
                        Voir
                      </button>
                      <button
                        className="admin-users__btn admin-users__btn--ghost"
                        type="button"
                        onClick={() => openEditModal(u)}
                        title="Modifier"
                      >
                        Modifier
                      </button>
                      <button
                        className="admin-users__btn admin-users__btn--ghost"
                        type="button"
                        onClick={() => toggleStatus(u)}
                      >
                        {u.status === "active" ? "Désactiver" : "Activer"}
                      </button>
                      <button
                        className="admin-users__btn admin-users__btn--danger"
                        type="button"
                        onClick={() => handleDelete(u.id)}
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── MODAL ── */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" onClick={closeModal}>×</button>

            {/* ════ MODE VIEW : affichage des données complètes ════ */}
            {modalMode === "view" && currentUser && (
              <>
                <h2 className="modal-title">Profil utilisateur</h2>
                <p className="modal-subtitle">Informations complètes de l'utilisateur</p>

                <div className="modal-view">
                  {/* Avatar initiales */}
                  <div className="modal-view__avatar">
                    {currentUser.prenom?.charAt(0)}{currentUser.nom?.charAt(0)}
                  </div>

                  <div className="modal-view__name">
                    {currentUser.prenom} {currentUser.nom}
                  </div>

                  <div className="modal-view__grid">
                    <div className="modal-view__item">
                      <span className="modal-view__label">Email</span>
                      <span className="modal-view__value">{currentUser.email}</span>
                    </div>
                    <div className="modal-view__item">
                      <span className="modal-view__label">Téléphone</span>
                      <span className="modal-view__value">{currentUser.telephone || "—"}</span>
                    </div>
                    <div className="modal-view__item">
                      <span className="modal-view__label">Rôle</span>
                      <span className="modal-view__value">
                        <span className="admin-users__role">{currentUser.role}</span>
                      </span>
                    </div>
                    <div className="modal-view__item">
                      <span className="modal-view__label">Statut</span>
                      <span className="modal-view__value">
                        <span className={`admin-users__badge admin-users__badge--${currentUser.status === "active" ? "active" : "disabled"}`}>
                          {currentUser.status}
                        </span>
                      </span>
                    </div>
                    <div className="modal-view__item">
                      <span className="modal-view__label">Créé le</span>
                      <span className="modal-view__value">{formatDate(currentUser.created_at)}</span>
                    </div>
                    <div className="modal-view__item">
                      <span className="modal-view__label">ID</span>
                      <span className="modal-view__value">#{currentUser.id}</span>
                    </div>
                  </div>

                  {/* Actions rapides depuis le modal view */}
                  <div className="modal-view__actions">
                    <button
                      className="admin-users__btn admin-users__btn--ghost"
                      onClick={() => { closeModal(); setTimeout(() => openEditModal(currentUser), 50); }}
                    >
                      Modifier
                    </button>
                    <button
                      className="admin-users__btn admin-users__btn--ghost"
                      onClick={() => { toggleStatus(currentUser); closeModal(); }}
                    >
                      {currentUser.status === "active" ? "Désactiver" : "Activer"}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ════ MODE CREATE / EDIT : formulaire ════ */}
            {(modalMode === "create" || modalMode === "edit") && (
              <>
                <h2 className="modal-title">
                  {modalMode === "create" ? "Créer un utilisateur" : "Modifier l'utilisateur"}
                </h2>
                <p className="modal-subtitle">
                  {modalMode === "create"
                    ? "Ajoutez un nouvel utilisateur au système"
                    : "Modifiez les informations de l'utilisateur"}
                </p>

                <form onSubmit={handleSubmit} className="modal-form">

                  {/* Prénom + Nom côte à côte */}
                  <div className="modal-row">
                    <div className="modal-field">
                      <label htmlFor="prenom" className="modal-label">Prénom</label>
                      <input
                        id="prenom" type="text"
                        className={`modal-input ${formErrors.prenom ? "modal-input--error" : ""}`}
                        value={formData.prenom}
                        onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                        placeholder="Alice"
                      />
                      {formErrors.prenom && <span className="modal-error">{formErrors.prenom}</span>}
                    </div>
                    <div className="modal-field">
                      <label htmlFor="nom" className="modal-label">Nom</label>
                      <input
                        id="nom" type="text"
                        className={`modal-input ${formErrors.nom ? "modal-input--error" : ""}`}
                        value={formData.nom}
                        onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                        placeholder="Dupont"
                      />
                      {formErrors.nom && <span className="modal-error">{formErrors.nom}</span>}
                    </div>
                  </div>

                  {/* Téléphone */}
                  <div className="modal-field">
                    <label htmlFor="telephone" className="modal-label">Téléphone</label>
                    <input
                      id="telephone" type="tel"
                      className={`modal-input ${formErrors.telephone ? "modal-input--error" : ""}`}
                      value={formData.telephone}
                      onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                      placeholder="+230 5XXX XXXX"
                    />
                    {formErrors.telephone && <span className="modal-error">{formErrors.telephone}</span>}
                  </div>

                  {/* Email */}
                  <div className="modal-field">
                    <label htmlFor="email" className="modal-label">Email</label>
                    <input
                      id="email" type="email"
                      className={`modal-input ${formErrors.email ? "modal-input--error" : ""}`}
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="votre@email.com"
                    />
                    {formErrors.email && <span className="modal-error">{formErrors.email}</span>}
                  </div>

                  {/* Mot de passe */}
                  <div className="modal-field">
                    <label htmlFor="password" className="modal-label">
                      Mot de passe {modalMode === "edit" && "(facultatif)"}
                    </label>
                    <input
                      id="password" type="password"
                      className={`modal-input ${formErrors.password ? "modal-input--error" : ""}`}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                    />
                    {formErrors.password && <span className="modal-error">{formErrors.password}</span>}
                    {modalMode === "edit" && (
                      <span className="modal-hint">Laissez vide pour conserver le mot de passe actuel</span>
                    )}
                  </div>

                  {/* Rôle */}
                  <div className="modal-field">
                    <label htmlFor="role" className="modal-label">Rôle</label>
                    <select
                      id="role" className="modal-input"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    >
                      <option value="CLIENT">CLIENT</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>

                  {/* Statut (edit uniquement) */}
                  {modalMode === "edit" && (
                    <div className="modal-field">
                      <label htmlFor="status" className="modal-label">Statut</label>
                      <select
                        id="status" className="modal-input"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      >
                        <option value="active">Actif</option>
                        <option value="disabled">Désactivé</option>
                      </select>
                    </div>
                  )}

                  {error && <div className="admin-users__error">{error}</div>}

                  <button type="submit" className="modal-submit" disabled={submitting}>
                    {submitting
                      ? "Enregistrement…"
                      : modalMode === "create" ? "Créer" : "Enregistrer"}
                  </button>
                </form>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}