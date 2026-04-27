// src/pages/PatientDashboard.jsx - FIXED: full language support
import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { useVoice } from "../hooks/useVoice";
import { analyzeSymptoms } from "../utils/geminiService";
import { db } from "../firebase";
import { collection, addDoc, getDocs, query, where, orderBy } from "firebase/firestore";
import { QRCodeCanvas } from "qrcode.react";
import toast from "react-hot-toast";

const riskColors = {
  low: "#00c853", medium: "#ffd600", high: "#ff6d00", emergency: "#d50000",
};

const getRiskKey = (text = "") => {
  const t = text.toLowerCase();
  if (t.includes("emergency") || t.includes("आपातकाल") || t.includes("அவசரநிலை") || t.includes("అత్యవసర") || t.includes("అత్యవసరం")) return "emergency";
  if (t.includes("high") || t.includes("गंभीर") || t.includes("அதிக") || t.includes("అధిక") || t.includes("उच्च")) return "high";
  if (t.includes("medium") || t.includes("मध्यम") || t.includes("நடுத்தர") || t.includes("మధ్యస్థ") || t.includes("मध्यम")) return "medium";
  return "low";
};

export default function PatientDashboard() {
  // ✅ Get t and language fresh from context every render
  const { t, user, userProfile, language, logoutUser } = useApp();
  const { isListening, transcript, error: voiceError, startListening, stopListening, speak, stopSpeaking, setTranscript } = useVoice(language);
  const [symptoms, setSymptoms] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [reports, setReports] = useState([]);
  const [view, setView] = useState("new");
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => { if (transcript) setSymptoms(transcript); }, [transcript]);
  useEffect(() => { if (user) fetchReports(); }, [user]);

  const fetchReports = async () => {
    try {
      let reports = [];
      try {
        const q = query(collection(db, "reports"), where("uid", "==", user.uid), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        reports = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch {
        const q2 = query(collection(db, "reports"), where("uid", "==", user.uid));
        const snap2 = await getDocs(q2);
        reports = snap2.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }
      setReports(reports);
    } catch (e) { console.error(e); }
  };

  const handleAnalyze = async () => {
    if (!symptoms.trim()) { toast.error("Please enter your symptoms"); return; }
    setLoading(true); setReport(null);
    try {
      const result = await analyzeSymptoms({
        symptoms, age: userProfile?.age || "Unknown",
        gender: userProfile?.gender || "Unknown",
        history: userProfile?.medHistory || "None",
        language, // ✅ Pass current language to Gemini
      });
      setReport(result);
      const docData = {
        uid: user.uid, patientName: userProfile?.name || "Unknown",
        patientId: user.uid, age: userProfile?.age,
        gender: userProfile?.gender, village: userProfile?.village,
        symptoms, report: result, language,
        createdAt: new Date().toISOString(), doctorNotes: "",
      };
      const ref = await addDoc(collection(db, "reports"), docData);
      setReports(prev => [{ id: ref.id, ...docData }, ...prev]);
      toast.success("✅ " + (language === "hi" ? "रिपोर्ट सहेजी गई!" : language === "ta" ? "அறிக்கை சேமிக்கப்பட்டது!" : language === "te" ? "నివేదిక సేవ్ చేయబడింది!" : "Report saved!"));
    } catch (err) {
      toast.error("Analysis failed: " + (err.message || "Check your API key"));
    } finally { setLoading(false); }
  };

  const handleSpeak = () => {
    if (isSpeaking) { stopSpeaking(); setIsSpeaking(false); return; }
    if (!report) return;
    const text = `${report.condition}. ${report.explanation}. ${report.recommendation}. ${report.disclaimer}`;
    speak(text, language);
    setIsSpeaking(true);
    setTimeout(() => setIsSpeaking(false), text.length * 60 + 3000);
  };

  const qrData = JSON.stringify({
    patientId: user?.uid,
    name: userProfile?.name,
    age: userProfile?.age,
    gender: userProfile?.gender,
    village: userProfile?.village,
    medHistory: userProfile?.medHistory,
    reportCount: reports.length,
    url: `${window.location.origin}/doctor?patientId=${user?.uid}`,
  });

  return (
    <div style={S.container}>
      {/* ✅ Header uses t which is always in current language */}
      <div style={S.header}>
        <div style={S.headerLeft}>
          <span style={{ fontSize: "28px" }}>🏥</span>
          <div>
            <div style={S.headerTitle}>{t.appName}</div>
            <div style={S.headerSub}>{t.welcomeBack}, {userProfile?.name || "User"}</div>
          </div>
        </div>
        <button onClick={logoutUser} style={S.logoutBtn}>🚪 {t.logout}</button>
      </div>

      {/* ✅ Tabs in correct language */}
      <div style={S.tabs}>
        {[
          { key: "new", icon: "🩺", label: t.newReport },
          { key: "history", icon: "📋", label: t.allReports },
          { key: "qr", icon: "📲", label: t.yourQRCode },
        ].map(tab => (
          <button key={tab.key} onClick={() => setView(tab.key)}
            style={{ ...S.tab, ...(view === tab.key ? S.tabActive : {}) }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div style={S.content}>
        {/* NEW REPORT */}
        {view === "new" && (
          <div>
            <h2 style={S.sectionTitle}>{t.symptomTitle}</h2>
            {voiceError && <div style={S.errorBox}>⚠️ {voiceError}</div>}

            <div style={S.voiceRow}>
              <button
                onClick={isListening ? stopListening : startListening}
                style={{ ...S.voiceBtn, ...(isListening ? S.voiceBtnActive : {}) }}
              >
                {isListening
                  ? <><span style={S.pulse} /> {t.speaking}</>
                  : t.speakBtn}
              </button>
              {symptoms && (
                <button onClick={() => { setSymptoms(""); setTranscript(""); }} style={S.clearBtn}>
                  🗑️ Clear
                </button>
              )}
            </div>

            <textarea
              value={symptoms}
              onChange={e => setSymptoms(e.target.value)}
              placeholder={t.typeSymptoms}
              style={S.textarea} rows={4}
            />

            <button onClick={handleAnalyze} style={S.analyzeBtn} disabled={loading}>
              {loading ? "⏳ " + t.analyzing : "🔍 " + t.analyzeBtn}
            </button>

            {report && (
              <ReportCard report={report} t={t} onSpeak={handleSpeak} isSpeaking={isSpeaking} language={language} />
            )}
          </div>
        )}

        {/* HISTORY */}
        {view === "history" && (
          <div>
            <h2 style={S.sectionTitle}>📋 {t.allReports}</h2>
            {reports.length === 0
              ? <p style={S.emptyText}>{t.noReports}</p>
              : reports.map(r => (
                <div key={r.id} style={S.histCard}>
                  <div style={S.histHeader}>
                    <span style={S.histDate}>📅 {new Date(r.createdAt).toLocaleString()}</span>
                    <RiskBadge level={getRiskKey(r.report?.riskLevel)} t={t} />
                  </div>
                  <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", margin: "6px 0" }}>
                    🗣️ {r.symptoms}
                  </p>
                  <p style={{ fontSize: "14px", color: "#94d8f0", fontWeight: 600, margin: 0 }}>
                    🔬 {r.report?.condition}
                  </p>
                  {r.doctorNotes && (
                    <div style={S.doctorNoteBox}>
                      🩺 <strong>Doctor:</strong> {r.doctorNotes}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* QR CODE */}
        {view === "qr" && (
          <div style={{ textAlign: "center" }}>
            <h2 style={S.sectionTitle}>{t.yourQRCode}</h2>
            <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: "24px" }}>{t.qrInstruction}</p>
            <div style={S.qrBox}>
              <QRCodeCanvas value={qrData} size={220} bgColor="#ffffff" fgColor="#0a0f1e" level="H" includeMargin />
            </div>
            <div style={S.patientCard}>
              <p style={{ fontSize: "18px", fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>
                👤 {userProfile?.name}
              </p>
              <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", fontFamily: "monospace", margin: "0 0 8px" }}>
                🆔 {user?.uid}
              </p>
              <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", margin: "4px 0" }}>
                🎂 {userProfile?.age} | ⚧ {userProfile?.gender} | 🏘️ {userProfile?.village}
              </p>
              <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", margin: "4px 0" }}>
                📊 {reports.length} {t.allReports}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ReportCard({ report, t, onSpeak, isSpeaking }) {
  const risk = getRiskKey(report.riskLevel);
  const color = riskColors[risk];
  const riskLabels = { emergency: t.emergency, high: t.high, medium: t.medium, low: t.low };

  return (
    <div style={S.reportCard}>
      <div style={{ background: color + "22", border: `1px solid ${color}`, borderRadius: "12px", padding: "12px 16px", marginBottom: "16px", textAlign: "center" }}>
        <div style={{ color, fontWeight: 900, fontSize: "18px" }}>{riskLabels[risk] || report.riskLevel}</div>
        {(risk === "emergency" || risk === "high") && (
          <div style={{ color: "#fff", fontSize: "13px", marginTop: "6px" }}>
            {risk === "emergency" ? "🚨 " : "⚠️ "}{report.recommendation?.slice(0, 80)}
          </div>
        )}
      </div>
      <Field icon="🔬" label={t.condition} value={report.condition} />
      <Field icon="📖" label={t.explanation} value={report.explanation} />
      <Field icon="💊" label={t.medicines} value={report.medicines} />
      <Field icon="🌿" label={t.homeRemedies} value={report.homeRemedies} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
        <Field icon="✅" label={t.eatFoods} value={report.eatFoods} green />
        <Field icon="❌" label={t.avoidFoods} value={report.avoidFoods} red />
      </div>
      <Field icon="📋" label={t.recommendation} value={report.recommendation} highlight />
      <div style={{ fontSize: "12px", color: "rgba(255,200,100,0.8)", background: "rgba(255,200,0,0.08)", border: "1px solid rgba(255,200,0,0.2)", borderRadius: "10px", padding: "10px 12px", marginBottom: "12px" }}>
        {report.disclaimer || t.disclaimer}
      </div>
      <button onClick={onSpeak} style={S.speakBtn}>
        {isSpeaking ? t.stopListening : t.listenReport}
      </button>
    </div>
  );
}

function Field({ icon, label, value, highlight, green, red }) {
  if (!value) return null;
  return (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", fontWeight: 700, marginBottom: "6px" }}>{icon} {label}</div>
      <div style={{
        fontSize: "14px", color: "#fff", lineHeight: "1.7", whiteSpace: "pre-wrap",
        background: highlight ? "rgba(26,115,232,0.1)" : green ? "rgba(0,200,130,0.08)" : red ? "rgba(255,100,100,0.08)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${highlight ? "rgba(26,115,232,0.3)" : green ? "rgba(0,200,130,0.2)" : red ? "rgba(255,100,100,0.2)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: "10px", padding: "10px 14px",
      }}>{value}</div>
    </div>
  );
}

function RiskBadge({ level, t }) {
  const color = riskColors[level] || "#94d8f0";
  const labels = { emergency: t.emergency, high: t.high, medium: t.medium, low: t.low };
  return (
    <span style={{ background: color + "33", color, border: `1px solid ${color}`, borderRadius: "8px", padding: "3px 10px", fontSize: "12px", fontWeight: 700 }}>
      {labels[level] || level}
    </span>
  );
}

const S = {
  container: { minHeight: "100vh", background: "linear-gradient(135deg, #0a0f1e 0%, #0d1b35 100%)", fontFamily: "'Nunito', 'Segoe UI', sans-serif", color: "#fff" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.1)" },
  headerLeft: { display: "flex", alignItems: "center", gap: "12px" },
  headerTitle: { fontSize: "18px", fontWeight: 800, color: "#fff" },
  headerSub: { fontSize: "12px", color: "rgba(255,255,255,0.5)" },
  logoutBtn: { background: "rgba(255,100,100,0.15)", border: "1px solid rgba(255,100,100,0.3)", color: "#ff9090", borderRadius: "10px", padding: "8px 14px", cursor: "pointer", fontSize: "13px", fontFamily: "'Nunito', sans-serif" },
  tabs: { display: "flex", borderBottom: "1px solid rgba(255,255,255,0.1)", overflowX: "auto" },
  tab: { flex: 1, padding: "14px 8px", background: "transparent", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: "13px", fontWeight: 600, fontFamily: "'Nunito', sans-serif", borderBottom: "2px solid transparent", whiteSpace: "nowrap", transition: "all 0.2s" },
  tabActive: { color: "#94d8f0", borderBottomColor: "#94d8f0", background: "rgba(148,216,240,0.06)" },
  content: { padding: "24px", maxWidth: "640px", margin: "0 auto" },
  sectionTitle: { fontSize: "20px", fontWeight: 700, marginBottom: "20px" },
  errorBox: { background: "rgba(255,100,100,0.15)", border: "1px solid rgba(255,100,100,0.3)", borderRadius: "12px", padding: "12px 16px", marginBottom: "16px", color: "#ff9090", fontSize: "14px" },
  voiceRow: { display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" },
  voiceBtn: { padding: "14px 24px", borderRadius: "50px", background: "linear-gradient(135deg, #1a73e8, #0d47a1)", border: "none", color: "#fff", fontSize: "15px", fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 8px 24px rgba(26,115,232,0.4)" },
  voiceBtnActive: { background: "linear-gradient(135deg, #d32f2f, #b71c1c)", boxShadow: "0 8px 24px rgba(211,47,47,0.5)", animation: "pulse 1.5s infinite" },
  pulse: { width: "10px", height: "10px", borderRadius: "50%", background: "#fff", display: "inline-block", animation: "blink 1s infinite" },
  clearBtn: { padding: "12px 18px", borderRadius: "50px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: "13px", fontFamily: "'Nunito', sans-serif" },
  textarea: { width: "100%", padding: "16px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "16px", color: "#fff", fontSize: "15px", fontFamily: "'Nunito', sans-serif", resize: "vertical", boxSizing: "border-box", marginBottom: "16px", outline: "none", lineHeight: "1.6" },
  analyzeBtn: { width: "100%", padding: "16px", background: "linear-gradient(135deg, #00897b, #00695c)", border: "none", borderRadius: "14px", color: "#fff", fontSize: "17px", fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif", marginBottom: "24px", boxShadow: "0 8px 24px rgba(0,137,123,0.4)" },
  reportCard: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "20px", padding: "24px" },
  speakBtn: { width: "100%", padding: "12px", background: "rgba(148,216,240,0.1)", border: "1px solid rgba(148,216,240,0.3)", borderRadius: "12px", color: "#94d8f0", fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: "'Nunito', sans-serif" },
  histCard: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "16px", marginBottom: "12px" },
  histHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" },
  histDate: { fontSize: "12px", color: "rgba(255,255,255,0.4)" },
  doctorNoteBox: { marginTop: "8px", padding: "8px 12px", background: "rgba(0,137,123,0.12)", borderRadius: "8px", fontSize: "13px", color: "#80cbc4", border: "1px solid rgba(0,137,123,0.3)" },
  emptyText: { color: "rgba(255,255,255,0.4)", textAlign: "center", padding: "40px 0" },
  qrBox: { display: "inline-block", padding: "20px", background: "#fff", borderRadius: "20px", boxShadow: "0 20px 60px rgba(0,0,0,0.5)", marginBottom: "24px" },
  patientCard: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "16px", padding: "20px", display: "inline-block", minWidth: "260px" },
};
