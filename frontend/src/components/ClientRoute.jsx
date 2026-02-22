import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../api";

export default function ClientRoute({ children }) {
  const token = localStorage.getItem("token");
  const [check, setCheck] = useState({ loading: true, isClient: false });

  useEffect(() => {
    if (!token) {
      setCheck({ loading: false, isClient: false });
      return;
    }
    api
      .get("/auth/me")
      .then((r) => {
        setCheck({ loading: false, isClient: r.data?.role === "CLIENT" });
      })
      .catch(() => setCheck({ loading: false, isClient: false }));
  }, [token]);

  if (!token) return <Navigate to="/login" replace />;
  if (check.loading) return <div style={{ padding: "2rem", textAlign: "center" }}>Chargement…</div>;
  if (!check.isClient) return <Navigate to="/admin/users" replace />;
  return children;
}