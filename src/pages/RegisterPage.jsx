// src/pages/RegisterPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const { t, registerUser, language } = useApp();
  const navigate = useNavigate();
  const [role, setRole] = useState("patient");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", age: "", gender: "male", phone: "",
    village: "", medHistory: "", email: "", password: "",
    confirmPassword: "", language: language, specialization: "",
    licenseNumber: "",
  });

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleRegister = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const profileData = {
        name: form.name, age: form.age, gender: form.gender,
        phone: form.phone, village: form.village,
        medHistory: form.medHistory, language: form.language,
        role,
        ...(role === "doctor" && {
          specialization: form.specialization,
          licenseNumber: form.licenseNumber,
        }),
      };
      await registerUser(form.email, form.password, profileData);
      toast.success("✅ Account created successfully!");
      navigate(role === "doctor" ? "/doctor" : "/patient");
    } catch (err) {
      toast.error(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "12px 16px",
    background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "12px", color: "#fff", fontSize: "15px",
    outline: "none", boxSizing: "border-box", fontFamily: "'Nunito', sans-serif",
    marginBottom: "14px",
  };
  const labelStyle = {
    display: "block", color: "rgba(255,255,255,0.7)",
    fontSize: "13px", fontWeight: 600, marginBottom: "6px",
  };

  return (
    <div style={styles.container}>
      <div style={styles.bgGlow} />
      <div style={styles.card}>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <span style={{ fontSize: "44px" }}>🏥</span>
          <h1 style={styles.title}>{t.registerBtn}</h1>
          <p style={styles.sub}>{t.appName}</p>
        </div>

        {/* Role Toggle */}
        <div style={styles.toggle}>
          {["patient", "doctor"].map(r => (
            <button key={r} onClick={() => setRole(r)}
              style={{ ...styles.toggleBtn, ...(role === r ? styles.toggleActive : {}) }}>
              {r === "patient" ? "👤 Patient" : "🩺 Doctor"}
            </button>
          ))}
        </div>

        <form onSubmit={handleRegister}>
          <label style={labelStyle}>👤 {t.name}</label>
          <input style={inputStyle} value={form.name} onChange={e => update("name", e.target.value)} required />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={labelStyle}>📅 {t.age}</label>
              <input style={{ ...inputStyle, marginBottom: 0 }} type="number" value={form.age} onChange={e => update("age", e.target.value)} required />
            </div>
            <div>
              <label style={labelStyle}>⚧ {t.gender}</label>
              <select style={{ ...inputStyle, marginBottom: 0 }} value={form.gender} onChange={e => update("gender", e.target.value)}>
                <option value="male">{t.male}</option>
                <option value="female">{t.female}</option>
                <option value="other">{t.other}</option>
              </select>
            </div>
          </div>
          <div style={{ height: "14px" }} />

          <label style={labelStyle}>📱 {t.phone}</label>
          <input style={inputStyle} type="tel" value={form.phone} onChange={e => update("phone", e.target.value)} />

          <label style={labelStyle}>🏘️ {t.village}</label>
          <input style={inputStyle} value={form.village} onChange={e => update("village", e.target.value)} />

          {role === "patient" && (
            <>
              <label style={labelStyle}>🏥 {t.medHistory}</label>
              <textarea style={{ ...inputStyle, height: "80px", resize: "vertical" }}
                value={form.medHistory} onChange={e => update("medHistory", e.target.value)}
                placeholder="e.g. Diabetes, Hypertension..." />
            </>
          )}

          {role === "doctor" && (
            <>
              <label style={labelStyle}>🔬 Specialization</label>
              <input style={inputStyle} value={form.specialization} onChange={e => update("specialization", e.target.value)} placeholder="e.g. General Physician" />
              <label style={labelStyle}>📋 License Number</label>
              <input style={inputStyle} value={form.licenseNumber} onChange={e => update("licenseNumber", e.target.value)} />
            </>
          )}

          <label style={labelStyle}>🌐 {t.language}</label>
          <select style={inputStyle} value={form.language} onChange={e => update("language", e.target.value)}>
            <option value="en">English</option>
            <option value="hi">हिंदी (Hindi)</option>
            <option value="ta">தமிழ் (Tamil)</option>
            <option value="te">తెలుగు (Telugu)</option>
          </select>

          <label style={labelStyle}>📧 Email</label>
          <input style={inputStyle} type="email" value={form.email} onChange={e => update("email", e.target.value)} required />

          <label style={labelStyle}>🔒 {t.password}</label>
          <input style={inputStyle} type="password" value={form.password} onChange={e => update("password", e.target.value)} required />

          <label style={labelStyle}>🔒 Confirm Password</label>
          <input style={inputStyle} type="password" value={form.confirmPassword} onChange={e => update("confirmPassword", e.target.value)} required />

          <button type="submit" style={styles.submitBtn} disabled={loading}>
            {loading ? "⏳ Creating..." : "✨ " + t.registerBtn}
          </button>

          <button type="button" onClick={() => navigate("/login")} style={styles.backBtn}>
            ← {t.backToLogin}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
    background: "linear-gradient(135deg, #0a0f1e 0%, #0d1b35 50%, #091228 100%)",
    fontFamily: "'Nunito', 'Segoe UI', sans-serif", padding: "20px",
    position: "relative", overflow: "hidden",
  },
  bgGlow: {
    position: "absolute", inset: 0, pointerEvents: "none",
    background: "radial-gradient(ellipse at 70% 30%, rgba(0,137,123,0.12) 0%, transparent 60%)",
  },
  card: {
    background: "rgba(255,255,255,0.04)", backdropFilter: "blur(24px)",
    border: "1px solid rgba(255,255,255,0.12)", borderRadius: "24px",
    padding: "36px 32px", maxWidth: "460px", width: "100%",
    boxShadow: "0 40px 80px rgba(0,0,0,0.5)", position: "relative", zIndex: 1,
  },
  title: {
    fontSize: "26px", fontWeight: 800, margin: "8px 0 4px",
    background: "linear-gradient(135deg, #fff 0%, #94d8f0 100%)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
  },
  sub: { color: "rgba(255,255,255,0.4)", fontSize: "13px", margin: 0 },
  toggle: {
    display: "flex", gap: "8px", marginBottom: "20px",
    background: "rgba(0,0,0,0.3)", borderRadius: "12px", padding: "4px",
  },
  toggleBtn: {
    flex: 1, padding: "10px", border: "none", borderRadius: "10px",
    cursor: "pointer", fontSize: "13px", fontWeight: 600,
    color: "rgba(255,255,255,0.5)", background: "transparent",
    fontFamily: "'Nunito', sans-serif",
  },
  toggleActive: {
    background: "linear-gradient(135deg, #1a73e8, #0d47a1)", color: "#fff",
    boxShadow: "0 4px 12px rgba(26,115,232,0.4)",
  },
  submitBtn: {
    width: "100%", padding: "14px",
    background: "linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%)",
    border: "none", borderRadius: "12px", color: "#fff",
    fontSize: "16px", fontWeight: 700, cursor: "pointer",
    fontFamily: "'Nunito', sans-serif", marginBottom: "12px",
    boxShadow: "0 8px 24px rgba(26,115,232,0.4)",
  },
  backBtn: {
    width: "100%", padding: "12px",
    background: "transparent", border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "12px", color: "rgba(255,255,255,0.6)",
    fontSize: "14px", cursor: "pointer", fontFamily: "'Nunito', sans-serif",
  },
};
