"use client";

import { useState, useEffect, useRef } from "react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [documents, setDocuments] = useState<{ id: string; filename: string }[]>([]);
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [asking, setAsking] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const fetchDocuments = async () => {
    try {
      const res = await fetch("/api/documents");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error("Failed to load documents", error);
    }
  };

  useEffect(() => { fetchDocuments(); }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadMessage("Processing…");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        setUploadMessage(`✓ ${data.chunksProcessed} chunks indexed`);
        setCurrentDocId(data.documentId);
        setChatHistory([]);
        fetchDocuments();
      } else {
        setUploadMessage(`Error: ${data.error}`);
      }
    } catch {
      setUploadMessage("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleAsk = async () => {
    if (!question.trim() || !currentDocId) return;
    const userMsg = { role: "user" as const, text: question };
    setChatHistory((prev) => [...prev, userMsg, { role: "ai", text: "" }]);
    setQuestion("");
    setAsking(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userMsg.text, documentId: currentDocId }),
      });
      if (!res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunk = decoder.decode(value, { stream: true });
        setChatHistory((prev) => {
          const next = [...prev];
          const last = next.length - 1;
          next[last] = { ...next[last], text: next[last].text + chunk };
          return next;
        });
      }
    } catch {
      setChatHistory((prev) => [...prev, { role: "ai", text: "Connection error. Please try again." }]);
    } finally {
      setAsking(false);
    }
  };

  const handleSelectDocument = (id: string) => {
    setCurrentDocId(id);
    setChatHistory([]);
    setUploadMessage("");
  };

  const handleDeleteDocument = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this document?")) return;
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (currentDocId === id) { setCurrentDocId(null); setChatHistory([]); }
        fetchDocuments();
      }
    } catch { console.error("Delete error"); }
  };

  const activeDoc = documents.find((d) => d.id === currentDocId);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --navy-deep:    #020B18;
          --navy-base:    #041123;
          --navy-mid:     #071A35;
          --navy-light:   #0A2244;
          --navy-border:  #0E2E55;
          --navy-muted:   #122F5A;
          --emerald:      #10B981;
          --emerald-dim:  #0D9268;
          --emerald-glow: rgba(16,185,129,0.2);
          --emerald-soft: rgba(16,185,129,0.08);
          --emerald-hint: rgba(16,185,129,0.04);
          --text-primary: #E8F4F0;
          --text-muted:   #6B8FA8;
          --text-dim:     #3A6078;
          --danger:       #F43F5E;
          --danger-soft:  rgba(244,63,94,0.1);
        }

        html, body { height: 100%; overflow: hidden; }

        body {
          font-family: 'Syne', sans-serif;
          background: var(--navy-deep);
          color: var(--text-primary);
        }

        /* ── Layout Shell ── */
        .shell {
          display: flex;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
        }

        /* ══════════════════════════════════════
           SIDEBAR
        ══════════════════════════════════════ */
        .sidebar {
          width: 280px;
          flex-shrink: 0;
          background: var(--navy-base);
          border-right: 1px solid var(--navy-border);
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }

        /* Ambient glow top-left */
        .sidebar::before {
          content: '';
          position: absolute;
          top: -60px; left: -60px;
          width: 220px; height: 220px;
          background: radial-gradient(circle, rgba(16,185,129,0.07) 0%, transparent 70%);
          pointer-events: none;
        }

        .sidebar-header {
          padding: 22px 20px 18px;
          border-bottom: 1px solid var(--navy-border);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 4px;
        }
        .brand-icon {
          width: 28px; height: 28px;
          border-radius: 8px;
          background: var(--emerald-soft);
          border: 1px solid var(--emerald-glow);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .brand-icon svg { width: 14px; height: 14px; stroke: var(--emerald); }
        .brand-name {
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--text-primary);
        }
        .brand-sub {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          color: var(--text-dim);
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding-left: 38px;
        }

        /* Upload zone */
        .upload-zone {
          padding: 16px 16px 14px;
          border-bottom: 1px solid var(--navy-border);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .file-drop {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border: 1px dashed var(--navy-muted);
          border-radius: 10px;
          background: var(--navy-mid);
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
          overflow: hidden;
        }
        .file-drop:hover { border-color: var(--emerald-dim); background: var(--emerald-hint); }
        .file-drop input { display: none; }

        .file-drop-icon {
          width: 26px; height: 26px;
          border-radius: 6px;
          background: var(--navy-light);
          border: 1px solid var(--navy-border);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .file-drop-icon svg { width: 12px; height: 12px; stroke: var(--emerald); }

        .file-drop-text { overflow: hidden; }
        .file-drop-name {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .file-drop-hint {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          color: var(--text-dim);
          margin-top: 1px;
        }

        .btn-upload {
          width: 100%;
          padding: 9px 14px;
          background: var(--emerald);
          color: #020B18;
          border: none;
          border-radius: 9px;
          font-family: 'Syne', sans-serif;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 0.2s, box-shadow 0.2s;
        }
        .btn-upload:hover:not(:disabled) {
          background: #0ECF94;
          box-shadow: 0 0 16px var(--emerald-glow);
        }
        .btn-upload:disabled {
          background: var(--navy-muted);
          color: var(--text-dim);
          cursor: not-allowed;
        }

        .upload-msg {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: var(--emerald);
          letter-spacing: 0.04em;
          padding: 0 2px;
        }
        .upload-msg.error { color: var(--danger); }

        /* Doc list */
        .doc-list-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px 8px;
        }
        .doc-list-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--text-dim);
        }
        .doc-count {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          color: var(--emerald);
          background: var(--emerald-soft);
          border: 1px solid var(--emerald-glow);
          border-radius: 4px;
          padding: 1px 6px;
        }

        .doc-list {
          flex: 1;
          overflow-y: auto;
          padding: 0 10px 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          scrollbar-width: thin;
          scrollbar-color: var(--navy-muted) transparent;
        }
        .doc-list::-webkit-scrollbar { width: 3px; }
        .doc-list::-webkit-scrollbar-thumb { background: var(--navy-muted); border-radius: 2px; }

        .doc-item {
          position: relative;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 12px;
          border-radius: 9px;
          border: 1px solid transparent;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
          overflow: hidden;
        }
        .doc-item:hover { background: var(--navy-mid); border-color: var(--navy-border); }
        .doc-item.active {
          background: var(--emerald-soft);
          border-color: var(--emerald-glow);
        }
        .doc-item.active::before {
          content: '';
          position: absolute;
          left: 0; top: 20%; bottom: 20%;
          width: 2px;
          background: var(--emerald);
          border-radius: 2px;
        }

        .doc-icon {
          width: 24px; height: 24px;
          border-radius: 5px;
          background: var(--navy-light);
          border: 1px solid var(--navy-border);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .doc-item.active .doc-icon {
          background: var(--emerald-soft);
          border-color: var(--emerald-glow);
        }
        .doc-icon svg { width: 11px; height: 11px; stroke: var(--text-dim); }
        .doc-item.active .doc-icon svg { stroke: var(--emerald); }

        .doc-name {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
        }
        .doc-item.active .doc-name { color: var(--text-primary); font-weight: 600; }

        .doc-delete {
          flex-shrink: 0;
          width: 22px; height: 22px;
          border-radius: 5px;
          background: transparent;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-dim);
          opacity: 0;
          transition: opacity 0.15s, background 0.15s, color 0.15s;
        }
        .doc-item:hover .doc-delete { opacity: 1; }
        .doc-delete:hover { background: var(--danger-soft); color: var(--danger); }
        .doc-delete svg { width: 11px; height: 11px; stroke: currentColor; }

        .doc-empty {
          padding: 24px 12px;
          text-align: center;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: var(--text-dim);
          line-height: 1.7;
        }

        /* ══════════════════════════════════════
           MAIN PANEL
        ══════════════════════════════════════ */
        .main {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: var(--navy-deep);
          position: relative;
          overflow: hidden;
        }

        /* Grid background on main */
        .main::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(var(--navy-border) 1px, transparent 1px),
            linear-gradient(90deg, var(--navy-border) 1px, transparent 1px);
          background-size: 44px 44px;
          opacity: 0.14;
          pointer-events: none;
        }

        /* Chat top bar */
        .chat-topbar {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          height: 58px;
          border-bottom: 1px solid var(--navy-border);
          background: rgba(4,17,35,0.8);
          backdrop-filter: blur(10px);
          flex-shrink: 0;
        }

        .chat-topbar-left {
          display: flex;
          align-items: center;
          gap: 12px;
          overflow: hidden;
        }
        .chat-topbar-indicator {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: var(--text-dim);
          flex-shrink: 0;
        }
        .chat-topbar-indicator.live {
          background: var(--emerald);
          box-shadow: 0 0 8px var(--emerald);
          animation: blink 2s ease-in-out infinite;
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .chat-topbar-doc {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .chat-topbar-doc.empty { color: var(--text-dim); font-weight: 400; }
        .chat-topbar-badge {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-dim);
          background: var(--navy-mid);
          border: 1px solid var(--navy-border);
          border-radius: 5px;
          padding: 2px 7px;
          flex-shrink: 0;
        }

        .btn-clear {
          padding: 7px 14px;
          background: transparent;
          color: var(--text-muted);
          border: 1px solid var(--navy-border);
          border-radius: 8px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          transition: border-color 0.2s, color 0.2s, background 0.2s;
          white-space: nowrap;
        }
        .btn-clear:hover {
          border-color: var(--danger);
          color: var(--danger);
          background: var(--danger-soft);
        }

        /* Messages */
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 28px 32px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          position: relative;
          z-index: 1;
          scrollbar-width: thin;
          scrollbar-color: var(--navy-muted) transparent;
        }
        .chat-messages::-webkit-scrollbar { width: 4px; }
        .chat-messages::-webkit-scrollbar-thumb { background: var(--navy-muted); border-radius: 4px; }

        /* Empty state */
        .empty-chat {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 14px;
        }
        .empty-orb {
          width: 56px; height: 56px;
          border-radius: 16px;
          background: var(--navy-mid);
          border: 1px solid var(--navy-border);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .empty-orb svg { width: 24px; height: 24px; stroke: var(--text-dim); }
        .empty-title {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-muted);
        }
        .empty-sub {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: var(--text-dim);
          letter-spacing: 0.06em;
          text-align: center;
          max-width: 260px;
          line-height: 1.8;
        }

        /* Bubbles */
        .msg-row {
          display: flex;
          animation: rise 0.22s ease-out both;
        }
        @keyframes rise {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .msg-row.user { justify-content: flex-end; }
        .msg-row.ai   { justify-content: flex-start; }

        .bubble {
          max-width: 72%;
          padding: 13px 17px;
          border-radius: 16px;
          font-size: 14px;
          line-height: 1.65;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .bubble.user {
          background: var(--emerald);
          color: #020B18;
          font-weight: 500;
          border-bottom-right-radius: 4px;
        }
        .bubble.ai {
          background: var(--navy-base);
          border: 1px solid var(--navy-border);
          color: var(--text-primary);
          border-bottom-left-radius: 4px;
        }

        /* AI avatar strip */
        .ai-row { display: flex; align-items: flex-end; gap: 10px; }
        .ai-avatar {
          width: 28px; height: 28px;
          border-radius: 8px;
          background: var(--emerald-soft);
          border: 1px solid var(--emerald-glow);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-bottom: 4px;
        }
        .ai-avatar svg { width: 13px; height: 13px; stroke: var(--emerald); }

        /* Thinking */
        .thinking {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 13px 17px;
          background: var(--navy-base);
          border: 1px solid var(--navy-border);
          border-radius: 16px;
          border-bottom-left-radius: 4px;
        }
        .dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: var(--emerald);
          animation: bounce 1.2s ease-in-out infinite;
        }
        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }

        /* ── Input Bar ── */
        .input-bar {
          position: relative;
          z-index: 2;
          padding: 16px 24px;
          border-top: 1px solid var(--navy-border);
          background: rgba(4,17,35,0.9);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .input-wrap {
          flex: 1;
          display: flex;
          align-items: center;
          background: var(--navy-mid);
          border: 1px solid var(--navy-border);
          border-radius: 12px;
          padding: 0 16px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .input-wrap:focus-within {
          border-color: rgba(16,185,129,0.4);
          box-shadow: 0 0 0 3px var(--emerald-soft);
        }

        .chat-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          padding: 14px 0;
          font-family: 'Syne', sans-serif;
          font-size: 14px;
          color: var(--text-primary);
          caret-color: var(--emerald);
        }
        .chat-input::placeholder { color: var(--text-dim); }
        .chat-input:disabled { cursor: not-allowed; }

        .btn-send {
          width: 46px; height: 46px;
          border-radius: 12px;
          background: var(--emerald);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background 0.2s, box-shadow 0.2s, transform 0.1s;
        }
        .btn-send:hover:not(:disabled) {
          background: #0ECF94;
          box-shadow: 0 0 18px var(--emerald-glow);
          transform: translateY(-1px);
        }
        .btn-send:active:not(:disabled) { transform: translateY(0); }
        .btn-send:disabled { background: var(--navy-muted); cursor: not-allowed; }
        .btn-send svg { width: 18px; height: 18px; stroke: #020B18; }
        .btn-send:disabled svg { stroke: var(--text-dim); }
      `}</style>

      <div className="shell">

        {/* ── SIDEBAR ── */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <div className="brand">
              <div className="brand-icon">
                <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              </div>
              <span className="brand-name">DocMind</span>
            </div>
            <div className="brand-sub">AI · Document Intelligence</div>
          </div>

          {/* Upload */}
          <div className="upload-zone">
            <label className="file-drop">
              <input type="file" accept="application/pdf" onChange={handleFileChange} />
              <div className="file-drop-icon">
                <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <div className="file-drop-text">
                <div className="file-drop-name">{file ? file.name : "Choose PDF file"}</div>
                <div className="file-drop-hint">{file ? `${(file.size / 1024).toFixed(1)} KB` : "PDF · tap to browse"}</div>
              </div>
            </label>

            <button className="btn-upload" onClick={handleUpload} disabled={!file || uploading}>
              {uploading ? "Processing…" : "Upload & Index"}
            </button>

            {uploadMessage && (
              <div className={`upload-msg ${uploadMessage.startsWith("Error") ? "error" : ""}`}>
                {uploadMessage}
              </div>
            )}
          </div>

          {/* Doc list */}
          <div className="doc-list-header">
            <span className="doc-list-label">Library</span>
            {documents.length > 0 && (
              <span className="doc-count">{documents.length}</span>
            )}
          </div>

          <div className="doc-list">
            {documents.length === 0 ? (
              <div className="doc-empty">No documents yet.<br />Upload a PDF to begin.</div>
            ) : (
              documents.map((doc) => (
                <div
                  key={doc.id}
                  className={`doc-item ${currentDocId === doc.id ? "active" : ""}`}
                  onClick={() => handleSelectDocument(doc.id)}
                >
                  <div className="doc-icon">
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                  <span className="doc-name">{doc.filename}</span>
                  <button
                    className="doc-delete"
                    onClick={(e) => handleDeleteDocument(doc.id, e)}
                    title="Delete"
                  >
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* ── MAIN ── */}
        <section className="main">
          {/* Top bar */}
          <div className="chat-topbar">
            <div className="chat-topbar-left">
              <div className={`chat-topbar-indicator ${currentDocId ? "live" : ""}`} />
              <span className={`chat-topbar-doc ${!currentDocId ? "empty" : ""}`}>
                {activeDoc ? activeDoc.filename : "No document selected"}
              </span>
              {activeDoc && (
                <span className="chat-topbar-badge">Active</span>
              )}
            </div>
            {currentDocId && chatHistory.length > 0 && (
              <button
                className="btn-clear"
                onClick={() => { if (confirm("Clear this conversation?")) setChatHistory([]); }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {chatHistory.length === 0 ? (
              <div className="empty-chat">
                <div className="empty-orb">
                  <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                  </svg>
                </div>
                <div className="empty-title">
                  {currentDocId ? "Ready to answer" : "Select a document"}
                </div>
                <div className="empty-sub">
                  {currentDocId
                    ? "Ask any question about the selected document"
                    : "Choose a file from the library\nor upload a new PDF"}
                </div>
              </div>
            ) : (
              chatHistory.map((msg, i) => (
                <div key={i} className={`msg-row ${msg.role}`}>
                  {msg.role === "ai" ? (
                    <div className="ai-row">
                      <div className="ai-avatar">
                        <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                        </svg>
                      </div>
                      {msg.text === "" && asking ? (
                        <div className="thinking">
                          <div className="dot" /><div className="dot" /><div className="dot" />
                        </div>
                      ) : (
                        <div className="bubble ai">{msg.text}</div>
                      )}
                    </div>
                  ) : (
                    <div className="bubble user">{msg.text}</div>
                  )}
                </div>
              ))
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Input */}
          <div className="input-bar">
            <div className="input-wrap">
              <input
                className="chat-input"
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAsk()}
                disabled={!currentDocId}
                placeholder={currentDocId ? "Ask something about the document…" : "Select a document to begin"}
              />
            </div>
            <button
              className="btn-send"
              onClick={handleAsk}
              disabled={asking || !question.trim() || !currentDocId}
            >
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.769 59.769 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>
        </section>
      </div>
    </>
  );
}