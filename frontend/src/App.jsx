import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import AdminUsers from "./pages/AdminUsers";
import ClientDashboard from "./pages/ClientDashboard";
import AdminRoute from "./components/AdminRoute";
import ClientRoute from "./components/ClientRoute";
import AdminBackup from "./pages/AdminBackup";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/admin/users"
        element={
          <AdminRoute>
            <AdminUsers />
          </AdminRoute>
        }
      />

      <Route
        path="/client"
        element={
          <ClientRoute>
            <ClientDashboard />
          </ClientRoute>
        }
      />

      <Route
        path="/admin/backups"
        element={
          <AdminRoute>
            <AdminBackup />
          </AdminRoute>
        }
      />
    </Routes>
  );
}