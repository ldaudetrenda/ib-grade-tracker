import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { HowItWorksSection } from './HowItWorksPage';
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, Cell,
  AreaChart, Area, ReferenceLine,
} from 'recharts';
import { TrendingUp, Award, Target, BookOpen, ChevronRight, ChevronLeft, Settings, Plus, X } from 'lucide-react';
import {
  useApp,
  getPredictedGrade,
  getTotalScore,
  getGoalTotal,
  getGradeColor,
  getGradeClass,
  getStatusInfo,
  getQuarterAvg,
  getTokColor,
  getLatestTokGrade,
} from '../context/AppContext';

// ─── Radial Progress Circle ──────────────────────────────────────────────────
function ScoreCircle({ current, goal, max = 45 }) {
  const pct = Math.min(1, current / max);
  const goalPct = Math.min(1, goal / max);
  const r = 80;
  const cx = 100;
  const cy = 100;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference * (1 - pct);
  const goalOffset = circumference * (1 - goalPct);

  const color = current >= goal ? '#10B981' : current >= goal * 0.85 ? '#F59E0B' : '#4F46E5';

  return (
    <div className="progress-circle-container">
      <div className="progress-circle-inner" style={{ width: 200, height: 200 }}>
        <svg width="200" height="200" viewBox="0 0 200 200">
          {/* Background track */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth="14" />
          {/* Goal indicator */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="14"
            strokeDasharray={`4 ${circumference - 4}`}
            strokeDashoffset={goalOffset}
            strokeLinecap="round"
            transform="rotate(-90, 100, 100)"
            opacity="0.5"
          />
          {/* Progress arc */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={color}
            strokeWidth="14"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90, 100, 100)"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div className="progress-circle-text">
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color, lineHeight: 1 }}>{current}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>/ {max}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-light)', marginTop: '0.125rem' }}>IB Score</div>
        </div>
      </div>
      <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem', fontSize: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
          <span style={{ color: 'var(--text-muted)' }}>Current: <strong>{current}</strong></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)', opacity: 0.7 }} />
          <span style={{ color: 'var(--text-muted)' }}>Goal: <strong>{goal}</strong></span>
        </div>
      </div>
    </div>
  );
}

// ─── Bar Chart: Current vs Goal ──────────────────────────────────────────────
const SUBJECT_COLORS = ['#4F46E5', '#0891B2', '#10B981', '#F59E0B', '#EF4444', '#7C3AED'];

function CurrentVsGoalChart({ subjects }) {
  const data = subjects.map((s, i) => ({
    name: s.name.length > 14 ? s.name.substring(0, 14) + '…' : s.name,
    fullName: s.name,
    level: s.level,
    current: getPredictedGrade(s) || 0,
    goal: s.goalGrade,
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const item = data.find(d => d.name === label);
      return (
        <div style={{
          background: 'white', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', padding: '0.75rem',
          boxShadow: 'var(--shadow)', fontSize: '0.8rem',
        }}>
          <p style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{item?.fullName}</p>
          {payload.map(p => (
            <p key={p.name} style={{ color: p.fill }}>
              {p.name}: <strong>{p.value || '–'}</strong>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
        <YAxis domain={[0, 7]} ticks={[1,2,3,4,5,6,7]} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
        <Bar dataKey="current" name="Predicted" radius={[4, 4, 0, 0]} maxBarSize={30}>
          {data.map((entry, i) => (
            <Cell key={i} fill={SUBJECT_COLORS[i % SUBJECT_COLORS.length]} />
          ))}
        </Bar>
        <Bar dataKey="goal" name="Goal" radius={[4, 4, 0, 0]} fill="#E2E8F0" maxBarSize={30} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── TOK letter ↔ number helpers ─────────────────────────────────────────────
const TOK_TO_NUM = { D: 1, C: 2, B: 3, A: 4 };
const NUM_TO_TOK = { 1: 'D', 2: 'C', 3: 'B', 4: 'A' };

// ─── Carousel Chart: One Subject at a Time ────────────────────────────────────
function ProgressCarouselChart({ subjects, tok }) {
  const [index, setIndex] = useState(0);
  const allItems = [...subjects, tok]; // TOK is last (index 6)
  const current = allItems[index];
  const isTok = current?.id === 'tok';
  const color = SUBJECT_COLORS[index % SUBJECT_COLORS.length];

  // Build quarter data
  const chartData = [1, 2, 3, 4].map(q => {
    if (isTok) {
      const grades = current.quarters[q] || [];
      const last = grades[grades.length - 1] || null;
      return { quarter: `Q${q}`, value: last ? TOK_TO_NUM[last] : null, letter: last };
    } else {
      const avg = getQuarterAvg(current.quarters[q]);
      return { quarter: `Q${q}`, value: avg !== null ? +avg.toFixed(2) : null };
    }
  });

  const hasAnyData = chartData.some(d => d.value !== null);
  const predicted = isTok
    ? getLatestTokGrade(current.quarters)
    : getPredictedGrade(current);
  const goal = isTok ? current.goalGrade : current.goalGrade;
  const goalNum = isTok ? (TOK_TO_NUM[goal] || null) : goal;

  const prev = () => setIndex(i => (i - 1 + allItems.length) % allItems.length);
  const next = () => setIndex(i => (i + 1) % allItems.length);

  const shortName = current?.name?.split(':')[0] || current?.name || '';

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const val = payload[0]?.value;
    const entry = chartData.find(d => d.quarter === label);
    const display = isTok ? (entry?.letter || '–') : (val !== null ? val : '–');
    return (
      <div style={{
        background: 'white', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.75rem',
        boxShadow: 'var(--shadow)', fontSize: '0.8rem',
      }}>
        <p style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{label}</p>
        <p style={{ color }}>{isTok ? 'Grade' : 'Avg'}: <strong>{display}</strong></p>
      </div>
    );
  };

  return (
    <div>
      {/* Nav row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>{shortName}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <button onClick={prev} style={navBtnSt}><ChevronLeft size={15} /></button>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', minWidth: '3rem', textAlign: 'center' }}>
            {index + 1} / {allItems.length}
          </span>
          <button onClick={next} style={navBtnSt}><ChevronRight size={15} /></button>
        </div>
      </div>

      {/* Dot indicators */}
      <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center', marginBottom: '0.75rem' }}>
        {allItems.map((item, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            title={item?.name?.split(':')[0]}
            style={{
              width: i === index ? '1.5rem' : '0.45rem',
              height: '0.45rem',
              borderRadius: '100px',
              background: i === index ? color : 'var(--border)',
              border: 'none', cursor: 'pointer', padding: 0,
              transition: 'all 0.2s',
            }}
          />
        ))}
      </div>

      {!hasAnyData ? (
        <div style={{ textAlign: 'center', padding: '1.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          <TrendingUp size={28} style={{ margin: '0 auto 0.5rem', display: 'block', opacity: 0.25 }} />
          No grades yet for {shortName}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis
              domain={isTok ? [0, 4] : [0, 7]}
              ticks={isTok ? [1, 2, 3, 4] : [1, 2, 3, 4, 5, 6, 7]}
              tickFormatter={isTok ? v => NUM_TO_TOK[v] || '' : undefined}
              tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
              axisLine={false} tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg)' }} />
            {goalNum && (
              <ReferenceLine
                y={goalNum}
                stroke="var(--primary)"
                strokeDasharray="5 4"
                strokeWidth={1.5}
                label={{ value: isTok ? `Goal: ${goal}` : `Goal: ${goal}`, position: 'right', fontSize: 10, fill: 'var(--primary)' }}
              />
            )}
            <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          {chartData.map(d => (
            <span key={d.quarter} style={{ marginRight: '0.75rem' }}>
              <strong>{d.quarter}</strong>:{' '}
              {d.value !== null
                ? (isTok ? d.letter : d.value)
                : <span style={{ color: 'var(--text-light)' }}>–</span>}
            </span>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '1rem', fontSize: '0.78rem' }}>
          {predicted !== null && (
            <span style={{ color: 'var(--text-muted)' }}>
              Predicted: <strong style={{ color }}>{predicted}</strong>
            </span>
          )}
          {goal && (
            <span style={{ color: 'var(--text-muted)' }}>
              Goal: <strong style={{ color: 'var(--primary)' }}>{goal}</strong>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

const navBtnSt = {
  background: 'var(--bg)', border: '1.5px solid var(--border)',
  borderRadius: 'var(--radius-sm)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '0.25rem', color: 'var(--text-muted)',
};

// ─── Progress History ─────────────────────────────────────────────────────────
const EMPTY_GRADES = ['', '', '', '', '', ''];

function computeHistoryTotal(grades) {
  return grades.reduce((sum, g) => {
    const v = Number(g);
    return sum + (Number.isInteger(v) && v >= 1 && v <= 7 ? v : 0);
  }, 0);
}

function ProgressHistorySection({ history, subjects, dispatch }) {
  const [addingNew, setAddingNew] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newGrades, setNewGrades] = useState(EMPTY_GRADES);
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [editGrades, setEditGrades] = useState(EMPTY_GRADES);

  const chartData = history.map(e => ({
    label: e.label,
    total: computeHistoryTotal(e.grades),
  }));

  function startAdd() {
    setNewLabel('');
    setNewGrades(EMPTY_GRADES);
    setAddingNew(true);
  }

  function cancelAdd() {
    setAddingNew(false);
  }

  function saveNew() {
    if (!newLabel.trim()) return;
    dispatch({
      type: 'ADD_PROGRESS_ENTRY',
      payload: { label: newLabel.trim(), grades: newGrades },
    });
    setAddingNew(false);
  }

  function startEdit(entry) {
    setEditingId(entry.id);
    setEditLabel(entry.label);
    const g = [...entry.grades];
    while (g.length < 6) g.push('');
    setEditGrades(g.slice(0, 6));
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function saveEdit() {
    dispatch({
      type: 'UPDATE_PROGRESS_ENTRY',
      payload: { id: editingId, label: editLabel.trim(), grades: editGrades },
    });
    setEditingId(null);
  }

  function removeEntry(id) {
    dispatch({ type: 'REMOVE_PROGRESS_ENTRY', payload: id });
  }

  const gradeInputStyle = {
    width: '2.25rem', padding: '0.2rem 0.25rem',
    border: '1.5px solid var(--border)', borderRadius: 6,
    fontSize: '0.85rem', textAlign: 'center',
    fontFamily: 'inherit', fontWeight: 700,
  };

  const subjectNames = subjects.map(s => s.name.split(':')[0].trim());

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div className="section-header" style={{ marginBottom: '1rem' }}>
        <h2>IB Progress History</h2>
        {!addingNew && (
          <button className="btn btn-primary btn-sm" onClick={startAdd}>
            <Plus size={13} /> Add Quarter
          </button>
        )}
      </div>

      {/* Progress chart */}
      {chartData.length > 0 && (() => {
        const totals = chartData.map(d => d.total).filter(Boolean);
        const minVal = Math.max(0, Math.min(...totals) - 4);
        const maxVal = 42;
        return (
          <div style={{
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '1.25rem 1.25rem 0.75rem',
            marginBottom: '1rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text)', margin: 0 }}>Score Progress</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.1rem 0 0' }}>Total IB points per quarter</p>
              </div>
              {totals.length >= 2 && (() => {
                const delta = totals[totals.length - 1] - totals[0];
                const positive = delta >= 0;
                return (
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 700,
                    padding: '0.2rem 0.6rem', borderRadius: 99,
                    background: positive ? '#DCFCE7' : '#FEE2E2',
                    color: positive ? '#16A34A' : '#DC2626',
                  }}>
                    {positive ? '+' : ''}{delta} pts overall
                  </span>
                );
              })()}
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData} margin={{ top: 20, right: 16, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="progressGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: 'var(--text-muted)', fontWeight: 500 }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  domain={[minVal, maxVal]}
                  tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                  axisLine={false} tickLine={false}
                  tickCount={4}
                />
                <Tooltip
                  cursor={{ stroke: 'var(--primary)', strokeWidth: 1, strokeDasharray: '4 2' }}
                  contentStyle={{
                    background: 'white', border: '1px solid var(--border)',
                    borderRadius: 8, fontSize: '0.8rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  }}
                  formatter={(val) => [`${val} / 42`, 'Total Score']}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  fill="url(#progressGrad)"
                  dot={{ r: 5, fill: 'var(--primary)', stroke: 'white', strokeWidth: 2 }}
                  activeDot={{ r: 7, fill: 'var(--primary)', stroke: 'white', strokeWidth: 2 }}
                  label={{ position: 'top', fontSize: 11, fontWeight: 700, fill: 'var(--primary)', offset: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        );
      })()}

      {/* Table */}
      {(history.length > 0 || addingNew) ? (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Quarter</th>
                {subjectNames.map((n, i) => <th key={i} style={{ fontSize: '0.72rem' }}>{n}</th>)}
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {history.map(entry => (
                editingId === entry.id ? (
                  <tr key={entry.id}>
                    <td>
                      <input
                        value={editLabel}
                        onChange={e => setEditLabel(e.target.value)}
                        placeholder="e.g. Q1"
                        style={{ ...gradeInputStyle, width: '5rem' }}
                        autoFocus
                      />
                    </td>
                    {editGrades.map((g, i) => (
                      <td key={i}>
                        <input
                          type="number" min="1" max="7" step="1"
                          value={g}
                          onChange={e => {
                            const next = [...editGrades];
                            next[i] = e.target.value;
                            setEditGrades(next);
                          }}
                          style={gradeInputStyle}
                        />
                      </td>
                    ))}
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                      {computeHistoryTotal(editGrades)}/42
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button className="btn btn-primary btn-sm" onClick={saveEdit}>✓</button>
                        <button className="btn btn-ghost btn-sm" onClick={cancelEdit}>✕</button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={entry.id}>
                    <td style={{ fontWeight: 600 }}>{entry.label}</td>
                    {(entry.grades.length === 6 ? entry.grades : [...entry.grades, ...EMPTY_GRADES].slice(0, 6)).map((g, i) => (
                      <td key={i} style={{ fontWeight: 500, color: g && Number(g) ? getGradeColor(Number(g)) : 'var(--text-light)' }}>
                        {g || '–'}
                      </td>
                    ))}
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                      {computeHistoryTotal(entry.grades)}/42
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => startEdit(entry)}>Edit</button>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => removeEntry(entry.id)}
                        ><X size={12} /></button>
                      </div>
                    </td>
                  </tr>
                )
              ))}

              {/* Add new row */}
              {addingNew && (
                <tr>
                  <td>
                    <input
                      value={newLabel}
                      onChange={e => setNewLabel(e.target.value)}
                      placeholder="e.g. Q1"
                      style={{ ...gradeInputStyle, width: '5rem' }}
                      autoFocus
                    />
                  </td>
                  {newGrades.map((g, i) => (
                    <td key={i}>
                      <input
                        type="number" min="1" max="7" step="1"
                        value={g}
                        onChange={e => {
                          const next = [...newGrades];
                          next[i] = e.target.value;
                          setNewGrades(next);
                        }}
                        style={gradeInputStyle}
                      />
                    </td>
                  ))}
                  <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                    {computeHistoryTotal(newGrades)}/42
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button className="btn btn-primary btn-sm" onClick={saveNew} disabled={!newLabel.trim()}>✓</button>
                      <button className="btn btn-ghost btn-sm" onClick={cancelAdd}>✕</button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state" style={{ padding: '2rem' }}>
          <TrendingUp size={32} style={{ margin: '0 auto 0.5rem', display: 'block', opacity: 0.3 }} />
          <p style={{ fontSize: '0.875rem' }}>No progress history yet. Click "Add Quarter" to record your IB scores.</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { state, dispatch } = useApp();
  const { subjects, studentName, goalScore, corePoints } = state;
  const [editGoal, setEditGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState(goalScore);

  const currentTotal = useMemo(() => getTotalScore(subjects, corePoints), [subjects, corePoints]);
  const diff = currentTotal - goalScore;
  const diffSign = diff > 0 ? '+' : '';

  function saveGoal() {
    dispatch({ type: 'SET_STUDENT_GOAL', payload: tempGoal });
    setEditGoal(false);
  }

  return (
    <div className="main-content container fade-in">
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h1 style={{ marginBottom: '0.25rem' }}>
              Hey, {studentName}! 👋
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              Here's your IB progress overview
            </p>
          </div>
          <Link to="/settings" style={{ textDecoration: 'none' }}>
            <button className="btn btn-ghost btn-sm">
              <Settings size={14} /> Settings
            </button>
          </Link>
        </div>
      </div>

      {/* Stat cards row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Total score */}
        <div className="stat-card" style={{ borderTop: `3px solid var(--primary)` }}>
          <div style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>
            <Award size={20} />
          </div>
          <div className="stat-value" style={{ color: 'var(--primary)' }}>{currentTotal}</div>
          <div className="stat-label">Current Score</div>
          <div className="stat-sub">out of 45</div>
        </div>

        {/* Goal score */}
        <div className="stat-card" style={{ borderTop: '3px solid var(--accent)' }}>
          <div style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>
            <Target size={20} />
          </div>
          {editGoal ? (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="number"
                min={6} max={45}
                value={tempGoal}
                onChange={e => setTempGoal(Number(e.target.value))}
                style={{ width: '4rem', padding: '0.25rem 0.5rem', border: '1.5px solid var(--border)', borderRadius: 6, fontSize: '1.5rem', fontWeight: 800 }}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && saveGoal()}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <button className="btn btn-primary btn-sm" onClick={saveGoal}>✓</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditGoal(false)}>✕</button>
              </div>
            </div>
          ) : (
            <>
              <div className="stat-value" style={{ color: 'var(--accent)', cursor: 'pointer' }} onClick={() => { setTempGoal(goalScore); setEditGoal(true); }}>
                {goalScore}
              </div>
              <div className="stat-label">Target Score</div>
              <div className="stat-sub" style={{ cursor: 'pointer', color: 'var(--primary)' }} onClick={() => { setTempGoal(goalScore); setEditGoal(true); }}>
                out of 45 · edit
              </div>
            </>
          )}
        </div>

        {/* Difference */}
        <div className="stat-card" style={{
          borderTop: `3px solid ${diff >= 0 ? 'var(--success)' : 'var(--danger)'}`,
        }}>
          <div style={{ color: diff >= 0 ? 'var(--success)' : 'var(--danger)', marginBottom: '0.5rem' }}>
            <TrendingUp size={20} />
          </div>
          <div className="stat-value" style={{ color: diff >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {diffSign}{diff}
          </div>
          <div className="stat-label">vs Goal</div>
          <div className="stat-sub">
            {diff > 0 ? 'Above target' : diff < 0 ? 'Below target' : 'On target'}
          </div>
        </div>

        {/* TOK / EE Core Points */}
        <div className="stat-card" style={{ borderTop: '3px solid var(--core-color)' }}>
          <div style={{ color: 'var(--core-color)', marginBottom: '0.5rem' }}>
            <BookOpen size={20} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginBottom: '0.25rem' }}>
            <span className="stat-value" style={{ color: 'var(--core-color)' }}>{corePoints}</span>
            <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)', fontWeight: 700 }}>/3</span>
          </div>
          <div className="stat-label">Core Points</div>
          <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem' }}>
            {[0, 1, 2, 3].map(v => (
              <button
                key={v}
                onClick={() => dispatch({ type: 'SET_CORE_POINTS', payload: v })}
                style={{
                  width: '1.75rem', height: '1.75rem',
                  borderRadius: '50%',
                  border: corePoints === v ? '2px solid var(--core-color)' : '2px solid var(--border)',
                  background: corePoints === v ? 'var(--core-bg)' : 'white',
                  color: corePoints === v ? 'var(--core-color)' : 'var(--text-muted)',
                  fontWeight: 700, fontSize: '0.8rem',
                  cursor: 'pointer', transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >{v}</button>
            ))}
          </div>
          <div className="stat-sub" style={{ marginTop: '0.375rem', fontSize: '0.75rem' }}>TOK + EE bonus</div>
        </div>

        {/* Subjects count */}
        <div className="stat-card" style={{ borderTop: '3px solid var(--success)' }}>
          <div style={{ color: 'var(--success)', marginBottom: '0.5rem' }}>
            <BookOpen size={20} />
          </div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>
            {subjects.filter(s => getPredictedGrade(s) !== null).length}
            <span style={{ fontSize: '1.25rem', color: 'var(--text-muted)' }}>/{subjects.length}</span>
          </div>
          <div className="stat-label">Subjects Graded</div>
          <div className="stat-sub">of 6 subjects</div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        {/* Progress circle */}
        <div className="chart-section">
          <p className="chart-title">Total IB Score</p>
          <p className="chart-subtitle">Progress toward your target</p>
          <ScoreCircle current={currentTotal} goal={goalScore} />
        </div>

        {/* Carousel chart */}
        <div className="chart-section">
          <p className="chart-title">Progress by Quarter</p>
          <p className="chart-subtitle">Use arrows to switch subjects</p>
          <ProgressCarouselChart subjects={subjects} tok={state.tok} />
        </div>
      </div>

      {/* Bar chart */}
      <div className="chart-section" style={{ marginBottom: '1.5rem' }}>
        <p className="chart-title">Current Grade vs Goal — All Subjects</p>
        <p className="chart-subtitle">Comparing predicted grades to your per-subject targets</p>
        <CurrentVsGoalChart subjects={subjects} />
      </div>

      {/* Subjects Table */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div className="section-header">
          <h2>All Subjects</h2>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Level</th>
                <th>Q1</th>
                <th>Q2</th>
                <th>Q3</th>
                <th>Q4</th>
                <th>Predicted</th>
                <th>Goal</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s) => {
                const predicted = getPredictedGrade(s);
                const status = getStatusInfo(predicted, s.goalGrade);
                const qAvgs = [1, 2, 3, 4].map(q => {
                  const avg = getQuarterAvg(s.quarters[q]);
                  return avg !== null ? avg.toFixed(1) : '–';
                });

                return (
                  <tr key={s.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{s.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.groupName}</div>
                    </td>
                    <td>
                      <span className={`badge ${s.level === 'HL' ? 'badge-hl' : 'badge-sl'}`}>{s.level}</span>
                    </td>
                    {qAvgs.map((avg, i) => (
                      <td key={i} style={{ fontWeight: 500, color: avg !== '–' ? getGradeColor(Math.round(Number(avg))) : 'var(--text-light)' }}>
                        {avg}
                      </td>
                    ))}
                    <td>
                      {predicted != null ? (
                        <span className={`grade-badge ${getGradeClass(predicted)}`}>{predicted}</span>
                      ) : (
                        <span style={{ color: 'var(--text-light)', fontSize: '0.8rem' }}>–</span>
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>{s.goalGrade}</td>
                    <td>
                      <span className={`badge ${status.badge}`}>{status.label}</span>
                    </td>
                    <td>
                      <Link
                        to={`/subject/${s.id}`}
                        style={{ textDecoration: 'none' }}
                      >
                        <button className="btn btn-secondary btn-sm">
                          View <ChevronRight size={13} />
                        </button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {/* TOK row */}
              <tr>
                <td>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Theory of Knowledge</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Core Component</div>
                </td>
                <td><span className="badge badge-core">CORE</span></td>
                {[1, 2, 3, 4].map(q => {
                  const grades = state.tok.quarters[q] || [];
                  return (
                    <td key={q}>
                      {grades.length === 0 ? (
                        <span style={{ color: 'var(--text-light)' }}>–</span>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                          {grades.map((g, i) => (
                            <span key={i} style={{ fontWeight: 800, fontSize: '0.875rem', color: getTokColor(g) }}>{g}</span>
                          ))}
                        </div>
                      )}
                    </td>
                  );
                })}
                <td>
                  {(() => {
                    const latest = getLatestTokGrade(state.tok.quarters);
                    if (!latest) return <span style={{ color: 'var(--text-light)', fontSize: '0.8rem' }}>–</span>;
                    return <span style={{ fontWeight: 800, fontSize: '1rem', color: getTokColor(latest) }}>{latest}</span>;
                  })()}
                </td>
                <td style={{ fontWeight: 800, color: getTokColor(state.tok.goalGrade) }}>
                  {state.tok.goalGrade}
                </td>
                <td></td>
                <td>
                  <Link to="/tok" style={{ textDecoration: 'none' }}>
                    <button className="btn btn-secondary btn-sm">
                      View <ChevronRight size={13} />
                    </button>
                  </Link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Progress History */}
      <ProgressHistorySection
        history={state.progressHistory || []}
        subjects={subjects}
        dispatch={dispatch}
      />

      {/* Subject Cards */}
      <div>
        <div className="section-header">
          <h2>Subject Cards</h2>
        </div>
        <div className="subjects-grid">
          {subjects.map((s, i) => {
            const predicted = getPredictedGrade(s);
            const status = getStatusInfo(predicted, s.goalGrade);
            const pct = predicted ? Math.min(1, predicted / 7) : 0;

            return (
              <Link key={s.id} to={`/subject/${s.id}`} className="subject-card">
                <div className="subject-card-header">
                  <div>
                    <div className="subject-card-name">{s.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>{s.groupName}</div>
                  </div>
                  <span className={`badge ${s.level === 'HL' ? 'badge-hl' : 'badge-sl'}`}>{s.level}</span>
                </div>

                {/* Progress bar */}
                <div className="progress-bar-container">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${pct * 100}%`,
                      background: SUBJECT_COLORS[i % SUBJECT_COLORS.length],
                    }}
                  />
                </div>

                <div className="subject-card-grades">
                  <div className="grade-item">
                    <span className="grade-item-label">Predicted</span>
                    <span className="grade-item-value" style={{ color: predicted ? getGradeColor(predicted) : 'var(--text-light)' }}>
                      {predicted || '–'}
                    </span>
                  </div>
                  <div className="grade-item">
                    <span className="grade-item-label">Goal</span>
                    <span className="grade-item-value" style={{ color: 'var(--accent)' }}>{s.goalGrade}</span>
                  </div>
                  <div style={{ marginLeft: 'auto' }}>
                    <span className={`badge ${status.badge}`}>{status.label}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* How It Works */}
      <div style={{ marginTop: '40px' }}>
        <HowItWorksSection />
      </div>
    </div>
  );
}
