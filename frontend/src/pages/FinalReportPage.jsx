import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { saveLocalInterview } from '../utils/storage';
import {
  Award,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  FileText,
  ArrowRight,
  Zap,
  Activity,
  MessageSquare,
  Clock,
} from 'lucide-react';
import ScrollStroke from '../components/ScrollStroke';

/* ---------- shared type tokens ---------- */
const DISPLAY = "'Playfair Display', serif";
const SANS = "'DM Sans', sans-serif";
const MONO = "'DM Mono', monospace";

/* ---------- motion variants ---------- */
const sectionV = {
  hidden: { opacity: 0, y: 26 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.62, delay: 0.06 * i, ease: [0.22, 1, 0.36, 1] },
  }),
};

const metricV = {
  hidden: { opacity: 0, scale: 0.9, y: 14 },
  show: (i = 0) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.5, delay: 0.05 * i, ease: [0.22, 1, 0.36, 1] },
  }),
};

const bulletV = {
  hidden: { opacity: 0, x: -12 },
  show: (i = 0) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.44, delay: 0.07 * i, ease: 'easeOut' },
  }),
};

/* ---------- score ring ---------- */
const RING_SIZE = 208;
const RING_STROKE = 14;
const RING_R = (RING_SIZE - RING_STROKE) / 2;
const RING_C = 2 * Math.PI * RING_R;

function ScoreRing({ score }) {
  // No score yet -> ring renders as an empty track with a faint gold hint.
  const pct = typeof score === 'number' ? Math.max(0, Math.min(100, score)) / 100 : 0;

  return (
    <div
      style={{
        position: 'relative',
        width: RING_SIZE,
        height: RING_SIZE,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* radial glow behind the circle */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: '-22%',
          pointerEvents: 'none',
          background:
            'radial-gradient(circle at 50% 50%, rgba(201,168,76,0.20) 0%, rgba(201,168,76,0.07) 38%, transparent 70%)',
          filter: 'blur(6px)',
        }}
      />

      <svg
        width={RING_SIZE}
        height={RING_SIZE}
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        style={{ position: 'relative', transform: 'rotate(-90deg)' }}
      >
        <defs>
          <linearGradient id="report-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c9a84c" />
            <stop offset="100%" stopColor="#e8c96a" />
          </linearGradient>
        </defs>

        {/* track */}
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_R}
          fill="none"
          stroke="var(--surface-3)"
          strokeWidth={RING_STROKE}
        />

        {/* faint full hint ring */}
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_R}
          fill="none"
          stroke="rgba(201,168,76,0.10)"
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray="2 10"
        />

        {/* animated progress arc: 0 -> score% */}
        <motion.circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_R}
          fill="none"
          stroke="url(#report-ring-grad)"
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={RING_C}
          initial={{ strokeDashoffset: RING_C }}
          animate={{ strokeDashoffset: RING_C * (1 - pct) }}
          transition={{ duration: 1.5, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>

      {/* center readout */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        <motion.span
          initial={{ opacity: 0, scale: 0.86 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontFamily: DISPLAY,
            fontSize: 72,
            lineHeight: 1,
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
          }}
        >
          {typeof score === 'number' ? score : '—'}
        </motion.span>
        <span style={{ fontFamily: MONO, fontSize: 13, color: 'var(--text-muted)' }}>/100</span>
      </div>
    </div>
  );
}

// Module-level lock to survive React Strict Mode unmount/remounts
const savingSessions = new Set();

export default function FinalReportPage({ setCurrentPage, recordedAnswers, interviewSetup }) {
  const answerKeys = Object.keys(recordedAnswers);
  const hasAnswers = answerKeys.length > 0;
  const answerCount = answerKeys.length;
  const [hasSaved, setHasSaved] = useState(false);

  let totalRelevance = 0;
  let totalWpm = 0;
  let totalFillers = 0;
  let totalPauses = 0;
  let hesitationCounts = { Low: 0, Medium: 0, High: 0 };
  let validRelevanceCount = 0;
  let validWpmCount = 0;

  answerKeys.forEach(key => {
    const ans = recordedAnswers[key];
    if (ans.relevance?.score != null) {
      totalRelevance += ans.relevance.score;
      validRelevanceCount++;
    }
    if (ans.features?.wpm != null) {
      totalWpm += ans.features.wpm;
      validWpmCount++;
    }
    if (ans.features?.filler_count != null) {
      totalFillers += ans.features.filler_count;
    }
    if (ans.features?.pause_count != null) {
      totalPauses += ans.features.pause_count;
    }
    if (ans.hesitation?.prediction) {
      hesitationCounts[ans.hesitation.prediction] = (hesitationCounts[ans.hesitation.prediction] || 0) + 1;
    }
  });

  const avgRelevance = validRelevanceCount > 0 ? Math.round(totalRelevance / validRelevanceCount) : null;
  const avgWpm = validWpmCount > 0 ? Math.round(totalWpm / validWpmCount) : null;

  let primaryHesitation = '—';
  if (hasAnswers) {
    primaryHesitation = Object.keys(hesitationCounts).reduce((a, b) => hesitationCounts[a] > hesitationCounts[b] ? a : b);
  }

  // Calculate Overall Score transparently
  let score = null;
  if (avgRelevance != null && avgWpm != null) {
    const relevanceScore = avgRelevance; // 0-100

    let paceScore = 100;
    if (avgWpm < 110) paceScore = Math.max(0, (avgWpm / 110) * 100);
    else if (avgWpm > 160) paceScore = Math.max(0, (1 - (avgWpm - 160) / 100) * 100);

    let hesitationScore = 100;
    if (primaryHesitation === 'Medium') hesitationScore = 50;
    if (primaryHesitation === 'High') hesitationScore = 0;

    let fluencyScore = Math.max(0, 100 - (totalFillers * 2) - (totalPauses * 2));

    score = Math.round((relevanceScore * 0.4) + (paceScore * 0.2) + (hesitationScore * 0.2) + (fluencyScore * 0.2));
  }

  useEffect(() => {
    if (hasAnswers && score != null && !hasSaved) {
      const sId = interviewSetup?.sessionId || 'legacy';

      // React Strict Mode concurrent trigger prevention
      if (sId !== 'legacy') {
        if (savingSessions.has(sId)) {
          setHasSaved(true);
          return;
        }
        savingSessions.add(sId);
      }

      async function saveInterview() {
        const record = {
          id: sId !== 'legacy' ? sId : crypto.randomUUID(),
          user_id: 'local_user',
          role: interviewSetup?.role || 'Software Engineer',
          difficulty: interviewSetup?.difficulty || 'Intermediate',
          type: interviewSetup?.type || 'Technical',
          question_count: answerCount,
          overall_score: score,
          avg_wpm: avgWpm,
          total_fillers: totalFillers,
          total_pauses: totalPauses,
          primary_hesitation: primaryHesitation,
          avg_relevance: avgRelevance,
          recorded_answers: { ...recordedAnswers, sessionId: sId },
          created_at: new Date().toISOString()
        };

        saveLocalInterview(record);

        try {
          const { data } = await supabase.auth.getUser();
          if (data?.user) {
            record.user_id = data.user.id;
            await supabase.from('interviews').insert({
              user_id: data.user.id,
              role: record.role,
              difficulty: record.difficulty,
              type: record.type,
              question_count: record.question_count,
              overall_score: record.overall_score,
              avg_wpm: record.avg_wpm,
              total_fillers: record.total_fillers,
              total_pauses: record.total_pauses,
              primary_hesitation: record.primary_hesitation,
              avg_relevance: record.avg_relevance,
              recorded_answers: record.recorded_answers
            });
          }
        } catch (e) {
          console.warn('Supabase save skipped:', e);
        }
      }
      saveInterview();
      setHasSaved(true);
    }
  }, [hasAnswers, score, avgWpm, totalFillers, totalPauses, primaryHesitation, avgRelevance, recordedAnswers, interviewSetup, hasSaved, answerCount]);

  const metrics = [
    { label: 'Answer Relevance', value: avgRelevance != null ? `${avgRelevance}%` : '—', icon: Award, color: 'var(--gold)' },
    { label: 'Speaking Pace', value: avgWpm != null ? `${avgWpm} WPM` : '—', icon: Zap, color: 'var(--accent-blue)' },
    { label: 'Hesitation Level', value: primaryHesitation, icon: Activity, color: '#a078d0' },
    { label: 'Filler Words', value: hasAnswers ? totalFillers : '—', icon: MessageSquare, color: 'var(--accent-rose)' },
    { label: 'Pause Count', value: hasAnswers ? totalPauses : '—', icon: Clock, color: 'var(--accent-teal)' },
    { label: 'Acoustic Clarity', value: 'N/A', icon: CheckCircle2, color: '#5cba7d' },
  ];

  // Dynamically generate insights
  const strengthsItems = [];
  if (avgWpm >= 110 && avgWpm <= 160) strengthsItems.push('Excellent speaking pace, maintaining a steady and professional cadence.');
  if (primaryHesitation === 'Low') strengthsItems.push('Minimal hesitation, projecting strong confidence.');
  if (avgRelevance >= 70) strengthsItems.push('High relevance in answers, addressing the core of the questions effectively.');
  if (hasAnswers && totalFillers <= 3) strengthsItems.push('Very clean speech with minimal use of filler words.');
  if (strengthsItems.length === 0) strengthsItems.push('Completed the interview successfully.');

  const improveItems = [];
  if (avgWpm != null && avgWpm < 110) improveItems.push('Speaking pace is on the slower side. Try to maintain a slightly more energetic cadence.');
  if (avgWpm != null && avgWpm > 160) improveItems.push('Speaking pace is quite fast. Remember to slow down and articulate clearly.');
  if (primaryHesitation === 'Medium' || primaryHesitation === 'High') improveItems.push('Noticeable hesitation detected. Practice structured answering to reduce pauses.');
  if (avgRelevance != null && avgRelevance < 70) improveItems.push('Some answers drifted from the core topic. Use the STAR method to stay on track.');
  if (hasAnswers && totalFillers > 3) improveItems.push('Frequent use of filler words detected. Try using deliberate pauses instead.');
  if (improveItems.length === 0) improveItems.push('Consistent performance with no major technical red flags.');

  const recItems = [
    'Practice 2–3 mock sessions per week to build verbal confidence.',
    'Use structured answer models (STAR / Problem-Solution-Result).',
    'Listen back to your audio recordings in the Interview Room player.',
  ];

  const insights = [
    { icon: CheckCircle2, color: 'var(--accent-teal)', title: 'Strengths', items: strengthsItems },
    { icon: AlertCircle, color: 'var(--gold)', title: 'Areas to Improve', items: improveItems },
    { icon: TrendingUp, color: 'var(--accent-blue)', title: 'Recommendations', items: recItems },
  ];

  const sessionMeta = [
    { label: 'Session', value: '#MOCK-2026-08' },
    { label: 'Recordings', value: `${answerCount} response${answerCount === 1 ? '' : 's'} saved` },
    { label: 'Date', value: 'Aug 2026' },
  ];

  return (
    <div style={{ position: 'relative', minHeight: '100vh', isolation: 'isolate' }}>
      {/* Responsive grid + layout rules that inline styles cannot express */}
      <style>{`
        .report-shell {
          max-width: 960px;
          margin: 0 auto;
          padding: 72px 24px 96px;
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          gap: 40px;
        }
        .report-metrics {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }
        .report-hero {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 40px;
          text-align: center;
        }
        .report-meta {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
          max-width: 320px;
        }
        .report-cta {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .report-banner {
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }
        @media (min-width: 768px) {
          .report-metrics { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .report-hero {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            gap: 48px;
            text-align: left;
          }
          .report-meta { max-width: 280px; }
          .report-cta { flex-direction: row; }
          .report-cta > button { flex: 1; }
        }
      `}</style>

      <ScrollStroke
        filterId="report"
        viewBox="0 0 1200 2000"
        path="M0,1800 C100,1700 200,1600 320,1500 C440,1400 500,1280 580,1180 C660,1080 760,1020 820,920 C880,820 860,700 920,600 C980,500 1060,460 1100,360 C1140,260 1120,140 1100,40 C1090,0 1080,0 1080,0"
        color="rgba(180,140,255,0.42)"
        glowColor="rgba(180,140,255,0.16)"
        dotColor="#B48CFF"
        strokeWidth={2.5}
        side="left"
        scrollRange={[0, 0.85]}
      />

      <div className="report-shell">
        {/* ---------------- Header ---------------- */}
        <motion.div
          custom={0}
          variants={sectionV}
          initial="hidden"
          animate="show"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
            textAlign: 'center',
          }}
        >
          <span className="tag-gold">FINAL ASSESSMENT</span>
          <h1
            className="font-display"
            style={{
              fontFamily: DISPLAY,
              fontSize: 42,
              lineHeight: 1.12,
              fontStyle: 'italic',
              fontWeight: 500,
              color: 'var(--text-primary)',
              margin: 0,
              letterSpacing: '-0.01em',
            }}
          >
            Interview Report
          </h1>

          {/* decorative gold line */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
            style={{
              width: 132,
              height: 1,
              transformOrigin: 'center',
              background:
                'linear-gradient(90deg, transparent, var(--gold) 50%, transparent)',
            }}
          />

          <p
            style={{
              fontFamily: SANS,
              fontSize: 14,
              lineHeight: 1.6,
              color: 'var(--text-secondary)',
              maxWidth: 520,
              margin: 0,
            }}
          >
            Comprehensive summary of verbal communication indicators and actionable guidance.
          </p>
        </motion.div>

        {/* ---------------- Score hero ---------------- */}
        <motion.div
          className="card"
          custom={1}
          variants={sectionV}
          initial="hidden"
          animate="show"
          style={{ position: 'relative', overflow: 'hidden', padding: '44px 40px' }}
        >
          {/* subtle gold radial at top-left */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background:
                'radial-gradient(ellipse 70% 90% at 0% 0%, rgba(201,168,76,0.09) 0%, transparent 62%)',
            }}
          />

          <div className="report-hero" style={{ position: 'relative' }}>
            {/* left: ring */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 18,
              }}
            >
              <ScoreRing score={score} />
              <div style={{ textAlign: 'center' }}>
                <p
                  style={{
                    fontFamily: MONO,
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.18em',
                    color: 'var(--text-muted)',
                    margin: '0 0 6px',
                  }}
                >
                  Overall Score
                </p>
                <p
                  style={{
                    fontFamily: SANS,
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    margin: 0,
                  }}
                >
                  {hasAnswers ? 'Derived from ML metrics' : 'Awaiting responses'}
                </p>
              </div>
            </div>

            {/* right: session metadata pills */}
            <div className="report-meta">
              {sessionMeta.map(({ label, value }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 + i * 0.09, ease: 'easeOut' }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    padding: '14px 18px',
                    borderRadius: 12,
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: 10,
                      textTransform: 'uppercase',
                      letterSpacing: '0.14em',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {label}
                  </span>
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--gold)',
                      textAlign: 'right',
                    }}
                  >
                    {value}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ---------------- Status banner ---------------- */}
        <AnimatePresence mode="wait">
          <motion.div
            key={hasAnswers ? 'has-answers' : 'no-answers'}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="report-banner"
            style={{
              padding: '20px 24px',
              borderRadius: 16,
              background: hasAnswers
                ? 'linear-gradient(135deg, rgba(61,184,160,0.09) 0%, rgba(61,184,160,0.02) 100%)'
                : 'linear-gradient(135deg, rgba(212,106,106,0.09) 0%, rgba(212,106,106,0.02) 100%)',
              border: hasAnswers
                ? '1px solid rgba(61,184,160,0.24)'
                : '1px solid rgba(212,106,106,0.24)',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 999,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--gold-dim)',
                border: '1px solid rgba(201,168,76,0.3)',
              }}
            >
              {hasAnswers ? (
                <FileText size={20} style={{ color: 'var(--gold)' }} />
              ) : (
                <AlertCircle size={20} style={{ color: 'var(--gold)' }} />
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontFamily: SANS,
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  margin: 0,
                }}
              >
                {hasAnswers
                  ? `${answerCount} response${answerCount > 1 ? 's' : ''} recorded`
                  : 'No session data yet'}
              </p>
              <p
                style={{
                  fontFamily: SANS,
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  margin: '4px 0 0',
                }}
              >
                {hasAnswers
                  ? 'Aggregated from all submitted responses'
                  : 'Complete an interview to generate your report'}
              </p>
            </div>

            {!hasAnswers && (
              <button
                onClick={() => setCurrentPage('setup')}
                className="btn-surface"
                style={{
                  flexShrink: 0,
                  padding: '10px 18px',
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: SANS,
                }}
              >
                Start Interview
              </button>
            )}
          </motion.div>
        </AnimatePresence>

        {/* ---------------- Metrics grid ---------------- */}
        <motion.div
          className="report-metrics"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
        >
          {metrics.map(({ label, value, icon: Icon, color }, i) => (
            <motion.div
              key={label}
              className="card"
              custom={i}
              variants={metricV}
              style={{
                position: 'relative',
                overflow: 'hidden',
                padding: '22px 20px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              {/* thin colored top strip */}
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: `linear-gradient(90deg, ${color}, transparent)`,
                }}
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <Icon size={14} style={{ color, flexShrink: 0 }} />
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 9.5,
                    textTransform: 'uppercase',
                    letterSpacing: '0.14em',
                    color: 'var(--text-muted)',
                    lineHeight: 1.3,
                  }}
                >
                  {label}
                </span>
              </div>

              <p
                style={{
                  fontFamily: DISPLAY,
                  fontSize: 40,
                  lineHeight: 1,
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  margin: 0,
                }}
              >
                {value}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* ---------------- Insight sections ---------------- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {insights.map(({ icon: Icon, color, title, items }, si) => (
            <motion.div
              key={title}
              className="card"
              custom={si}
              variants={sectionV}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.25 }}
              style={{
                padding: '26px 28px',
                borderLeft: `2px solid ${color}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
              }}
            >
              <h3
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontFamily: SANS,
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  margin: 0,
                }}
              >
                <Icon size={16} style={{ color, flexShrink: 0 }} />
                {title}
              </h3>

              <ul
                style={{
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 11,
                }}
              >
                {items.map((item, i) => (
                  <motion.li
                    key={i}
                    custom={i}
                    variants={bulletV}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.6 }}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 11,
                      fontFamily: SANS,
                      fontSize: 13.5,
                      lineHeight: 1.6,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        marginTop: 7,
                        width: 5,
                        height: 5,
                        borderRadius: 999,
                        flexShrink: 0,
                        background: color,
                        boxShadow: `0 0 8px ${color}`,
                      }}
                    />
                    {item}
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* ---------------- CTA row ---------------- */}
        <motion.div
          className="report-cta"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <button
            onClick={() => setCurrentPage('history')}
            className="btn-ghost"
            style={{
              padding: '14px 24px',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: SANS,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            View History
          </button>

          <button
            onClick={() => setCurrentPage('setup')}
            className="btn-gold"
            style={{
              padding: '14px 24px',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: SANS,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <span>New Interview</span>
            <ArrowRight size={16} />
          </button>
        </motion.div>
      </div>
    </div>
  );
}
