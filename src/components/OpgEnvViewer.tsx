// src/components/OpgEnvViewer.tsx
// Komponen UI untuk menampilkan dan meng-copy environment variables
// ⚠️ HAPUS SETELAH MIGRASI SELESAI

import { useState } from "react";

interface EnvData {
  success: boolean;
  timestamp: string;
  env: Record<string, string>;
  dbConnectionUrl: string | null;
  totalKeys: number;
}

interface OpgEnvViewerProps {
  supabaseUrl: string;
  anonKey: string;
}

// Kategorisasi keys untuk tampilan yang lebih rapi
const CATEGORIES: { label: string; emoji: string; patterns: RegExp[] }[] = [
  {
    label: "Supabase",
    emoji: "🔋",
    patterns: [/supabase/i, /database/i, /direct_url/i, /^db_/i],
  },
  {
    label: "OpenAI",
    emoji: "🤖",
    patterns: [/openai/i],
  },
  {
    label: "Resend / Email",
    emoji: "📧",
    patterns: [/resend/i, /email/i, /smtp/i, /from_email/i],
  },
  {
    label: "Stripe",
    emoji: "💳",
    patterns: [/stripe/i],
  },
  {
    label: "Lovable / App",
    emoji: "💜",
    patterns: [/lovable/i, /^vite_app/i, /^app_url/i],
  },
];

function categorize(key: string): string {
  for (const cat of CATEGORIES) {
    if (cat.patterns.some((p) => p.test(key))) return cat.label;
  }
  return "Lainnya";
}

export function OpgEnvViewer({ supabaseUrl, anonKey }: OpgEnvViewerProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<EnvData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [allRevealed, setAllRevealed] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [allCopied, setAllCopied] = useState(false);

  async function loadEnv(token: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/opg-export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ token }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal memuat environment variables.");
      }

      setData(json);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  function toggleReveal(key: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function revealAll() {
    if (!data) return;
    setRevealed(new Set(Object.keys(data.env)));
    setAllRevealed(true);
  }

  function copyValue(key: string, value: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  function copyAll() {
    if (!data) return;
    const text = Object.entries(data.env)
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setAllCopied(true);
      setTimeout(() => setAllCopied(false), 3000);
    });
  }

  function copyDbUrl() {
    if (!data?.dbConnectionUrl) return;
    navigator.clipboard.writeText(data.dbConnectionUrl).then(() => {
      setCopied("__DB_URL__");
      setTimeout(() => setCopied(null), 2000);
    });
  }

  // Group env by category
  function groupedEnv(): Record<string, [string, string][]> {
    if (!data) return {};
    const groups: Record<string, [string, string][]> = {};
    for (const [k, v] of Object.entries(data.env)) {
      const cat = categorize(k);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push([k, v]);
    }
    return groups;
  }

  return { loadEnv, loading, data, error, revealed, allRevealed, copied, allCopied, toggleReveal, revealAll, copyValue, copyAll, copyDbUrl, groupedEnv };
}

// ---- Styled Component ----

export default function OpgEnvViewerUI({
  token,
  supabaseUrl,
  anonKey,
}: {
  token: string;
  supabaseUrl: string;
  anonKey: string;
}) {
  const viewer = OpgEnvViewer({ supabaseUrl, anonKey });
  const [hasLoaded, setHasLoaded] = useState(false);

  async function handleLoad() {
    await viewer.loadEnv(token);
    setHasLoaded(true);
  }

  const groups = viewer.groupedEnv();

  return (
    <div className="opg-viewer">
      <style>{`
        .opg-viewer { font-family: 'Courier New', monospace; }
        .opg-load-btn {
          background: #7c3aed;
          color: white;
          border: none;
          padding: 12px 28px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: background 0.2s;
        }
        .opg-load-btn:hover { background: #6d28d9; }
        .opg-load-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .opg-error {
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.3);
          color: #fca5a5;
          padding: 12px 16px;
          border-radius: 8px;
          margin-top: 16px;
          font-size: 13px;
        }
        .opg-actions {
          display: flex;
          gap: 10px;
          margin: 20px 0 16px;
          flex-wrap: wrap;
        }
        .opg-btn {
          background: #1a1a24;
          border: 1px solid #2a2a3a;
          color: #94a3b8;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 12px;
          font-family: 'Courier New', monospace;
          cursor: pointer;
          transition: all 0.2s;
        }
        .opg-btn:hover { border-color: #7c3aed; color: #e2e8f0; }
        .opg-btn.success { background: #059669; border-color: #059669; color: white; }
        .opg-meta {
          font-size: 11px;
          color: #64748b;
          margin-bottom: 20px;
          font-family: 'Courier New', monospace;
        }
        .opg-category { margin-bottom: 24px; }
        .opg-cat-title {
          font-size: 11px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #64748b;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .opg-cat-title::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #1e1e2e;
        }
        .opg-row {
          background: #111118;
          border: 1px solid #1e1e2e;
          border-radius: 8px;
          padding: 10px 14px;
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .opg-key {
          color: #a78bfa;
          font-size: 12px;
          min-width: 220px;
          flex-shrink: 0;
        }
        .opg-value {
          flex: 1;
          font-size: 12px;
          color: #86efac;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          cursor: pointer;
        }
        .opg-value.hidden { color: #2a2a3a; letter-spacing: 4px; }
        .opg-icon-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: #64748b;
          font-size: 14px;
          padding: 4px;
          border-radius: 4px;
          transition: color 0.2s;
          flex-shrink: 0;
        }
        .opg-icon-btn:hover { color: #e2e8f0; }
        .opg-db-section {
          background: rgba(6,182,212,0.06);
          border: 1px solid rgba(6,182,212,0.25);
          border-radius: 12px;
          padding: 16px;
          margin-top: 24px;
        }
        .opg-db-title {
          font-size: 12px;
          color: #67e8f9;
          font-weight: 700;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .opg-db-url {
          background: #0d0d15;
          border: 1px solid #1e1e2e;
          border-radius: 8px;
          padding: 12px;
          font-size: 11px;
          color: #67e8f9;
          word-break: break-all;
          margin-bottom: 10px;
          line-height: 1.6;
        }
      `}</style>

      {!hasLoaded ? (
        <button
          className="opg-load-btn"
          onClick={handleLoad}
          disabled={viewer.loading}
        >
          {viewer.loading ? "⏳ Loading..." : "🔍 Load Environment Variables"}
        </button>
      ) : null}

      {viewer.error && (
        <div className="opg-error">❌ {viewer.error}</div>
      )}

      {viewer.data && (
        <div>
          <div className="opg-meta">
            ✅ Loaded {viewer.data.totalKeys} variables · {new Date(viewer.data.timestamp).toLocaleString("id-ID")}
          </div>

          <div className="opg-actions">
            <button className="opg-btn" onClick={viewer.revealAll}>
              👁 Reveal All
            </button>
            <button
              className={`opg-btn ${viewer.allCopied ? "success" : ""}`}
              onClick={viewer.copyAll}
            >
              {viewer.allCopied ? "✓ Copied!" : "📋 Copy All as .env"}
            </button>
          </div>

          {Object.entries(groups).map(([cat, entries]) => (
            <div className="opg-category" key={cat}>
              <div className="opg-cat-title">
                {CATEGORIES.find((c) => c.label === cat)?.emoji ?? "🔧"} {cat}
              </div>
              {entries.map(([key, val]) => {
                const isRevealed = viewer.allRevealed || viewer.revealed.has(key);
                return (
                  <div className="opg-row" key={key}>
                    <span className="opg-key">{key}</span>
                    <span
                      className={`opg-value ${isRevealed ? "" : "hidden"}`}
                      onClick={() => viewer.toggleReveal(key)}
                      title="Klik untuk toggle"
                    >
                      {isRevealed ? val : "••••••••••••••••"}
                    </span>
                    <button
                      className="opg-icon-btn"
                      onClick={() => viewer.toggleReveal(key)}
                      title={isRevealed ? "Sembunyikan" : "Tampilkan"}
                    >
                      {isRevealed ? "🙈" : "👁"}
                    </button>
                    <button
                      className="opg-icon-btn"
                      onClick={() => viewer.copyValue(key, val)}
                      title="Copy value"
                    >
                      {viewer.copied === key ? "✓" : "📋"}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}

          {viewer.data.dbConnectionUrl && (
            <div className="opg-db-section">
              <div className="opg-db-title">🔌 Database Connection URL (SOURCE)</div>
              <div className="opg-db-url">{viewer.data.dbConnectionUrl}</div>
              <button
                className={`opg-btn ${viewer.copied === "__DB_URL__" ? "success" : ""}`}
                onClick={viewer.copyDbUrl}
              >
                {viewer.copied === "__DB_URL__" ? "✓ Copied!" : "📋 Copy DB URL"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
