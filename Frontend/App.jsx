import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Web3Provider, useWeb3 } from "./context/Web3Context";
import Navbar from "./components/Navbar";
import LandingPage    from "./pages/LandingPage";
import RegisterPage   from "./pages/RegisterPage";
import DashboardPage  from "./pages/DashboardPage";
import RecordsPage    from "./pages/RecordsPage";
import AccessPage     from "./pages/AccessPage";
import AuditPage      from "./pages/AuditPage";
import AdminPage      from "./pages/AdminPage";

// ─── Protected route wrapper ─────────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const { isConnected, userProfile } = useWeb3();
  if (!isConnected) return <Navigate to="/" replace />;
  if (!userProfile?.isRegistered) return <Navigate to="/register" replace />;
  return children;
}

function AppRoutes() {
  const { isConnected } = useWeb3();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Routes>
        <Route path="/"          element={<LandingPage />} />
        <Route path="/register"  element={isConnected ? <RegisterPage /> : <Navigate to="/" />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/records"   element={<ProtectedRoute><RecordsPage /></ProtectedRoute>} />
        <Route path="/access"    element={<ProtectedRoute><AccessPage /></ProtectedRoute>} />
        <Route path="/audit"     element={<ProtectedRoute><AuditPage /></ProtectedRoute>} />
        <Route path="/admin"     element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
        <Route path="*"          element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <Web3Provider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { borderRadius: "12px", fontSize: "14px" },
            success: { style: { background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" } },
            error:   { style: { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" } },
          }}
        />
      </BrowserRouter>
    </Web3Provider>
  );
}
