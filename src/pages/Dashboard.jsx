import React, { useMemo, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { HowItWorksSection } from './HowItWorksPage';
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, Cell,
  AreaChart, Area, ReferenceLine,
} from 'recharts';
import { TrendingUp, Award, Target, BookOpen, ChevronRight, ChevronLeft, Settings, Plus, X, FileText, File, AlertTriangle, Check, Image } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerSrc;

// ─── OCR Helper ──────────────────────────────────────────────────────────────

// Preprocess image: upscale, grayscale, contrast boost, sharpen — for better Tesseract accuracy
async function preprocessImageForOCR(file) {
  return new Promise((resolve) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        // Scale to at least 2000px wide (Tesseract works best at 300dpi+)
        const scale = Math.max(2, 2000 / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, w, h);

        // Grayscale + contrast boost
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;
        const cf = (259 * (50 + 255)) / (255 * (259 - 50)); // contrast factor
        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          const boosted = Math.max(0, Math.min(255, Math.round(cf * (gray - 128) + 128)));
          data[i] = data[i + 1] = data[i + 2] = boosted;
        }
        ctx.putImageData(imageData, 0, 0);

        // Sharpen with cross-shaped kernel [0,-1,0,-1,5,-1,0,-1,0]
        const src = imageData.data.slice();
        const sharp = ctx.getImageData(0, 0, w, h);
        const dst = sharp.data;
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const c = (y * w + x) * 4;
            const v = Math.max(0, Math.min(255,
              5 * src[c] - src[((y - 1) * w + x) * 4] - src[((y + 1) * w + x) * 4]
              - src[(y * w + x - 1) * 4] - src[(y * w + x + 1) * 4]
            ));
            dst[c] = dst[c + 1] = dst[c + 2] = v;
            dst[c + 3] = 255;
          }
        }
        ctx.putImageData(sharp, 0, 0);
        canvas.toBlob(blob => resolve(blob || file), 'image/png');
      } catch {
        resolve(file); // fallback to original on any error
      }
    };
    img.onerror = () => resolve(file);
    img.src = objectUrl;
  });
}

async function ocrImage(file) {
  const processedBlob = await preprocessImageForOCR(file);
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng');
  try {
    const { data: { text } } = await worker.recognize(processedBlob);
    return text;
  } finally {
    await worker.terminate();
  }
}

// ─── PDF Extraction Helpers ───────────────────────────────────────────────────
async function extractPdfText(file) {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const lineMap = {};
    content.items.forEach(item => {
      const y = Math.round(item.transform[5]);
      if (!lineMap[y]) lineMap[y] = [];
      lineMap[y].push(item.str);
    });
    const sortedY = Object.keys(lineMap).map(Number).sort((a, b) => b - a);
    pages.push(sortedY.map(y => lineMap[y].join(' ')).join('\n'));
  }
  return pages.join('\n');
}

function parsePdfForHistory(text, subjects) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const stop = new Set(['a', 'an', 'the', 'and', 'of', 'in', 'to', 'for', 'or', 'is', 'at', 'by', 'with', 'ib']);

  // Detect quarter/term label — try multiple patterns
  const qPatterns = [
    /\b(Q\s*[1-4])\b/i,
    /\b(Quarter\s*[1-4])\b/i,
    /\b(Term\s*[1-4])\b/i,
    /\b(Semester\s*[1-2])\b/i,
    /\b(S\s*[1-2])\b/,
  ];
  let label = '';
  for (const re of qPatterns) {
    const m = text.match(re);
    if (m) {
      // Normalize: "Quarter3" → "Quarter 3"; preserve "Q3" as-is
      label = m[1]
        .replace(/\s+/g, ' ')
        .replace(/^(Quarter|Term|Semester)(\d)/i, '$1 $2')
        .trim();
      break;
    }
  }

  // For each subject, find the BEST matching line then search nearby for a grade 1-7
  const grades = subjects.map(subject => {
    const words = subject.name.toLowerCase()
      .split(/[\s:&\-/()\[\],.']+/)
      .filter(w => w.length > 2 && !stop.has(w));
    if (words.length === 0) return '';

    // Lower threshold: 30% of significant words must match (more lenient for OCR noise)
    const threshold = Math.max(1, Math.ceil(words.length * 0.3));

    // Find the line with the most keyword hits (best match, not just first match)
    let bestIdx = -1;
    let bestHits = 0;
    for (let i = 0; i < lines.length; i++) {
      const ll = lines[i].toLowerCase();
      const hits = words.filter(w => ll.includes(w)).length;
      if (hits >= threshold && hits > bestHits) {
        bestIdx = i;
        bestHits = hits;
      }
    }
    if (bestIdx < 0) return '';

    const i = bestIdx;

    // Strategy 1: last number 1-7 on the same line (usually the final/predicted grade)
    const sameLineNums = lines[i].match(/\b([1-7])\b/g);
    if (sameLineNums) return sameLineNums[sameLineNums.length - 1];

    // Strategy 2: scan next 8 lines one-by-one, return last grade found per line
    for (let j = i + 1; j < Math.min(lines.length, i + 9); j++) {
      const nums = lines[j].match(/\b([1-7])\b/g);
      if (nums) return nums[nums.length - 1];
    }

    // Strategy 3: scan up to 4 lines before
    for (let j = i - 1; j >= Math.max(0, i - 4); j--) {
      const nums = lines[j].match(/\b([1-7])\b/g);
      if (nums) return nums[nums.length - 1];
    }

    return '';
  });

  const detected = grades.filter(Boolean).length;
  return { label, grades, detected };
}
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

  // ── PDF Import state ──
  const [importPhase, setImportPhase] = useState(null); // null | 'upload' | 'processing' | 'review'
  const [importError, setImportError] = useState(null);
  const [importLabel, setImportLabel] = useState('');
  const [importGrades, setImportGrades] = useState(EMPTY_GRADES);
  const [importDragOver, setImportDragOver] = useState(false);
  const [importRawText, setImportRawText] = useState('');
  const [importIsImageBased, setImportIsImageBased] = useState(false);
  const [importDetected, setImportDetected] = useState(0);
  const [showTextPreview, setShowTextPreview] = useState(false);
  const [importExtractionFailed, setImportExtractionFailed] = useState(false);
  const [importPasteText, setImportPasteText] = useState('');
  const [showPasteInput, setShowPasteInput] = useState(false);
  const [importSource, setImportSource] = useState(null); // 'pdf' | 'paste'
  const importFileRef = useRef(null);

  // ── Screenshot Import state ──
  const [screenshotPhase, setScreenshotPhase] = useState(null); // null | 'upload' | 'processing' | 'review'
  const [screenshotError, setScreenshotError] = useState(null);
  const [screenshotDragOver, setScreenshotDragOver] = useState(false);
  const [screenshotLabel, setScreenshotLabel] = useState('');
  const [screenshotGrades, setScreenshotGrades] = useState(EMPTY_GRADES);
  const [screenshotDetected, setScreenshotDetected] = useState(0);
  const [screenshotRawText, setScreenshotRawText] = useState('');
  const [showScreenshotText, setShowScreenshotText] = useState(false);
  const screenshotFileRef = useRef(null);

  async function handleImportFile(file) {
    if (!file || file.type !== 'application/pdf') {
      setImportError('Please upload a PDF file (.pdf).');
      return;
    }
    setImportError(null);
    setImportSource('pdf');
    setImportPhase('processing');
    try {
      const text = await extractPdfText(file);
      setImportRawText(text);
      setShowTextPreview(false);

      if (!text.trim()) {
        // Image-based / scanned PDF — go to review with empty grades
        setImportIsImageBased(true);
        setImportLabel('');
        setImportDetected(0);
        setImportGrades(Array(subjects.length).fill(''));
        setImportPhase('review');
        return;
      }

      setImportIsImageBased(false);
      setImportExtractionFailed(false);
      const { label, grades, detected } = parsePdfForHistory(text, subjects);
      setImportLabel(label);
      setImportDetected(detected);
      setImportGrades(grades.length === subjects.length ? grades : Array(subjects.length).fill(''));
      setImportPhase('review');
    } catch (err) {
      // Don't block the user — go to review with empty grades and show diagnostic info
      setImportExtractionFailed(true);
      setImportIsImageBased(false);
      setImportRawText('');
      setImportLabel('');
      setImportDetected(0);
      setImportGrades(Array(subjects.length).fill(''));
      setShowPasteInput(true);
      setImportPhase('review');
    }
  }

  function handlePasteDetect() {
    if (!importPasteText.trim()) return;
    const { label, grades, detected } = parsePdfForHistory(importPasteText, subjects);
    if (label) setImportLabel(label);
    setImportDetected(detected);
    setImportGrades(grades.length === subjects.length ? grades : Array(subjects.length).fill(''));
    setImportRawText(importPasteText);
    setImportIsImageBased(false);
    setImportExtractionFailed(false);
    setImportSource('paste');
    setImportPhase('review');
  }

  async function handleScreenshotFile(file) {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!file || !validTypes.includes(file.type)) {
      setScreenshotError('Please upload a PNG or JPG image.');
      return;
    }
    setScreenshotError(null);
    setScreenshotPhase('processing');
    try {
      const text = await ocrImage(file);
      setScreenshotRawText(text);
      setShowScreenshotText(false);
      if (!text.trim()) {
        setScreenshotError('We could not read this screenshot clearly. Please try another image or use Paste Text / Manual Entry.');
        setScreenshotDetected(0);
        setScreenshotGrades(Array(subjects.length).fill(''));
        setScreenshotPhase('review');
        return;
      }
      const { label, grades, detected } = parsePdfForHistory(text, subjects);
      setScreenshotLabel(label);
      setScreenshotDetected(detected);
      setScreenshotGrades(grades.length === subjects.length ? grades : Array(subjects.length).fill(''));
      setScreenshotPhase('review');
    } catch (err) {
      setScreenshotError('We could not read this screenshot clearly. Please try another image or use Paste Text / Manual Entry.');
      setScreenshotDetected(0);
      setScreenshotGrades(Array(subjects.length).fill(''));
      setScreenshotRawText('');
      setScreenshotPhase('review');
    }
  }

  function cancelScreenshot() {
    setScreenshotPhase(null);
    setScreenshotError(null);
    setScreenshotLabel('');
    setScreenshotGrades(EMPTY_GRADES);
    setScreenshotRawText('');
    setScreenshotDetected(0);
    setShowScreenshotText(false);
    setScreenshotDragOver(false);
  }

  function saveScreenshot() {
    if (!screenshotLabel.trim()) return;
    dispatch({ type: 'ADD_PROGRESS_ENTRY', payload: { label: screenshotLabel.trim(), grades: screenshotGrades } });
    cancelScreenshot();
  }

  function cancelImport() {
    setImportPhase(null);
    setImportError(null);
    setImportLabel('');
    setImportGrades(EMPTY_GRADES);
    setImportRawText('');
    setImportIsImageBased(false);
    setImportDetected(0);
    setShowTextPreview(false);
    setImportExtractionFailed(false);
    setImportPasteText('');
    setShowPasteInput(false);
    setImportSource(null);
    setImportDragOver(false);
  }

  function saveImport() {
    if (!importLabel.trim()) return;
    dispatch({ type: 'ADD_PROGRESS_ENTRY', payload: { label: importLabel.trim(), grades: importGrades } });
    cancelImport();
  }

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
        {!addingNew && !importPhase && !screenshotPhase && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-sm" onClick={startAdd}>
              <Plus size={13} /> Add Manually
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setImportPasteText(''); setImportPhase('paste'); }}>
              <FileText size={13} /> Paste Text
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setScreenshotPhase('upload')}>
              <Image size={13} /> Import Screenshot
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setImportError(null); setImportPhase('upload'); }}>
              <File size={13} /> Import PDF
            </button>
          </div>
        )}
      </div>

      {/* ── PDF Upload Panel ── */}
      {importPhase === 'upload' && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0 }}>Import PDF</h3>
            <button className="btn btn-ghost btn-sm" onClick={cancelImport}><X size={14} /></button>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.875rem' }}>
            Upload your IB report card PDF to detect grades automatically. The file is processed locally and never uploaded or stored.
          </p>

          {importError && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <AlertTriangle size={14} color="var(--danger)" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
              <p style={{ fontSize: '0.82rem', color: 'var(--danger)', margin: 0 }}>{importError}</p>
            </div>
          )}

          <input ref={importFileRef} type="file" accept="application/pdf" style={{ display: 'none' }}
            onChange={e => { if (e.target.files[0]) handleImportFile(e.target.files[0]); e.target.value = ''; }} />

          <div
            onDragOver={e => { e.preventDefault(); setImportDragOver(true); }}
            onDragLeave={() => setImportDragOver(false)}
            onDrop={e => { e.preventDefault(); setImportDragOver(false); if (e.dataTransfer.files[0]) handleImportFile(e.dataTransfer.files[0]); }}
            onClick={() => importFileRef.current?.click()}
            style={{
              border: `2px dashed ${importDragOver ? 'var(--primary)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-sm)', padding: '2rem', textAlign: 'center',
              cursor: 'pointer', background: importDragOver ? 'var(--primary-light)' : 'var(--bg)',
              transition: 'all 0.15s', marginBottom: '0.875rem',
            }}
          >
            <File size={32} color={importDragOver ? 'var(--primary)' : 'var(--text-light)'} style={{ marginBottom: '0.75rem' }} />
            <p style={{ fontWeight: 600, marginBottom: '0.25rem', color: importDragOver ? 'var(--primary)' : 'var(--text)' }}>
              Drop PDF here, or click to browse
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>PDF files only</p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <AlertTriangle size={13} color="#D97706" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
            <p style={{ fontSize: '0.78rem', color: '#92400E', margin: 0 }}>
              If the PDF cannot be read automatically, you'll be shown a message and can switch to Paste Text, Import Screenshot, or Add Manually.
            </p>
          </div>
        </div>
      )}

      {/* ── Paste Text Panel ── */}
      {importPhase === 'paste' && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0 }}>Import by Pasting Text</h3>
            <button className="btn btn-ghost btn-sm" onClick={cancelImport}><X size={14} /></button>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Open your report card in a PDF viewer or browser, select all text (Ctrl+A / Cmd+A), copy, and paste below.
          </p>
          <textarea
            value={importPasteText}
            onChange={e => setImportPasteText(e.target.value)}
            placeholder="Paste your report card text here…"
            rows={8}
            autoFocus
            style={{
              width: '100%', fontFamily: 'monospace', fontSize: '0.78rem',
              border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
              padding: '0.625rem', resize: 'vertical', boxSizing: 'border-box',
              color: 'var(--text)', background: 'var(--bg)', marginBottom: '0.75rem',
            }}
          />
          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <button className="btn btn-primary btn-sm" onClick={handlePasteDetect} disabled={!importPasteText.trim()}>
              Detect Grades
            </button>
            <button className="btn btn-ghost btn-sm" onClick={cancelImport}>Cancel</button>
          </div>
        </div>
      )}

      {importPhase === 'processing' && (
        <div className="card" style={{ marginBottom: '1.5rem', textAlign: 'center', padding: '2rem' }}>
          <div style={{ width: '36px', height: '36px', border: '3px solid var(--border)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
          <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Reading your PDF…</p>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Extracting text and detecting grades</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {importPhase === 'review' && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Review Imported Grades</h3>
            <button className="btn btn-ghost btn-sm" onClick={cancelImport}><X size={14} /></button>
          </div>

          {/* Extraction failed warning */}
          {importExtractionFailed && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <AlertTriangle size={14} color="var(--danger)" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
              <p style={{ fontSize: '0.82rem', color: 'var(--danger)', margin: 0 }}>
                <strong>We could not read this PDF clearly.</strong> Try using Paste Text, Import Screenshot, or Add Manually.
              </p>
            </div>
          )}

          {/* Image-based PDF warning */}
          {importIsImageBased && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <AlertTriangle size={14} color="var(--danger)" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
              <p style={{ fontSize: '0.82rem', color: 'var(--danger)', margin: 0 }}>
                <strong>This PDF appears to be image-based or scanned.</strong> Text extraction did not find any content. Please enter grades manually below, or upload a text-based PDF.
              </p>
            </div>
          )}

          {/* Detection summary */}
          {!importIsImageBased && (
            <div style={{ background: importDetected > 0 ? '#F0FDF4' : '#FFFBEB', border: `1px solid ${importDetected > 0 ? '#BBF7D0' : '#FDE68A'}`, borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <AlertTriangle size={14} color={importDetected > 0 ? '#16A34A' : '#D97706'} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                <p style={{ fontSize: '0.82rem', color: importDetected > 0 ? '#166534' : '#92400E', margin: 0 }}>
                  {importDetected > 0
                    ? <><strong>{importDetected} of {subjects.length} subject grade{importDetected !== 1 ? 's' : ''} detected.</strong> Review and fill in any missing ones.</>
                    : <><strong>No grades were automatically detected.</strong> The PDF text was extracted but no matching grades were found. Enter them manually below.</>
                  }
                </p>
              </div>
              <button
                onClick={() => setShowTextPreview(p => !p)}
                style={{ fontSize: '0.75rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', whiteSpace: 'nowrap' }}
              >
                {showTextPreview ? 'Hide extracted text' : 'Show extracted text'}
              </button>
            </div>
          )}

          {/* Always-warn */}
          {!importIsImageBased && (
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 'var(--radius-sm)', padding: '0.625rem 1rem', marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
              <AlertTriangle size={13} color="#D97706" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
              <p style={{ fontSize: '0.78rem', color: '#92400E', margin: 0 }}>
                <strong>Imported grades may not be perfect.</strong> Review each grade before confirming.
              </p>
            </div>
          )}

          {/* Extracted text preview */}
          {showTextPreview && importRawText && (
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.375rem' }}>Extracted Text</p>
              <pre style={{
                background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                padding: '0.75rem', fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap',
                wordBreak: 'break-word', maxHeight: '200px', overflowY: 'auto', fontFamily: 'monospace',
                lineHeight: 1.5,
              }}>{importRawText.slice(0, 3000)}{importRawText.length > 3000 ? '\n\n[… truncated]' : ''}</pre>
            </div>
          )}

          {/* Quarter label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Quarter</label>
            {['Q1', 'Q2', 'Q3', 'Q4'].map(q => (
              <button key={q} onClick={() => setImportLabel(q)}
                style={{
                  padding: '0.3rem 0.875rem', borderRadius: '100px', fontWeight: 700, fontSize: '0.82rem',
                  border: importLabel === q ? '2px solid var(--primary)' : '2px solid var(--border)',
                  background: importLabel === q ? 'var(--primary)' : 'white',
                  color: importLabel === q ? 'white' : 'var(--text-muted)', cursor: 'pointer',
                }}
              >{q}</button>
            ))}
            <input
              value={importLabel}
              onChange={e => setImportLabel(e.target.value)}
              placeholder="Custom label…"
              style={{ ...gradeInputStyle, width: '8rem', borderColor: importLabel ? 'var(--primary)' : 'var(--border)' }}
            />
          </div>

          {/* Per-subject grades */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
            {subjects.map((s, i) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', flexWrap: 'wrap' }}>
                <span className={`badge ${s.level === 'HL' ? 'badge-hl' : 'badge-sl'}`}>{s.level}</span>
                <span style={{ flex: 1, fontWeight: 500, fontSize: '0.875rem', minWidth: '120px' }}>{s.name}</span>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {[1, 2, 3, 4, 5, 6, 7].map(g => (
                    <button key={g} onClick={() => {
                      const next = [...importGrades];
                      next[i] = String(g);
                      setImportGrades(next);
                    }}
                      style={{
                        width: '2rem', height: '2rem', borderRadius: '50%', fontWeight: 700, fontSize: '0.78rem',
                        border: importGrades[i] === String(g) ? '2px solid var(--primary)' : '2px solid var(--border)',
                        background: importGrades[i] === String(g) ? 'var(--primary)' : 'white',
                        color: importGrades[i] === String(g) ? 'white' : 'var(--text-muted)', cursor: 'pointer',
                      }}
                    >{g}</button>
                  ))}
                  <button onClick={() => { const next = [...importGrades]; next[i] = ''; setImportGrades(next); }}
                    title="Clear" style={{ width: '2rem', height: '2rem', borderRadius: '50%', border: '1.5px solid var(--border)', background: 'none', cursor: 'pointer', color: 'var(--text-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={10} />
                  </button>
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, minWidth: '1.5rem', textAlign: 'center', color: importGrades[i] ? 'var(--primary)' : 'var(--text-light)' }}>
                  {importGrades[i] || '–'}
                </span>
              </div>
            ))}
          </div>

          {/* Total */}
          <div style={{ padding: '0.625rem 0.75rem', background: 'var(--primary-light)', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--primary-dark)' }}>Calculated Total</span>
            <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--primary)' }}>
              {computeHistoryTotal(importGrades)} / 42
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <button className="btn btn-primary btn-sm" onClick={saveImport} disabled={!importLabel.trim()}>
              <Check size={13} /> Confirm Import
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => {
              setImportExtractionFailed(false);
              setImportIsImageBased(false);
              setImportRawText('');
              setImportLabel('');
              setImportDetected(0);
              setImportGrades(Array(subjects.length).fill(''));
              setShowTextPreview(false);
              if (importSource === 'paste') { setImportPasteText(''); setImportPhase('paste'); }
              else { setImportError(null); setImportPhase('upload'); }
            }}>
              Try Again
            </button>
            <button className="btn btn-ghost btn-sm" onClick={cancelImport}>
              Cancel
            </button>
          </div>
          {!importLabel.trim() && (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Select a quarter label to enable confirm.</p>
          )}
        </div>
      )}

      {/* ── Screenshot Import Panels ── */}
      {screenshotPhase === 'upload' && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ margin: 0 }}>Import Screenshot</h3>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, background: '#EDE9FE', color: '#7C3AED', borderRadius: 4, padding: '0.15rem 0.4rem' }}>BETA</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={cancelScreenshot}><X size={14} /></button>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.875rem' }}>
            Upload a screenshot of your report card to detect grades automatically. OCR results may not be perfect — always review before saving.
          </p>

          {screenshotError && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <AlertTriangle size={14} color="var(--danger)" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
              <p style={{ fontSize: '0.82rem', color: 'var(--danger)', margin: 0 }}>{screenshotError}</p>
            </div>
          )}

          <input ref={screenshotFileRef} type="file" accept="image/png,image/jpeg,image/jpg" style={{ display: 'none' }}
            onChange={e => handleScreenshotFile(e.target.files[0])} />

          <div
            onDragOver={e => { e.preventDefault(); setScreenshotDragOver(true); }}
            onDragLeave={() => setScreenshotDragOver(false)}
            onDrop={e => { e.preventDefault(); setScreenshotDragOver(false); handleScreenshotFile(e.dataTransfer.files[0]); }}
            onClick={() => screenshotFileRef.current?.click()}
            style={{
              border: `2px dashed ${screenshotDragOver ? 'var(--primary)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-sm)', padding: '2rem', textAlign: 'center',
              cursor: 'pointer', background: screenshotDragOver ? 'var(--primary-light)' : 'var(--bg)',
              transition: 'all 0.15s', marginBottom: '0.875rem',
            }}
          >
            <Image size={32} color={screenshotDragOver ? 'var(--primary)' : 'var(--text-light)'} style={{ marginBottom: '0.75rem' }} />
            <p style={{ fontWeight: 600, marginBottom: '0.25rem', color: screenshotDragOver ? 'var(--primary)' : 'var(--text)' }}>
              Drop screenshot here, or click to browse
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>PNG, JPG, JPEG accepted</p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginTop: '0.25rem' }}>
            <AlertTriangle size={13} color="#D97706" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
            <p style={{ fontSize: '0.78rem', color: '#92400E', margin: 0 }}>
              <strong>Screenshot import is in beta.</strong> For best results, upload a clear, zoomed-in screenshot of the grade table. Image is processed locally — never uploaded or stored.
            </p>
          </div>
        </div>
      )}

      {screenshotPhase === 'processing' && (
        <div className="card" style={{ marginBottom: '1.5rem', textAlign: 'center', padding: '2rem' }}>
          <div style={{ width: '36px', height: '36px', border: '3px solid var(--border)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
          <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Reading screenshot…</p>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Running OCR — this may take a few seconds</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {screenshotPhase === 'review' && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ margin: 0 }}>Review Screenshot Grades</h3>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, background: '#EDE9FE', color: '#7C3AED', borderRadius: 4, padding: '0.15rem 0.4rem' }}>BETA</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={cancelScreenshot}><X size={14} /></button>
          </div>

          {screenshotError && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <AlertTriangle size={14} color="var(--danger)" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
              <p style={{ fontSize: '0.82rem', color: 'var(--danger)', margin: 0 }}>{screenshotError}</p>
            </div>
          )}

          {!screenshotError && (
            <div style={{ background: screenshotDetected > 0 ? '#F0FDF4' : '#FFFBEB', border: `1px solid ${screenshotDetected > 0 ? '#BBF7D0' : '#FDE68A'}`, borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <AlertTriangle size={14} color={screenshotDetected > 0 ? '#16A34A' : '#D97706'} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                <p style={{ fontSize: '0.82rem', color: screenshotDetected > 0 ? '#166534' : '#92400E', margin: 0 }}>
                  {screenshotDetected > 0
                    ? <><strong>{screenshotDetected} of {subjects.length} grades detected.</strong> Review and fill in any missing ones.</>
                    : <><strong>No grades were automatically detected.</strong> Enter them manually below.</>
                  }
                </p>
              </div>
              {screenshotRawText && (
                <button onClick={() => setShowScreenshotText(p => !p)}
                  style={{ fontSize: '0.75rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', whiteSpace: 'nowrap' }}>
                  {showScreenshotText ? 'Hide OCR text' : 'Show OCR text'}
                </button>
              )}
            </div>
          )}

          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 'var(--radius-sm)', padding: '0.625rem 1rem', marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
            <AlertTriangle size={13} color="#D97706" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
            <p style={{ fontSize: '0.78rem', color: '#92400E', margin: 0 }}>
              <strong>OCR-detected grades may not be accurate.</strong> Review every grade carefully before confirming.
            </p>
          </div>

          {showScreenshotText && screenshotRawText && (
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.375rem' }}>OCR Text</p>
              <pre style={{
                background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                padding: '0.75rem', fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap',
                wordBreak: 'break-word', maxHeight: '200px', overflowY: 'auto', fontFamily: 'monospace', lineHeight: 1.5,
              }}>{screenshotRawText.slice(0, 3000)}{screenshotRawText.length > 3000 ? '\n\n[… truncated]' : ''}</pre>
            </div>
          )}

          {/* Quarter label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Quarter</label>
            {['Q1', 'Q2', 'Q3', 'Q4'].map(q => (
              <button key={q} onClick={() => setScreenshotLabel(q)}
                style={{
                  padding: '0.3rem 0.875rem', borderRadius: '100px', fontWeight: 700, fontSize: '0.82rem',
                  border: screenshotLabel === q ? '2px solid var(--primary)' : '2px solid var(--border)',
                  background: screenshotLabel === q ? 'var(--primary)' : 'white',
                  color: screenshotLabel === q ? 'white' : 'var(--text-muted)', cursor: 'pointer',
                }}
              >{q}</button>
            ))}
            <input
              value={screenshotLabel}
              onChange={e => setScreenshotLabel(e.target.value)}
              placeholder="Custom label…"
              style={{ width: '8rem', padding: '0.2rem 0.25rem', border: `1.5px solid ${screenshotLabel ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 6, fontSize: '0.85rem', textAlign: 'center', fontFamily: 'inherit', fontWeight: 700 }}
            />
          </div>

          {/* Per-subject grades */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
            {subjects.map((s, i) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: screenshotGrades[i] ? 'var(--bg)' : '#FFFBEB', border: `1px solid ${screenshotGrades[i] ? 'transparent' : '#FDE68A'}`, borderRadius: 'var(--radius-sm)', flexWrap: 'wrap' }}>
                <span className={`badge ${s.level === 'HL' ? 'badge-hl' : 'badge-sl'}`}>{s.level}</span>
                <span style={{ flex: 1, fontWeight: 500, fontSize: '0.875rem', minWidth: '120px' }}>{s.name}</span>
                {!screenshotGrades[i] && (
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, background: '#FEF3C7', color: '#92400E', borderRadius: 4, padding: '0.1rem 0.35rem', whiteSpace: 'nowrap' }}>Needs review</span>
                )}
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {[1, 2, 3, 4, 5, 6, 7].map(g => (
                    <button key={g} onClick={() => {
                      const next = [...screenshotGrades];
                      next[i] = String(g);
                      setScreenshotGrades(next);
                    }}
                      style={{
                        width: '2rem', height: '2rem', borderRadius: '50%', fontWeight: 700, fontSize: '0.78rem',
                        border: screenshotGrades[i] === String(g) ? '2px solid var(--primary)' : '2px solid var(--border)',
                        background: screenshotGrades[i] === String(g) ? 'var(--primary)' : 'white',
                        color: screenshotGrades[i] === String(g) ? 'white' : 'var(--text-muted)', cursor: 'pointer',
                      }}
                    >{g}</button>
                  ))}
                  <button onClick={() => { const next = [...screenshotGrades]; next[i] = ''; setScreenshotGrades(next); }}
                    title="Clear" style={{ width: '2rem', height: '2rem', borderRadius: '50%', border: '1.5px solid var(--border)', background: 'none', cursor: 'pointer', color: 'var(--text-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={10} />
                  </button>
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, minWidth: '1.5rem', textAlign: 'center', color: screenshotGrades[i] ? 'var(--primary)' : 'var(--text-light)' }}>
                  {screenshotGrades[i] || '–'}
                </span>
              </div>
            ))}
          </div>

          {/* Total */}
          <div style={{ padding: '0.625rem 0.75rem', background: 'var(--primary-light)', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--primary-dark)' }}>Calculated Total</span>
            <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--primary)' }}>
              {computeHistoryTotal(screenshotGrades)} / 42
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <button className="btn btn-primary btn-sm" onClick={saveScreenshot} disabled={!screenshotLabel.trim()}>
              <Check size={13} /> Confirm Import
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setScreenshotPhase('upload')}>
              Upload Different Image
            </button>
            <button className="btn btn-ghost btn-sm" onClick={cancelScreenshot}>
              Cancel
            </button>
          </div>
          {!screenshotLabel.trim() && (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Select a quarter label to enable confirm.</p>
          )}
        </div>
      )}

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
            <p style={{ color: 'var(--text-light)', fontSize: '0.78rem', marginTop: '0.25rem', maxWidth: '520px' }}>
              IB Grade Tracker is a student-made IB organizer that helps IB students track grades, predicted scores, subject goals, core points, progress graphs, and university targets.
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
