import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, LayoutDashboard, Settings as SettingsIcon, Menu, X, Trophy, UserCircle, LogOut, Info, GraduationCap } from 'lucide-react';
import { useApp, getTotalScore } from './context/AppContext';
import { logEvent } from './analytics';
import { AuthProvider, useAuth } from './context/AuthContext';
import Setup from './pages/Setup';
import Dashboard from './pages/Dashboard';
import SubjectDetail from './pages/SubjectDetail';
import Settings from './pages/Settings';
import Rooms from './pages/Rooms';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import HowItWorksPage from './pages/HowItWorksPage';
import DreamUniversity from './pages/DreamUniversity';
import ImportPDF from './pages/ImportPDF';

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
  const { state } = useApp();
  const { user, profile, logOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const currentTotal = getTotalScore(state.subjects, state.corePoints);

  const isActive = (path) => location.pathname === path;

  async function handleLogout() {
    await logOut();
    navigate('/');
    setMenuOpen(false);
  }

  const navLinks = (
    <>
      <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}
        style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
        onClick={() => setMenuOpen(false)}>
        <LayoutDashboard size={15} /> Dashboard
      </Link>
      <Link to="/rooms" className={`nav-link ${isActive('/rooms') ? 'active' : ''}`}
        style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
        onClick={() => setMenuOpen(false)}>
        <Trophy size={15} /> Rooms
      </Link>
      <Link to="/dream-university" className={`nav-link ${isActive('/dream-university') ? 'active' : ''}`}
        style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
        onClick={() => setMenuOpen(false)}>
        <GraduationCap size={15} /> Dream University
      </Link>
      <Link to="/how-it-works" className={`nav-link ${isActive('/how-it-works') ? 'active' : ''}`}
        style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
        onClick={() => setMenuOpen(false)}>
        <Info size={15} /> How It Works
      </Link>
      <Link to="/settings" className={`nav-link ${isActive('/settings') ? 'active' : ''}`}
        style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
        onClick={() => setMenuOpen(false)}>
        <SettingsIcon size={15} /> Settings
      </Link>
    </>
  );

  return (
    <nav className="navbar" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand" onClick={() => setMenuOpen(false)}>
          <BookOpen size={22} />
          IB Grade Tracker
        </Link>

        {/* Score pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.375rem',
          background: 'var(--primary-light)', color: 'var(--primary)',
          padding: '0.375rem 0.75rem', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 700,
        }}>
          <span>{currentTotal}</span>
          <span style={{ color: 'var(--text-light)', fontWeight: 400 }}>/45</span>
        </div>

        {/* Desktop nav */}
        <div className="navbar-nav">
          {navLinks}

          {/* Auth section */}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '0.25rem' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.3rem 0.75rem', borderRadius: '100px',
                background: 'var(--bg-secondary)', fontSize: '0.8rem', fontWeight: 600,
              }}>
                <UserCircle size={14} color="var(--text-muted)" />
                <span style={{ color: 'var(--text)' }}>{profile?.nickname || user.email}</span>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.375rem', marginLeft: '0.25rem' }}>
              <Link to="/login" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>Login</Link>
              <Link to="/signup" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>Sign Up</Link>
            </div>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="hamburger"
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Toggle menu"
          style={{ display: 'none' }}
        >
          {menuOpen ? <X size={22} color="var(--text-muted)" /> : <Menu size={22} color="var(--text-muted)" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{
          background: 'white', borderBottom: '1px solid var(--border)',
          padding: '0.75rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem',
        }}>
          {navLinks}
          {user ? (
            <>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', padding: '0.4rem 0', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <UserCircle size={14} /> {profile?.nickname || user.email}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}
                style={{ justifyContent: 'flex-start', color: 'var(--danger)', gap: '0.375rem' }}>
                <LogOut size={14} /> Logout
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.25rem' }}>
              <Link to="/login" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>Login</Link>
              <Link to="/signup" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>Sign Up</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

// ─── Inner App (needs AuthContext) ────────────────────────────────────────────
function AppInner() {
  const { state } = useApp();

  useEffect(() => { logEvent('app_opened'); }, []);

  if (!state.isSetupComplete) {
    return <Setup />;
  }

  return (
    <div>
      <Navbar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/subject/:id" element={<SubjectDetail />} />
        <Route path="/tok" element={<SubjectDetail />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/setup/edit" element={<Setup editMode />} />
        <Route path="/import" element={<ImportPDF />} />
        <Route path="/rooms" element={<Rooms />} />
        <Route path="/dream-university" element={<DreamUniversity />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="*" element={<Dashboard />} />
      </Routes>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
