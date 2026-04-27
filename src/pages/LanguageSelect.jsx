// src/pages/LanguageSelect.jsx - FIXED: language saved before navigating
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";

const languages = [
  {
    code: "en", label: "English", native: "English",
    flag: "🇬🇧", color: "#1a73e8",
    greeting: "Hello! Select your language",
  },
  {
    code: "hi", label: "Hindi", native: "हिंदी",
    flag: "🇮🇳", color: "#ff6b35",
    greeting: "नमस्ते! अपनी भाषा चुनें",
  },
  {
    code: "ta", label: "Tamil", native: "தமிழ்",
    flag: "🌺", color: "#00897b",
    greeting: "வணக்கம்! உங்கள் மொழியை தேர்வு செய்யுங்கள்",
  },
  {
    code: "te", label: "Telugu", native: "తెలుగు",
    flag: "🏵️", color: "#7b1fa2",
    greeting: "నమస్కారం! మీ భాషను ఎంచుకోండి",
  },
];

export default function LanguageSelect() {
  const { changeLanguage, user, userProfile } = useApp();
  const navigate = useNavigate();

  // If already logged in, redirect to correct dashboard
  useEffect(() => {
    if (user && userProfile) {
      navigate(userProfile.role === "doctor" ? "/doctor" : "/patient", { replace: true });
    }
  }, [user, userProfile]);

  const handleSelect = (code) => {
    // ✅ Save language FIRST before navigating
    changeLanguage(code);
    localStorage.setItem("medgemma_lang", code);
    navigate("/login");
  };

  return (
    <div style={S.container}>
      <div style={S.bgGlow} />
      <div style={S.card}>
        <div style={S.logoSection}>
          <span style={{ fontSize: "64px", display: "block", marginBottom: "12px" }}>🏥</span>
          <h1 style={S.appName}>Med Gemma AI</h1>
          <p style={S.tagline}>Your Rural Health Companion</p>
          <p style={S.poweredBy}>Powered by Google Gemini API + Firebase</p>
        </div>

        <h2 style={S.chooseTitle}>
          Choose Your Language<br />
          <span style={{ fontSize: "14px", opacity: 0.7 }}>अपनी भाषा चुनें • மொழி தேர்வு • భాష ఎంచుకోండి</span>
        </h2>

        <div style={S.langGrid}>
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              style={{ ...S.langBtn, borderColor: lang.color }}
              onMouseEnter={e => {
                e.currentTarget.style.background = lang.color + "22";
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = `0 12px 32px ${lang.color}44`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <span style={{ fontSize: "36px" }}>{lang.flag}</span>
              <span style={{ fontSize: "20px", fontWeight: 800, color: "#fff" }}>{lang.native}</span>
              <span style={{ fontSize: "12px", color: lang.color, fontWeight: 600 }}>{lang.label}</span>
              <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", textAlign: "center", lineHeight: 1.3 }}>
                {lang.greeting}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const S = {
  container: {
    minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
    background: "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
    fontFamily: "'Nunito', 'Segoe UI', sans-serif",
    position: "relative", overflow: "hidden", padding: "20px",
  },
  bgGlow: {
    position: "absolute", inset: 0, pointerEvents: "none",
    background: "radial-gradient(ellipse at 20% 50%, rgba(26,115,232,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(0,137,123,0.15) 0%, transparent 60%)",
  },
  card: {
    background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.15)", borderRadius: "28px",
    padding: "48px 40px", maxWidth: "520px", width: "100%",
    textAlign: "center", boxShadow: "0 32px 64px rgba(0,0,0,0.4)",
    position: "relative", zIndex: 1,
  },
  logoSection: { marginBottom: "28px" },
  appName: {
    fontSize: "34px", fontWeight: 900, margin: "0 0 8px",
    background: "linear-gradient(135deg, #fff 0%, #94d8f0 100%)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
    letterSpacing: "-0.5px",
  },
  tagline: { color: "rgba(255,255,255,0.6)", fontSize: "14px", margin: "0 0 6px" },
  poweredBy: { color: "rgba(255,255,255,0.3)", fontSize: "11px", margin: 0 },
  chooseTitle: {
    color: "rgba(255,255,255,0.9)", fontSize: "18px",
    fontWeight: 700, marginBottom: "24px", lineHeight: 1.6,
  },
  langGrid: {
    display: "grid", gridTemplateColumns: "1fr 1fr",
    gap: "16px", marginBottom: "20px",
  },
  langBtn: {
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: "6px", padding: "20px 12px",
    background: "rgba(255,255,255,0.06)", border: "2px solid",
    borderRadius: "18px", cursor: "pointer",
    transition: "all 0.25s ease", color: "#fff",
    backdropFilter: "blur(10px)",
  },
};
