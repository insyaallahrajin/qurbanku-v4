// src/pages/OpgPage.tsx
// Halaman /opg — portal migrasi sementara
// ⚠️ HAPUS SETELAH MIGRASI SELESAI

import { useState } from "react";
import OpgEnvViewerUI from "@/components/OpgEnvViewer";

// Ambil dari env vars yang sudah di-inject Vite
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

type Stage = "lock" | "unlock" | "viewer";

export default function OpgPage() {
  const [stage, setStage] = useState<Stage>("lock");
  const [inputToken, setInputToken] = useState("");
  const [tokenError, setTokenError] = useState("");
  const [verifiedToken, setVerifiedToken] = useState("");

  // Token dikonfirmasi lewat edge function (tidak disimpan di client)
  async function handleUnlock() {
    if (!inputToken.trim()) {
      setTokenError("Token tidak boleh kosong.");
      return;
    }

    // Pre-check: coba panggil edge function dengan token ini
    // Jika berhasil, berarti token valid
    setTokenError("");
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/opg-export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ token: inputToken.trim() }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setTokenError(json.error || "Token tidak valid.");
        return;
      }

      setVerifiedToken(inputToken.trim());
      setStage("viewer");
    } catch {
      setTokenError("Gagal terhubung ke server. Pastikan edge function sudah di-deploy.");
    }
  }

  return (
    <div style={styles.page}>
      {/* Background grid */}
      <div style={styles.grid} />

      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.badge}>⚡ MIGRATION TOOLKIT</div>
          <h1 style={styles.title}>
            Lovable<span style={styles.titleAccent}> → </span>Supabase
          </h1>
          <p style={styles.subtitle}>
            Environment Variables Extractor
          </p>
        </div>

        {/* Warning banner */}
        <div style={styles.warnBanner}>
          <span style={styles.warnIcon}>⚠️</span>
          <span>
            Halaman ini mengekspos semua secrets app kamu.{" "}
            <strong>Hapus setelah migrasi selesai.</strong>
          </span>
        </div>

        {/* Lock screen */}
        {stage === "lock" && (
          <div style={styles.card}>
            <div style={styles.lockIcon}>🔐</div>
            <h2 style={styles.cardTitle}>Masukkan Token</h2>
            <p style={styles.cardDesc}>
              Token tersimpan di <code style={styles.code}>.env</code> sebagai{" "}
              <code style={styles.code}>OPG_TOKEN</code>
            </p>

            <div style={styles.inputWrap}>
              <input
                type="password"
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                placeholder="Paste token di sini..."
                style={styles.input}
                autoFocus
              />
              {tokenError && (
                <p style={styles.errorText}>❌ {tokenError}</p>
              )}
            </div>

            <button style={styles.btnPrimary} onClick={handleUnlock}>
              🔓 Unlock
            </button>

            <p style={styles.hint}>
              Belum punya token? Pastikan Lovable sudah menginstall toolkit dan
              menambahkan <code style={styles.code}>OPG_TOKEN</code> ke .env
            </p>
          </div>
        )}

        {/* Viewer */}
        {stage === "viewer" && (
          <div style={styles.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={styles.cardTitle}>🔓 Environment Variables</h2>
              <button
                style={{ ...styles.btnOutline, fontSize: 12 }}
                onClick={() => { setStage("lock"); setInputToken(""); setVerifiedToken(""); }}
              >
                🔒 Lock
              </button>
            </div>

            <OpgEnvViewerUI
              token={verifiedToken}
              supabaseUrl={SUPABASE_URL}
              anonKey={SUPABASE_ANON_KEY}
            />
          </div>
        )}

        {/* Info cards */}
        {stage !== "viewer" && (
          <div style={styles.infoGrid}>
            <div style={styles.infoCard}>
              <div style={styles.infoEmoji}>📋</div>
              <div style={styles.infoTitle}>Cara Pakai</div>
              <div style={styles.infoText}>
                Unlock → Load Variables → Reveal All → Copy All → paste ke notepad kamu
              </div>
            </div>
            <div style={styles.infoCard}>
              <div style={styles.infoEmoji}>🔌</div>
              <div style={styles.infoTitle}>DB Connection URL</div>
              <div style={styles.infoText}>
                Scroll ke bawah setelah load untuk melihat Database Connection URL (source)
              </div>
            </div>
            <div style={styles.infoCard}>
              <div style={{ ...styles.infoEmoji, color: "#f87171" }}>🗑️</div>
              <div style={{ ...styles.infoTitle, color: "#f87171" }}>Cleanup</div>
              <div style={styles.infoText}>
                Kirim prompt cleanup ke Lovable setelah migrasi. Halaman ini harus 404.
              </div>
            </div>
          </div>
        )}

        <div style={styles.footer}>
          Lovable Migration Toolkit · Untuk keperluan migrasi saja
        </div>
      </div>
    </div>
  );
}

// ---- Styles ----
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0a0a0f",
    color: "#e2e8f0",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    position: "relative",
    overflow: "hidden",
  },
  grid: {
    position: "fixed",
    inset: 0,
    backgroundImage:
      "linear-gradient(rgba(124,58,237,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.04) 1px, transparent 1px)",
    backgroundSize: "40px 40px",
    pointerEvents: "none",
  },
  container: {
    maxWidth: 720,
    margin: "0 auto",
    padding: "40px 24px 80px",
    position: "relative",
    zIndex: 1,
  },
  header: { textAlign: "center", marginBottom: 32 },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: "rgba(124,58,237,0.15)",
    border: "1px solid rgba(124,58,237,0.35)",
    color: "#a78bfa",
    fontFamily: "'Courier New', monospace",
    fontSize: 11,
    letterSpacing: 2,
    padding: "5px 14px",
    borderRadius: 100,
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: 800,
    background: "linear-gradient(135deg, #e2e8f0, #a78bfa 50%, #06b6d4)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    margin: "0 0 8px",
  },
  titleAccent: { color: "#7c3aed" },
  subtitle: { color: "#64748b", fontSize: 14, margin: 0 },
  warnBanner: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    background: "rgba(245,158,11,0.08)",
    border: "1px solid rgba(245,158,11,0.3)",
    color: "#fcd34d",
    padding: "12px 16px",
    borderRadius: 10,
    fontSize: 13,
    marginBottom: 28,
  },
  warnIcon: { flexShrink: 0, marginTop: 1 },
  card: {
    background: "#111118",
    border: "1px solid #2a2a3a",
    borderRadius: 16,
    padding: "28px 28px",
    marginBottom: 24,
  },
  lockIcon: { fontSize: 40, textAlign: "center" as const, marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: 700, margin: "0 0 8px", color: "#e2e8f0" },
  cardDesc: { fontSize: 13, color: "#64748b", margin: "0 0 20px" },
  code: {
    background: "#1a1a24",
    border: "1px solid #2a2a3a",
    borderRadius: 4,
    padding: "1px 6px",
    fontSize: 12,
    fontFamily: "'Courier New', monospace",
    color: "#a78bfa",
  },
  inputWrap: { marginBottom: 16 },
  input: {
    width: "100%",
    background: "#1a1a24",
    border: "1px solid #2a2a3a",
    borderRadius: 8,
    padding: "10px 14px",
    color: "#e2e8f0",
    fontFamily: "'Courier New', monospace",
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box" as const,
  },
  errorText: { color: "#fca5a5", fontSize: 12, margin: "8px 0 0", fontFamily: "'Courier New', monospace" },
  btnPrimary: {
    background: "#7c3aed",
    color: "white",
    border: "none",
    padding: "11px 28px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    width: "100%",
    marginBottom: 16,
  },
  btnOutline: {
    background: "transparent",
    border: "1px solid #2a2a3a",
    color: "#64748b",
    padding: "8px 16px",
    borderRadius: 6,
    cursor: "pointer",
    fontFamily: "'Courier New', monospace",
  },
  hint: { fontSize: 12, color: "#64748b", textAlign: "center" as const, margin: 0, lineHeight: 1.6 },
  infoGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 32 },
  infoCard: {
    background: "#111118",
    border: "1px solid #1e1e2e",
    borderRadius: 12,
    padding: "16px 16px",
  },
  infoEmoji: { fontSize: 24, marginBottom: 8 },
  infoTitle: { fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 },
  infoText: { fontSize: 12, color: "#64748b", lineHeight: 1.6 },
  footer: { textAlign: "center" as const, color: "#2a2a3a", fontSize: 11, fontFamily: "'Courier New', monospace", marginTop: 40 },
};
