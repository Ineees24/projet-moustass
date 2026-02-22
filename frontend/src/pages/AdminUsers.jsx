import { useEffect, useMemo, useState } from "react";
import api from "../api";
import "./AdminUsers.css";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // "create" ou "edit"
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role: "CLIENT",
    status: "active",
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    let alive = true;
    setLoading(true);
    setError("");

    api
      .get("/admin/users")
      .then((res) => {
        if (!alive) return;
        setUsers(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => {
        if (!alive) return;
        setError(
          err.response?.data?.message ||
            "Impossible de charger les utilisateurs (API/connexion)."
        );
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  };

  const openCreateModal = () => {
    setModalMode("create");
    setCurrentUser(null);
    setFormData({
      email: "",
      password: "",
      role: "CLIENT",
      status: "active",
    });
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setModalMode("edit");
    setCurrentUser(user);
    setFormData({
      email: user.email,
      password: "",
      role: user.role,
      status: user.status,
    });
    setFormErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setCurrentUser(null);
    setFormData({
      email: "",
      password: "",
      role: "CLIENT",
      status: "active",
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.email.trim()) {
      errors.email = "L'email est requis";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Email invalide";
    }

    if (modalMode === "create" && !formData.password) {
      errors.password = "Le mot de passe est requis";
    }

    if (formData.password && formData.password.length < 12) {
      errors.password = "Le mot de passe doit contenir au moins 12 caractères";
    }

    if (!formData.role) {
      errors.role = "Le rôle est requis";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);
    setError("");

    try {
      if (modalMode === "create") {
        const res = await api.post("/admin/users", formData);
        setUsers((prev) => [...prev, res.data.user]);
      } else {
        const payload = { ...formData };
        if (!payload.password) {
          delete payload.password;
        }
        const res = await api.put(`/admin/users/${currentUser.id}`, payload);
        setUsers((prev) =>
          prev.map((u) => (u.id === currentUser.id ? res.data.user : u))
        );
      }
      closeModal();
    } catch (err) {
      setError(
        err.response?.data?.message || "Une erreur est survenue lors de l'enregistrement."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) {
      return;
    }

    try {
      await api.delete(`/admin/users/${id}`);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      setError(
        err.response?.data?.message || "Impossible de supprimer l'utilisateur."
      );
    }
  };

  const toggleStatus = async (user) => {
    try {
      const endpoint =
        user.status === "active"
          ? `/admin/users/${user.id}/disable`
          : `/admin/users/${user.id}/enable`;

      await api.patch(endpoint);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? { ...u, status: user.status === "active" ? "disabled" : "active" }
            : u
        )
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Action impossible pour le moment. Réessayez."
      );
    }
  };

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const email = String(u.email || "").toLowerCase();
      const status = String(u.status || "").toLowerCase();
      const role = String(u.role || "").toLowerCase();
      return email.includes(q) || status.includes(q) || role.includes(q);
    });
  }, [query, users]);

  return (
    <div className="admin-users">
      <header className="admin-users__header">
        <div className="admin-users__titles">
          <h1 className="admin-users__title">Admin</h1>
          <p className="admin-users__subtitle">Gestion des utilisateurs</p>
        </div>

        <div className="admin-users__meta">
          <span className="admin-users__pill">
            {loading ? "Chargement…" : `${filteredUsers.length} utilisateur(s)`}
          </span>
          <button
            className="admin-users__btn admin-users__btn--primary"
            type="button"
            onClick={openCreateModal}
          >
            + Nouvel utilisateur
          </button>
        </div>
      </header>

      <section className="admin-users__card">
        <div className="admin-users__toolbar">
          <div className="admin-users__search">
            <label htmlFor="q" className="admin-users__label">
              Rechercher
            </label>
            <input
              id="q"
              className="admin-users__input"
              placeholder="email, rôle ou statut…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="admin-users__error" role="alert">
            {error}
          </div>
        )}

        <div className="admin-users__tableWrap">
          <table className="admin-users__table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th className="admin-users__thActions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="admin-users__empty">
                    Chargement des utilisateurs…
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="admin-users__empty">
                    Aucun utilisateur trouvé.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td className="admin-users__email">{u.email}</td>
                    <td>
                      <span className="admin-users__role">{u.role}</span>
                    </td>
                    <td>
                      <span
                        className={[
                          "admin-users__badge",
                          u.status === "active"
                            ? "admin-users__badge--active"
                            : "admin-users__badge--disabled",
                        ].join(" ")}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="admin-users__actions">
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
                        title={
                          u.status === "active" ? "Désactiver" : "Activer"
                        }
                      >
                        {u.status === "active" ? "Désactiver" : "Activer"}
                      </button>
                      <button
                        className="admin-users__btn admin-users__btn--danger"
                        type="button"
                        onClick={() => handleDelete(u.id)}
                        title="Supprimer"
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

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close"
              onClick={closeModal}
            >
              ×
            </button>

            <h2 className="modal-title">
              {modalMode === "create"
                ? "Créer un utilisateur"
                : "Modifier l'utilisateur"}
            </h2>
            
            <p className="modal-subtitle">
              {modalMode === "create"
                ? "Ajoutez un nouvel utilisateur au système"
                : "Modifiez les informations de l'utilisateur"}
            </p>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="modal-field">
                <label htmlFor="email" className="modal-label">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className={`modal-input ${
                    formErrors.email ? "modal-input--error" : ""
                  }`}
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="votre@email.com"
                />
                {formErrors.email && (
                  <span className="modal-error">{formErrors.email}</span>
                )}
              </div>

              <div className="modal-field">
                <label htmlFor="password" className="modal-label">
                  Mot de passe {modalMode === "edit" && "(facultatif)"}
                </label>
                <input
                  id="password"
                  type="password"
                  className={`modal-input ${
                    formErrors.password ? "modal-input--error" : ""
                  }`}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="••••••••"
                />
                {formErrors.password && (
                  <span className="modal-error">{formErrors.password}</span>
                )}
                {modalMode === "edit" && (
                  <span className="modal-hint">
                    Laissez vide pour conserver le mot de passe actuel
                  </span>
                )}
              </div>

              <div className="modal-field">
                <label htmlFor="role" className="modal-label">
                  Rôle
                </label>
                <select
                  id="role"
                  className="modal-input"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                >
                  <option value="CLIENT">CLIENT</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>

              {modalMode === "edit" && (
                <div className="modal-field">
                  <label htmlFor="status" className="modal-label">
                    Statut
                  </label>
                  <select
                    id="status"
                    className="modal-input"
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                  >
                    <option value="active">Active</option>
                    <option value="disabled">Désactivé</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                className="modal-submit"
                disabled={submitting}
              >
                {submitting
                  ? "Enregistrement..."
                  : modalMode === "create"
                  ? "Créer"
                  : "Enregistrer"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}