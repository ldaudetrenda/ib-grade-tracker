import React, { useState, useEffect, useCallback } from 'react';
import {
  Trophy, Plus, LogIn, LogOut, ArrowLeft, Users, Copy, Check,
  Eye, EyeOff,
} from 'lucide-react';
import {
  collection, doc, setDoc, getDoc, onSnapshot, deleteDoc, serverTimestamp,
} from 'firebase/firestore';
import { db, FIREBASE_CONFIGURED } from '../firebase';
import { useApp, getTotalScore } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useRoomMeta } from '../hooks/useRoomMeta';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars O/0, I/1
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function RankIcon({ rank }) {
  if (rank === 1) return <span style={{ fontSize: '1.1rem' }}>🥇</span>;
  if (rank === 2) return <span style={{ fontSize: '1.1rem' }}>🥈</span>;
  if (rank === 3) return <span style={{ fontSize: '1.1rem' }}>🥉</span>;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: '1.6rem', height: '1.6rem', borderRadius: '50%',
      background: 'var(--bg-secondary)', color: 'var(--text-muted)',
      fontSize: '0.72rem', fontWeight: 700,
    }}>{rank}</span>
  );
}

function NeedsLabel({ score, goal }) {
  const diff = goal - score;
  if (diff <= 0) {
    return (
      <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Achieved</span>
    );
  }
  return (
    <span style={{
      fontSize: '0.75rem', fontWeight: 600, color: '#D97706',
      background: '#FEF3C7', padding: '0.15rem 0.4rem', borderRadius: 99,
    }}>+{diff}</span>
  );
}

function DeltaBadge({ delta }) {
  if (delta === null || delta === undefined) return <span style={{ color: 'var(--text-light)', fontSize: '0.8rem' }}>—</span>;
  if (delta === 0) return <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>±0</span>;
  const pos = delta > 0;
  return (
    <span style={{
      fontSize: '0.75rem', fontWeight: 700,
      color: pos ? '#16A34A' : '#DC2626',
      background: pos ? '#DCFCE7' : '#FEE2E2',
      padding: '0.15rem 0.4rem', borderRadius: 99,
    }}>
      {pos ? `+${delta}` : delta}
    </span>
  );
}

// ─── Not Configured Banner ────────────────────────────────────────────────────
function NotConfiguredBanner() {
  return (
    <div style={{
      background: '#FFFBEB', border: '1px solid #FCD34D',
      borderRadius: 'var(--radius)', padding: '1.25rem 1.5rem',
      marginBottom: '1.5rem',
    }}>
      <p style={{ fontWeight: 700, color: '#92400E', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
        Firebase not configured
      </p>
      <p style={{ color: '#92400E', fontSize: '0.82rem', lineHeight: 1.5, margin: 0 }}>
        To use Friends Leaderboard, you need a Firebase project.<br />
        1. Go to <strong>console.firebase.google.com</strong> → Create project<br />
        2. Add a Web app → copy the config<br />
        3. Enable <strong>Firestore Database</strong> (test mode is fine)<br />
        4. Paste your config into <strong>src/firebase.js</strong>
      </p>
    </div>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 999, padding: '1rem',
    }}>
      <div style={{
        background: 'white', borderRadius: 'var(--radius-lg)',
        padding: '1.75rem', width: '100%', maxWidth: '420px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{title}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '0.25rem' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputSt = {
  width: '100%', padding: '0.55rem 0.75rem',
  border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
  fontSize: '0.875rem', fontFamily: 'inherit', outline: 'none',
  boxSizing: 'border-box',
};

function VisibilityToggle({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      {[
        { val: 'total_only', label: 'Total score only', icon: <EyeOff size={13} /> },
        { val: 'full', label: 'Include subject grades', icon: <Eye size={13} /> },
      ].map(opt => (
        <button
          key={opt.val}
          onClick={() => onChange(opt.val)}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '0.35rem', padding: '0.5rem 0.5rem',
            border: `1.5px solid ${value === opt.val ? 'var(--primary)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-sm)', background: value === opt.val ? 'var(--primary-light)' : 'white',
            color: value === opt.val ? 'var(--primary)' : 'var(--text-muted)',
            fontSize: '0.75rem', fontWeight: value === opt.val ? 700 : 400, cursor: 'pointer',
          }}
        >
          {opt.icon} {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Create Room Modal ─────────────────────────────────────────────────────────
function CreateRoomModal({ onClose, onCreated, userId, defaultNickname, currentScore, currentGoal }) {
  const [roomName, setRoomName] = useState('');
  const [displayName, setDisplayName] = useState(defaultNickname || '');
  const [visibility, setVisibility] = useState('total_only');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!roomName.trim() || !displayName.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const code = generateRoomCode();
      const roomRef = doc(db, 'rooms', code);
      await setDoc(roomRef, {
        name: roomName.trim(),
        code,
        createdAt: serverTimestamp(),
      });
      const memberRef = doc(db, 'rooms', code, 'members', userId);
      await setDoc(memberRef, {
        displayName: displayName.trim(),
        score: currentScore,
        goalScore: currentGoal,
        visibility,
        lastQuarterScore: 0,
        joinedAt: serverTimestamp(),
      });
      onCreated(code, displayName.trim(), visibility);
    } catch (e) {
      setError('Failed to create room. Check your Firebase config.');
      setLoading(false);
    }
  }

  return (
    <Modal title="Create a Room" onClose={onClose}>
      <Field label="Room name">
        <input style={inputSt} placeholder="e.g. IB Class 2026" value={roomName} onChange={e => setRoomName(e.target.value)} />
      </Field>
      <Field label="Your display name">
        <input style={inputSt} placeholder="Your name or nickname" value={displayName} onChange={e => setDisplayName(e.target.value)} />
      </Field>
      <Field label="Visibility">
        <VisibilityToggle value={visibility} onChange={setVisibility} />
      </Field>
      {error && <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{error}</p>}
      <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleCreate} disabled={loading}>
        {loading ? 'Creating…' : 'Create Room'}
      </button>
    </Modal>
  );
}

// ─── Join Room Modal ──────────────────────────────────────────────────────────
function JoinRoomModal({ onClose, onJoined, userId, defaultNickname, currentScore, currentGoal }) {
  const [code, setCode] = useState('');
  const [displayName, setDisplayName] = useState(defaultNickname || '');
  const [visibility, setVisibility] = useState('total_only');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleJoin() {
    const trimCode = code.trim().toUpperCase();
    if (!trimCode || !displayName.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const roomRef = doc(db, 'rooms', trimCode);
      const snap = await getDoc(roomRef);
      if (!snap.exists()) {
        setError('Room not found. Check the code and try again.');
        setLoading(false);
        return;
      }
      const memberRef = doc(db, 'rooms', trimCode, 'members', userId);
      await setDoc(memberRef, {
        displayName: displayName.trim(),
        score: currentScore,
        goalScore: currentGoal,
        visibility,
        lastQuarterScore: 0,
        joinedAt: serverTimestamp(),
      });
      onJoined(trimCode, displayName.trim(), visibility);
    } catch (e) {
      setError('Failed to join room. Check your Firebase config.');
      setLoading(false);
    }
  }

  return (
    <Modal title="Join a Room" onClose={onClose}>
      <Field label="Room code">
        <input
          style={{ ...inputSt, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}
          placeholder="e.g. A3B7K2"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          maxLength={8}
        />
      </Field>
      <Field label="Your display name">
        <input style={inputSt} placeholder="Your name or nickname" value={displayName} onChange={e => setDisplayName(e.target.value)} />
      </Field>
      <Field label="Visibility">
        <VisibilityToggle value={visibility} onChange={setVisibility} />
      </Field>
      {error && <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{error}</p>}
      <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleJoin} disabled={loading}>
        {loading ? 'Joining…' : 'Join Room'}
      </button>
    </Modal>
  );
}

// ─── Room Card (in list) ──────────────────────────────────────────────────────
function RoomCard({ roomMeta, onOpen, onLeave }) {
  return (
    <div style={{
      background: 'white', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '1rem 1.25rem',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: '1rem', flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          width: '2.25rem', height: '2.25rem', borderRadius: 'var(--radius-sm)',
          background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Users size={16} color="var(--primary)" />
        </div>
        <div>
          <p style={{ fontWeight: 700, margin: 0, fontSize: '0.9rem' }}>{roomMeta.name || roomMeta.code}</p>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Code: <span style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.05em' }}>{roomMeta.code}</span>
            {' · '}as <em>{roomMeta.displayName}</em>
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button className="btn btn-primary btn-sm" onClick={() => onOpen(roomMeta.code)}>
          View Leaderboard
        </button>
        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => onLeave(roomMeta.code)}>
          <LogOut size={13} /> Leave
        </button>
      </div>
    </div>
  );
}

// ─── Leaderboard View ─────────────────────────────────────────────────────────
function LeaderboardView({ roomCode, userId, currentScore, currentGoal, onBack, onLeave }) {
  const [roomName, setRoomName] = useState('');
  const [members, setMembers] = useState([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Fetch room name
    getDoc(doc(db, 'rooms', roomCode)).then(snap => {
      if (snap.exists()) setRoomName(snap.data().name || roomCode);
    });

    // Subscribe to members
    const unsub = onSnapshot(
      collection(db, 'rooms', roomCode, 'members'),
      (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setMembers(list);
      },
      (err) => console.error('Leaderboard error:', err)
    );

    // Update own score whenever we enter the view
    const memberRef = doc(db, 'rooms', roomCode, 'members', userId);
    setDoc(memberRef, { score: currentScore, goalScore: currentGoal }, { merge: true });

    return unsub;
  }, [roomCode, userId, currentScore, currentGoal]);

  function copyCode() {
    navigator.clipboard.writeText(roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const sorted = [...members].sort((a, b) => (b.score || 0) - (a.score || 0));

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ padding: '0.35rem 0.75rem' }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Trophy size={18} color="var(--primary)" /> {roomName}
          </h2>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={copyCode}
          style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.05em' }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {' '}{roomCode}
        </button>
        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => onLeave(roomCode)}>
          <LogOut size={13} /> Leave
        </button>
      </div>

      {members.length === 0 ? (
        <div className="empty-state" style={{ padding: '2.5rem' }}>
          <Users size={32} style={{ margin: '0 auto 0.5rem', display: 'block', opacity: 0.3 }} />
          <p style={{ fontSize: '0.875rem' }}>No members yet. Share the code <strong>{roomCode}</strong> with friends!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {sorted.map((member, idx) => {
            const rank = idx + 1;
            const isMe = member.id === userId;
            const delta = member.lastQuarterScore
              ? (member.score || 0) - member.lastQuarterScore
              : null;

            return (
              <div
                key={member.id}
                style={{
                  background: isMe ? 'var(--primary-light)' : 'white',
                  border: `1.5px solid ${isMe ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius)',
                  padding: '0.875rem 1.25rem',
                  display: 'flex', alignItems: 'center', gap: '0.875rem', flexWrap: 'wrap',
                }}
              >
                {/* Rank */}
                <div style={{ minWidth: '2rem', textAlign: 'center' }}>
                  <RankIcon rank={rank} />
                </div>

                {/* Name */}
                <div style={{ flex: 1, minWidth: '6rem' }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: isMe ? 'var(--primary)' : 'var(--text)' }}>
                    {member.displayName}
                    {isMe && <span style={{ fontSize: '0.65rem', marginLeft: '0.4rem', opacity: 0.7, fontWeight: 400 }}>(you)</span>}
                  </p>
                  {member.visibility === 'full' && member.subjectGrades && (
                    <p style={{ margin: '0.1rem 0 0', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {member.subjectGrades}
                    </p>
                  )}
                </div>

                {/* Score */}
                <div style={{ textAlign: 'center', minWidth: '4rem' }}>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: isMe ? 'var(--primary)' : 'var(--text)' }}>
                    {member.score || 0}
                    <span style={{ fontSize: '0.7rem', fontWeight: 400, color: 'var(--text-muted)' }}>/45</span>
                  </p>
                  <p style={{ margin: 0, fontSize: '0.68rem', color: 'var(--text-muted)' }}>score</p>
                </div>

                {/* Goal */}
                <div style={{ textAlign: 'center', minWidth: '4rem' }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    {member.goalScore || '—'}
                    <span style={{ fontSize: '0.7rem', fontWeight: 400 }}>/45</span>
                  </p>
                  <p style={{ margin: 0, fontSize: '0.68rem', color: 'var(--text-muted)' }}>goal</p>
                </div>

                {/* Needs */}
                <div style={{ textAlign: 'center', minWidth: '4.5rem' }}>
                  <NeedsLabel score={member.score || 0} goal={member.goalScore || 45} />
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.68rem', color: 'var(--text-muted)' }}>to goal</p>
                </div>

                {/* Change */}
                <div style={{ textAlign: 'center', minWidth: '3.5rem' }}>
                  <DeltaBadge delta={delta} />
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.68rem', color: 'var(--text-muted)' }}>change</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '1rem', textAlign: 'center' }}>
        Share code <strong style={{ fontFamily: 'monospace' }}>{roomCode}</strong> with friends to invite them
      </p>
    </div>
  );
}

// ─── Login Required Banner ────────────────────────────────────────────────────
function LoginRequired() {
  return (
    <div style={{
      background: 'white', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '2.5rem', textAlign: 'center',
      marginTop: '1rem',
    }}>
      <Trophy size={36} style={{ margin: '0 auto 0.75rem', display: 'block', color: 'var(--primary)', opacity: 0.4 }} />
      <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.375rem' }}>Login to use Rooms</p>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
        Create or join rooms to compare your IB scores with friends.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
        <a href="/login" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>Login</a>
        <a href="/signup" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>Sign Up</a>
      </div>
    </div>
  );
}

// ─── Main Rooms Page ──────────────────────────────────────────────────────────
export default function Rooms() {
  const { state } = useApp();
  const { user, profile, addRoomToProfile } = useAuth();
  const { rooms, joinRoom, leaveRoom } = useRoomMeta();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [activeRoom, setActiveRoom] = useState(null);
  const [roomNames, setRoomNames] = useState({});

  const currentScore = getTotalScore(state.subjects, state.corePoints);
  const currentGoal = state.goalScore;
  const userId = user?.uid;
  const defaultNickname = profile?.nickname || '';

  // Fetch room names for the list
  useEffect(() => {
    rooms.forEach(async (r) => {
      if (!FIREBASE_CONFIGURED) return;
      try {
        const snap = await getDoc(doc(db, 'rooms', r.code));
        if (snap.exists()) {
          setRoomNames(prev => ({ ...prev, [r.code]: snap.data().name }));
        }
      } catch (e) { /* ignore */ }
    });
  }, [rooms]);

  function handleCreated(code, displayName, visibility) {
    joinRoom(code, displayName, visibility);
    addRoomToProfile(code);
    setShowCreate(false);
    setActiveRoom(code);
  }

  function handleJoined(code, displayName, visibility) {
    joinRoom(code, displayName, visibility);
    addRoomToProfile(code);
    setShowJoin(false);
    setActiveRoom(code);
  }

  async function handleLeave(code) {
    if (!FIREBASE_CONFIGURED || !userId) { leaveRoom(code); return; }
    try {
      await deleteDoc(doc(db, 'rooms', code, 'members', userId));
    } catch (e) { /* ignore */ }
    leaveRoom(code);
    if (activeRoom === code) setActiveRoom(null);
  }

  // ── Leaderboard view
  if (activeRoom && userId) {
    return (
      <div className="main-content container fade-in">
        <LeaderboardView
          roomCode={activeRoom}
          userId={userId}
          currentScore={currentScore}
          currentGoal={currentGoal}
          onBack={() => setActiveRoom(null)}
          onLeave={handleLeave}
        />
      </div>
    );
  }

  // ── Rooms list
  return (
    <div className="main-content container fade-in">
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h1 style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Trophy size={22} color="var(--primary)" /> Friends Leaderboard
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0 }}>
              Compare your IB scores with classmates in real time
            </p>
          </div>
          {user && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowJoin(true)}>
                <LogIn size={14} /> Join Room
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
                <Plus size={14} /> Create Room
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Not logged in */}
      {!user && <LoginRequired />}

      {/* Rooms list */}
      {user && (
        rooms.length === 0 ? (
          <div className="empty-state" style={{ padding: '3rem' }}>
            <Trophy size={36} style={{ margin: '0 auto 0.75rem', display: 'block', opacity: 0.25 }} />
            <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>No rooms yet</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
              Create a room or join one with a friend's code to start comparing scores.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {rooms.map(r => (
              <RoomCard
                key={r.code}
                roomMeta={{ ...r, name: roomNames[r.code] }}
                onOpen={setActiveRoom}
                onLeave={handleLeave}
              />
            ))}
          </div>
        )
      )}

      {/* Modals */}
      {showCreate && user && (
        <CreateRoomModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
          userId={userId}
          defaultNickname={defaultNickname}
          currentScore={currentScore}
          currentGoal={currentGoal}
        />
      )}
      {showJoin && user && (
        <JoinRoomModal
          onClose={() => setShowJoin(false)}
          onJoined={handleJoined}
          userId={userId}
          defaultNickname={defaultNickname}
          currentScore={currentScore}
          currentGoal={currentGoal}
        />
      )}
    </div>
  );
}
