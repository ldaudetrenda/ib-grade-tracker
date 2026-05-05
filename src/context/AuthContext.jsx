import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInWithPopup,
} from 'firebase/auth';
import {
  doc, setDoc, getDoc, updateDoc, serverTimestamp, arrayUnion,
} from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (snap.exists()) {
            setProfile(snap.data());
            await updateDoc(doc(db, 'users', firebaseUser.uid), {
              lastActiveAt: serverTimestamp(),
            });
          }
        } catch (e) { /* ignore network errors */ }
      } else {
        setProfile(null);
      }
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  async function signUp(email, password, nickname) {
    // Throws Firebase auth errors — let the caller handle them
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const profileData = {
      uid: cred.user.uid,
      nickname: nickname.trim(),
      email: email.trim().toLowerCase(),
      createdAt: serverTimestamp(),
      lastActiveAt: serverTimestamp(),
      currentScore: 0,
      goalScore: 40,
      roomsJoined: [],
    };
    try {
      await setDoc(doc(db, 'users', cred.user.uid), profileData);
    } catch (firestoreErr) {
      console.error('Firestore profile write failed:', firestoreErr.code, firestoreErr.message);
      // Auth succeeded — don't block signup if Firestore write fails
    }
    setProfile(profileData);
    return cred.user;
  }

  async function logIn(email, password) {
    // Throws Firebase auth errors — let the caller handle them
    const cred = await signInWithEmailAndPassword(auth, email, password);
    try {
      const snap = await getDoc(doc(db, 'users', cred.user.uid));
      if (snap.exists()) {
        setProfile(snap.data());
        await updateDoc(doc(db, 'users', cred.user.uid), {
          lastActiveAt: serverTimestamp(),
        });
      }
    } catch (e) {
      console.error('Firestore profile fetch failed:', e.code, e.message);
    }
    return cred.user;
  }

  async function signInWithGoogle() {
    const cred = await signInWithPopup(auth, googleProvider);
    const { uid, displayName, email, photoURL } = cred.user;
    const userRef = doc(db, 'users', uid);
    try {
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        await updateDoc(userRef, {
          lastActiveAt: serverTimestamp(),
          photoURL: photoURL || null,
        });
        setProfile({ ...snap.data(), photoURL: photoURL || null });
      } else {
        const profileData = {
          uid,
          nickname: displayName || email.split('@')[0],
          email: email.toLowerCase(),
          photoURL: photoURL || null,
          createdAt: serverTimestamp(),
          lastActiveAt: serverTimestamp(),
          currentScore: 0,
          goalScore: 40,
          roomsJoined: [],
        };
        await setDoc(userRef, profileData);
        setProfile(profileData);
      }
    } catch (firestoreErr) {
      console.error('Firestore error after Google sign-in:', firestoreErr.code, firestoreErr.message);
    }
    return cred.user;
  }

  async function logOut() {
    await signOut(auth);
    setProfile(null);
  }

  async function syncScore(currentScore, goalScore) {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        currentScore,
        goalScore,
        lastActiveAt: serverTimestamp(),
      });
      setProfile(prev => prev ? { ...prev, currentScore, goalScore } : prev);
    } catch (e) { /* ignore */ }
  }

  async function addRoomToProfile(code) {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        roomsJoined: arrayUnion(code),
        lastActiveAt: serverTimestamp(),
      });
      setProfile(prev => prev
        ? { ...prev, roomsJoined: [...new Set([...(prev.roomsJoined || []), code])] }
        : prev
      );
    } catch (e) { /* ignore */ }
  }

  return (
    <AuthContext.Provider value={{ user, profile, authLoading, signUp, logIn, logOut, signInWithGoogle, syncScore, addRoomToProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
