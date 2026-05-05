import React, { createContext, useContext, useReducer, useEffect } from 'react';

// ─── IB Subjects List ───────────────────────────────────────────────────────
export const IB_SUBJECTS = [
  // Group 1 – Language & Literature
  { name: 'English A: Literature', group: 1, groupName: 'Language & Literature', canHL: true },
  { name: 'English A: Language & Literature', group: 1, groupName: 'Language & Literature', canHL: true },
  { name: 'Spanish A: Literature', group: 1, groupName: 'Language & Literature', canHL: true },
  { name: 'French A: Literature', group: 1, groupName: 'Language & Literature', canHL: true },
  { name: 'Portuguese A: Literature', group: 1, groupName: 'Language & Literature', canHL: true },
  { name: 'German A: Literature', group: 1, groupName: 'Language & Literature', canHL: true },
  // Group 2 – Language Acquisition
  { name: 'Spanish B', group: 2, groupName: 'Language Acquisition', canHL: true },
  { name: 'French B', group: 2, groupName: 'Language Acquisition', canHL: true },
  { name: 'English B', group: 2, groupName: 'Language Acquisition', canHL: true },
  { name: 'German B', group: 2, groupName: 'Language Acquisition', canHL: true },
  { name: 'Mandarin B', group: 2, groupName: 'Language Acquisition', canHL: true },
  { name: 'Japanese B', group: 2, groupName: 'Language Acquisition', canHL: true },
  { name: 'Spanish ab initio', group: 2, groupName: 'Language Acquisition', canHL: false },
  { name: 'French ab initio', group: 2, groupName: 'Language Acquisition', canHL: false },
  { name: 'German ab initio', group: 2, groupName: 'Language Acquisition', canHL: false },
  // Group 3 – Individuals & Societies
  { name: 'Brazilian Social Studies (BSS)', group: 'bss', groupName: 'Business & Social Sciences', canHL: true },
  { name: 'Business Management', group: 'bss', groupName: 'Business & Social Sciences', canHL: true },
  { name: 'Economics', group: 'bss', groupName: 'Business & Social Sciences', canHL: true },
  { name: 'Global Politics', group: 'bss', groupName: 'Business & Social Sciences', canHL: true },
  { name: 'Psychology', group: 'bss', groupName: 'Business & Social Sciences', canHL: true },
  { name: 'History', group: 'bss', groupName: 'Business & Social Sciences', canHL: true },
  { name: 'Geography', group: 'bss', groupName: 'Business & Social Sciences', canHL: true },
  { name: 'Philosophy', group: 3, groupName: 'Individuals & Societies', canHL: true },
  { name: 'Social & Cultural Anthropology', group: 3, groupName: 'Individuals & Societies', canHL: false },
  { name: 'Environmental Systems & Societies', group: 3, groupName: 'Individuals & Societies', canHL: false },
  // Group 4 – Sciences
  { name: 'Biology', group: 4, groupName: 'Sciences', canHL: true },
  { name: 'Chemistry', group: 4, groupName: 'Sciences', canHL: true },
  { name: 'Physics', group: 4, groupName: 'Sciences', canHL: true },
  { name: 'Computer Science', group: 4, groupName: 'Sciences', canHL: true },
  { name: 'Design Technology', group: 4, groupName: 'Sciences', canHL: true },
  { name: 'Sports, Exercise & Health Science', group: 4, groupName: 'Sciences', canHL: false },
  // Group 5 – Mathematics
  { name: 'Mathematics: Analysis & Approaches', group: 5, groupName: 'Mathematics', canHL: true },
  { name: 'Mathematics: Applications & Interpretation', group: 5, groupName: 'Mathematics', canHL: true },
  // Group 6 – The Arts
  { name: 'Visual Arts', group: 6, groupName: 'The Arts', canHL: true },
  { name: 'Theatre', group: 6, groupName: 'The Arts', canHL: true },
  { name: 'Music', group: 6, groupName: 'The Arts', canHL: true },
  { name: 'Film', group: 6, groupName: 'The Arts', canHL: true },
  { name: 'Dance', group: 6, groupName: 'The Arts', canHL: true },
];

export const SUBJECT_GROUPS = [
  { id: 1, name: 'Language & Literature' },
  { id: 2, name: 'Language Acquisition' },
  { id: 'bss', name: 'Business & Social Sciences' },
  { id: 3, name: 'Individuals & Societies' },
  { id: 4, name: 'Sciences' },
  { id: 5, name: 'Mathematics' },
  { id: 6, name: 'The Arts' },
];

// ─── TOK Letter Grade Helpers ────────────────────────────────────────────────
export const TOK_GRADES = ['D', 'C', 'B', 'A'];

export function getTokColor(grade) {
  if (!grade) return 'var(--text-light)';
  if (grade === 'A') return '#059669';
  if (grade === 'B') return '#2563EB';
  if (grade === 'C') return '#D97706';
  return '#EA580C';
}

export function getLatestTokGrade(tokQuarters) {
  for (let q = 4; q >= 1; q--) {
    const g = tokQuarters[q];
    if (g && g.length > 0) return g[g.length - 1];
  }
  return null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
export function getQuarterAvg(grades) {
  if (!grades || grades.length === 0) return null;
  return grades.reduce((a, b) => a + b, 0) / grades.length;
}

export function getSemesterAvg(subject, semester) {
  const q1 = semester === 1 ? 1 : 3;
  const q2 = semester === 1 ? 2 : 4;
  const grades = [
    ...(subject.quarters[q1] || []),
    ...(subject.quarters[q2] || []),
  ];
  return getQuarterAvg(grades);
}

export function getPredictedGrade(subject) {
  const all = Object.values(subject.quarters).flat();
  if (all.length === 0) return null;
  return Math.min(7, Math.max(1, Math.round(all.reduce((a, b) => a + b, 0) / all.length)));
}

export function getTotalScore(subjects, corePoints = 0) {
  const subjectTotal = subjects.reduce((t, s) => {
    const g = getPredictedGrade(s);
    return t + (g || 0);
  }, 0);
  return subjectTotal + (corePoints || 0);
}

export function getGoalTotal(subjects) {
  return subjects.reduce((t, s) => t + (s.goalGrade || 0), 0);
}

export function getGradeColor(grade) {
  if (grade === null || grade === undefined) return 'var(--text-light)';
  if (grade >= 7) return '#059669';
  if (grade >= 6) return '#2563EB';
  if (grade >= 5) return '#4338CA';
  if (grade >= 4) return '#D97706';
  if (grade >= 3) return '#EA580C';
  return '#DC2626';
}

export function getGradeClass(grade) {
  if (!grade) return '';
  return `grade-${Math.min(7, Math.max(1, grade))}`;
}

export function getStatusInfo(predicted, goal) {
  if (predicted === null) return { label: 'No grades', class: 'status-na', badge: 'badge-neutral' };
  if (predicted >= goal) return { label: 'Achieved', class: 'status-achieved', badge: 'badge-success' };
  if (predicted >= goal - 1) return { label: 'On track', class: 'status-on-track', badge: 'badge-success' };
  if (predicted >= goal - 2) return { label: 'At risk', class: 'status-at-risk', badge: 'badge-warning' };
  return { label: 'Below goal', class: 'status-below', badge: 'badge-danger' };
}

// ─── Initial State ───────────────────────────────────────────────────────────
const STORAGE_KEY = 'ib_grade_tracker_v1';

const initialState = {
  isSetupComplete: false,
  studentName: '',
  schoolName: '',
  ibYear: '',
  goalScore: 40,
  corePoints: 0,
  subjects: [],
  progressHistory: [],
  dreamUniversities: [],
  tok: {
    id: 'tok',
    name: 'Theory of Knowledge',
    level: 'CORE',
    goalGrade: 'A',
    quarters: { 1: [], 2: [], 3: [], 4: [] },
  },
};

function loadState() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return { ...initialState, ...JSON.parse(s) };
  } catch (e) { /* ignore */ }
  return null;
}

// ─── Reducer ─────────────────────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    case 'COMPLETE_SETUP':
      return {
        ...state,
        isSetupComplete: true,
        studentName: action.payload.studentName,
        goalScore: action.payload.goalScore,
        subjects: action.payload.subjects,
      };

    case 'RESET_SETUP':
      return { ...initialState };

    case 'UPDATE_PROFILE':
      return {
        ...state,
        studentName: action.payload.studentName,
        schoolName: action.payload.schoolName,
        ibYear: action.payload.ibYear,
      };

    case 'UPDATE_SUBJECTS': {
      const newSubjects = action.payload.subjects.map(s => {
        const old = state.subjects.find(o => o.name === s.name && o.level === s.level);
        return old ? { ...s, id: old.id, quarters: old.quarters } : s;
      });
      return { ...state, subjects: newSubjects };
    }

    case 'ADD_GRADE': {
      const { subjectId, quarter, grade } = action.payload;
      return {
        ...state,
        subjects: state.subjects.map(s => {
          if (s.id !== subjectId) return s;
          const existing = s.quarters[quarter] || [];
          return {
            ...s,
            quarters: { ...s.quarters, [quarter]: [...existing, grade] },
          };
        }),
      };
    }

    case 'REMOVE_GRADE': {
      const { subjectId, quarter, index } = action.payload;
      return {
        ...state,
        subjects: state.subjects.map(s => {
          if (s.id !== subjectId) return s;
          const updated = [...(s.quarters[quarter] || [])];
          updated.splice(index, 1);
          return { ...s, quarters: { ...s.quarters, [quarter]: updated } };
        }),
      };
    }

    case 'EDIT_GRADE': {
      const { subjectId, quarter, index, grade } = action.payload;
      return {
        ...state,
        subjects: state.subjects.map(s => {
          if (s.id !== subjectId) return s;
          const updated = [...(s.quarters[quarter] || [])];
          updated[index] = grade;
          return { ...s, quarters: { ...s.quarters, [quarter]: updated } };
        }),
      };
    }

    case 'SET_SUBJECT_GOAL': {
      const { subjectId, goalGrade } = action.payload;
      return {
        ...state,
        subjects: state.subjects.map(s =>
          s.id === subjectId ? { ...s, goalGrade } : s
        ),
      };
    }

    case 'SET_STUDENT_GOAL': {
      return { ...state, goalScore: action.payload };
    }

    case 'SET_CORE_POINTS': {
      return { ...state, corePoints: Math.min(3, Math.max(0, Number(action.payload))) };
    }

    case 'ADD_TOK_GRADE': {
      const { quarter, grade } = action.payload;
      const existing = state.tok.quarters[quarter] || [];
      return {
        ...state,
        tok: {
          ...state.tok,
          quarters: { ...state.tok.quarters, [quarter]: [...existing, grade] },
        },
      };
    }

    case 'REMOVE_TOK_GRADE': {
      const { quarter, index } = action.payload;
      const updated = [...(state.tok.quarters[quarter] || [])];
      updated.splice(index, 1);
      return {
        ...state,
        tok: { ...state.tok, quarters: { ...state.tok.quarters, [quarter]: updated } },
      };
    }

    case 'EDIT_TOK_GRADE': {
      const { quarter, index, grade } = action.payload;
      const updated = [...(state.tok.quarters[quarter] || [])];
      updated[index] = grade;
      return {
        ...state,
        tok: { ...state.tok, quarters: { ...state.tok.quarters, [quarter]: updated } },
      };
    }

    case 'SET_TOK_GOAL': {
      return { ...state, tok: { ...state.tok, goalGrade: action.payload } };
    }

    case 'ADD_PROGRESS_ENTRY': {
      const { label, grades } = action.payload;
      const entry = { id: `ph_${Date.now()}`, label, grades };
      return { ...state, progressHistory: [...(state.progressHistory || []), entry] };
    }

    case 'UPDATE_PROGRESS_ENTRY': {
      const { id, label, grades } = action.payload;
      return {
        ...state,
        progressHistory: (state.progressHistory || []).map(e =>
          e.id === id ? { ...e, label, grades } : e
        ),
      };
    }

    case 'REMOVE_PROGRESS_ENTRY': {
      return {
        ...state,
        progressHistory: (state.progressHistory || []).filter(e => e.id !== action.payload),
      };
    }

    case 'ADD_DREAM_UNIVERSITY': {
      const entry = { id: `du_${Date.now()}`, ...action.payload };
      return { ...state, dreamUniversities: [...(state.dreamUniversities || []), entry] };
    }

    case 'REMOVE_DREAM_UNIVERSITY': {
      return {
        ...state,
        dreamUniversities: (state.dreamUniversities || []).filter(d => d.id !== action.payload),
      };
    }

    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────
const AppContext = createContext(null);

export function AppProvider({ children }) {
  const saved = loadState();
  const [state, dispatch] = useReducer(reducer, saved || initialState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
