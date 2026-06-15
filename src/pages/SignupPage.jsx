import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function SignupPage() {
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nickname: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  function set(field) {
    return e => setForm(prev => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.nickname.trim()) { setError('Please enter a nickname.'); return; }
    if (!form.email.trim()) { setError('Please enter your email.'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }

    setLoading(true);
    try {
      await signUp(form.email.trim(), form.password, form.nickname.trim());
      navigate('/');
    } catch (err) {
      const code = err.code || 'unknown';
      if (code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.');
      } else if (code === 'auth/invalid-email') {
        setError('Invalid email address.');
      } else if (code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.');
      } else {
        setError(`Error (${code}): ${err.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError('');
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      navigate('/');
    } catch (err) {
      const code = err.code || 'unknown';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        // user closed popup — no error to show
      } else if (code === 'auth/popup-blocked') {
        setError('Popup was blocked by the browser. Please allow popups for this site.');
      } else if (code === 'auth/account-exists-with-different-credential') {
        setError('An account already exists with this email using a different sign-in method.');
      } else if (code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized for Google Sign-In. Add it to Firebase → Authentication → Authorized domains.');
      } else if (code === 'auth/operation-not-allowed') {
        setError('Google Sign-In is not enabled. Enable it in Firebase → Authentication → Sign-in methods.');
      } else {
        setError(`Error (${code}): ${err.message || 'Unknown error'}`);
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: '1.5rem',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '3rem', height: '3rem', borderRadius: '12px',
            background: 'var(--primary)', marginBottom: '0.75rem',
          }}>
            <BookOpen size={22} color="white" />
          </div>
          <h1 style={{ fontSize: '1.4rem', marginBottom: '0.25rem' }}>Create Account</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Join IB Grade Tracker
          </p>
        </div>

        <div className="card">
          {/* Google button */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading || loading}
            style={googleBtnSt}
          >
            <GoogleIcon />
            {googleLoading ? 'Signing in…' : 'Continue with Google'}
          </button>

          <div style={dividerSt}>
            <span style={dividerLineSt} />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', padding: '0 0.75rem' }}>or sign up with email</span>
            <span style={dividerLineSt} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={labelSt}>Nickname</label>
              <input
                style={inputSt}
                placeholder="Your display name"
                value={form.nickname}
                onChange={set('nickname')}
                autoFocus
              />
            </div>
            <div>
              <label style={labelSt}>Email</label>
              <input
                type="email"
                style={inputSt}
                placeholder="your@email.com"
                value={form.email}
                onChange={set('email')}
              />
            </div>
            <div>
              <label style={labelSt}>Password</label>
              <input
                type="password"
                style={inputSt}
                placeholder="At least 6 characters"
                value={form.password}
                onChange={set('password')}
              />
            </div>
            <div>
              <label style={labelSt}>Confirm Password</label>
              <input
                type="password"
                style={inputSt}
                placeholder="Repeat your password"
                value={form.confirm}
                onChange={set('confirm')}
              />
            </div>

            {error && (
              <p style={{ color: 'var(--danger)', fontSize: '0.82rem', margin: 0 }}>{error}</p>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.65rem', fontSize: '0.9rem' }}
              disabled={loading || googleLoading}
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
              Login
            </Link>
          </p>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
            Continue without account →
          </Link>
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

const labelSt = {
  display: 'block', fontSize: '0.8rem', fontWeight: 600,
  color: 'var(--text-muted)', marginBottom: '0.35rem',
};

const inputSt = {
  width: '100%', padding: '0.55rem 0.75rem',
  border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
  fontSize: '0.875rem', fontFamily: 'inherit', outline: 'none',
  boxSizing: 'border-box',
};

const googleBtnSt = {
  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
  gap: '0.6rem', padding: '0.6rem 1rem',
  border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
  background: 'var(--surface)', color: 'var(--text)', fontSize: '0.875rem',
  fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer',
};

const dividerSt = {
  display: 'flex', alignItems: 'center', margin: '1rem 0',
};

const dividerLineSt = {
  flex: 1, height: '1px', background: 'var(--border)',
};
