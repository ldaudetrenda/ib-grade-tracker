import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ChevronRight, ChevronLeft, Check, Lock, User, Target } from 'lucide-react';
import { useApp, IB_SUBJECTS, SUBJECT_GROUPS } from '../context/AppContext';
import { logEvent } from '../analytics';

const STEPS = ['Welcome', 'Choose Subjects', 'Subject Goals', 'Total Target'];

const groupedSubjects = SUBJECT_GROUPS.map(g => ({
  ...g,
  subjects: IB_SUBJECTS.filter(s => s.group === g.id),
}));

function StepIndicator({ current }) {
  return (
    <div className="step-indicator">
      {STEPS.map((_, i) => (
        <div
          key={i}
          className={`step-dot ${i < current ? 'done' : i === current ? 'active' : ''}`}
        />
      ))}
    </div>
  );
}

// ─── Main Setup Flow ──────────────────────────────────────────────────────────
export default function Setup({ editMode = false }) {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(editMode ? 1 : 0);
  const [studentName, setStudentName] = useState('');
  const [goalScore, setGoalScore] = useState(editMode ? state.goalScore : 40);
  const [selected, setSelected] = useState(() => {
    if (!editMode) return [];
    return state.subjects.map(s => ({
      name: s.name,
      level: s.level,
      group: s.group,
      groupName: s.groupName,
      canHL: IB_SUBJECTS.find(sub => sub.name === s.name)?.canHL ?? true,
    }));
  });
  const [subjectGoals, setSubjectGoals] = useState(() => {
    if (!editMode) return {};
    return Object.fromEntries(state.subjects.map(s => [s.name, s.goalGrade]));
  });

  const hlSelected = selected.filter(s => s.level === 'HL');
  const slSelected = selected.filter(s => s.level === 'SL');
  const isSubjectSelected = (name) => selected.find(s => s.name === name);

  function toggleSubject(subject) {
    const existing = selected.find(s => s.name === subject.name);
    if (existing) {
      setSelected(prev => prev.filter(s => s.name !== subject.name));
      return;
    }
    if (selected.length >= 6) return;
    let level;
    if (hlSelected.length < 3 && subject.canHL) {
      level = 'HL';
    } else if (slSelected.length < 3) {
      level = 'SL';
    } else {
      return;
    }
    setSelected(prev => [...prev, { ...subject, level }]);
  }

  function toggleLevel(name) {
    setSelected(prev => prev.map(s => {
      if (s.name !== name) return s;
      const newLevel = s.level === 'HL' ? 'SL' : 'HL';
      if (newLevel === 'HL' && !s.canHL) return s;
      if (newLevel === 'HL' && hlSelected.filter(x => x.name !== name).length >= 3) return s;
      if (newLevel === 'SL' && slSelected.filter(x => x.name !== name).length >= 3) return s;
      return { ...s, level: newLevel };
    }));
  }

  const canNext = () => {
    if (step === 0) return studentName.trim().length > 0;
    if (step === 1) return hlSelected.length === 3 && slSelected.length === 3;
    if (step === 2) return selected.every(s => subjectGoals[s.name] >= 1 && subjectGoals[s.name] <= 7);
    return true;
  };

  function goNext() {
    if (step === 0) logEvent('onboarding_completed');
    if (step === 1) {
      // Initialize per-subject goals: keep existing, fill blanks with smart defaults
      const defaults = {};
      selected.forEach(s => {
        defaults[s.name] = subjectGoals[s.name] || (s.level === 'HL' ? 6 : 5);
      });
      setSubjectGoals(defaults);
    }
    setStep(s => s + 1);
  }

  function handleFinish() {
    const subjects = selected.map((s, i) => ({
      id: `subject_${i}_${Date.now()}`,
      name: s.name,
      level: s.level,
      group: s.group,
      groupName: s.groupName,
      goalGrade: subjectGoals[s.name] || (s.level === 'HL' ? 6 : 5),
      quarters: { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [] },
    }));
    if (editMode) {
      dispatch({ type: 'UPDATE_SUBJECTS', payload: { subjects } });
      navigate('/settings');
    } else {
      logEvent('setup_completed');
      dispatch({
        type: 'COMPLETE_SETUP',
        payload: { studentName: studentName.trim(), goalScore, subjects },
      });
    }
  }

  function hlCount() { return hlSelected.length; }
  function slCount() { return slSelected.length; }
  const countClass = (n, target) => n === target ? 'ok' : n > target ? 'err' : 'warn';

  return (
    <div className="setup-page">
      <div className="setup-card fade-in">
        <div className="setup-header">
          <div className="setup-logo">
            <BookOpen size={28} />
          </div>
          <h1 style={{ fontSize: '1.6rem', marginBottom: '0.25rem' }}>
            {editMode ? 'Edit Subjects' : 'IB Grade Tracker'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            {editMode ? 'Your grade data will be preserved for unchanged subjects.' : 'Track your IB Diploma progress'}
          </p>
        </div>

        <StepIndicator current={step} />

        {/* ── Step 0: Welcome ── */}
        {step === 0 && (
          <div className="fade-in">
            <h2 style={{ marginBottom: '1.5rem' }}>Welcome! What's your name?</h2>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="label" htmlFor="studentName">Your Name</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                <input
                  id="studentName"
                  className="input"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="Enter your name"
                  value={studentName}
                  onChange={e => setStudentName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && canNext() && goNext()}
                  autoFocus
                />
              </div>
            </div>
            <div style={{
              background: 'var(--primary-light)',
              border: '1px solid #C7D2FE',
              borderRadius: 'var(--radius)',
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
            }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--primary-dark)', fontWeight: 500 }}>
                This app helps you track your IB predicted grades across all subjects.
                You'll set up your 6 subjects (3 HL + 3 SL), set individual goals for each, and monitor your progress toward your target score.
              </p>
            </div>
          </div>
        )}

        {/* ── Step 1: Choose Subjects ── */}
        {step === 1 && (
          <div className="fade-in">
            <h2 style={{ marginBottom: '0.5rem' }}>Choose Your 6 Subjects</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Select 3 HL and 3 SL subjects. Click a selected subject to toggle HL/SL.
            </p>

            {/* TOK locked chip */}
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div className="subject-chip tok">
                <Lock size={12} />
                Theory of Knowledge (Core)
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Auto-included</span>
            </div>

            {/* Selection summary */}
            <div className="selection-info">
              <div className="selection-count">
                <span style={{ background: 'var(--hl-bg)', color: 'var(--hl-color)', padding: '0.2rem 0.5rem', borderRadius: '100px', fontSize: '0.7rem', fontWeight: 700 }}>HL</span>
                <span className={`num ${countClass(hlCount(), 3)}`}>{hlCount()}</span>
                <span style={{ color: 'var(--text-light)' }}>/ 3</span>
              </div>
              <div className="selection-count">
                <span style={{ background: 'var(--sl-bg)', color: 'var(--sl-color)', padding: '0.2rem 0.5rem', borderRadius: '100px', fontSize: '0.7rem', fontWeight: 700 }}>SL</span>
                <span className={`num ${countClass(slCount(), 3)}`}>{slCount()}</span>
                <span style={{ color: 'var(--text-light)' }}>/ 3</span>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {selected.length}/6 selected
              </div>
            </div>

            {/* Subject groups */}
            <div style={{ maxHeight: '340px', overflowY: 'auto', marginTop: '1rem', paddingRight: '0.25rem' }}>
              {groupedSubjects.map(group => (
                <div key={group.id}>
                  <p className="subject-group-title">{typeof group.id === 'number' ? `Group ${group.id}: ` : ''}{group.name}</p>
                  <div className="subject-chips">
                    {group.subjects.map(subject => {
                      const sel = isSubjectSelected(subject.name);
                      const isFull = !sel && selected.length >= 6;
                      const hlFull = !sel && hlSelected.length >= 3;
                      const slFull = !sel && slSelected.length >= 3;
                      const cantAdd = isFull || (hlFull && slFull) || (!subject.canHL && slFull);
                      return (
                        <button
                          key={subject.name}
                          className={`subject-chip ${sel ? (sel.level === 'HL' ? 'selected-hl' : 'selected-sl') : ''}`}
                          onClick={() => {
                            if (sel) {
                              if (sel.level === 'HL' && subject.canHL) {
                                toggleLevel(subject.name);
                              } else {
                                toggleSubject(subject);
                              }
                            } else {
                              toggleSubject(subject);
                            }
                          }}
                          disabled={!sel && cantAdd}
                          style={{ opacity: (!sel && cantAdd) ? 0.4 : 1 }}
                          title={sel ? `Click to switch ${sel.level === 'HL' ? 'to SL' : 'and remove'}` : 'Click to add'}
                        >
                          {sel && <Check size={11} />}
                          {subject.name}
                          {sel && (
                            <span style={{
                              background: sel.level === 'HL' ? 'var(--hl-color)' : 'var(--sl-color)',
                              color: 'white',
                              fontSize: '0.65rem',
                              padding: '0.1rem 0.35rem',
                              borderRadius: '4px',
                              fontWeight: 700,
                            }}>
                              {sel.level}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {selected.length > 0 && (
              <div style={{ marginTop: '1rem', padding: '0.875rem', background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                  Your Selection
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                  {selected.map(s => (
                    <div key={s.name} className={`badge ${s.level === 'HL' ? 'badge-hl' : 'badge-sl'}`}>
                      {s.name} · {s.level}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Subject Goals ── */}
        {step === 2 && (
          <div className="fade-in">
            <h2 style={{ marginBottom: '0.5rem' }}>Set Subject Goals</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              Choose your target grade (1–7) for each subject.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', maxHeight: '380px', overflowY: 'auto', paddingRight: '0.25rem' }}>
              {selected.map(s => (
                <div key={s.name} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.875rem 1rem',
                  background: 'var(--bg)', borderRadius: 'var(--radius-sm)',
                  flexWrap: 'wrap',
                }}>
                  <div style={{ flex: 1, minWidth: '130px' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>{s.name}</div>
                    <span className={`badge ${s.level === 'HL' ? 'badge-hl' : 'badge-sl'}`}>{s.level}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
                    {[1, 2, 3, 4, 5, 6, 7].map(g => (
                      <button
                        key={g}
                        onClick={() => setSubjectGoals(prev => ({ ...prev, [s.name]: g }))}
                        style={{
                          width: '2.1rem', height: '2.1rem',
                          borderRadius: '50%',
                          border: subjectGoals[s.name] === g ? '2px solid var(--primary)' : '2px solid var(--border)',
                          background: subjectGoals[s.name] === g ? 'var(--primary)' : 'white',
                          color: subjectGoals[s.name] === g ? 'white' : 'var(--text-muted)',
                          fontWeight: 700, fontSize: '0.8rem',
                          cursor: 'pointer', transition: 'all 0.1s',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >{g}</button>
                    ))}
                  </div>
                </div>
              ))}

              {/* TOK row – no goal to set here */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.875rem 1rem',
                background: 'var(--core-bg)', borderRadius: 'var(--radius-sm)',
              }}>
                <Lock size={13} color="var(--core-color)" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--core-color)', marginBottom: '0.25rem' }}>Theory of Knowledge</div>
                  <span className="badge badge-core">CORE</span>
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Set via Core Points (0–3)</span>
              </div>
            </div>

            {!canNext() && (
              <p style={{ fontSize: '0.8rem', color: 'var(--warning)', marginTop: '0.75rem' }}>
                Please set a goal for every subject before continuing.
              </p>
            )}
          </div>
        )}

        {/* ── Step 3: Total Target ── */}
        {step === 3 && (
          <div className="fade-in">
            <h2 style={{ marginBottom: '0.5rem' }}>Set Your Total Target</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              What's your target IB Diploma score out of 45?
            </p>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="label">
                <Target size={12} style={{ display: 'inline', marginRight: 4 }} />
                Target Total Score (out of 45)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <input
                  type="range"
                  min={24}
                  max={45}
                  value={goalScore}
                  onChange={e => setGoalScore(Number(e.target.value))}
                  style={{ flex: 1, accentColor: 'var(--primary)' }}
                />
                <div style={{
                  background: 'var(--primary)',
                  color: 'white',
                  fontWeight: 800,
                  fontSize: '1.5rem',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.25rem 0.875rem',
                  minWidth: '4rem',
                  textAlign: 'center',
                }}>
                  {goalScore}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>
                <span>24</span>
                <span>
                  {goalScore === 45 ? 'Perfect score!' :
                   goalScore >= 42 ? 'Exceptional target' :
                   goalScore >= 38 ? 'Excellent target' :
                   goalScore >= 32 ? 'Good target' : 'Keep pushing!'}
                </span>
                <span>45</span>
              </div>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Per-subject goals have been set. You can edit them later in each subject's page or in Settings.
            </p>

            {/* Summary */}
            <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius)', padding: '1rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                Your Setup Summary
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <p style={{ fontSize: '0.875rem' }}>
                  <strong>{studentName}</strong> · Total target: <strong>{goalScore}/45</strong>
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.25rem' }}>
                  <div className="badge badge-core">TOK (Core)</div>
                  {selected.map(s => (
                    <div key={s.name} className={`badge ${s.level === 'HL' ? 'badge-hl' : 'badge-sl'}`}>
                      {s.name} · {s.level} · Goal {subjectGoals[s.name]}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', gap: '0.75rem' }}>
          {step > 0 ? (
            <button className="btn btn-ghost" onClick={() => setStep(s => s - 1)}>
              <ChevronLeft size={16} /> Back
            </button>
          ) : <div />}

          {step < (editMode ? 2 : STEPS.length - 1) ? (
            <button
              className="btn btn-primary btn-lg"
              disabled={!canNext()}
              onClick={goNext}
            >
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              {editMode && (
                <button className="btn btn-ghost" onClick={() => navigate('/settings')}>
                  Cancel
                </button>
              )}
              <button className="btn btn-primary btn-lg" onClick={handleFinish}>
                {editMode ? 'Save Changes' : 'Start Tracking'} <Check size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
