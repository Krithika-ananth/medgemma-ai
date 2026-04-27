// src/App.js - FIXED: proper role-based routing
import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AppProvider, useApp } from "./context/AppContext";
import LanguageSelect from "./pages/LanguageSelect";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import PatientDashboard from "./pages/PatientDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";

function LoadingScreen() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "#0a0f1e", color: "#94d8f0",
      fontFamily: "'Nunito', sans-serif", gap: "16px",
    }}>
      <div style={{ fontSize: "56px" }}>🏥</div>
      <div style={{ fontSize: "18px", fontWeight: 700 }}>Med Gemma AI</div>
      <div style={{ fontSize: "14px", opacity: 0.5 }}>Loading...</div>
    </div>
  );
}

// ✅ Patient route - only for patients
function PatientRoute({ children }) {
  const { user, userProfile, loading } = useApp();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!userProfile) return <LoadingScreen />;
  // If doctor tries patient page → send to doctor page
  if (userProfile.role === "doctor") return <Navigate to="/doctor" replace />;
  return children;
}

// ✅ Doctor route - only for doctors
function DoctorRoute({ children }) {
  const { user, userProfile, loading } = useApp();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!userProfile) return <LoadingScreen />;
  // If patient tries doctor page → send to patient page
  if (userProfile.role !== "doctor") return <Navigate to="/patient" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LanguageSelect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/patient"
        element={
          <PatientRoute>
            <PatientDashboard />
          </PatientRoute>
        }
      />
      <Route
        path="/doctor"
        element={
          <DoctorRoute>
            <DoctorDashboard />
          </DoctorRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Router>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "#1a2332", color: "#fff",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "12px", fontFamily: "'Nunito', sans-serif",
              fontSize: "14px", maxWidth: "420px",
            },
            duration: 4000,
          }}
        />
        <AppRoutes />
      </Router>
    </AppProvider>
  );
}
