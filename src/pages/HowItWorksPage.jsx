import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logEvent } from '../analytics';
import { ArrowLeft, BookOpen, Target, BarChart2, Award } from 'lucide-react';

function getSteps() {
  return [
    {
      icon: <BookOpen size={20} color="var(--primary)" />,
      title: 'Open your grade portal',
      desc: 'Access ManageBac or any other school system where your summative grades are listed.',
    },
    {
      icon: <Target size={20} color="var(--primary)" />,
      title: 'Add your grades',
      desc: 'Copy your summative grades and enter them into IB Grade Tracker, quarter by quarter, for each subject.',
    },
    {
      icon: <BarChart2 size={20} color="var(--primary)" />,
      title: 'Track your progress',
      desc: 'The app automatically calculates averages, predicted grades, and your total IB score in real time.',
    },
    {
      icon: <Award size={20} color="var(--primary)" />,
      title: 'Reach your goal',
      desc: 'Set subject goals, monitor how far you are from your IB target, and adjust your strategy as needed.',
    },
  ];
}

export function HowItWorksSection() {
  const steps = getSteps();
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{
        background: 'white', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '1.75rem',
      }}>
        <h2 style={{ marginBottom: '0.5rem', fontSize: '1.15rem' }}>How It Works</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.65, marginBottom: '1.5rem', maxWidth: '680px' }}>
          I created this app to help IB Diploma Programme students stay organized and track their
          progress throughout the two years of IB. Instead of keeping grades spread across your school
          portal, spreadsheets, or personal notes, you can organize everything in one place.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {steps.map((s, i) => (
            <div key={i} style={{
              background: 'var(--bg)', borderRadius: 'var(--radius-sm)',
              padding: '1rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '2rem', height: '2rem', borderRadius: '50%',
                  background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>{s.icon}</div>
                <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--primary)' }}>Step {i + 1}</span>
              </div>
              <p style={{ fontWeight: 700, fontSize: '0.875rem', margin: 0 }}>{s.title}</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.55 }}>{s.desc}</p>
            </div>
          ))}
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.65, margin: 0 }}>
          The purpose of this app is to make grade tracking <strong>clearer, more visual, and easier</strong> —
          helping students understand where they are, where they want to be, and what they need to improve.
        </p>
      </div>
    </div>
  );
}

export default function HowItWorksPage() {
  const navigate = useNavigate();
  const steps = getSteps();

  useEffect(() => { logEvent('how_it_works_opened'); }, []);
  return (
    <div className="main-content container fade-in">
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: '1.25rem' }} onClick={() => navigate('/')}>
        <ArrowLeft size={14} /> Dashboard
      </button>

      <div style={{ maxWidth: '720px' }}>
        <h1 style={{ marginBottom: '0.375rem' }}>How It Works</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '2rem' }}>
          Everything you need to know about IB Grade Tracker
        </p>

        {/* Intro */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.75, margin: 0, color: 'var(--text)' }}>
            I created this app to help IB Diploma Programme students stay organized and track their
            progress throughout the two years of IB.
          </p>
        </div>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.75, margin: 0, color: 'var(--text)' }}>
            The idea is simple: instead of keeping your grades spread across your school portal,
            spreadsheets, or personal notes, you can organize everything in one place.
          </p>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {steps.map((s, i) => (
            <div key={i} style={{
              background: 'white', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '1.1rem 1.25rem',
              display: 'flex', gap: '1rem', alignItems: 'flex-start',
            }}>
              <div style={{
                width: '2.5rem', height: '2.5rem', borderRadius: '50%', flexShrink: 0,
                background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {s.icon}
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.9rem', margin: '0 0 0.25rem' }}>
                  <span style={{ color: 'var(--primary)', marginRight: '0.4rem', fontSize: '0.75rem', fontWeight: 600 }}>
                    STEP {i + 1}
                  </span>
                  {s.title}
                </p>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* More detail */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.75, margin: 0, color: 'var(--text)' }}>
            You can also set goals for each subject, track your progress by quarter, simulate
            different grade scenarios, and see how far you are from your final IB goal.
          </p>
        </div>

        {/* Closing */}
        <div className="card" style={{ borderLeft: '3px solid var(--primary)', marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.75, margin: 0, color: 'var(--text)' }}>
            The purpose of this app is to make grade tracking <strong>clearer, more visual, and
            easier</strong> — helping students understand where they are, where they want to be,
            and what they need to improve.
          </p>
        </div>
      </div>
    </div>
  );
}
