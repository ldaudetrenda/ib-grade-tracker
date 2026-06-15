import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

const SITE = 'https://ib-grade-tracker.vercel.app';

const SEO_LINKS = [
  { path: '/ib-grade-tracker', label: 'IB Grade Tracker' },
  { path: '/ib-grade-calculator', label: 'IB Grade Calculator' },
  { path: '/ib-predicted-grade-calculator', label: 'IB Predicted Grade Calculator' },
  { path: '/ib-progress-tracker', label: 'IB Progress Tracker' },
  { path: '/ib-organizer', label: 'IB Organizer' },
  { path: '/ib-help', label: 'IB Help' },
];

// ─── Shared styles ─────────────────────────────────────────────────────────────
const h1St = { fontSize: '2rem', fontWeight: 800, color: '#1e1b4b', marginBottom: '0.75rem', lineHeight: 1.25 };
const introSt = { fontSize: '1.05rem', color: '#374151', lineHeight: 1.75, marginBottom: '1.5rem' };
const h2St = { fontSize: '1.2rem', fontWeight: 700, color: '#1e1b4b', marginTop: '2rem', marginBottom: '0.625rem' };
const pSt = { fontSize: '0.95rem', color: '#374151', lineHeight: 1.75, marginBottom: '1rem' };
const ulSt = { paddingLeft: '1.5rem', marginBottom: '1rem' };
const liSt = { fontSize: '0.95rem', color: '#374151', lineHeight: 1.75, marginBottom: '0.375rem' };

// ─── Shared Layout ──────────────────────────────────────────────────────────────
function SEOLayout({ title, description, canonical, children }) {
  useEffect(() => {
    const prevTitle = document.title;
    const metaDesc = document.querySelector('meta[name="description"]');
    const prevDesc = metaDesc ? metaDesc.getAttribute('content') : '';
    const canonEl = document.querySelector('link[rel="canonical"]');
    const prevCanon = canonEl ? canonEl.getAttribute('href') : '';

    document.title = title;
    if (metaDesc) metaDesc.setAttribute('content', description);
    if (canonEl) canonEl.setAttribute('href', canonical);

    return () => {
      document.title = prevTitle;
      if (metaDesc) metaDesc.setAttribute('content', prevDesc);
      if (canonEl) canonEl.setAttribute('href', prevCanon);
    };
  }, [title, description, canonical]);

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Minimal nav */}
      <nav style={{
        background: '#fff', borderBottom: '1px solid #E5E7EB',
        padding: '0 1.5rem', height: '60px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <Link to="/" style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          textDecoration: 'none', color: '#4F46E5', fontWeight: 800, fontSize: '1rem',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
          IB Grade Tracker
        </Link>
        <Link to="/" style={{
          background: '#4F46E5', color: '#fff', borderRadius: '8px',
          padding: '0.45rem 1.1rem', fontWeight: 700, fontSize: '0.875rem',
          textDecoration: 'none', whiteSpace: 'nowrap',
        }}>
          Start Free →
        </Link>
      </nav>

      {/* Main content */}
      <main style={{ maxWidth: '760px', margin: '0 auto', padding: '2.5rem 1.25rem 4rem' }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{
        background: '#F9FAFB', borderTop: '1px solid #E5E7EB',
        padding: '2rem 1.5rem', textAlign: 'center',
      }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.875rem' }}>
          More IB Resources
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem 1.25rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <Link to="/" style={{ color: '#4F46E5', textDecoration: 'none', fontSize: '0.875rem' }}>Home</Link>
          {SEO_LINKS.map(l => (
            <Link key={l.path} to={l.path} style={{ color: '#4F46E5', textDecoration: 'none', fontSize: '0.875rem' }}>
              {l.label}
            </Link>
          ))}
        </div>
        <p style={{ fontSize: '0.78rem', color: '#9CA3AF', margin: 0 }}>
          IB Grade Tracker — a free, student-made tool for IB students worldwide
        </p>
      </footer>
    </div>
  );
}

// ─── Shared CTA Box ─────────────────────────────────────────────────────────────
function CTABox() {
  return (
    <div style={{
      background: '#EEF2FF', border: '1px solid #C7D2FE',
      borderRadius: '12px', padding: '2rem', textAlign: 'center', marginTop: '2.5rem',
    }}>
      <h3 style={{ color: '#1e1b4b', marginBottom: '0.5rem', fontSize: '1.2rem', fontWeight: 700 }}>
        Ready to track your IB grades?
      </h3>
      <p style={{ color: '#4B5563', fontSize: '0.9rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>
        IB Grade Tracker is free and takes less than 2 minutes to set up.
      </p>
      <Link to="/" style={{
        background: '#4F46E5', color: '#fff', borderRadius: '8px',
        padding: '0.7rem 2rem', fontWeight: 700, fontSize: '0.9rem',
        textDecoration: 'none', display: 'inline-block',
      }}>
        Start Tracking Free →
      </Link>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE 1: /ib-grade-tracker
// ─────────────────────────────────────────────────────────────────────────────
export function IbGradeTrackerPage() {
  return (
    <SEOLayout
      title="IB Grade Tracker | Free Tool to Track IB Grades & Predicted Scores"
      description="IB Grade Tracker is a free, student-made platform to track IB grades, predicted scores, subject goals, core points, progress history, and university targets."
      canonical={`${SITE}/ib-grade-tracker`}
    >
      <h1 style={h1St}>IB Grade Tracker</h1>
      <p style={introSt}>
        <strong>IB Grade Tracker</strong> is a free, student-made tool designed to help IB students stay on top of their grades, monitor predicted scores, set subject goals, track core points, and plan for university. Whether you're in Year 1 or the final stretch of Year 2, IB Grade Tracker gives you a clear picture of where you stand — and what you need to do to hit your target score.
      </p>

      <h2 style={h2St}>What Is IB Grade Tracker?</h2>
      <p style={pSt}>
        IB Grade Tracker is a web-based dashboard built specifically for students in the International Baccalaureate Diploma Programme. Unlike general grade calculators or spreadsheets, IB Grade Tracker is purpose-built for the IB: it understands HL and SL subjects, core components (TOK, EE, and CAS), and the 45-point scoring system.
      </p>
      <p style={pSt}>
        You enter your grades, set your goals, and IB Grade Tracker automatically calculates your predicted total, shows your progress over quarters, and highlights which subjects need the most work to reach your target.
      </p>

      <h2 style={h2St}>Key Features</h2>
      <ul style={ulSt}>
        <li style={liSt}><strong>Subject grade tracking</strong> — log grades for up to 6 HL and SL subjects with individual goals</li>
        <li style={liSt}><strong>Predicted score calculator</strong> — see your estimated final IB total in real time</li>
        <li style={liSt}><strong>Core points tracking</strong> — monitor TOK and Extended Essay grades and their bonus point contribution</li>
        <li style={liSt}><strong>Progress history</strong> — log quarterly grades and compare improvement over time</li>
        <li style={liSt}><strong>Progress graphs</strong> — visualize grade trends with built-in bar and line charts</li>
        <li style={liSt}><strong>University targets</strong> — link your target score to your Dream University's requirements</li>
      </ul>

      <h2 style={h2St}>Why Use IB Grade Tracker?</h2>
      <p style={pSt}>
        Most IB students track their grades in a notes app, a spreadsheet, or simply their memory. That works — until it doesn't. When you have six subjects, three core components, quarterly assessments, and a university target, things get complicated fast.
      </p>
      <p style={pSt}>
        IB Grade Tracker brings it all together in one place. In under two minutes, you can set up your subjects, enter your current grades, and immediately see your predicted total and how far you are from your goal. The dashboard updates every time you add a grade, so you always have a live picture of your IB performance.
      </p>

      <h2 style={h2St}>Who Made IB Grade Tracker?</h2>
      <p style={pSt}>
        IB Grade Tracker was built by a current IB student who wanted a better way to track their own grades. It's free, requires no installation, and works entirely in the browser. Your grades are stored locally — nothing is sent to a server unless you choose to create an account.
      </p>

      <h2 style={h2St}>How to Get Started</h2>
      <p style={pSt}>Getting started takes less than two minutes:</p>
      <ol style={{ ...ulSt, listStyleType: 'decimal' }}>
        <li style={liSt}>Open IB Grade Tracker at ibgradetracker.vercel.app</li>
        <li style={liSt}>Enter your IB subjects (HL and SL) and your goal grade for each</li>
        <li style={liSt}>Log your current grades for each subject</li>
        <li style={liSt}>See your predicted IB total instantly on the dashboard</li>
        <li style={liSt}>Return each quarter to update your grades and track your progress</li>
      </ol>

      <CTABox />
    </SEOLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE 2: /ib-grade-calculator
// ─────────────────────────────────────────────────────────────────────────────
export function IbGradeCalculatorPage() {
  return (
    <SEOLayout
      title="IB Grade Calculator | Calculate Your Total IB Score Online"
      description="Use our free IB grade calculator to calculate your total IB score from subject grades and core points. Track predicted grades, set goals, and visualize progress."
      canonical={`${SITE}/ib-grade-calculator`}
    >
      <h1 style={h1St}>IB Grade Calculator</h1>
      <p style={introSt}>
        Our free <strong>IB grade calculator</strong> lets IB students calculate their total IB score based on subject grades and core points — instantly, without any spreadsheets. Whether you want to know your current predicted score, work out what you need to reach a target, or just check where you stand, the IB grade calculator in IB Grade Tracker gives you a clear answer at all times.
      </p>

      <h2 style={h2St}>How the IB Grading System Works</h2>
      <p style={pSt}>The IB Diploma Programme is scored on a 45-point scale. Your total score has two parts:</p>
      <ul style={ulSt}>
        <li style={liSt}><strong>Subject scores</strong> — up to 7 points per subject × 6 subjects = maximum 42 points</li>
        <li style={liSt}><strong>Core bonus points</strong> — up to 3 additional points from your TOK and Extended Essay grades combined</li>
      </ul>
      <p style={pSt}>
        CAS (Creativity, Activity, Service) does not contribute to the numerical score but is required to earn the diploma. You must also meet minimum requirements: at least 12 points across HL subjects, at least 9 points across SL subjects, and no grade below 2 in any subject.
      </p>

      <h2 style={h2St}>Using the IB Grade Calculator in IB Grade Tracker</h2>
      <p style={pSt}>
        The IB grade calculator in IB Grade Tracker works automatically. Enter grades for each of your six subjects, and the dashboard instantly shows your current total score, your predicted final score, and the gap between your current total and your target. No manual addition required.
      </p>
      <p style={pSt}>
        Unlike a one-time static calculator, IB Grade Tracker's grade calculator is dynamic — it tracks your grades across multiple quarters and updates your predicted total each time you log a new grade. This means the calculator is always reflecting your most up-to-date performance.
      </p>

      <h2 style={h2St}>What the IB Grade Calculator Shows You</h2>
      <ul style={ulSt}>
        <li style={liSt}><strong>Current predicted total</strong> — sum of your subject grades plus core bonus points</li>
        <li style={liSt}><strong>Goal gap</strong> — exactly how many more points you need to reach your target</li>
        <li style={liSt}><strong>HL and SL breakdown</strong> — scores separated by subject level</li>
        <li style={liSt}><strong>Per-subject goal tracking</strong> — set a goal grade for each subject and see the gap</li>
        <li style={liSt}><strong>Quarterly history</strong> — see how your calculated total has changed quarter by quarter</li>
      </ul>

      <h2 style={h2St}>Common IB Score Benchmarks</h2>
      <p style={pSt}>When setting your goal in the IB grade calculator, these benchmarks are commonly used by IB students:</p>
      <ul style={ulSt}>
        <li style={liSt}><strong>24 points</strong> — minimum for the IB Diploma (subject to other requirements)</li>
        <li style={liSt}><strong>30–32 points</strong> — typical range for many university programs</li>
        <li style={liSt}><strong>36–38 points</strong> — competitive range for selective universities</li>
        <li style={liSt}><strong>40+ points</strong> — highly competitive range for top global programs</li>
      </ul>
      <p style={pSt}>
        The Dream University feature in IB Grade Tracker lets you set a specific target score based on your target program's IB requirements. The grade calculator then always shows your gap relative to that real-world goal — not just an arbitrary number.
      </p>

      <h2 style={h2St}>Why Use a Dedicated IB Grade Calculator?</h2>
      <p style={pSt}>
        A regular calculator or spreadsheet can add up your grades, but it can't track your history, set subject goals, or show you which areas to improve. IB Grade Tracker's built-in IB grade calculator is connected to your grade history, your subject goals, and your university target — so every calculation is meaningful and actionable.
      </p>

      <CTABox />
    </SEOLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE 3: /ib-predicted-grade-calculator
// ─────────────────────────────────────────────────────────────────────────────
export function IbPredictedGradeCalculatorPage() {
  return (
    <SEOLayout
      title="IB Predicted Grade Calculator | Estimate Your Final IB Score"
      description="Calculate your IB predicted grade with our free tool. Estimate your final IB score based on current grades, track progress across quarters, and plan for your target university."
      canonical={`${SITE}/ib-predicted-grade-calculator`}
    >
      <h1 style={h1St}>IB Predicted Grade Calculator</h1>
      <p style={introSt}>
        The <strong>IB predicted grade calculator</strong> in IB Grade Tracker estimates your final IB Diploma score based on your current grades across all subjects and core components. It helps you understand where you're heading, what you need to improve, and how your performance is evolving quarter by quarter — so you're never caught off guard.
      </p>

      <h2 style={h2St}>What Are IB Predicted Grades?</h2>
      <p style={pSt}>
        IB predicted grades are the grades your school submits to universities before your final May or November examinations. They're based on your performance throughout the two-year course: Internal Assessments (IAs), mock examinations, class tests, and your teacher's assessment of your likely final grade.
      </p>
      <p style={pSt}>
        Universities use predicted grades to make conditional offers. If a program requires 38 points, they'll make you an offer based on whether your predicted grades are strong enough — making your predicted performance extremely important for university applications.
      </p>

      <h2 style={h2St}>How the IB Predicted Grade Calculator Works</h2>
      <p style={pSt}>IB Grade Tracker's predicted grade calculator uses a practical, real-time approach:</p>
      <ul style={ulSt}>
        <li style={liSt}>You enter your grades for each subject across multiple quarters (Q1, Q2, Q3, Q4)</li>
        <li style={liSt}>The calculator uses your latest logged grades as your current predicted level for each subject</li>
        <li style={liSt}>Core points from TOK and Extended Essay are factored into the predicted total</li>
        <li style={liSt}>Your predicted total is shown in real time and compared against your target score</li>
      </ul>
      <p style={pSt}>
        Every time you log a new grade, the predicted total updates automatically — giving you a running estimate that always reflects your most recent performance.
      </p>

      <h2 style={h2St}>Tracking Predicted Grades Over Time</h2>
      <p style={pSt}>
        One of the most powerful aspects of IB Grade Tracker's predicted grade calculator is the progress history feature. You log your grades at the end of each quarter and build a complete timeline of your performance. This lets you see:
      </p>
      <ul style={ulSt}>
        <li style={liSt}>Whether your predicted total is trending upward or declining</li>
        <li style={liSt}>Which subjects are improving and which are stagnating</li>
        <li style={liSt}>Whether your current trajectory will get you to your target by final exams</li>
      </ul>

      <h2 style={h2St}>Why Predicted Grades Matter for University</h2>
      <p style={pSt}>
        Predicted grades can determine which universities make you an offer. A strong predicted total in the right subjects can unlock competitive university places, while weaker predictions may close doors — even if you plan to do well in your final exams.
      </p>
      <p style={pSt}>
        By regularly using the IB predicted grade calculator, you build a clear picture of which subjects need the most work well before your school submits predictions. This gives you time to improve — not just react.
      </p>

      <h2 style={h2St}>Predicted Grade vs. Final Grade</h2>
      <p style={pSt}>
        Your predicted grade and your final grade are not always the same. Final grades are determined by internationally marked external examinations. Many students find their finals differ from predictions — sometimes higher, sometimes lower.
      </p>
      <p style={pSt}>
        IB Grade Tracker helps you focus on consistent improvement throughout the course so that your final grades match — or exceed — your predicted grades. The goal is to eliminate surprises by tracking every quarter, not just the weeks before exams.
      </p>

      <CTABox />
    </SEOLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE 4: /ib-progress-tracker
// ─────────────────────────────────────────────────────────────────────────────
export function IbProgressTrackerPage() {
  return (
    <SEOLayout
      title="IB Progress Tracker | Track Your IB Journey Quarter by Quarter"
      description="Track your IB progress across quarters and subjects. IB Grade Tracker shows your grade history, quarter-by-quarter comparisons, total score trends, and subject improvement over time."
      canonical={`${SITE}/ib-progress-tracker`}
    >
      <h1 style={h1St}>IB Progress Tracker</h1>
      <p style={introSt}>
        The <strong>IB progress tracker</strong> in IB Grade Tracker helps you monitor your IB Diploma journey from Year 1 to final exams. By logging grades at the end of each quarter, you build a complete record of your academic progress — subject by subject — so you can see how you're improving, spot patterns early, and make smarter study decisions.
      </p>

      <h2 style={h2St}>Why You Need an IB Progress Tracker</h2>
      <p style={pSt}>
        The IB Diploma Programme runs across two years and involves six subjects, three core components, and multiple rounds of assessment. Without a dedicated IB progress tracker, it's easy to lose sight of whether you're improving, plateauing, or drifting behind in specific subjects.
      </p>
      <p style={pSt}>
        IB Grade Tracker gives you a structured space to record every quarter's grades. Over time, you build a complete timeline of your performance — not just a single snapshot, but a full history you can learn from and act on.
      </p>

      <h2 style={h2St}>What the IB Progress Tracker Records</h2>
      <ul style={ulSt}>
        <li style={liSt}><strong>Quarterly grade snapshots</strong> — log your grades at the end of Q1, Q2, Q3, and Q4</li>
        <li style={liSt}><strong>Per-subject grade history</strong> — track how each subject's grade has evolved over time</li>
        <li style={liSt}><strong>Total score trend</strong> — see how your IB total moves quarter by quarter</li>
        <li style={liSt}><strong>Progress graphs</strong> — visualize trends with bar and line charts per subject</li>
        <li style={liSt}><strong>Goal comparison</strong> — your actual progress always shown against your target for each subject</li>
      </ul>

      <h2 style={h2St}>IB Progress History Feature</h2>
      <p style={pSt}>
        The Progress History section in IB Grade Tracker is designed specifically for logging quarter-by-quarter snapshots. You can import grades from a PDF report card, paste text from a digital report, upload a screenshot, or enter them manually. Once saved, each quarter's data becomes a permanent entry in your progress history.
      </p>
      <p style={pSt}>
        This means you can compare Q1 of Year 1 directly to Q3 of Year 2 and see exactly how much you've grown in each subject — and which ones still need the most attention heading into finals.
      </p>

      <h2 style={h2St}>Progress Graphs Explained</h2>
      <p style={pSt}>
        IB Grade Tracker includes a built-in progress chart for every subject. Each subject's chart plots your grade over time, with your goal grade shown as a reference line. You can immediately see whether you're closing the gap to your goal or falling further away.
      </p>
      <p style={pSt}>
        The main dashboard also includes a bar chart of all your subject grades side by side, making it easy to identify your strongest and weakest subjects at a glance — useful for allocating study time effectively.
      </p>

      <h2 style={h2St}>How to Use the IB Progress Tracker</h2>
      <p style={pSt}>
        For the best results, log your grades as soon as you receive your quarterly report card. The more consistently you update your progress tracker, the more useful the trend data becomes. A single data point is a score — a series of data points is a story.
      </p>
      <p style={pSt}>
        If you spot a subject where your grade is declining or not improving, treat that as an early warning signal. The IB progress tracker doesn't just tell you where you are — it shows you where you're heading, giving you time to course-correct before it's too late.
      </p>

      <CTABox />
    </SEOLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE 5: /ib-organizer
// ─────────────────────────────────────────────────────────────────────────────
export function IbOrganizerPage() {
  return (
    <SEOLayout
      title="IB Organizer | Organize IB Subjects, Goals, Core Points and TOK"
      description="Use IB Grade Tracker as your complete IB organizer. Manage HL and SL subjects, set grade goals, track TOK and Extended Essay core points, and plan for your target university."
      canonical={`${SITE}/ib-organizer`}
    >
      <h1 style={h1St}>IB Organizer</h1>
      <p style={introSt}>
        IB Grade Tracker is more than a grade tracker — it's a full <strong>IB organizer</strong> that helps students stay structured throughout the two-year IB Diploma Programme. From managing your HL and SL subject lineup to tracking TOK grades, Extended Essay performance, core bonus points, and university targets, IB Grade Tracker brings every part of your IB academic life into one clean, organized dashboard.
      </p>

      <h2 style={h2St}>What a Good IB Organizer Needs to Do</h2>
      <p style={pSt}>
        The IB Diploma is complex: six subjects split across Higher Level (HL) and Standard Level (SL), three core components (TOK, EE, CAS), bonus core points, subject group requirements, and two years of quarterly assessments. A good IB organizer helps you keep track of all this complexity without getting overwhelmed.
      </p>

      <h2 style={h2St}>Organize Your Subjects</h2>
      <p style={pSt}>
        When you set up IB Grade Tracker, you enter your six subjects and assign each one as HL or SL. This becomes the backbone of your organizer — every grade, goal, chart, and progress entry is built around your personal subject list.
      </p>
      <ul style={ulSt}>
        <li style={liSt}>Enter up to 6 subjects with HL/SL designation</li>
        <li style={liSt}>Set individual goal grades for each subject (e.g., aim for a 6 in Maths HL)</li>
        <li style={liSt}>Edit your subject list anytime from Settings</li>
        <li style={liSt}>See all subjects and grades at a glance in the main dashboard</li>
      </ul>

      <h2 style={h2St}>Track Core Points: TOK, EE, and CAS</h2>
      <p style={pSt}>
        Core points are the most frequently underestimated part of the IB. TOK and Extended Essay together can contribute up to 3 bonus points to your total — the difference between a 39 and a 42, or between passing and reaching a target university's offer. CAS, while not scored numerically, must be completed to receive the diploma.
      </p>
      <p style={pSt}>
        IB Grade Tracker's IB organizer includes a dedicated section for core components. You can track your TOK grade (A–E), your EE grade (A–E), and see in real time how these combine to determine your bonus point total. Your predicted total score always reflects the complete picture — not just subject grades.
      </p>

      <h2 style={h2St}>Set and Track Goals</h2>
      <p style={pSt}>
        A good IB organizer should help you work toward your goals, not just record what has already happened. In IB Grade Tracker, you set a target grade for each subject and a target total score. The dashboard shows you at every moment how far you are from those targets — both per subject and for your total.
      </p>
      <p style={pSt}>
        The radial progress chart on the main dashboard visualizes your current score vs. your target in a single clear graphic. The bar chart shows current vs. goal for every subject simultaneously — making prioritization easy.
      </p>

      <h2 style={h2St}>University Planning</h2>
      <p style={pSt}>
        The Dream University feature turns IB Grade Tracker into a longer-horizon planning tool. Save the IB score requirement for your target program, and every piece of tracking data you enter is now measured against a real-world goal — not an arbitrary number. This connects your daily study discipline to the university outcome you're working toward.
      </p>

      <h2 style={h2St}>Stay Organized Across Two Years</h2>
      <p style={pSt}>
        IB Grade Tracker stores your progress history across all quarters of your two-year IB journey. When you reach Year 2, you can look back at your Q1 Year 1 performance and see how far you've come — and use that perspective to stay motivated and focused heading into your final examinations.
      </p>

      <CTABox />
    </SEOLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE 6: /ib-help
// ─────────────────────────────────────────────────────────────────────────────
export function IbHelpPage() {
  return (
    <SEOLayout
      title="IB Help | Understand IB Grades, Predicted Scores and Core Points"
      description="Get IB help understanding grades, predicted scores, core points, and the 45-point system. IB Grade Tracker explains how IB grading works and helps you stay on track throughout the diploma."
      canonical={`${SITE}/ib-help`}
    >
      <h1 style={h1St}>IB Help</h1>
      <p style={introSt}>
        Looking for <strong>IB help</strong> understanding how IB grades work, what predicted grades mean, or how to calculate your total score? IB Grade Tracker explains the IB grading system clearly — and gives you the tools to track your grades, predicted scores, and progress in one place so you always know exactly where you stand.
      </p>

      <h2 style={h2St}>How IB Grades Work</h2>
      <p style={pSt}>
        IB subjects are graded on a scale of 1 to 7, where 7 is the highest grade and reflects consistent excellence. Each grade corresponds to a level of achievement:
      </p>
      <ul style={ulSt}>
        <li style={liSt}><strong>7 — Excellent</strong>: consistent achievement of the highest standard</li>
        <li style={liSt}><strong>6 — Very good</strong>: consistent achievement of high quality with minor gaps</li>
        <li style={liSt}><strong>5 — Good</strong>: achievement of expected IB standards throughout</li>
        <li style={liSt}><strong>4 — Satisfactory</strong>: achievement of basic objectives with adequate performance</li>
        <li style={liSt}><strong>3 — Mediocre</strong>: limited achievement with significant gaps</li>
        <li style={liSt}><strong>2 — Poor</strong>: very limited achievement across the criteria</li>
        <li style={liSt}><strong>1 — Very poor</strong>: minimal achievement</li>
      </ul>

      <h2 style={h2St}>The 45-Point IB Scoring System</h2>
      <p style={pSt}>The maximum IB Diploma score is 45 points, made up of two components:</p>
      <ul style={ulSt}>
        <li style={liSt}><strong>Subject scores</strong>: 6 subjects × up to 7 points each = up to 42 points</li>
        <li style={liSt}><strong>Core bonus points</strong>: up to 3 additional points from your TOK + Extended Essay grades combined</li>
      </ul>
      <p style={pSt}>
        To earn the IB Diploma, you need a minimum of 24 points total, no grade below 2 in any subject, no failing conditions in TOK or EE, and completion of CAS requirements. Meeting all conditions alongside the point threshold earns you the diploma.
      </p>

      <h2 style={h2St}>What Are Predicted Grades?</h2>
      <p style={pSt}>
        Predicted grades are the grades your school submits to universities on your behalf, usually in your second IB year before final exams. They're based on your performance throughout the course: IA scores, mock exams, and teacher assessment of your likely final level.
      </p>
      <p style={pSt}>
        Universities use predicted grades to make conditional offers. If a program requires 38 IB points and your predicted grades total 40, the university may offer you a place conditional on achieving 38 or above in your finals. This makes predicted grades critically important for university applications.
      </p>

      <h2 style={h2St}>What Are Core Points?</h2>
      <p style={pSt}>
        Core points are bonus points awarded based on your combined performance in Theory of Knowledge (TOK) and your Extended Essay (EE). Both components are graded A–E, and the grade combination determines how many bonus points you receive (0, 1, 2, or 3). For example:
      </p>
      <ul style={ulSt}>
        <li style={liSt}>TOK A + EE A = 3 bonus points</li>
        <li style={liSt}>TOK B + EE B = 2 bonus points</li>
        <li style={liSt}>TOK C + EE C = 1 bonus point</li>
        <li style={liSt}>TOK D + EE D = 0 bonus points</li>
      </ul>
      <p style={pSt}>
        Important: scoring an E in both TOK and EE results in automatic diploma failure, regardless of subject scores. Treating core components seriously is essential — they can add up to 3 points or cause you to fail.
      </p>

      <h2 style={h2St}>How IB Grade Tracker Helps</h2>
      <p style={pSt}>
        IB Grade Tracker turns all of this theory into live, personal data. Instead of mentally calculating your predicted total and guessing whether you're on track, IB Grade Tracker does it automatically and shows you:
      </p>
      <ul style={ulSt}>
        <li style={liSt}>Your current predicted IB total, updated every time you log a grade</li>
        <li style={liSt}>How far you are from your target score</li>
        <li style={liSt}>Your strongest and weakest subjects at a glance</li>
        <li style={liSt}>How your core points affect your overall total</li>
        <li style={liSt}>Your grade history and improvement trends across all quarters</li>
      </ul>
      <p style={pSt}>
        If you're looking for IB help with your grades, the best place to start is by getting all your information organized in one place — and that's exactly what IB Grade Tracker is built to do.
      </p>

      <CTABox />
    </SEOLayout>
  );
}
