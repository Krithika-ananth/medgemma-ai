// src/pages/DoctorDashboard.jsx
import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import { db } from "../firebase";
import {
  collection, getDocs, query, where,
  orderBy, updateDoc, doc, getDoc
} from "firebase/firestore";
import toast from "react-hot-toast";
import { Html5QrcodeScanner } from "html5-qrcode";

const riskColors = {
  low: "#00c853", medium: "#ffd600", high: "#ff6d00", emergency: "#d50000",
};

const getRiskKey = (text) => {
  const t = (text || "").toLowerCase();
  if (t.includes("emergency") || t.includes("आपातकाल") || t.includes("அவசரநிலை") || t.includes("అత్యవసర")) return "emergency";
  if (t.includes("high") || t.includes("गंभीर") || t.includes("அதிக") || t.includes("అధిక")) return "high";
  if (t.includes("medium") || t.includes("मध्यम") || t.includes("நடுத்தர") || t.includes("మధ్యస్థ")) return "medium";
  return "low";
};

export default function DoctorDashboard() {
  const { t, userProfile, logoutUser } = useApp();
  const [view, setView] = useState("scan");
  const [scannedPatient, setScannedPatient] = useState(null);
  const [patientReports, setPatientReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [doctorNote, setDoctorNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const scannerRef = useRef(null);

  const startScanner = () => {
    setScanning(true);
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );
      scanner.render(
        async (decodedText) => {
          await scanner.clear();
          setScanning(false);
          try {
            const data = JSON.parse(decodedText);
            if (!data.patientId) { toast.error("Invalid QR"); return; }
            await loadPatientData(data.patientId, data);
          } catch (e) {
            toast.error("Could not read QR code");
          }
        },
        (err) => {}
      );
      scannerRef.current = scanner;
    }, 400);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => {});
      scannerRef.current = null;
    }
    setScanning(false);
  };

  // ✅ FIXED: Load patient reports WITHOUT requiring composite index
  const loadPatientData = async (patientId, qrData) => {
    setScannedPatient(qrData);
    setLoadingReports(true);
    toast.loading("Loading patient reports...", { id: "loading" });

    try {
      // First try with orderBy (needs index)
      let reports = [];
      try {
        const q = query(
          collection(db, "reports"),
          where("uid", "==", patientId),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        reports = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (indexErr) {
        // If index error, fetch without orderBy and sort manually
        console.log("Index not ready, fetching without orderBy...");
        const q2 = query(collection(db, "reports"), where("uid", "==", patientId));
        const snap2 = await getDocs(q2);
        reports = snap2.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }

      toast.dismiss("loading");

      if (reports.length === 0) {
        toast.error("No reports found for this patient");
        // Still show patient info even with no reports
        setPatientReports([]);
        setSelectedReport(null);
        setView("patient");
        return;
      }

      setPatientReports(reports);
      setSelectedReport(reports[0]);
      setView("patient");
      toast.success(`✅ Loaded ${reports.length} report(s)!`);
    } catch (e) {
      toast.dismiss("loading");
      console.error("Load error:", e);
      toast.error("Error: " + e.message);
    } finally {
      setLoadingReports(false);
    }
  };

  const saveNote = async () => {
    if (!selectedReport) return;
    if (!doctorNote.trim()) { toast.error("Please write a note first"); return; }
    setSavingNote(true);
    try {
      await updateDoc(doc(db, "reports", selectedReport.id), {
        doctorNotes: doctorNote,
        doctorNotesUpdatedAt: new Date().toISOString(),
      });
      setPatientReports(prev =>
        prev.map(r => r.id === selectedReport.id ? { ...r, doctorNotes: doctorNote } : r)
      );
      setSelectedReport(prev => ({ ...prev, doctorNotes: doctorNote }));
      toast.success("✅ " + t.noteSaved);
    } catch (e) {
      toast.error("Failed to save: " + e.message);
    } finally {
      setSavingNote(false);
    }
  };

  useEffect(() => {
    if (selectedReport) setDoctorNote(selectedReport.doctorNotes || "");
  }, [selectedReport]);

  useEffect(() => {
    return () => { if (scannerRef.current) scannerRef.current.clear().catch(() => {}); };
  }, []);

  return (
    <div style={S.container}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.headerLeft}>
          <span style={{ fontSize: "28px" }}>🩺</span>
          <div>
            <div style={S.headerTitle}>{t.doctorDashboard}</div>
            <div style={S.headerSub}>Dr. {userProfile?.name || "Doctor"} • {userProfile?.specialization || "General"}</div>
          </div>
        </div>
        <button onClick={logoutUser} style={S.logoutBtn}>🚪 {t.logout}</button>
      </div>

      {/* Tabs */}
      <div style={S.tabs}>
        <button onClick={() => { setView("scan"); stopScanner(); }}
          style={{ ...S.tab, ...(view === "scan" ? S.tabActive : {}) }}>
          📲 {t.scanQR}
        </button>
        {scannedPatient && (
          <button onClick={() => setView("patient")}
            style={{ ...S.tab, ...(view === "patient" ? S.tabActive : {}) }}>
            👤 {t.patientReports}
            {patientReports.length > 0 && (
              <span style={S.badge}>{patientReports.length}</span>
            )}
          </button>
        )}
      </div>

      <div style={S.content}>
        {/* SCAN VIEW */}
        {view === "scan" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "64px", marginBottom: "12px" }}>📲</div>
            <h2 style={S.scanTitle}>{t.scanQR}</h2>
            <p style={S.scanSub}>Scan patient QR code to view their reports and AI analysis</p>

            {!scanning ? (
              <button onClick={startScanner} style={S.scanBtn}>
                📷 Start QR Scanner
              </button>
            ) : (
              <div style={{ marginBottom: "20px" }}>
                <div id="qr-reader" style={S.scannerBox} />
                <button onClick={stopScanner} style={S.cancelBtn}>❌ Cancel Scan</button>
              </div>
            )}

            <div style={S.divider}>— OR enter Patient UID manually —</div>
            <ManualLoad onLoad={loadPatientData} />

            {/* Help text */}
            <div style={S.helpBox}>
              <p style={S.helpText}>💡 <strong>How to get Patient UID:</strong></p>
              <p style={S.helpText}>Ask patient to go to their app → "Your QR Code" tab → show you their QR or copy their UID shown below the QR</p>
            </div>
          </div>
        )}

        {/* PATIENT VIEW */}
        {view === "patient" && scannedPatient && (
          <div>
            {/* Patient Card */}
            <div style={S.patientCard}>
              <div style={S.patientCardTop}>
                <span style={{ fontSize: "36px" }}>👤</span>
                <div>
                  <div style={S.patientName}>{scannedPatient.name || "Unknown Patient"}</div>
                  <div style={S.patientMeta}>
                    🎂 {scannedPatient.age} yrs &nbsp;|&nbsp;
                    ⚧ {scannedPatient.gender} &nbsp;|&nbsp;
                    🏘️ {scannedPatient.village || "—"}
                  </div>
                  <div style={S.patientUID}>UID: {scannedPatient.patientId}</div>
                </div>
              </div>
              {scannedPatient.medHistory && (
                <div style={S.historyBox}>
                  🏥 <strong>Past Medical History:</strong> {scannedPatient.medHistory}
                </div>
              )}
            </div>

            {loadingReports ? (
              <div style={S.loadingBox}>⏳ Loading reports...</div>
            ) : patientReports.length === 0 ? (
              <div style={S.emptyBox}>
                <div style={{ fontSize: "48px" }}>📋</div>
                <p>No reports found for this patient yet.</p>
                <p style={{ fontSize: "13px", opacity: 0.6 }}>Patient needs to analyze symptoms first.</p>
              </div>
            ) : (
              <>
                {/* Report Selector */}
                <div style={S.selectorBox}>
                  <label style={S.selectorLabel}>
                    📋 Select Report ({patientReports.length} total):
                  </label>
                  <select
                    value={selectedReport?.id || ""}
                    onChange={e => setSelectedReport(patientReports.find(r => r.id === e.target.value))}
                    style={S.select}
                  >
                    {patientReports.map((r, i) => (
                      <option key={r.id} value={r.id}>
                        {i === 0 ? "🔴 Latest — " : `📄 #${patientReports.length - i} — `}
                        {new Date(r.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit"
                        })}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedReport && (
                  <>
                    {/* Symptoms */}
                    <div style={S.symptomsBox}>
                      <div style={S.fieldLabel}>🗣️ Patient's Reported Symptoms:</div>
                      <div style={S.symptomsText}>{selectedReport.symptoms}</div>
                    </div>

                    {/* Risk Banner */}
                    <RiskBanner level={getRiskKey(selectedReport.report?.riskLevel)} raw={selectedReport.report?.riskLevel} t={t} />

                    {/* AI Report */}
                    <div style={S.reportCard}>
                      <div style={S.reportCardTitle}>🤖 {t.aiDiagnosis}</div>
                      <Field icon="🔬" label={t.condition} value={selectedReport.report?.condition} />
                      <Field icon="📖" label={t.explanation} value={selectedReport.report?.explanation} />
                      <Field icon="💊" label={t.medicines} value={selectedReport.report?.medicines} />
                      <Field icon="🌿" label={t.homeRemedies} value={selectedReport.report?.homeRemedies} />
                      <div style={{ display: "flex", gap: "12px" }}>
                        <Field icon="✅" label={t.eatFoods} value={selectedReport.report?.eatFoods} half />
                        <Field icon="❌" label={t.avoidFoods} value={selectedReport.report?.avoidFoods} half />
                      </div>
                      <Field icon="📋" label={t.recommendation} value={selectedReport.report?.recommendation} highlight />
                      {selectedReport.report?.disclaimer && (
                        <div style={S.disclaimer}>{selectedReport.report.disclaimer}</div>
                      )}
                    </div>

                    {/* Doctor Notes */}
                    <div style={S.notesCard}>
                      <div style={S.notesTitle}>🩺 {t.doctorNotes}</div>
                      {selectedReport.doctorNotes && (
                        <div style={S.existingNote}>
                          <strong>Previous note:</strong> {selectedReport.doctorNotes}
                        </div>
                      )}
                      <textarea
                        value={doctorNote}
                        onChange={e => setDoctorNote(e.target.value)}
                        placeholder={t.notesPlaceholder}
                        style={S.notesArea}
                        rows={5}
                      />
                      <button onClick={saveNote} style={S.saveBtn} disabled={savingNote}>
                        {savingNote ? "⏳ Saving..." : "💾 " + t.saveNotes}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ManualLoad({ onLoad }) {
  const [pid, setPid] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLoad = async () => {
    if (!pid.trim()) { toast.error("Enter a Patient UID"); return; }
    setLoading(true);
    try {
      // Try to get patient profile from users collection
      const userDoc = await getDoc(doc(db, "users", pid.trim()));
      if (userDoc.exists()) {
        const data = userDoc.data();
        await onLoad(pid.trim(), {
          patientId: pid.trim(),
          name: data.name,
          age: data.age,
          gender: data.gender,
          village: data.village,
          medHistory: data.medHistory || "",
        });
      } else {
        // Try from reports collection
        const q = query(collection(db, "reports"), where("uid", "==", pid.trim()));
        const snap = await getDocs(q);
        if (snap.empty) { toast.error("No patient found with this ID"); return; }
        const first = snap.docs[0].data();
        await onLoad(pid.trim(), {
          patientId: pid.trim(),
          name: first.patientName || "Unknown",
          age: first.age,
          gender: first.gender,
          village: first.village,
          medHistory: first.medHistory || "",
        });
      }
    } catch (e) {
      toast.error("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
      <input
        value={pid}
        onChange={e => setPid(e.target.value)}
        placeholder="Paste Patient UID here..."
        style={{
          padding: "12px 16px", borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.2)",
          background: "rgba(255,255,255,0.07)", color: "#fff",
          fontSize: "13px", fontFamily: "monospace", width: "280px",
          outline: "none",
        }}
      />
      <button
        onClick={handleLoad}
        disabled={loading}
        style={{
          padding: "12px 20px", borderRadius: "12px",
          background: "linear-gradient(135deg, #1a73e8, #0d47a1)",
          border: "none", color: "#fff", cursor: "pointer",
          fontSize: "14px", fontWeight: 700, fontFamily: "'Nunito', sans-serif",
        }}
      >
        {loading ? "⏳" : "🔍 Load"}
      </button>
    </div>
  );
}

function Field({ icon, label, value, highlight, half }) {
  if (!value) return null;
  return (
    <div style={{ marginBottom: "12px", flex: half ? 1 : undefined }}>
      <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", fontWeight: 700, marginBottom: "6px" }}>
        {icon} {label}
      </div>
      <div style={{
        fontSize: "14px", color: "#fff", lineHeight: "1.7",
        background: highlight ? "rgba(26,115,232,0.12)" : "rgba(255,255,255,0.05)",
        border: highlight ? "1px solid rgba(26,115,232,0.3)" : "1px solid rgba(255,255,255,0.08)",
        borderRadius: "10px", padding: "10px 14px", whiteSpace: "pre-wrap",
      }}>
        {value}
      </div>
    </div>
  );
}

function RiskBanner({ level, raw, t }) {
  const color = riskColors[level] || "#94d8f0";
  const labels = { emergency: t.emergency, high: t.high, medium: t.medium, low: t.low };
  return (
    <div style={{
      padding: "14px 18px", marginBottom: "16px",
      background: color + "18", border: `2px solid ${color}`,
      borderRadius: "14px", textAlign: "center",
    }}>
      <div style={{ color, fontWeight: 900, fontSize: "18px" }}>{labels[level] || raw}</div>
      {(level === "emergency" || level === "high") && (
        <div style={{ color: "#fff", fontSize: "13px", marginTop: "6px", opacity: 0.85 }}>
          {level === "emergency" ? "🚨 Immediate hospital visit required!" : "⚠️ Doctor consultation strongly advised"}
        </div>
      )}
    </div>
  );
}

const S = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0a0f1e 0%, #0d1b35 100%)",
    fontFamily: "'Nunito', 'Segoe UI', sans-serif", color: "#fff",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "18px 24px",
    background: "rgba(0,137,123,0.08)",
    borderBottom: "1px solid rgba(0,137,123,0.25)",
  },
  headerLeft: { display: "flex", alignItems: "center", gap: "12px" },
  headerTitle: { fontSize: "18px", fontWeight: 800, color: "#80cbc4" },
  headerSub: { fontSize: "12px", color: "rgba(255,255,255,0.45)" },
  logoutBtn: {
    background: "rgba(255,100,100,0.12)", border: "1px solid rgba(255,100,100,0.25)",
    color: "#ff9090", borderRadius: "10px", padding: "8px 14px",
    cursor: "pointer", fontSize: "13px", fontFamily: "'Nunito', sans-serif",
  },
  tabs: { display: "flex", borderBottom: "1px solid rgba(255,255,255,0.08)" },
  tab: {
    flex: 1, padding: "14px", background: "transparent", border: "none",
    color: "rgba(255,255,255,0.45)", cursor: "pointer", fontSize: "13px",
    fontWeight: 600, fontFamily: "'Nunito', sans-serif",
    borderBottom: "2px solid transparent", display: "flex",
    alignItems: "center", justifyContent: "center", gap: "8px",
  },
  tabActive: { color: "#80cbc4", borderBottomColor: "#80cbc4", background: "rgba(0,137,123,0.06)" },
  badge: {
    background: "#00897b", color: "#fff", borderRadius: "50%",
    width: "20px", height: "20px", display: "inline-flex",
    alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700,
  },
  content: { padding: "24px", maxWidth: "720px", margin: "0 auto" },
  scanTitle: { fontSize: "22px", fontWeight: 700, marginBottom: "8px" },
  scanSub: { color: "rgba(255,255,255,0.45)", fontSize: "14px", marginBottom: "24px" },
  scanBtn: {
    padding: "16px 36px", marginBottom: "24px",
    background: "linear-gradient(135deg, #00897b, #00695c)",
    border: "none", borderRadius: "50px", color: "#fff",
    fontSize: "16px", fontWeight: 700, cursor: "pointer",
    boxShadow: "0 8px 24px rgba(0,137,123,0.45)", fontFamily: "'Nunito', sans-serif",
  },
  scannerBox: {
    maxWidth: "340px", margin: "0 auto 16px",
    background: "rgba(255,255,255,0.04)",
    borderRadius: "16px", overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.1)",
  },
  cancelBtn: {
    padding: "10px 24px", marginBottom: "20px",
    background: "rgba(255,100,100,0.12)", border: "1px solid rgba(255,100,100,0.3)",
    color: "#ff9090", cursor: "pointer", borderRadius: "10px",
    fontSize: "13px", fontFamily: "'Nunito', sans-serif",
  },
  divider: { color: "rgba(255,255,255,0.3)", fontSize: "13px", margin: "20px 0 14px" },
  helpBox: {
    marginTop: "24px", padding: "14px 18px",
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "12px", maxWidth: "420px", margin: "24px auto 0",
  },
  helpText: { color: "rgba(255,255,255,0.55)", fontSize: "13px", margin: "4px 0" },
  patientCard: {
    background: "rgba(0,137,123,0.1)", border: "1px solid rgba(0,137,123,0.3)",
    borderRadius: "16px", padding: "20px", marginBottom: "20px",
  },
  patientCardTop: { display: "flex", gap: "16px", alignItems: "flex-start", marginBottom: "12px" },
  patientName: { fontSize: "20px", fontWeight: 800 },
  patientMeta: { fontSize: "13px", color: "rgba(255,255,255,0.6)", marginTop: "6px" },
  patientUID: { fontSize: "11px", color: "rgba(255,255,255,0.3)", fontFamily: "monospace", marginTop: "4px" },
  historyBox: {
    background: "rgba(255,255,255,0.06)", borderRadius: "10px",
    padding: "10px 14px", fontSize: "13px", color: "rgba(255,255,255,0.7)",
  },
  loadingBox: { textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.5)", fontSize: "16px" },
  emptyBox: { textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.4)" },
  selectorBox: { marginBottom: "16px" },
  selectorLabel: { color: "rgba(255,255,255,0.6)", fontSize: "13px", fontWeight: 600 },
  select: {
    width: "100%", padding: "12px 14px", marginTop: "8px",
    background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "10px", color: "#fff", fontSize: "13px",
    fontFamily: "'Nunito', sans-serif", outline: "none",
  },
  symptomsBox: {
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "12px", padding: "14px 16px", marginBottom: "16px",
  },
  fieldLabel: { fontSize: "12px", color: "rgba(255,255,255,0.5)", fontWeight: 700, marginBottom: "6px" },
  symptomsText: { fontSize: "15px", color: "#fff", lineHeight: "1.6" },
  reportCard: {
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "16px", padding: "20px", marginBottom: "20px",
  },
  reportCardTitle: { fontSize: "15px", fontWeight: 700, color: "#80cbc4", marginBottom: "16px" },
  disclaimer: {
    fontSize: "12px", color: "rgba(255,200,100,0.8)",
    background: "rgba(255,200,0,0.08)", border: "1px solid rgba(255,200,0,0.2)",
    borderRadius: "10px", padding: "10px 12px", marginTop: "12px",
  },
  notesCard: {
    background: "rgba(26,115,232,0.08)", border: "1px solid rgba(26,115,232,0.2)",
    borderRadius: "16px", padding: "20px", marginBottom: "24px",
  },
  notesTitle: { fontSize: "15px", fontWeight: 700, color: "#94d8f0", marginBottom: "14px" },
  existingNote: {
    background: "rgba(0,137,123,0.1)", borderRadius: "10px",
    padding: "10px 14px", fontSize: "13px", color: "#80cbc4",
    marginBottom: "12px", border: "1px solid rgba(0,137,123,0.2)",
  },
  notesArea: {
    width: "100%", padding: "14px",
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "12px", color: "#fff", fontSize: "14px",
    fontFamily: "'Nunito', sans-serif", resize: "vertical",
    boxSizing: "border-box", outline: "none", lineHeight: "1.6", marginBottom: "12px",
  },
  saveBtn: {
    padding: "12px 28px",
    background: "linear-gradient(135deg, #1a73e8, #0d47a1)",
    border: "none", borderRadius: "10px", color: "#fff",
    fontSize: "14px", fontWeight: 700, cursor: "pointer",
    fontFamily: "'Nunito', sans-serif",
    boxShadow: "0 4px 14px rgba(26,115,232,0.4)",
  },
};
