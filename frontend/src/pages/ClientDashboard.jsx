import { useEffect, useRef, useState, useCallback } from "react";
import api from "../api";
import "./ClientDashboard.css";

// ════════════════════════════════════════════════════════════
//  FONCTIONS UTILITAIRES
// ════════════════════════════════════════════════════════════

// Retourne les 2 premières lettres de l'email en majuscules (pour l'avatar)
function initials(email = "") {
  return email.slice(0, 2).toUpperCase();
}

// Formate une date ISO en format lisible français (ex: "20 févr. 22:15")
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

// Convertit des secondes en format mm:ss (ex: 75 → "1:15")
function formatDuration(seconds = 0) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ════════════════════════════════════════════════════════════
//  COMPOSANT : WAVEFORM (visualisation audio décorative)
// ════════════════════════════════════════════════════════════

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

// ════════════════════════════════════════════════════════════
//  COMPOSANT : LECTEUR AUDIO
//  - Marque le message comme "lu" dès le début de la lecture
//  - Appelle onRead(messageId) pour mettre à jour l'état parent
// ════════════════════════════════════════════════════════════

function MessagePlayer({ audioUrl, messageId, onRead }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // Evite d'appeler l'API plusieurs fois pour le même message
  const hasMarkedRead = useRef(false);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
    } else {
      a.play();
      // Marque comme lu dès le premier appui sur play
      if (!hasMarkedRead.current) {
        hasMarkedRead.current = true;
        api
          .patch(`/messages/${messageId}/read`)
          .then(() => onRead && onRead(messageId))
          .catch(() => {
            // Si l'API échoue, on remet à false pour réessayer
            hasMarkedRead.current = false;
          });
      }
    }
    setPlaying(!playing);
  };

  return (
    <div className="audio-player">
      {/* Bouton play/pause */}
      <button className="audio-player__btn" onClick={toggle} type="button">
        {playing ? "⏸" : "▶"}
      </button>

      {/* Waveform décorative */}
      <Waveform played={playing} />

      {/* Temps écoulé / durée totale */}
      <span className="audio-player__time">
        {duration
          ? `${formatDuration(currentTime)} / ${formatDuration(duration)}`
          : "0:00"}
      </span>

      {/* Élément audio HTML natif (caché, contrôlé par le bouton) */}
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

// ════════════════════════════════════════════════════════════
//  COMPOSANT : CARTE DE MESSAGE
//  - Affiche le badge "non lu" si status === "unread"
//  - Passe onRead au lecteur pour mettre à jour le statut
// ════════════════════════════════════════════════════════════

function MessageCard({ msg, onRead }) {
  const isUnread = msg.status === "unread";
  return (
    <div className={`msg-card ${isUnread ? "msg-card--unread" : ""}`}>
      {/* En-tête : avatar, expéditeur, date, durée */}
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

      {/* Lecteur audio ou message d'indisponibilité */}
      {msg.audio_url ? (
        <MessagePlayer
          audioUrl={msg.audio_url}
          messageId={msg.id}
          onRead={onRead}
        />
      ) : (
        <div
          className="audio-player"
          style={{
            justifyContent: "center",
            color: "var(--text-muted)",
            fontSize: "0.85rem",
          }}
        >
          Fichier audio non disponible
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  HOOK : ENREGISTREUR AUDIO
// ════════════════════════════════════════════════════════════

function useRecorder() {
  // États : idle (prêt), recording (en cours), done (terminé)
  const [state, setState] = useState("idle");
  const [blob, setBlob] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const mediaRecorder = useRef(null);
  const chunks = useRef([]);
  const timerRef = useRef(null);

  // Démarre l'enregistrement
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

  // Arrête l'enregistrement
  const stop = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      mediaRecorder.current.stop();
    }
    clearInterval(timerRef.current);
  }, []);

  // Réinitialise tout
  const reset = useCallback(() => {
    stop();
    setBlob(null);
    setState("idle");
    setElapsed(0);
  }, [stop]);

  useEffect(() => () => clearInterval(timerRef.current), []);

  return { state, blob, elapsed, start, stop, reset };
}

// ════════════════════════════════════════════════════════════
//  COMPOSANT PRINCIPAL : TABLEAU DE BORD CLIENT
// ════════════════════════════════════════════════════════════

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

  // ── Chargement de l'utilisateur connecté ──────────────────
  useEffect(() => {
    api
      .get("/auth/me")
      .then((r) => setMe(r.data))
      .catch(() => {
        window.location.href = "/";
      });
  }, []);

  // ── Chargement de la liste des destinataires ──────────────
  useEffect(() => {
    api
      .get("/users")
      .then((r) => setUsers(r.data || []))
      .catch(() => setUsers([]));
  }, []);

  // ── Chargement des messages reçus ─────────────────────────
  const loadMessages = useCallback(() => {
    setLoadingMsgs(true);
    api
      .get("/messages")
      .then((r) => setMessages(r.data || []))
      .catch(() => setMessages([]))
      .finally(() => setLoadingMsgs(false));
  }, []);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // ── URL de prévisualisation après enregistrement ──────────
  useEffect(() => {
    if (recorder.blob) {
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
      previewUrl.current = URL.createObjectURL(recorder.blob);
    }
  }, [recorder.blob]);

  // ── Marque un message comme lu (appelé par MessagePlayer) ──
  // Met à jour le statut localement sans recharger toute la liste
  const handleRead = useCallback((messageId) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, status: "read" } : m))
    );
  }, []);

  // ── Gestion du bouton d'enregistrement ────────────────────
  const handleRecord = () => {
    if (recorder.state === "idle") recorder.start();
    else if (recorder.state === "recording") recorder.stop();
    else recorder.reset();
  };

  // ── Envoi du message vocal ─────────────────────────────────
  const handleSend = async () => {
    if (!recorder.blob) return;

    if (!recipientId) {
      setBanner({ type: "error", text: "Veuillez sélectionner un destinataire." });
      return;
    }

    setSending(true);
    setBanner({ type: "", text: "" });

    try {
      // NE PAS forcer le Content-Type — axios gère le boundary automatiquement
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

  // ── Déconnexion ───────────────────────────────────────────
  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  // Exclut l'utilisateur connecté de la liste des destinataires
  const otherUsers = users.filter((u) => u.id !== me?.id);
  const unreadCount = messages.filter((m) => m.status === "unread").length;

  // ════════════════════════════════════════════════════════
  //  RENDU
  // ════════════════════════════════════════════════════════
  return (
    <div className="client-dashboard">

      {/* ── BARRE DE NAVIGATION SUPÉRIEURE ── */}
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

      {/* ── CONTENU PRINCIPAL (2 colonnes) ── */}
      <main className="client-main">

        {/* ── COLONNE GAUCHE : BOÎTE DE RÉCEPTION ── */}
        <div className="inbox-panel">
          <div className="inbox-header">
            <p className="section-title">Boîte de réception</p>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {/* Badge messages non lus — se met à jour automatiquement */}
              {unreadCount > 0 && (
                <span className="inbox-badge">
                  🔵 {unreadCount} nouveau{unreadCount > 1 ? "x" : ""}
                </span>
              )}
              <button
                className="inbox-refresh"
                onClick={loadMessages}
                title="Actualiser"
              >
                ↻
              </button>
            </div>
          </div>

          <div className="inbox-list">
            {loadingMsgs ? (
              // Squelettes de chargement
              [1, 2, 3].map((i) => (
                <div key={i} className="skeleton skeleton-card" />
              ))
            ) : messages.length === 0 ? (
              // État vide
              <div className="inbox-empty">
                <div className="inbox-empty__icon">📭</div>
                <p className="inbox-empty__text">
                  Aucun message reçu pour l'instant.
                </p>
              </div>
            ) : (
              // Liste des messages — onRead met à jour le statut localement
              messages.map((msg) => (
                <MessageCard key={msg.id} msg={msg} onRead={handleRead} />
              ))
            )}
          </div>
        </div>

        {/* ── COLONNE DROITE : PANNEAU D'ENVOI ── */}
        <aside className="send-panel">

          {/* Statistiques */}
          <div className="stats-card">
            <div className="stat">
              <span className="stat__value">{messages.length}</span>
              <span className="stat__label">Reçus</span>
            </div>
            <div className="stat">
              {/* Ce compteur diminue automatiquement quand on écoute */}
              <span className="stat__value">{unreadCount}</span>
              <span className="stat__label">Non lus</span>
            </div>
          </div>

          {/* Formulaire d'envoi */}
          <div className="send-card">
            <p className="section-title" style={{ marginBottom: "1.25rem" }}>
              Envoyer un message vocal
            </p>

            {/* Bannière succès ou erreur */}
            {banner.text && (
              <div
                className={`banner banner--${banner.type}`}
                style={{ marginBottom: "1rem" }}
              >
                {banner.text}
              </div>
            )}

            {/* Sélecteur de destinataire */}
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

            {/* Zone d'enregistrement audio */}
            <div
              className={`recorder ${
                recorder.state === "recording"
                  ? "recorder--recording"
                  : recorder.state === "done"
                  ? "recorder--has-audio"
                  : ""
              }`}
            >
              {/* Bouton principal : démarrer / arrêter / recommencer */}
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

              {/* Minuterie pendant l'enregistrement */}
              {recorder.state === "recording" && (
                <div className="recorder__timer">
                  {formatDuration(recorder.elapsed)}
                </div>
              )}

              {/* Durée finale après enregistrement */}
              {recorder.state === "done" && (
                <div className="recorder__timer recorder__timer--done">
                  ✓ {formatDuration(recorder.elapsed)}
                </div>
              )}

              {/* Instruction contextuelle */}
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

              {/* Prévisualisation avant envoi */}
              {recorder.state === "done" && previewUrl.current && (
                <div className="recorder__preview">
                  <audio controls src={previewUrl.current} />
                </div>
              )}
            </div>

            {/* Boutons Annuler / Envoyer */}
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