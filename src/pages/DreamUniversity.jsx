import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap, Plus, Trash2, ArrowLeft, AlertTriangle,
  BookOpen, Save, X,
} from 'lucide-react';
import { useApp, getTotalScore, getPredictedGrade } from '../context/AppContext';

// labelType: 'official' | 'estimate' | 'no-fixed'
// target is used for status comparison (competitive estimate even for no-fixed)
const SAMPLE_UNIVERSITIES = [
  // ── USA ──
  {
    university: 'MIT', country: 'USA', course: 'Engineering / Science',
    target: 42, range: '40–45', labelType: 'no-fixed',
    note: 'US universities usually evaluate IB scores as part of a holistic application.',
  },
  {
    university: 'Harvard University', country: 'USA', course: 'General / Liberal Arts',
    target: 41, range: '40–45', labelType: 'no-fixed',
    note: 'US universities usually evaluate IB scores as part of a holistic application.',
  },
  {
    university: 'Stanford University', country: 'USA', course: 'General',
    target: 41, range: '40–45', labelType: 'no-fixed',
    note: 'US universities usually evaluate IB scores as part of a holistic application.',
  },
  // ── UK ──
  {
    university: 'University of Oxford', country: 'UK', course: 'Varies by course',
    target: 39, range: '38–42', labelType: 'official',
    note: 'Requirements vary by course; most require specific HL grades (e.g. 6s or 7s in relevant subjects).',
  },
  {
    university: 'University of Cambridge', country: 'UK', course: 'Varies by course',
    target: 40, range: '40–42', labelType: 'official',
    note: 'Requirements vary by course; typically includes specific HL subject requirements.',
  },
  {
    university: 'Imperial College London', country: 'UK', course: 'Engineering / Science',
    target: 39, range: '38–41', labelType: 'official',
    note: null,
  },
  {
    university: 'UCL', country: 'UK', course: 'Varies by course',
    target: 36, range: '34+', labelType: 'official',
    note: 'Minimum 34+; competitive courses (Medicine, Law) typically require 38–40+.',
  },
  {
    university: 'London School of Economics', country: 'UK', course: 'Economics / Social Science',
    target: 38, range: '37–39', labelType: 'official',
    note: "Requirement varies by course; check LSE's official entry requirements.",
  },
  // ── Canada ──
  {
    university: 'University of Toronto', country: 'Canada', course: 'Varies by program',
    target: 36, range: '34–38', labelType: 'estimate',
    note: 'Requirements vary by program. No single fixed IB score.',
  },
  {
    university: 'McGill University', country: 'Canada', course: 'Varies by program',
    target: 35, range: '33–37', labelType: 'estimate',
    note: 'Requirements vary by program. No single fixed IB score.',
  },
  // ── Switzerland ──
  {
    university: 'ETH Zurich', country: 'Switzerland', course: 'Engineering / Science',
    target: 38, range: '38/42', labelType: 'official',
    note: 'Official minimum: 38 without bonus points (42 with). Specific HL subject requirements apply (e.g. Maths, Physics).',
  },
  // ── Singapore ──
  {
    university: 'National University of Singapore', country: 'Singapore', course: 'General',
    target: 40, range: '38–42', labelType: 'estimate',
    note: null,
  },
  // ── Australia ──
  {
    university: 'University of Melbourne', country: 'Australia', course: 'General',
    target: 36, range: '34–38', labelType: 'estimate',
    note: null,
  },
  {
    university: 'University of Sydney', country: 'Australia', course: 'General',
    target: 35, range: '33–37', labelType: 'estimate',
    note: null,
  },
  // ── France ──
  {
    university: 'Sciences Po', country: 'France', course: 'Social Science / Politics',
    target: 37, range: '35–40', labelType: 'estimate',
    note: null,
  },
  // ── Spain ──
  {
    university: 'ESADE Business School', country: 'Spain', course: 'Business / Economics / Management',
    target: 39, range: '39', labelType: 'estimate',
    note: 'Requirements may vary by program and year. Always confirm with ESADE\'s official admissions page.',
  },
];

// ─── Status logic ────────────────────────────────────────────────────────────
function getUniversityStatus(current, target) {
  const diff = target - current;
  if (diff <= 0) return { label: 'On track', color: '#059669', bg: '#d1fae5' };
  if (diff <= 2) return { label: 'Close', color: '#b45309', bg: '#fef3c7' };
  if (diff <= 5) return { label: 'Reach', color: '#c2410c', bg: '#ffedd5' };
  return { label: 'High Reach', color: '#dc2626', bg: '#fee2e2' };
}

// ─── University Goal Card ─────────────────────────────────────────────────
function GoalCard({ goal, currentScore, onDelete }) {
  const status = getUniversityStatus(currentScore, goal.targetScore);
  const diff = goal.targetScore - currentScore;

  return (
    <div className="card" style={{ marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>{goal.university}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--bg)', padding: '0.125rem 0.5rem', borderRadius: '100px', border: '1px solid var(--border)' }}>
              {goal.country}
            </span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            {goal.course}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, color: 'var(--text-muted)' }}>Target</span>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary)' }}>{goal.targetScore}<span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>/45</span></div>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, color: 'var(--text-muted)' }}>Your score</span>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{currentScore}<span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>/45</span></div>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, color: 'var(--text-muted)' }}>Gap</span>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: diff <= 0 ? '#059669' : '#dc2626' }}>
                {diff <= 0 ? `+${Math.abs(diff)}` : `-${diff}`}
              </div>
            </div>
            <div style={{
              padding: '0.3rem 0.75rem', borderRadius: '100px',
              background: status.bg, color: status.color,
              fontWeight: 700, fontSize: '0.8rem',
            }}>
              {status.label}
            </div>
          </div>
        </div>

        <button
          onClick={() => onDelete(goal.id)}
          style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', flexShrink: 0 }}
          title="Delete"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── Add Goal Form ────────────────────────────────────────────────────────
function AddGoalForm({ onAdd, onCancel }) {
  const [form, setForm] = useState({ university: '', course: '', country: '', targetScore: '' });
  function set(field) { return e => setForm(p => ({ ...p, [field]: e.target.value })); }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.university.trim() || !form.targetScore) return;
    const score = parseInt(form.targetScore, 10);
    if (isNaN(score) || score < 1 || score > 45) return;
    onAdd({
      university: form.university.trim(),
      course: form.course.trim() || 'General',
      country: form.country.trim() || '—',
      targetScore: score,
      targetType: 'manual',
      aiNote: null,
    });
  }

  return (
    <div className="card" style={{ marginBottom: '1rem', borderColor: 'var(--primary)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h4 style={{ margin: 0 }}>Add University Goal</h4>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={16} /></button>
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label style={labelSt}>University *</label>
            <input style={inputSt} placeholder="e.g. Oxford" value={form.university} onChange={set('university')} autoFocus />
          </div>
          <div>
            <label style={labelSt}>Country</label>
            <input style={inputSt} placeholder="e.g. UK" value={form.country} onChange={set('country')} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
          <div>
            <label style={labelSt}>Course / Major</label>
            <input style={inputSt} placeholder="e.g. Computer Science" value={form.course} onChange={set('course')} />
          </div>
          <div>
            <label style={labelSt}>IB Target (1–45) *</label>
            <input style={inputSt} type="number" min={1} max={45} placeholder="e.g. 38" value={form.targetScore} onChange={set('targetScore')} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn-primary btn-sm"><Save size={14} /> Save Goal</button>
        </div>
      </form>
    </div>
  );
}

// ─── What Should I Improve ─────────────────────────────────────────────────
function ImprovementSection({ subjects }) {
  const gaps = subjects
    .map(s => {
      const predicted = getPredictedGrade(s);
      const goal = s.goalGrade;
      const gap = goal && predicted !== null ? goal - predicted : null;
      return { ...s, predicted, goal, gap };
    })
    .filter(s => s.gap !== null && s.gap > 0)
    .sort((a, b) => b.gap - a.gap);

  if (gaps.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        All subjects are at or above their goal. Keep it up!
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {gaps.map(s => (
        <div key={s.id} style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.75rem', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', flexWrap: 'wrap',
        }}>
          <span className={`badge ${s.level === 'HL' ? 'badge-hl' : 'badge-sl'}`}>{s.level}</span>
          <span style={{ flex: 1, fontWeight: 500, fontSize: '0.9rem', minWidth: '120px' }}>{s.name}</span>
          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)' }}>Predicted: <strong style={{ color: 'var(--text)' }}>{s.predicted}</strong></span>
            <span style={{ color: 'var(--text-muted)' }}>Goal: <strong style={{ color: 'var(--text)' }}>{s.goal}</strong></span>
            <span style={{
              fontWeight: 700, fontSize: '0.82rem', padding: '0.2rem 0.6rem', borderRadius: '100px',
              background: s.gap >= 3 ? '#fee2e2' : s.gap >= 2 ? '#ffedd5' : '#fef3c7',
              color: s.gap >= 3 ? '#dc2626' : s.gap >= 2 ? '#c2410c' : '#b45309',
            }}>
              –{s.gap} {s.gap === 1 ? 'point' : 'points'} behind
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────
export default function DreamUniversity() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [showAddForm, setShowAddForm] = useState(false);

  const currentScore = getTotalScore(state.subjects, state.corePoints);
  const dreamUniversities = state.dreamUniversities || [];

  function handleAdd(data) {
    dispatch({ type: 'ADD_DREAM_UNIVERSITY', payload: data });
    setShowAddForm(false);
  }

  function handleDelete(id) {
    dispatch({ type: 'REMOVE_DREAM_UNIVERSITY', payload: id });
  }

  function handleSaveSample(sample) {
    dispatch({
      type: 'ADD_DREAM_UNIVERSITY',
      payload: {
        university: sample.university,
        course: sample.course,
        country: sample.country,
        targetScore: sample.target,
        targetType: 'sample',
        aiNote: null,
      },
    });
  }

  const savedUniversityNames = useMemo(() =>
    new Set(dreamUniversities.map(d => d.university.toLowerCase())),
    [dreamUniversities]
  );

  return (
    <div className="main-content container fade-in">
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: '1.25rem' }} onClick={() => navigate('/')}>
        <ArrowLeft size={14} /> Dashboard
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
        <GraduationCap size={28} color="var(--primary)" />
        <h1 style={{ margin: 0 }}>Dream Universities</h1>
      </div>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
        Compare your current IB score to university requirements and track your goals.
      </p>

      {/* Score summary */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div className="card" style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem 1.5rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Your Score</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>{currentScore}<span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--text-muted)' }}>/45</span></div>
        </div>
        <div className="card" style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1rem 1.5rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Your Goal</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1 }}>{state.goalScore}<span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--text-muted)' }}>/45</span></div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: '200px', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fffbeb', borderColor: '#fcd34d' }}>
          <AlertTriangle size={15} color="#b45309" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '0.78rem', color: '#92400e' }}>
            These IB targets are estimates and may vary by course, country, and year. Always check the official university admissions website before applying.
          </span>
        </div>
      </div>

      {/* My goals */}
      <section style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>My University Goals</h2>
          {!showAddForm && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddForm(true)}>
              <Plus size={14} /> Add Goal
            </button>
          )}
        </div>

        {showAddForm && <AddGoalForm onAdd={handleAdd} onCancel={() => setShowAddForm(false)} />}

        {dreamUniversities.length === 0 && !showAddForm ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem', background: 'var(--bg)', borderRadius: 'var(--radius)', border: '1.5px dashed var(--border)' }}>
            <GraduationCap size={32} color="var(--border)" style={{ marginBottom: '0.5rem' }} />
            <p style={{ margin: 0 }}>No university goals yet. Add one above or save a sample below.</p>
          </div>
        ) : (
          dreamUniversities.map(goal => (
            <GoalCard key={goal.id} goal={goal} currentScore={currentScore} onDelete={handleDelete} />
          ))
        )}
      </section>

      {/* Sample universities */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem' }}>Sample Universities</h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
          Estimated IB requirements — for reference only.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
          {SAMPLE_UNIVERSITIES.map(u => {
            const status = getUniversityStatus(currentScore, u.target);
            const alreadySaved = savedUniversityNames.has(u.university.toLowerCase());
            const labelCfg = {
              official:   { text: 'Official',             bg: '#d1fae5', color: '#065f46' },
              estimate:   { text: 'Estimate',             bg: '#fef3c7', color: '#92400e' },
              'no-fixed': { text: 'No fixed requirement', bg: '#e0e7ff', color: '#3730a3' },
            }[u.labelType] || { text: u.labelType, bg: '#f3f4f6', color: '#374151' };

            return (
              <div key={u.university} style={{
                padding: '0.875rem 1rem', background: 'var(--surface)', borderRadius: 'var(--radius-sm)',
                border: '1.5px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.5rem',
              }}>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{u.university}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.country} · {u.course}</div>
                  </div>
                  {/* Status badge */}
                  <div style={{
                    fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '100px',
                    background: status.bg, color: status.color, whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    {status.label}
                  </div>
                </div>

                {/* Label + score row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '4px',
                    background: labelCfg.bg, color: labelCfg.color,
                  }}>
                    {labelCfg.text}
                  </span>
                  {u.labelType === 'no-fixed' ? (
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      No fixed IB requirement — holistic admissions
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {u.labelType === 'official' ? 'Requirement:' : 'Competitive est.:'}{' '}
                      <strong style={{ color: 'var(--text)' }}>{u.range || u.target}</strong>
                    </span>
                  )}
                  {u.labelType === 'no-fixed' && (
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Competitive est.: <strong>{u.range}</strong>
                    </span>
                  )}
                </div>

                {/* Note */}
                {u.note && (
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                    {u.note}
                  </p>
                )}

                {/* Save button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.125rem' }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', opacity: alreadySaved ? 0.5 : 1 }}
                    disabled={alreadySaved}
                    onClick={() => !alreadySaved && handleSaveSample(u)}
                  >
                    {alreadySaved ? '✓ Saved' : '+ Save'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* What should I improve */}
      <section style={{ marginBottom: '2rem' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <BookOpen size={18} color="var(--primary)" />
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>What Should I Improve?</h2>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Subjects where your predicted grade is below your goal — sorted by biggest gap.
          </p>
          <ImprovementSection subjects={state.subjects} />
        </div>
      </section>
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────
const labelSt = {
  display: 'block', fontSize: '0.78rem', fontWeight: 600,
  color: 'var(--text-muted)', marginBottom: '0.3rem',
};
const inputSt = {
  width: '100%', padding: '0.5rem 0.75rem',
  border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
  fontSize: '0.875rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
};
