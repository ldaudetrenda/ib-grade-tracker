import { useState, useCallback } from 'react';

const STORAGE_KEY = 'ib_rooms_meta_v1';

function generateUserId() {
  return 'u_' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
}

function loadMeta() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return null;
}

function saveMeta(meta) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
}

function getOrCreateMeta() {
  const existing = loadMeta();
  if (existing) return existing;
  const fresh = { userId: generateUserId(), rooms: [] };
  saveMeta(fresh);
  return fresh;
}

export function useRoomMeta() {
  const [meta, setMeta] = useState(() => getOrCreateMeta());

  const joinRoom = useCallback((code, displayName, visibility) => {
    setMeta(prev => {
      const alreadyIn = prev.rooms.some(r => r.code === code);
      if (alreadyIn) return prev;
      const updated = {
        ...prev,
        rooms: [...prev.rooms, { code, displayName, visibility }],
      };
      saveMeta(updated);
      return updated;
    });
  }, []);

  const leaveRoom = useCallback((code) => {
    setMeta(prev => {
      const updated = { ...prev, rooms: prev.rooms.filter(r => r.code !== code) };
      saveMeta(updated);
      return updated;
    });
  }, []);

  const getRoomMembership = useCallback((code) => {
    return meta.rooms.find(r => r.code === code) || null;
  }, [meta.rooms]);

  return {
    userId: meta.userId,
    rooms: meta.rooms,
    joinRoom,
    leaveRoom,
    getRoomMembership,
  };
}
