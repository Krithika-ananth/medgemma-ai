// src/components/shared/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";

export function ProtectedRoute({ children, doctorOnly = false }) {
  const { user, isDoctor, loading } = useApp();

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#0a0f1e", color: "#94d8f0", fontSize: "16px",
        fontFamily: "'Nunito', sans-serif",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🏥</div>
          <div>Loading Med Gemma AI...</div>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (doctorOnly && !isDoctor) return <Navigate to="/patient" replace />;
  return children;
}
