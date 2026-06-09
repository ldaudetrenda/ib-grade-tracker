import React, { useState, useMemo } from 'react';
import { logEvent } from '../analytics';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { ArrowLeft, Plus, X, Pencil, Check, Target, TrendingUp, Award } from 'lucide-react';
import {
  useApp,
  getQuarterAvg,
  getPredictedGrade,
  getGradeColor,
  getGradeClass,
  getStatusInfo,
  TOK_GRADES,
  getTokColor,
  getLatestTokGrade,
} from '../context/AppContext';

const QUARTER_LABELS = { 1: 'Quarter 1', 2: 'Quarter 2', 3: 'Quarter 3', 4: 'Quarter 4', 5: 'Quarter 5', 6: 'Quarter 6', 7: 'Quarter 7', 8: 'Quarter 8' };

// ─── Quarter Card ─────────────────────────────────────────────────────────────
function QuarterCard({ quarter, grades, subjectId, dispatch, isTok = false }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editError, setEditError] = useState('');

  // Only compute numeric average for regular subjects
  const avg = isTok ? null : getQuarterAvg(grades);

  // ── Regular subject: add grade via form ──
  function addGrade(e) {
    e.preventDefault();
    const val = Number(input);
    if (!Number.isInteger(val) || val < 1 || val > 7) {
      setError('Enter a whole number from 1 to 7');
      return;
    }
    dispatch({ type: 'ADD_GRADE', payload: { subjectId, quarter, grade: val } });
    logEvent('grade_added');
    setInput('');
    setError('');
  }

  // ── TOK: add letter grade via button ──
  function addTokGrade(letter) {
    dispatch({ type: 'ADD_TOK_GRADE', payload: { quarter, grade: letter } });
    logEvent('grade_added');
  }

  function removeGrade(index) {
    if (editingIndex === index) setEditingIndex(null);
    if (isTok) {
      dispatch({ type: 'REMOVE_TOK_GRADE', payload: { quarter, index } });
    } else {
      dispatch({ type: 'REMOVE_GRADE', payload: { subjectId, quarter, index } });
    }
  }

  function startEdit(index) {
    setEditingIndex(index);
    setEditError('');
  }

  // ── Regular subject: save numeric edit ──
  function saveNumericEdit(index, rawValue) {
    const val = Number(rawValue);
    if (!Number.isInteger(val) || val < 1 || val > 7) {
      setEditError('1–7 only');
      return;
    }
    dispatch({ type: 'EDIT_GRADE', payload: { subjectId, quarter, index, grade: val } });
    setEditingIndex(null);
    setEditError('');
  }

  // ── TOK: save letter edit via button ──
  function saveTokEdit(index, letter) {
    dispatch({ type: 'EDIT_TOK_GRADE', payload: { quarter, index, grade: letter } });
    setEditingIndex(null);
    setEditError('');
  }

  function cancelEdit() {
    setEditingIndex(null);
    setEditError('');
  }

  const pillBase = { display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit', opacity: 0.6 };

  return (
    <div className="quarter-card">
      <div className="quarter-title">
        <span>{QUARTER_LABELS[quarter]}</span>
        {avg !== null && (
          <span style={{
            fontSize: '0.75rem', fontWeight: 700,
            color: getGradeColor(Math.round(avg)),
            background: '#F8FAFC', padding: '0.1rem 0.45rem', borderRadius: 4,
          }}>
            Avg: {avg.toFixed(2)}
          </span>
        )}
        {isTok && grades.length > 0 && (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            {grades.length} grade{grades.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Grades list */}
      <div className="grades-list" style={{ flexWrap: 'wrap', gap: '0.375rem' }}>
        {grades.length === 0 && (
          <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontStyle: 'italic' }}>No grades yet</span>
        )}
        {grades.map((g, i) =>
          editingIndex === i ? (
            isTok ? (
              // TOK edit: click a letter button to replace
              <div key={i} style={{ display: 'inline-flex', gap: '0.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Change to:</span>
                {TOK_GRADES.map(letter => (
                  <button
                    key={letter}
                    onClick={() => saveTokEdit(i, letter)}
                    style={{
                      width: '2rem', height: '2rem', borderRadius: '50%',
                      border: g === letter ? `2px solid ${getTokColor(letter)}` : '2px solid var(--border)',
                      background: g === letter ? getTokColor(letter) : 'white',
                      color: g === letter ? 'white' : 'var(--text-muted)',
                      fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >{letter}</button>
                ))}
                <button onClick={cancelEdit} title="Cancel"
                  style={{ width: '1.4rem', height: '1.4rem', borderRadius: '50%', border: 'none', background: 'var(--border)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                ><X size={10} /></button>
              </div>
            ) : (
              // Regular subject edit: number input
              <NumericEditInline
                key={i}
                current={g}
                onSave={val => saveNumericEdit(i, val)}
                onCancel={cancelEdit}
                error={editError}
                setError={setEditError}
              />
            )
          ) : (
            <div key={i} className="grade-pill" style={{
              background: isTok ? `${getTokColor(g)}18` : `${getGradeColor(Math.round(g))}15`,
              color: isTok ? getTokColor(g) : getGradeColor(Math.round(g)),
            }}>
              <span
                style={{ cursor: 'pointer', userSelect: 'none', fontWeight: 700 }}
                onClick={() => startEdit(i)}
                title="Click to edit"
              >{isTok ? g : Math.round(g)}</span>
              <div style={{ display: 'flex', gap: '0.1rem', alignItems: 'center' }}>
                <button onClick={() => startEdit(i)} title="Edit" style={pillBase}><Pencil size={9} /></button>
                <button onClick={() => removeGrade(i)} title="Remove" style={pillBase}><X size={11} /></button>
              </div>
            </div>
          )
        )}
      </div>

      {/* Add section */}
      {isTok ? (
        <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Add:</span>
          {TOK_GRADES.map(letter => (
            <button
              key={letter}
              onClick={() => addTokGrade(letter)}
              style={{
                padding: '0.3rem 0.75rem',
                borderRadius: '100px',
                border: `1.5px solid ${getTokColor(letter)}`,
                background: 'white',
                color: getTokColor(letter),
                fontWeight: 700, fontSize: '0.85rem',
                cursor: 'pointer', transition: 'all 0.12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = getTokColor(letter); e.currentTarget.style.color = 'white'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = getTokColor(letter); }}
            >{letter}</button>
          ))}
        </div>
      ) : (
        <form className="add-grade-form" onSubmit={addGrade} style={{ marginTop: '0.75rem' }}>
          <input
            type="number"
            min="1" max="7" step="1"
            placeholder="1–7"
            value={input}
            onChange={e => { setInput(e.target.value); setError(''); }}
          />
          <button type="submit" className="btn btn-primary btn-sm">
            <Plus size={13} /> Add
          </button>
        </form>
      )}
      {error && <p style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.25rem' }}>{error}</p>}
    </div>
  );
}

// Small inline numeric edit component (keeps QuarterCard clean)
function NumericEditInline({ current, onSave, onCancel, error, setError }) {
  const [val, setVal] = useState(String(Math.round(current)));
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
      <input
        type="number" min="1" max="7" step="1"
        value={val}
        onChange={e => { setVal(e.target.value); setError && setError(''); }}
        onKeyDown={e => { if (e.key === 'Enter') onSave(val); if (e.key === 'Escape') onCancel(); }}
        style={{
          width: '2.5rem', padding: '0.2rem 0.35rem',
          border: `1.5px solid ${error ? 'var(--danger)' : 'var(--primary)'}`,
          borderRadius: 6, fontSize: '0.875rem', textAlign: 'center',
          fontFamily: 'inherit', fontWeight: 700,
        }}
        autoFocus
      />
      <button onClick={() => onSave(val)} title="Save"
        style={{ width: '1.4rem', height: '1.4rem', borderRadius: '50%', border: 'none', background: 'var(--success)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      ><Check size={10} /></button>
      <button onClick={onCancel} title="Cancel"
        style={{ width: '1.4rem', height: '1.4rem', borderRadius: '50%', border: 'none', background: 'var(--border)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      ><X size={10} /></button>
      {error && <span style={{ fontSize: '0.7rem', color: 'var(--danger)' }}>{error}</span>}
    </div>
  );
}

// ─── Subject Detail Page ──────────────────────────────────────────────────────
export default function SubjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  // isTok is true when coming from /tok (id undefined) or /subject/tok
  const isTok = !id || id === 'tok';

  const subject = isTok ? state.tok : state.subjects.find(s => s.id === id);
  const [editGoal, setEditGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('');

  if (!subject) {
    return (
      <div className="main-content container">
        <p>Subject not found.</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>Back to Dashboard</Link>
      </div>
    );
  }

  const quarters = subject.quarters || {};

  // For TOK: latest entered letter grade. For subjects: numeric predicted.
  const predicted = useMemo(() => {
    if (isTok) return getLatestTokGrade(quarters);
    return getPredictedGrade(subject);
  }, [subject, quarters, isTok]);

  // Semester averages only for regular subjects
  const sem1Avg = useMemo(() => {
    if (isTok) return null;
    return getQuarterAvg([...(quarters[1] || []), ...(quarters[2] || [])]);
  }, [quarters, isTok]);

  const sem2Avg = useMemo(() => {
    if (isTok) return null;
    return getQuarterAvg([...(quarters[3] || []), ...(quarters[4] || [])]);
  }, [quarters, isTok]);

  const sem3Avg = useMemo(() => {
    if (isTok) return null;
    return getQuarterAvg([...(quarters[5] || []), ...(quarters[6] || [])]);
  }, [quarters, isTok]);

  const sem4Avg = useMemo(() => {
    if (isTok) return null;
    return getQuarterAvg([...(quarters[7] || []), ...(quarters[8] || [])]);
  }, [quarters, isTok]);

  const allGradesAvg = useMemo(() => {
    if (isTok) return null;
    const all = Object.values(quarters).flat();
    if (all.length === 0) return null;
    return all.reduce((a, b) => a + b, 0) / all.length;
  }, [quarters, isTok]);

  const status = isTok ? null : getStatusInfo(predicted, subject.goalGrade);

  // Charts only for regular subjects
  const lineData = !isTok ? [1, 2, 3, 4, 5, 6, 7, 8].map(q => {
    const avg = getQuarterAvg(quarters[q]);
    return { name: `Q${q}`, avg: avg !== null ? +avg.toFixed(2) : null };
  }) : [];

  const barData = !isTok ? [1, 2, 3, 4, 5, 6, 7, 8].map(q => ({
    quarter: `Q${q}`,
    avg: getQuarterAvg(quarters[q]),
  })).filter(d => d.avg !== null) : [];

  function saveGoal() {
    const val = parseInt(goalInput, 10);
    if (!isNaN(val) && val >= 1 && val <= 7) {
      dispatch({ type: 'SET_SUBJECT_GOAL', payload: { subjectId: id, goalGrade: val } });
      logEvent('goal_set');
    }
    setEditGoal(false);
  }

  const hasAnyGrades = Object.values(quarters).some(q => q.length > 0);

  return (
    <div className="main-content container fade-in">
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: '1.25rem' }} onClick={() => navigate('/')}>
        <ArrowLeft size={14} /> Dashboard
      </button>

      {/* Subject header */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <h1 style={{ fontSize: '1.5rem' }}>{subject.name}</h1>
              <span className={`badge ${isTok ? 'badge-core' : subject.level === 'HL' ? 'badge-hl' : 'badge-sl'}`}>
                {isTok ? 'CORE' : subject.level}
              </span>
            </div>
            {!isTok && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{subject.groupName}</p>
            )}
            {isTok && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>IB Core Component · Letter grades: D, C, B, A</p>
            )}
          </div>

          {/* Stat chips */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Latest grade / Predicted */}
            <div style={{
              background: predicted
                ? isTok ? `${getTokColor(predicted)}15` : `${getGradeColor(Math.round(predicted))}15`
                : 'var(--bg)',
              borderRadius: 'var(--radius-sm)', padding: '0.625rem 1rem', textAlign: 'center',
            }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                {isTok ? 'Latest' : 'Predicted'}
              </div>
              <div style={{
                fontSize: '1.75rem', fontWeight: 800,
                color: predicted
                  ? isTok ? getTokColor(predicted) : getGradeColor(Math.round(predicted))
                  : 'var(--text-light)',
              }}>
                {predicted || '–'}
              </div>
            </div>

            {/* Goal */}
            {isTok ? (
              // TOK goal: D / C / B / A selector
              <div style={{ background: 'var(--core-bg)', borderRadius: 'var(--radius-sm)', padding: '0.625rem 1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  Goal
                </div>
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  {TOK_GRADES.map(g => (
                    <button
                      key={g}
                      onClick={() => { dispatch({ type: 'SET_TOK_GOAL', payload: g }); logEvent('goal_set'); }}
                      style={{
                        width: '2rem', height: '2rem', borderRadius: '50%',
                        border: subject.goalGrade === g ? `2px solid ${getTokColor(g)}` : '2px solid var(--border)',
                        background: subject.goalGrade === g ? getTokColor(g) : 'white',
                        color: subject.goalGrade === g ? 'white' : 'var(--text-muted)',
                        fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.1s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >{g}</button>
                  ))}
                </div>
              </div>
            ) : (
              // Regular subject goal: numeric
              <div style={{ background: 'var(--accent-light)', borderRadius: 'var(--radius-sm)', padding: '0.625rem 1rem', textAlign: 'center', cursor: 'pointer' }}
                onClick={() => { setGoalInput(String(subject.goalGrade)); setEditGoal(true); }}
              >
                <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  Goal
                </div>
                {editGoal ? (
                  <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                    <input
                      type="number" min={1} max={7}
                      value={goalInput}
                      onChange={e => setGoalInput(e.target.value)}
                      style={{ width: '3rem', fontSize: '1.25rem', fontWeight: 800, textAlign: 'center', border: '1.5px solid var(--accent)', borderRadius: 6, padding: '0.1rem 0.25rem' }}
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') saveGoal(); if (e.key === 'Escape') setEditGoal(false); }}
                    />
                    <button className="btn btn-primary btn-sm" onClick={saveGoal}>✓</button>
                  </div>
                ) : (
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent)' }}>
                    {subject.goalGrade}
                  </div>
                )}
              </div>
            )}

            {/* Status (subjects only) */}
            {!isTok && status && (
              <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: '0.625rem 1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  Status
                </div>
                <span className={`badge ${status.badge}`} style={{ fontSize: '0.85rem', padding: '0.375rem 0.75rem' }}>
                  {status.label}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Semester averages — subjects only */}
        {!isTok && hasAnyGrades && (
          <>
            <hr className="divider" />
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              {[{ label: 'Y1 Sem 1 (Q1–Q2)', avg: sem1Avg }, { label: 'Y1 Sem 2 (Q3–Q4)', avg: sem2Avg }, { label: 'Y2 Sem 1 (Q5–Q6)', avg: sem3Avg }, { label: 'Y2 Sem 2 (Q7–Q8)', avg: sem4Avg }].map(({ label, avg }) => (
                <div key={label}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.125rem' }}>{label}</div>
                  <div style={{ fontWeight: 700, fontSize: '1.125rem', color: avg !== null ? getGradeColor(Math.round(avg)) : 'var(--text-light)' }}>
                    {avg !== null ? avg.toFixed(2) : '–'}
                  </div>
                </div>
              ))}
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.125rem' }}>Annual Average</div>
                <div style={{ fontWeight: 700, fontSize: '1.125rem', color: predicted ? getGradeColor(Math.round(predicted)) : 'var(--text-light)' }}>
                  {predicted !== null ? predicted : '–'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.125rem' }}>All Grades Average</div>
                <div style={{ fontWeight: 700, fontSize: '1.125rem', color: allGradesAvg !== null ? getGradeColor(Math.round(allGradesAvg)) : 'var(--text-light)' }}>
                  {allGradesAvg !== null ? allGradesAvg.toFixed(2) : 'No grades yet'}
                </div>
              </div>
            </div>
          </>
        )}

        {/* TOK info note */}
        {isTok && hasAnyGrades && (
          <>
            <hr className="divider" />
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Latest grade: <strong style={{ color: getTokColor(predicted) }}>{predicted || '–'}</strong> ·
              Goal: <strong style={{ color: getTokColor(subject.goalGrade) }}>{subject.goalGrade}</strong> ·
              TOK contributes to your Core Points (0–3) together with EE.
            </p>
          </>
        )}
      </div>

      {/* Quarters grid */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Quarter Grades</h2>
        <div className="quarters-grid">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(q => (
            <QuarterCard
              key={q}
              quarter={q}
              grades={quarters[q] || []}
              subjectId={id}
              dispatch={dispatch}
              isTok={isTok}
            />
          ))}
        </div>
      </div>

      {/* Charts — regular subjects only */}
      {!isTok && hasAnyGrades && (
        <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
          <div className="chart-section">
            <p className="chart-title">Grade Trend</p>
            <p className="chart-subtitle">Quarter averages over time</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={lineData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis domain={[1, 7]} ticks={[1,2,3,4,5,6,7]} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <Tooltip
                  contentStyle={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}
                  formatter={(val) => [val !== null ? val : '–', 'Avg grade']}
                />
                <ReferenceLine y={subject.goalGrade} stroke="var(--accent)" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'Goal', fill: 'var(--accent)', fontSize: 11 }} />
                <Line type="monotone" dataKey="avg" stroke="var(--primary)" strokeWidth={2.5}
                  dot={{ r: 5, fill: 'white', stroke: 'var(--primary)', strokeWidth: 2 }}
                  activeDot={{ r: 7 }} connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-section">
            <p className="chart-title">Quarter Performance</p>
            <p className="chart-subtitle">Average grade per quarter</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis domain={[0, 7]} ticks={[1,2,3,4,5,6,7]} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <Tooltip
                  contentStyle={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}
                  formatter={(val) => [val?.toFixed(2), 'Quarter avg']}
                />
                <ReferenceLine y={subject.goalGrade} stroke="var(--accent)" strokeDasharray="4 4" strokeWidth={1.5} />
                <Bar dataKey="avg" radius={[6, 6, 0, 0]} maxBarSize={50}>
                  {barData.map((entry, i) => (
                    <Cell key={i} fill={getGradeColor(Math.round(entry.avg))} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Grade summary table — subjects: show averages; TOK: show letters only */}
      {hasAnyGrades && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Grade Summary</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Grades Entered</th>
                  {!isTok && <th>Quarter Average</th>}
                  {!isTok && <th>Semester Average</th>}
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(q => {
                  const g = quarters[q] || [];
                  const avg = isTok ? null : getQuarterAvg(g);
                  const semAvg = isTok ? null : (q <= 2 ? sem1Avg : q <= 4 ? sem2Avg : q <= 6 ? sem3Avg : sem4Avg);
                  return (
                    <tr key={q}>
                      <td style={{ fontWeight: 600 }}>{QUARTER_LABELS[q]}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                          {g.length === 0 ? (
                            <span style={{ color: 'var(--text-light)', fontSize: '0.8rem' }}>–</span>
                          ) : isTok ? (
                            g.map((grade, i) => (
                              <span key={i} style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                width: '1.75rem', height: '1.75rem', borderRadius: '50%',
                                background: `${getTokColor(grade)}18`,
                                color: getTokColor(grade),
                                fontWeight: 800, fontSize: '0.85rem',
                              }}>{grade}</span>
                            ))
                          ) : (
                            g.map((grade, i) => (
                              <span key={i} className={`grade-badge ${getGradeClass(Math.round(grade))}`} style={{ width: 'auto', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>
                                {Math.round(grade)}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      {!isTok && (
                        <td style={{ fontWeight: 600, color: avg !== null ? getGradeColor(Math.round(avg)) : 'var(--text-light)' }}>
                          {avg !== null ? avg.toFixed(2) : '–'}
                        </td>
                      )}
                      {!isTok && (
                        <td style={{ color: semAvg !== null ? getGradeColor(Math.round(semAvg)) : 'var(--text-light)', fontWeight: q % 2 === 0 ? 700 : 500 }}>
                          {(q === 1 || q === 3) ? '' : semAvg !== null ? semAvg.toFixed(2) : '–'}
                          {(q === 2 || q === 4) && semAvg === null ? '–' : null}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
