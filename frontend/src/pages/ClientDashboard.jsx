import { useEffect, useRef, useState, useCallback } from "react";
import api from "../api";
import "./ClientDashboard.css";

// ── helpers ──────────────────────────────────────────────────
function initials(email = "") {
  return email.slice(0, 2).toUpperCase();
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(seconds = 0) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ── Fake waveform bars (visual only) ──────────────────────────
const BARS = 30;
function Waveform({ played = false }) {
  const heights = useRef(
    Array.from({ length: BARS }, () => 20 + Math.random() * 80)
  );
  return (
    <div className="audio-player__waveform">
      {heights.current.map((h, i) => (
        <div
          key={i}
          className={`audio-player__bar ${
            played && i < BARS / 2 ? "audio-player__bar--played" : ""
          }`}
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

// ── Mini audio player per message ────────────────────────────
function MessagePlayer({ audioUrl }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
    } else {
      a.play();
    }
    setPlaying(!playing);
  };

  return (
    <div className="audio-player">
      <button className="audio-player__btn" onClick={toggle} type="button">
        {playing ? "⏸" : "▶"}
      </button>
      <Waveform played={playing} />
      <span className="audio-player__time">
        {duration
          ? `${formatDuration(currentTime)} / ${formatDuration(duration)}`
          : "0:00"}
      </span>
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        onEnded={() => setPlaying(false)}
      />
    </div>
  );
}

// ── Message card ──────────────────────────────────────────────
function MessageCard({ msg }) {
  const isUnread = msg.status === "unread";
  return (
    <div className={`msg-card ${isUnread ? "msg-card--unread" : ""}`}>
      <div className="msg-card__top">
        <div className="msg-card__avatar">{initials(msg.sender_email)}</div>
        <div className="msg-card__meta">
          <div className="msg-card__from">{msg.sender_email}</div>
          <div className="msg-card__date">{formatDate(msg.created_at)}</div>
        </div>
        {msg.duration_seconds != null && (
          <div className="msg-card__duration">
            🎙 {formatDuration(msg.duration_seconds)}
          </div>
        )}
      </div>
      {msg.audio_url ? (
        <MessagePlayer audioUrl={msg.audio_url} />
      ) : (
        <div className="audio-player" style={{ justifyContent: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
          Fichier audio non disponible
        </div>
      )}
    </div>
  );
}

// ── Recorder hook ──────────────────────────────────────────────
function useRecorder() {
  const [state, setState] = useState("idle"); // idle | recording | done
  const [blob, setBlob] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const mediaRecorder = useRef(null);
  const chunks = useRef([]);
  const timerRef = useRef(null);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorder.current = mr;
      chunks.current = [];
      mr.ondataavailable = (e) => chunks.current.push(e.data);
      mr.onstop = () => {
        const b = new Blob(chunks.current, { type: "audio/webm" });
        setBlob(b);
        setState("done");
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      setState("recording");
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch {
      alert("Accès au microphone refusé. Veuillez autoriser le microphone.");
    }
  }, []);

  const stop = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      mediaRecorder.current.stop();
    }
    clearInterval(timerRef.current);
  }, []);

  const reset = useCallback(() => {
    stop();
    setBlob(null);
    setState("idle");
    setElapsed(0);
  }, [stop]);

  useEffect(() => () => clearInterval(timerRef.current), []);

  return { state, blob, elapsed, start, stop, reset };
}

// ── Main component ────────────────────────────────────────────
export default function ClientDashboard() {
  const [me, setMe] = useState(null);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const [recipientId, setRecipientId] = useState("");
  const [sending, setSending] = useState(false);
  const [banner, setBanner] = useState({ type: "", text: "" });
  const recorder = useRecorder();
  const previewUrl = useRef(null);

  // Load current user
  useEffect(() => {
    api.get("/auth/me").then((r) => {
      setMe(r.data);
    }).catch(() => {
      window.location.href = "/";
    });
  }, []);

  // Load recipients (other clients) for the selector
  useEffect(() => {
    api
      .get("/users/recipients")
      .then((r) => setUsers(r.data || []))
      .catch(() => setUsers([]));
  }, []);

  const loadMessages = useCallback(() => {
    setLoadingMsgs(true);
    api.get("/messages")
      .then((r) => setMessages(r.data || []))
      .catch(() => setMessages([]))
      .finally(() => setLoadingMsgs(false));
  }, []);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Create preview URL when recorder is done
  useEffect(() => {
    if (recorder.blob) {
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
      previewUrl.current = URL.createObjectURL(recorder.blob);
    }
  }, [recorder.blob]);

  const handleRecord = () => {
    if (recorder.state === "idle") recorder.start();
    else if (recorder.state === "recording") recorder.stop();
    else recorder.reset();
  };

  const handleSend = async () => {
    if (!recorder.blob) return;
    if (!recipientId) {
      setBanner({ type: "error", text: "Veuillez sélectionner un destinataire." });
      return;
    }
    setSending(true);
    setBanner({ type: "", text: "" });
    try {
      const formData = new FormData();
      formData.append("audio", recorder.blob, "message.webm");
      formData.append("receiver_id", recipientId);
      await api.post("/messages", formData);
      setBanner({ type: "success", text: "Message envoyé avec succès !" });
      recorder.reset();
      loadMessages();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        `Erreur ${err.response?.status || ""}`.trim() ||
        "Erreur lors de l'envoi.";
      setBanner({ type: "error", text: msg });
    } finally {
      setSending(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  const otherUsers = users;
  const unreadCount = messages.filter((m) => m.status === "unread").length;

  return (
    <div className="client-dashboard">
      {/* Topbar */}
      <header className="client-topbar">
        <div className="client-topbar__brand">
          <div className="client-topbar__logo">🎙</div>
          <span className="client-topbar__name">Moustass</span>
        </div>
        <div className="client-topbar__right">
          {me && (
            <div className="client-topbar__user">
              <div className="client-topbar__avatar">{initials(me.email)}</div>
              <span>{me.email}</span>
            </div>
          )}
          <button className="client-topbar__logout" onClick={handleLogout}>
            Déconnexion
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="client-main">
        {/* ── Inbox ── */}
        <div className="inbox-panel">
          <div className="inbox-header">
            <p className="section-title">Boîte de réception</p>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {unreadCount > 0 && (
                <span className="inbox-badge">🔵 {unreadCount} nouveau{unreadCount > 1 ? "x" : ""}</span>
              )}
              <button className="inbox-refresh" onClick={loadMessages} title="Actualiser">
                ↻
              </button>
            </div>
          </div>

          <div className="inbox-list">
            {loadingMsgs ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="skeleton skeleton-card" />
              ))
            ) : messages.length === 0 ? (
              <div className="inbox-empty">
                <div className="inbox-empty__icon">📭</div>
                <p className="inbox-empty__text">Aucun message reçu pour l'instant.</p>
              </div>
            ) : (
              messages.map((msg) => <MessageCard key={msg.id} msg={msg} />)
            )}
          </div>
        </div>

        {/* ── Send panel ── */}
        <aside className="send-panel">
          {/* Stats */}
          <div className="stats-card">
            <div className="stat">
              <span className="stat__value">{messages.length}</span>
              <span className="stat__label">Reçus</span>
            </div>
            <div className="stat">
              <span className="stat__value">{unreadCount}</span>
              <span className="stat__label">Non lus</span>
            </div>
          </div>

          {/* Send card */}
          <div className="send-card">
            <p className="section-title" style={{ marginBottom: "1.25rem" }}>
              Envoyer un message vocal
            </p>

            {banner.text && (
              <div className={`banner banner--${banner.type}`} style={{ marginBottom: "1rem" }}>
                {banner.text}
              </div>
            )}

            <div className="send-field">
              <label className="send-label" htmlFor="recipient">
                Destinataire
              </label>
              <select
                id="recipient"
                className="send-select"
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
              >
                <option value="">— Choisir un utilisateur —</option>
                {otherUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Recorder */}
            <div
              className={`recorder ${
                recorder.state === "recording"
                  ? "recorder--recording"
                  : recorder.state === "done"
                  ? "recorder--has-audio"
                  : ""
              }`}
            >
              <button
                type="button"
                className={`recorder__btn recorder__btn--${
                  recorder.state === "idle"
                    ? "idle"
                    : recorder.state === "recording"
                    ? "recording"
                    : "done"
                }`}
                onClick={handleRecord}
                title={
                  recorder.state === "idle"
                    ? "Démarrer l'enregistrement"
                    : recorder.state === "recording"
                    ? "Arrêter"
                    : "Recommencer"
                }
              >
                {recorder.state === "idle"
                  ? "🎙"
                  : recorder.state === "recording"
                  ? "⏹"
                  : "🔄"}
              </button>

              {recorder.state === "recording" && (
                <div className="recorder__timer">{formatDuration(recorder.elapsed)}</div>
              )}

              {recorder.state === "done" && (
                <div className="recorder__timer recorder__timer--done">
                  ✓ {formatDuration(recorder.elapsed)}
                </div>
              )}

              <div className="recorder__status">
                {recorder.state === "idle" && (
                  <>Appuyez pour <strong>enregistrer</strong></>
                )}
                {recorder.state === "recording" && (
                  <>Enregistrement en cours… appuyez pour <strong>arrêter</strong></>
                )}
                {recorder.state === "done" && (
                  <>Prêt à envoyer — ou recommencez</>
                )}
              </div>

              {recorder.state === "done" && previewUrl.current && (
                <div className="recorder__preview">
                  <audio controls src={previewUrl.current} />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="send-actions" style={{ marginTop: "1rem" }}>
              {recorder.state === "done" && (
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={recorder.reset}
                  disabled={sending}
                >
                  Annuler
                </button>
              )}
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleSend}
                disabled={recorder.state !== "done" || sending || !recipientId}
              >
                {sending ? "Envoi…" : "Envoyer →"}
              </button>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}