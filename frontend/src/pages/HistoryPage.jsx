import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Code, Database, Cpu, CheckCircle,
  ArrowRight, Layers, TrendingUp, Award, HelpCircle, Trash2
} from 'lucide-react';
import ScrollStroke from '../components/ScrollStroke';
import { supabase } from '../supabaseClient';
import { getLocalInterviews, combineInterviews, deleteLocalInterview } from '../utils/storage';

export default function HistoryPage({ setCurrentPage }) {
  const [rawHistory, setRawHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All Sessions');

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
      setRawHistory(combined);
      setLoading(false);
    }
    fetchData();

    const handleUpdate = () => fetchData();
    window.addEventListener('mockly_interviews_updated', handleUpdate);
    return () => window.removeEventListener('mockly_interviews_updated', handleUpdate);
  }, []);

  const mappedHistory = rawHistory.map(d => {
    let icon = Code;
    const r = (d.role || '').toLowerCase();
    if (r.includes('ai') || r.includes('ml')) icon = Cpu;
    else if (r.includes('backend') || r.includes('data')) icon = Database;
    return {
      id: d.id || d.recorded_answers?.sessionId || Math.random(),
      date: new Date(d.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      role: d.role || 'Unknown Role',
      score: d.overall_score || 0,
      icon,
      type: d.type || 'Technical',
      questions: d.question_count || 0
    };
  });

  function scoreColor(s) {
    if (s >= 80) return 'var(--accent-teal)';
    if (s >= 75) return 'var(--gold)';
    return '#e89050';
  }

  const filters = ['All Sessions', 'Frontend Developer', 'Software Engineer', 'Backend Developer', 'AI/ML Engineer', 'Data Analyst', 'Technical', 'Behavioral'];

  const historyData = mappedHistory.filter(row => {
    if (activeFilter === 'All Sessions') return true;
    if (activeFilter === 'Technical' || activeFilter === 'Behavioral') {
      return (row.type || '').toLowerCase() === activeFilter.toLowerCase();
    }
    return (row.role || '').toLowerCase() === activeFilter.toLowerCase();
  });

  const summaryStats = [
    { icon: Layers, label: 'Total', value: `${historyData.length} Session${historyData.length !== 1 ? 's' : ''}`, color: 'var(--accent-blue)' },
    { icon: TrendingUp, label: 'Average', value: `Avg Score: ${historyData.length > 0 ? Math.round(historyData.reduce((acc, row) => acc + row.score, 0) / historyData.length) : '0'}`, color: 'var(--gold)' },
    { icon: Award, label: 'Personal Best', value: `Best: ${historyData.length > 0 ? Math.max(...historyData.map(r => r.score)) : '0'}`, color: 'var(--accent-teal)' },
  ];

  const [hoveredId, setHoveredId] = useState(null);

  const difficultyFor = (q) => (q >= 10 ? 'Extended' : 'Standard');

  return (
    <div style={{ position: 'relative', minHeight: '100vh', isolation: 'isolate' }}>
      <ScrollStroke
        filterId="history"
        viewBox="0 0 1200 2000"
        path="M100,0 C200,80 400,60 500,160 C600,260 500,400 600,500 C700,600 900,580 1000,680 C1100,780 1000,920 1000,1040 C1000,1160 1100,1220 1080,1340 C1060,1460 900,1500 860,1620 C820,1740 900,1860 880,2000"
        color="rgba(74,143,212,0.42)"
        glowColor="rgba(74,143,212,0.16)"
        dotColor="#4A8FD4"
        strokeWidth={2.5}
        side="center"
        scrollRange={[0, 0.88]}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: 1120,
          margin: '0 auto',
          padding: '56px 24px 80px',
        }}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: 24,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <span className="tag-gold">Past Sessions</span>
              <h1
                className="font-display"
                style={{
                  fontSize: 38,
                  fontStyle: 'italic',
                  fontWeight: 600,
                  lineHeight: 1.15,
                  color: 'var(--text-primary)',
                  margin: '16px 0 10px',
                  letterSpacing: '-0.01em',
                }}
              >
                Interview History
              </h1>
              <p
                style={{
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: 'var(--text-secondary)',
                  fontFamily: "'DM Sans', sans-serif",
                  margin: 0,
                  maxWidth: 520,
                }}
              >
                Review your past mock sessions, performance trends, and full reports.
              </p>
            </div>

            <button
              className="btn-gold"
              onClick={() => setCurrentPage('setup')}
              style={{ flexShrink: 0 }}
            >
              New Session
              <ArrowRight size={14} />
            </button>
          </div>

          {/* thin gold gradient line */}
          <div
            style={{
              marginTop: 28,
              height: 1,
              background:
                'linear-gradient(90deg, rgba(201,168,76,0.55) 0%, rgba(201,168,76,0.18) 45%, transparent 100%)',
            }}
          />
        </motion.div>

        {/* ── Filter bar (visual only) ───────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 30 }}
        >
          {filters.map((f) => {
            const active = activeFilter === f;
            return (
              <motion.button
                key={f}
                onClick={() => setActiveFilter(f)}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  padding: '8px 18px',
                  borderRadius: 999,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  fontFamily: "'DM Mono', monospace",
                  transition: 'background 0.2s ease, border-color 0.2s ease, color 0.2s ease',
                  background: active ? 'var(--gold-dim)' : 'var(--surface-2)',
                  border: `1px solid ${active ? 'rgba(201,168,76,0.35)' : 'var(--border)'}`,
                  color: active ? 'var(--gold-light)' : 'var(--text-secondary)',
                }}
              >
                {f}
              </motion.button>
            );
          })}
        </motion.div>

        {/* ── Summary strip ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 14,
            marginTop: 22,
          }}
        >
          {summaryStats.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="metric-card"
                style={{ display: 'flex', alignItems: 'center', gap: 14 }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--surface-3)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <Icon size={16} style={{ color: s.color }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 10,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'var(--text-muted)',
                      fontFamily: "'DM Mono', monospace",
                    }}
                  >
                    {s.label}
                  </p>
                  <p
                    className="font-display"
                    style={{
                      margin: '3px 0 0',
                      fontSize: 16,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {s.value}
                  </p>
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* ── Session list ───────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 26 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace", fontSize: 13, letterSpacing: '0.1em' }}>
              LOADING HISTORY...
            </div>
          ) : historyData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, margin: 0 }}>No sessions found.</p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, opacity: 0.6, margin: '8px 0 0' }}>Complete an interview to see it here.</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {historyData.map((row, i) => {
                const Icon = row.icon;
                const color = scoreColor(row.score);
                const isHovered = hoveredId === row.id;

                return (
                  <motion.div
                    key={row.id}
                    layout
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.45, delay: 0.22 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ backgroundColor: 'var(--surface-2)', x: 2 }}
                    onHoverStart={() => setHoveredId(row.id)}
                    onHoverEnd={() => setHoveredId(null)}
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderLeft: `2px solid ${isHovered ? color : 'transparent'}`,
                      borderRadius: 14,
                      padding: '18px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 18,
                      flexWrap: 'wrap',
                      transition: 'border-color 0.25s ease',
                    }}
                  >
                    {/* Score ring badge */}
                    <motion.div
                      initial={{ scale: 0.7, opacity: 0 }}
                      animate={{ scale: [0.7, 1.12, 1], opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.3 + i * 0.06, ease: 'easeOut' }}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: `1px solid ${color}`,
                        background: 'var(--surface-2)',
                        boxShadow: isHovered ? `0 0 16px -4px ${color}` : 'none',
                      }}
                    >
                      <span
                        className="font-display"
                        style={{ fontSize: 17, fontWeight: 700, color }}
                      >
                        {row.score}
                      </span>
                    </motion.div>

                    {/* Role + type */}
                    <div style={{ minWidth: 172, flex: '1 1 172px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Icon size={14} style={{ color: 'var(--gold)', flexShrink: 0 }} />
                        <p
                          style={{
                            margin: 0,
                            fontSize: 15,
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            fontFamily: "'DM Sans', sans-serif",
                          }}
                        >
                          {row.role}
                        </p>
                      </div>
                      <span
                        style={{
                          display: 'inline-block',
                          marginTop: 7,
                          padding: '3px 9px',
                          borderRadius: 5,
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          fontFamily: "'DM Mono', monospace",
                          color: 'var(--accent-blue)',
                          background: 'rgba(74,143,212,0.1)',
                          border: '1px solid rgba(74,143,212,0.22)',
                        }}
                      >
                        {row.type}
                      </span>
                    </div>

                    {/* Meta: difficulty, questions, date */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        flexWrap: 'wrap',
                        flex: '1 1 auto',
                      }}
                    >
                      <span className="tag-surface">{difficultyFor(row.questions)}</span>

                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: 11,
                          color: 'var(--text-muted)',
                          fontFamily: "'DM Mono', monospace",
                        }}
                      >
                        <HelpCircle size={12} />
                        {row.questions}Q
                      </span>

                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 11,
                          color: 'var(--text-secondary)',
                          fontFamily: "'DM Mono', monospace",
                        }}
                      >
                        <Calendar size={12} style={{ color: 'var(--text-muted)' }} />
                        {row.date}
                      </span>
                    </div>

                    {/* Score + status */}
                    <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 104 }}>
                      <motion.p
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: [0.8, 1.1, 1], opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.34 + i * 0.06, ease: 'easeOut' }}
                        className="font-display"
                        style={{ margin: 0, fontSize: 28, fontWeight: 700, lineHeight: 1, color }}
                      >
                        {row.score}
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 400,
                            color: 'var(--text-muted)',
                            marginLeft: 3,
                            fontFamily: "'DM Mono', monospace",
                          }}
                        >
                          /100
                        </span>
                      </motion.p>

                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          marginTop: 9,
                          padding: '3px 10px',
                          borderRadius: 999,
                          fontSize: 10,
                          letterSpacing: '0.05em',
                          fontFamily: "'DM Mono', monospace",
                          color: 'var(--accent-teal)',
                          background: 'rgba(61,184,160,0.1)',
                          border: '1px solid rgba(61,184,160,0.25)',
                        }}
                      >
                        <CheckCircle size={10} />
                        Completed
                      </span>
                    </div>

                    {/* Action */}
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button
                        className="btn-surface"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (window.confirm("Are you sure you want to delete this session?")) {
                            const targetId = row.id;
                            // 1. Remove from local component state
                            setRawHistory(prev => prev.filter(r => (r.id || r.recorded_answers?.sessionId || r.sessionId) !== targetId));
                            // 2. Remove from localStorage
                            deleteLocalInterview(targetId);
                            // 3. Remove from Supabase if stored
                            try {
                              if (typeof targetId === 'number' || (!isNaN(Number(targetId)) && Number(targetId) > 0)) {
                                await supabase.from('interviews').delete().eq('id', Number(targetId));
                              } else {
                                await supabase.from('interviews').delete().eq('id', targetId);
                              }
                            } catch (err) {
                              console.warn('Supabase delete skipped or failed:', err);
                            }
                          }
                        }}
                        style={{ padding: '8px 12px' }}
                        title="Delete Session"
                      >
                        <Trash2 size={13} color="var(--accent-rose)" />
                      </button>
                      <button
                        className="btn-surface"
                        onClick={() => setCurrentPage('report')}
                      >
                        View Report
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* ── CTA footer ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.56, ease: [0.22, 1, 0.36, 1] }}
          style={{
            marginTop: 40,
            background:
              'linear-gradient(135deg, var(--surface) 0%, rgba(201,168,76,0.04) 100%)',
            border: '1px solid rgba(201,168,76,0.15)',
            borderRadius: 16,
            padding: '28px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h3
              className="font-display"
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: 'var(--text-primary)',
                margin: '0 0 4px',
              }}
            >
              Ready to practice?
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
              Each session sharpens your delivery and builds lasting confidence.
            </p>
          </div>
          <button className="btn-gold" onClick={() => setCurrentPage('setup')}>
            Start New Session
            <ArrowRight size={14} />
          </button>
        </motion.div>
      </div>
    </div>
  );
}
