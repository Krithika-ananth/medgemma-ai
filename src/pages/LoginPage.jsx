// src/pages/LoginPage.jsx - FIXED: proper role-based login
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import toast from "react-hot-toast";

const generateCaptcha = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

export default function LoginPage() {
  const { t, loginUser, resetPassword, userProfile } = useApp();
  const navigate = useNavigate();
  const [mode, setMode] = useState("patient");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaCode, setCaptchaCode] = useState(generateCaptcha());
  const [captchaInput, setCaptchaInput] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const canvasRef = useRef();

  // ✅ CRITICAL FIX: Always sign out any existing session when login page loads
  useEffect(() => {
    signOut(auth).catch(() => {});
  }, []);

  // Load saved credentials per mode
  useEffect(() => {
    const saved = localStorage.getItem(`medgemma_creds_${mode}`);
    if (saved) {
      try {
        const { savedEmail, savedPass } = JSON.parse(saved);
        setEmail(savedEmail || "");
        setPassword(savedPass || "");
      } catch (e) {
        setEmail(""); setPassword("");
      }
    } else {
      setEmail(""); setPassword("");
    }
  }, [mode]);

  // Draw captcha canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#1a2332";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = `rgba(${Math.random()*200},${Math.random()*200},255,0.3)`;
      ctx.beginPath();
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.stroke();
    }
    captchaCode.split("").forEach((char, i) => {
      ctx.save();
      ctx.font = `bold ${20 + Math.random() * 6}px 'Courier New'`;
      ctx.fillStyle = `hsl(${180 + i * 30}, 80%, 70%)`;
      ctx.translate(14 + i * 22, 28 + (Math.random() - 0.5) * 6);
      ctx.rotate((Math.random() - 0.5) * 0.4);
      ctx.fillText(char, 0, 0);
      ctx.restore();
    });
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.3})`;
      ctx.beginPath();
      ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [captchaCode]);

  const refreshCaptcha = () => { setCaptchaCode(generateCaptcha()); setCaptchaInput(""); };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (captchaInput.toUpperCase() !== captchaCode) {
      toast.error("❌ Wrong captcha. Please try again.");
      refreshCaptcha();
      return;
    }
    setLoading(true);
    try {
      // ✅ Sign out first to clear any previous session
      await signOut(auth);

      // Now login with new credentials
      const cred = await loginUser(email.trim(), password.trim());
      const uid = cred.user.uid;

      // ✅ Fetch the user's actual role from Firestore directly
      const { getDoc, doc } = await import("firebase/firestore");
      const { db } = await import("../firebase");
      const snap = await getDoc(doc(db, "users", uid));

      if (!snap.exists()) {
        await signOut(auth);
        toast.error("❌ Account not found. Please register first.");
        setLoading(false);
        return;
      }

      const profile = snap.data();
      const actualRole = profile.role || "patient";

      // ✅ Check role matches what they selected
      if (mode === "doctor" && actualRole !== "doctor") {
        await signOut(auth);
        toast.error("❌ This account is a Patient account. Please use Patient Login tab.");
        refreshCaptcha();
        setLoading(false);
        return;
      }

      if (mode === "patient" && actualRole === "doctor") {
        await signOut(auth);
        toast.error("❌ This account is a Doctor account. Please use Doctor Login tab.");
        refreshCaptcha();
        setLoading(false);
        return;
      }

      // Save credentials per mode if remember me
      if (rememberMe) {
        localStorage.setItem(`medgemma_creds_${mode}`, JSON.stringify({
          savedEmail: email.trim(), savedPass: password.trim(),
        }));
      } else {
        localStorage.removeItem(`medgemma_creds_${mode}`);
      }

      toast.success(`✅ Welcome, ${profile.name || "User"}!`);

      // ✅ Navigate based on actual role from database
      if (actualRole === "doctor") {
        navigate("/doctor", { replace: true });
      } else {
        navigate("/patient", { replace: true });
      }

    } catch (err) {
      const msg = err.message || "";
      if (msg.includes("user-not-found") || msg.includes("invalid-credential") || msg.includes("wrong-password")) {
        toast.error("❌ Wrong email or password. Please check and try again.");
      } else if (msg.includes("too-many-requests")) {
        toast.error("⚠️ Too many attempts. Please wait a few minutes.");
      } else if (msg.includes("invalid-email")) {
        toast.error("❌ Invalid email format.");
      } else {
        toast.error("❌ Login failed: " + msg.slice(0, 60));
      }
      refreshCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    try {
      await resetPassword(resetEmail);
      toast.success("✅ Password reset email sent! Check your inbox.");
      setShowForgot(false);
    } catch {
      toast.error("Error sending reset email. Check the email address.");
    }
  };

  if (showForgot) {
    return (
      <div style={S.container}>
        <div style={S.bgGlow} />
        <div style={S.card}>
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <div style={{ fontSize: "44px" }}>🔑</div>
            <h2 style={S.appTitle}>Reset Password</h2>
            <p style={S.appSub}>Enter your registered email</p>
          </div>
          <form onSubmit={handleReset}>
            <label style={S.label}>📧 Email Address</label>
            <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)}
              style={S.input} placeholder="your@email.com" required />
            <button type="submit" style={S.submitBtn}>📨 Send Reset Email</button>
            <button type="button" onClick={() => setShowForgot(false)} style={S.linkBtn}>
              ← Back to Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={S.container}>
      <div style={S.bgGlow} />
      <div style={S.card}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{ fontSize: "52px" }}>🏥</div>
          <h1 style={S.appTitle}>{t.appName}</h1>
          <p style={S.appSub}>{t.tagline}</p>
        </div>

        {/* Mode Toggle */}
        <div style={S.toggle}>
          <button
            type="button"
            onClick={() => setMode("patient")}
            style={{ ...S.toggleBtn, ...(mode === "patient" ? S.togglePatient : {}) }}
          >
            👤 {t.patientLogin}
          </button>
          <button
            type="button"
            onClick={() => setMode("doctor")}
            style={{ ...S.toggleBtn, ...(mode === "doctor" ? S.toggleDoctor : {}) }}
          >
            🩺 {t.doctorLogin}
          </button>
        </div>

        {/* Mode hint */}
        <div style={{
          ...S.hintBox,
          background: mode === "doctor" ? "rgba(0,137,123,0.1)" : "rgba(26,115,232,0.1)",
          borderColor: mode === "doctor" ? "rgba(0,137,123,0.3)" : "rgba(26,115,232,0.3)",
          color: mode === "doctor" ? "#80cbc4" : "#94d8f0",
        }}>
          {mode === "doctor"
            ? "🩺 Login with your Doctor account registered with doctor role"
            : "👤 Login with your Patient account registered with patient role"}
        </div>

        <form onSubmit={handleLogin}>
          <label style={S.label}>
            {mode === "patient" ? "👤 " + t.patientId : "🩺 " + t.doctorId}
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={S.input}
            placeholder="your@email.com"
            required
            autoComplete="email"
          />

          <label style={S.label}>🔒 {t.password}</label>
          <div style={{ position: "relative", marginBottom: "16px" }}>
            <input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ ...S.input, marginBottom: 0, paddingRight: "44px" }}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              style={{ position: "absolute", right: "12px", top: "12px", background: "none", border: "none", cursor: "pointer", fontSize: "18px" }}
            >
              {showPass ? "🙈" : "👁️"}
            </button>
          </div>

          {/* Captcha */}
          <label style={S.label}>🔐 {t.captchaLabel}</label>
          <div style={{ display: "flex", gap: "10px", marginBottom: "8px", alignItems: "center" }}>
            <canvas ref={canvasRef} width={160} height={44}
              style={{ borderRadius: "8px", border: "1px solid rgba(255,255,255,0.15)" }} />
            <button type="button" onClick={refreshCaptcha} title="Refresh captcha"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", padding: "8px 12px", cursor: "pointer", fontSize: "18px" }}>
              🔄
            </button>
          </div>
          <input type="text" value={captchaInput} onChange={e => setCaptchaInput(e.target.value)}
            placeholder={t.captchaPlaceholder} style={S.input} maxLength={6} required autoComplete="off" />

          {/* Remember me + Forgot */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
            <input type="checkbox" id="remember" checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              style={{ width: "16px", height: "16px", accentColor: "#1a73e8", cursor: "pointer" }} />
            <label htmlFor="remember" style={{ color: "rgba(255,255,255,0.65)", fontSize: "13px", cursor: "pointer" }}>
              {t.rememberMe}
            </label>
            <button type="button" onClick={() => setShowForgot(true)}
              style={{ ...S.linkBtn, marginLeft: "auto" }}>
              {t.forgotPassword}
            </button>
          </div>

          <button type="submit"
            style={{ ...S.submitBtn, opacity: loading ? 0.7 : 1, background: mode === "doctor" ? "linear-gradient(135deg, #00897b, #00695c)" : "linear-gradient(135deg, #1a73e8, #0d47a1)" }}
            disabled={loading}
          >
            {loading ? "⏳ Signing in..." : (mode === "doctor" ? "🩺 Doctor Sign In" : "🔐 Patient Sign In")}
          </button>
        </form>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "16px 0" }}>
          <span style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.1)" }} />
          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "12px" }}>{t.or}</span>
          <span style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.1)" }} />
        </div>

        <button onClick={() => navigate("/register")} style={S.registerBtn}>
          ✨ {t.registerBtn}
        </button>

        <p style={{ textAlign: "center", fontSize: "13px", marginTop: "14px", margin: "14px 0 0" }}>
          <a href="/" style={{ color: "#94d8f0", textDecoration: "none" }}>🌐 Change Language</a>
        </p>
      </div>
    </div>
  );
}

const S = {
  container: {
    minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
    background: "linear-gradient(135deg, #0a0f1e 0%, #0d1b35 50%, #091228 100%)",
    fontFamily: "'Nunito', 'Segoe UI', sans-serif", padding: "20px",
    position: "relative", overflow: "hidden",
  },
  bgGlow: {
    position: "absolute", inset: 0, pointerEvents: "none",
    background: "radial-gradient(ellipse at 30% 40%, rgba(26,115,232,0.12) 0%, transparent 60%), radial-gradient(ellipse at 70% 70%, rgba(0,200,150,0.1) 0%, transparent 60%)",
  },
  card: {
    background: "rgba(255,255,255,0.04)", backdropFilter: "blur(24px)",
    border: "1px solid rgba(255,255,255,0.12)", borderRadius: "24px",
    padding: "36px 32px", maxWidth: "440px", width: "100%",
    boxShadow: "0 40px 80px rgba(0,0,0,0.5)", position: "relative", zIndex: 1,
  },
  appTitle: {
    fontSize: "26px", fontWeight: 800, margin: "8px 0 4px",
    background: "linear-gradient(135deg, #fff 0%, #94d8f0 100%)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
  },
  appSub: { color: "rgba(255,255,255,0.5)", fontSize: "13px", margin: 0 },
  toggle: {
    display: "flex", gap: "6px", marginBottom: "12px",
    background: "rgba(0,0,0,0.3)", borderRadius: "12px", padding: "4px",
  },
  toggleBtn: {
    flex: 1, padding: "10px 6px", border: "none", borderRadius: "10px",
    cursor: "pointer", fontSize: "13px", fontWeight: 600,
    color: "rgba(255,255,255,0.5)", background: "transparent",
    fontFamily: "'Nunito', sans-serif", transition: "all 0.2s",
  },
  togglePatient: {
    background: "linear-gradient(135deg, #1a73e8, #0d47a1)", color: "#fff",
    boxShadow: "0 4px 12px rgba(26,115,232,0.4)",
  },
  toggleDoctor: {
    background: "linear-gradient(135deg, #00897b, #00695c)", color: "#fff",
    boxShadow: "0 4px 12px rgba(0,137,123,0.4)",
  },
  hintBox: {
    border: "1px solid", borderRadius: "10px",
    padding: "10px 14px", fontSize: "12px", marginBottom: "16px",
  },
  label: {
    display: "block", color: "rgba(255,255,255,0.7)",
    fontSize: "13px", fontWeight: 600, marginBottom: "8px",
  },
  input: {
    width: "100%", padding: "12px 16px",
    background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "12px", color: "#fff", fontSize: "15px",
    outline: "none", boxSizing: "border-box",
    fontFamily: "'Nunito', sans-serif", marginBottom: "16px",
  },
  submitBtn: {
    width: "100%", padding: "14px", border: "none",
    borderRadius: "12px", color: "#fff", fontSize: "16px",
    fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif",
    marginBottom: "4px", boxShadow: "0 8px 24px rgba(26,115,232,0.3)",
    transition: "all 0.2s",
  },
  registerBtn: {
    width: "100%", padding: "13px",
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "12px", color: "rgba(255,255,255,0.8)",
    fontSize: "15px", fontWeight: 600, cursor: "pointer",
    fontFamily: "'Nunito', sans-serif",
  },
  linkBtn: {
    background: "none", border: "none", cursor: "pointer",
    color: "#94d8f0", fontSize: "13px", textDecoration: "underline",
    fontFamily: "'Nunito', sans-serif",
  },
};
