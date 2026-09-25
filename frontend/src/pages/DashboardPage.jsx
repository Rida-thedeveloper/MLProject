import React, { useState, useEffect } from 'react';
import {
  PlusCircle, Award, CheckCircle2, TrendingUp, AlertTriangle, ArrowRight,
  Calendar, Code, Database, Cpu, Mic, X, Lightbulb, Flame, Target, Gauge,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ScrollStroke from '../components/ScrollStroke';
import { supabase } from '../supabaseClient';
import { getLocalInterviews, combineInterviews } from '../utils/storage';

const MONO = "'DM Mono', monospace";
const SANS = "'DM Sans', sans-serif";

const DAILY_TIPS = [
  { tip: "Begin every answer with a one-sentence summary, then elaborate. Interviewers form impressions in the first 10 seconds.", label: "Opening Impact" },
  { tip: "Aim for 120–150 WPM. Record yourself reading a 300-word passage — if it takes less than 2 minutes, slow down.", label: "Speaking Pace" },
  { tip: "Replace 'um' and 'uh' with a silent pause. Silence sounds confident; filler words signal anxiety.", label: "Filler Reduction" },
  { tip: "When asked 'Tell me about yourself', lead with your current role, one major achievement, and why you're here.", label: "Classic Opener" },
  { tip: "Use the STAR method for behavioral questions: Situation (10%), Task (10%), Action (60%), Result (20%).", label: "STAR Framework" },
  { tip: "Mirror the interviewer's vocabulary. If they say 'scale', use 'scale' — not 'grow'. It builds unconscious rapport.", label: "Rapport Building" },
  { tip: "End technical answers with 'One trade-off worth noting is…' — it shows senior-level thinking.", label: "Technical Depth" },
];

const todayTip = DAILY_TIPS[new Date().getDay() % DAILY_TIPS.length];

/* Pick a role-specific glyph: Code for SE/FE, Database for BE/Data, Cpu for AI/ML */
const roleIcon = (role = '') => {
  const r = role.toLowerCase();
  if (r.includes('ai') || r.includes('ml') || r.includes('machine') || r.includes('data scien')) return Cpu;
  if (r.includes('backend') || r.includes('back-end') || r.includes('data')) return Database;
  return Code;
};

/* Shared entrance transition for major sections */
const section = (i) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] },
});

export default function DashboardPage({ setCurrentPage, user }) {
  const [tipDismissed, setTipDismissed] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      let sbData = [];
      try {
        const { data, error } = await supabase
          .from('interviews')
          .select('*');
        if (!error && data) sbData = data;
      } catch (e) {
        console.warn('Supabase fetch skipped:', e);
      }
      const localData = getLocalInterviews();
      const combined = combineInterviews(sbData, localData);
      setHistoryData(combined);
      setLoading(false);
    }
    fetchData();

    const handleUpdate = () => fetchData();
    window.addEventListener('mockly_interviews_updated', handleUpdate);
    return () => window.removeEventListener('mockly_interviews_updated', handleUpdate);
  }, []);

  const totalInterviews = historyData.length;
  const avgScore = totalInterviews > 0 ? Math.round(historyData.reduce((acc, curr) => acc + (curr.overall_score || 0), 0) / totalInterviews) : 0;

  let topSkill = "—";
  let focusArea = "—";
  if (totalInterviews > 0) {
    const avgRel = historyData.reduce((acc, curr) => acc + (curr.avg_relevance || 0), 0) / totalInterviews;
    if (avgRel > 75) { topSkill = "Relevance"; focusArea = "Fluency"; }
    else { topSkill = "Fluency"; focusArea = "Relevance"; }
  }

  const stats = [
    { label: "Interviews Completed", value: loading ? "—" : totalInterviews.toString(), icon: CheckCircle2, color: 'var(--gold)', foot: 'All time' },
    { label: "Average Score", value: loading ? "—" : avgScore.toString(), sub: "/ 100", icon: Award, color: '#7ab8e8', foot: 'All time' },
    { label: "Top Skill", value: loading ? "—" : topSkill, icon: TrendingUp, color: 'var(--accent-teal)', foot: 'Consistently strong' },
    { label: "Focus Area", value: loading ? "—" : focusArea, icon: AlertTriangle, color: '#e89050', foot: 'Needs attention' },
  ];

  const recentInterviews = historyData.slice(0, 3).map(item => ({
    id: item.id,
    role: item.role,
    score: item.overall_score || 0,
    date: new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    type: item.type,
    difficulty: item.difficulty || 'Standard'
  }));

  const scoreColor = (s) => s >= 80 ? 'var(--accent-teal)' : s >= 70 ? 'var(--gold)' : '#e89050';

  const weekStats = (() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const thisWeek = historyData.filter(d => new Date(d.created_at) > oneWeekAgo);
    const weekTotal = thisWeek.length;
    const weekBest = weekTotal > 0 ? Math.max(...thisWeek.map(d => d.overall_score || 0)) : 0;
    const weekAvgWpm = weekTotal > 0 ? Math.round(thisWeek.reduce((acc, d) => acc + (d.avg_wpm || 0), 0) / weekTotal) : 0;

    return [
      { label: 'Sessions This Week', value: loading ? "—" : weekTotal.toString(), icon: Flame, color: 'var(--gold)' },
      { label: 'Best Score', value: loading ? "—" : weekBest.toString(), icon: Target, color: 'var(--accent-teal)' },
      { label: 'Avg WPM', value: loading ? "—" : weekAvgWpm.toString(), icon: Gauge, color: '#7ab8e8' },
    ];
  })();

  const firstName = user?.name?.split(' ')[0] || 'Rida';

  return (
    <div style={{ position: 'relative', minHeight: '100vh', isolation: 'isolate' }}>
      <ScrollStroke
        filterId="dash"
        viewBox="0 0 1200 2400"
        path="M1200,0 C1100,60 980,40 900,120 C820,200 860,320 780,400 C700,480 580,460 520,560 C460,660 500,780 440,860 C380,940 260,940 200,1040 C140,1140 180,1260 160,1360 C140,1460 80,1540 100,1640 C120,1740 220,1780 280,1880 C340,1980 320,2100 400,2180 C480,2260 600,2240 680,2320 C760,2400 760,2400 800,2400"
        color="rgba(61,184,160,0.42)"
        glowColor="rgba(61,184,160,0.16)"
        dotColor="#3DB8A0"
        strokeWidth={2.5}
        side="right"
      />

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px', position: 'relative', zIndex: 2 }}>

        {/* ── Today's Tip Banner ─────────────────────────────── */}
        <AnimatePresence initial={false}>
          {!tipDismissed && (
            <motion.div
              key="daily-tip"
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.94, marginBottom: 0, height: 0 }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 14,
                background: 'linear-gradient(120deg, var(--gold-dim) 0%, rgba(201,168,76,0.04) 55%, rgba(61,184,160,0.05) 100%)',
                border: '1px solid rgba(201,168,76,0.2)',
                borderLeft: '3px solid var(--gold)',
                borderRadius: 12,
                padding: '16px 18px',
                marginBottom: 28,
                overflow: 'hidden',
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: 'var(--gold-dim)',
                border: '1px solid rgba(201,168,76,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Lightbulb size={15} color="var(--gold)" />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: 10, fontFamily: MONO, fontWeight: 600,
                    letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold)',
                  }}>
                    Today's Tip
                  </span>
                  <span style={{ fontSize: 10, fontFamily: MONO, color: 'var(--text-muted)' }}>
                    · {todayTip.label}
                  </span>
                </div>
                <p style={{ fontSize: 13, fontFamily: SANS, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.65 }}>
                  {todayTip.tip}
                </p>
              </div>

              <motion.button
                onClick={() => setTipDismissed(true)}
                whileHover={{ scale: 1.12, color: 'var(--text-primary)' }}
                whileTap={{ scale: 0.92 }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', padding: 4, flexShrink: 0,
                  borderRadius: 6, lineHeight: 1,
                }}
                title="Dismiss"
              >
                <X size={14} />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Hero Header ────────────────────────────────────── */}
        <motion.div
          {...section(0)}
          style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 20,
          }}
        >
          <div>
            <div className="tag-gold" style={{ marginBottom: 14, fontFamily: MONO }}>Overview</div>
            <h1
              className="font-display"
              style={{
                fontSize: 'clamp(28px, 4.4vw, 40px)',
                fontWeight: 700,
                fontStyle: 'italic',
                color: 'var(--text-primary)',
                margin: '0 0 8px',
                lineHeight: 1.15,
                letterSpacing: '-0.01em',
              }}
            >
              Welcome back,{' '}
              <span style={{ color: 'var(--gold)', fontStyle: 'italic' }}>{firstName}</span>
            </h1>
            <p style={{ fontSize: 14, fontFamily: SANS, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
              Track your verbal communication progress across all sessions.
            </p>
          </div>

          <motion.button
            className="btn-gold"
            onClick={() => setCurrentPage('setup')}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            style={{ alignSelf: 'flex-start' }}
          >
            <PlusCircle size={15} />
            New Interview
          </motion.button>
        </motion.div>

        {/* ── Decorative divider with gold dot ───────────────── */}
        <motion.div
          {...section(1)}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            margin: '32px 0 36px',
          }}
        >
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, var(--border-hover))' }} />
          <div style={{
            width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
            background: 'var(--gold)',
            boxShadow: '0 0 10px rgba(201,168,76,0.6)',
          }} />
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, var(--border-hover), transparent)' }} />
        </motion.div>

        {/* ── Stat Cards Row ─────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(212px, 1fr))',
          gap: 16,
          marginBottom: 48,
        }}>
          {stats.map((st, i) => {
            const Icon = st.icon;
            return (
              <motion.div
                key={st.label}
                initial={{ opacity: 0, y: 20, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.16 + i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -4 }}
                style={{
                  position: 'relative',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 16,
                  padding: 24,
                  overflow: 'hidden',
                }}
              >
                {/* accent color indicator strip along the top */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                  background: `linear-gradient(90deg, ${st.color}, ${st.color}00)`,
                }} />

                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'flex-start', gap: 10, marginBottom: 18,
                }}>
                  <span style={{
                    fontSize: 10, fontFamily: MONO, fontWeight: 500,
                    letterSpacing: '0.09em', textTransform: 'uppercase',
                    color: 'var(--text-muted)', lineHeight: 1.5, paddingTop: 6,
                  }}>
                    {st.label}
                  </span>
                  <div style={{
                    width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                    background: `${st.color}1f`,
                    border: `1px solid ${st.color}33`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={14} color={st.color} />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                  <span className="font-display" style={{
                    fontSize: 32, fontWeight: 700, color: st.color,
                    lineHeight: 1, letterSpacing: '-0.015em',
                  }}>
                    {st.value}
                  </span>
                  {st.sub && (
                    <span style={{ fontSize: 13, fontFamily: SANS, color: 'var(--text-muted)' }}>
                      {st.sub}
                    </span>
                  )}
                </div>

                {st.foot && (
                  <div style={{
                    marginTop: 12, fontSize: 10, fontFamily: MONO,
                    letterSpacing: '0.05em', color: 'var(--text-muted)',
                  }}>
                    {st.foot}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* ── Recent Sessions ───────────────────────────────── */}
        <motion.div {...section(2)}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 16, marginBottom: 20, flexWrap: 'wrap',
          }}>
            <h2 className="font-display" style={{
              fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', margin: 0,
            }}>
              Recent Sessions
            </h2>
            <motion.button
              onClick={() => setCurrentPage('history')}
              whileHover={{ x: 3 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'none', border: 'none', color: 'var(--gold)',
                fontSize: 13, fontFamily: SANS, fontWeight: 500, cursor: 'pointer',
                padding: 0,
              }}
            >
              View all <ArrowRight size={13} />
            </motion.button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recentInterviews.length === 0 && !loading && (
              <div style={{
                background: 'var(--surface)', border: '1px dashed var(--border)',
                borderRadius: 14, padding: '32px 24px', textAlign: 'center',
                color: 'var(--text-muted)', fontSize: 13, fontFamily: SANS,
              }}>
                No sessions completed yet. Start your first mock interview!
              </div>
            )}
            {recentInterviews.map((item, idx) => {
              const RoleIcon = roleIcon(item.role);
              const sc = scoreColor(item.score);
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + idx * 0.09, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ x: 4, borderLeftColor: sc }}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderLeft: `3px solid transparent`,
                    borderRadius: 14,
                    padding: '20px 24px',
                    display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
                  }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: 11, flexShrink: 0,
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <RoleIcon size={18} color="var(--text-secondary)" />
                  </div>

                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{
                      fontSize: 15, fontFamily: SANS, fontWeight: 600,
                      color: 'var(--text-primary)', marginBottom: 7,
                    }}>
                      {item.role}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className="tag-surface">{item.type}</span>
                      <span className="tag-surface">{item.difficulty}</span>
                      <span style={{
                        fontSize: 11, fontFamily: MONO, color: 'var(--text-muted)',
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}>
                        <Calendar size={10} /> {item.date}
                      </span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div className="font-display" style={{
                      fontSize: 26, fontWeight: 700, color: sc, lineHeight: 1,
                    }}>
                      {item.score}
                      <span style={{
                        fontSize: 13, fontFamily: SANS, fontWeight: 400,
                        color: 'var(--text-muted)',
                      }}>
                        /100
                      </span>
                    </div>
                  </div>

                  <motion.button
                    onClick={() => setCurrentPage('report')}
                    className="btn-surface"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    style={{ flexShrink: 0 }}
                  >
                    View Report <ArrowRight size={13} />
                  </motion.button>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* ── Performance Snapshot — This Week ───────────────── */}
        <motion.div {...section(4)} style={{ marginTop: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <h2 className="font-display" style={{
              fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', margin: 0,
            }}>
              This Week
            </h2>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, var(--border-hover), transparent)' }} />
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 14,
          }}>
            {weekStats.map((w, i) => {
              const WIcon = w.icon;
              return (
                <motion.div
                  key={w.label}
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.42 + i * 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ y: -3 }}
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: '18px 20px',
                    display: 'flex', alignItems: 'center', gap: 14,
                  }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    background: `${w.color}1f`,
                    border: `1px solid ${w.color}33`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <WIcon size={16} color={w.color} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: 10, fontFamily: MONO, letterSpacing: '0.09em',
                      textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 5,
                    }}>
                      {w.label}
                    </div>
                    <div className="font-display" style={{
                      fontSize: 24, fontWeight: 700, color: w.color, lineHeight: 1,
                    }}>
                      {w.value}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* ── Quick CTA Banner ──────────────────────────────── */}
        <motion.div
          {...section(6)}
          style={{
            position: 'relative',
            overflow: 'hidden',
            marginTop: 48,
            background: 'var(--surface)',
            border: '1px solid rgba(201,168,76,0.16)',
            borderRadius: 16,
            padding: 28,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 20, flexWrap: 'wrap',
          }}
        >
          {/* gold radial glow, bottom-right */}
          <div style={{
            position: 'absolute', right: -80, bottom: -120,
            width: 340, height: 340, borderRadius: '50%', pointerEvents: 'none',
            background: 'radial-gradient(circle, rgba(201,168,76,0.16) 0%, rgba(201,168,76,0.05) 45%, transparent 72%)',
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <h3 className="font-display" style={{
              fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px',
            }}>
              Ready to practice again?
            </h3>
            <p style={{ fontSize: 13, fontFamily: SANS, color: 'var(--text-secondary)', margin: 0 }}>
              Each session builds better speaking habits.
            </p>
          </div>

          <motion.button
            className="btn-gold"
            onClick={() => setCurrentPage('setup')}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            style={{ position: 'relative', zIndex: 1 }}
          >
            <Mic size={14} />
            Start Session
          </motion.button>
        </motion.div>

      </div>
    </div>
  );
}
