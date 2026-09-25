import React, { useRef, useState, useEffect } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { TrendingUp, ArrowRight, BarChart2, Layers, Mic, Clock, MessageSquare, Activity, Loader2, Filter } from 'lucide-react';
import ScrollStroke from '../components/ScrollStroke';
import { supabase } from '../supabaseClient';
import { getLocalInterviews, combineInterviews } from '../utils/storage';

const DISPLAY = "'Playfair Display', serif";
const SANS = "'DM Sans', sans-serif";
const MONO = "'DM Mono', monospace";

function barColor(score) {
  if (score >= 80) return 'linear-gradient(to top, #2d9e84, var(--accent-teal))';
  if (score >= 75) return 'linear-gradient(to top, #a07830, var(--gold))';
  return 'linear-gradient(to top, #3a4a8a, var(--accent-blue))';
}

function scoreColor(score) {
  if (score >= 80) return 'var(--accent-teal)';
  if (score >= 75) return 'var(--gold)';
  return '#7ab8e8';
}

// SVG chart dimensions
const SVG_W = 600;
const SVG_H = 240;
const PAD_X = 60;
const PAD_Y = 24;
const CHART_W = SVG_W - PAD_X * 2;
const CHART_H = SVG_H - PAD_Y * 2;
const SCORE_MIN = 30;
const SCORE_MAX = 100;

function scoreToY(score) {
  const boundedScore = Math.max(SCORE_MIN, Math.min(SCORE_MAX, score));
  return PAD_Y + CHART_H - ((boundedScore - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * CHART_H;
}

function indexToX(i, length) {
  if (length <= 1) return PAD_X + CHART_W / 2;
  return PAD_X + (i / (length - 1)) * CHART_W;
}

const gridLines = [40, 60, 80, 100];

function MetricRow({ metric, delay }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const improved = metric.inverse
    ? metric.last < metric.first
    : metric.last > metric.first;

  const maxVal = Math.max(metric.first, metric.last, 1);
  const pct = metric.inverse
    ? Math.max(0, Math.min(100, (1 - metric.last / (maxVal * 1.5)) * 100))
    : Math.max(0, Math.min(100, (metric.last / 100) * 100));

  const deltaVal = Math.abs(metric.last - metric.first);
  let deltaStr = `${deltaVal} ${metric.unit}`;
  if (metric.inverse) deltaStr = `${deltaVal} fewer`;
  if (deltaVal === 0) deltaStr = `nc`;

  return (
    <div ref={ref} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <metric.icon size={13} color={metric.color} />
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: MONO }}>{metric.label}</span>
        <span style={{
          marginLeft: 'auto', fontSize: 10, fontWeight: 700,
          color: deltaVal === 0 ? 'var(--text-muted)' : (improved ? 'var(--accent-teal)' : 'var(--accent-rose)'),
          fontFamily: MONO,
        }}>
          {deltaVal !== 0 && (improved ? '↑' : '↓')} {deltaStr}
        </span>
      </div>
      <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
        <motion.div
          initial={{ width: 0 }}
          animate={inView ? { width: `${pct}%` } : { width: 0 }}
          transition={{ delay, duration: 0.8, ease: 'easeOut' }}
          style={{ height: '100%', background: `linear-gradient(90deg, ${metric.color}99, ${metric.color})`, borderRadius: 99 }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: MONO }}>First: {metric.first}{metric.unit === "%" ? "%" : ""}</span>
        <span style={{ fontSize: 11, color: metric.color, fontFamily: MONO, fontWeight: 600 }}>Latest: {metric.last}{metric.unit === "%" ? "%" : ""}</span>
      </div>
    </div>
  );
}

export default function ProgressPage({ setCurrentPage, interviewSetup }) {
  const chartRef = useRef(null);
  const chartInView = useInView(chartRef, { once: true });

  const [rawHistory, setRawHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState(interviewSetup?.role || 'All Roles');

  const availableRoles = [
    'All Roles',
    'Software Engineer',
    'Frontend Developer',
    'Backend Developer',
    'AI/ML Engineer',
    'Data Analyst'
  ];

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
      // Sort chronologically (oldest first for progress trend line)
      combined.sort((a, b) => new Date(a.created_at || Date.now()) - new Date(b.created_at || Date.now()));
      setRawHistory(combined);
      setLoading(false);
    }

    fetchData();

    const handleUpdate = () => fetchData();
    window.addEventListener('mockly_interviews_updated', handleUpdate);
    return () => window.removeEventListener('mockly_interviews_updated', handleUpdate);
  }, []);

  const filteredHistory = selectedRole === 'All Roles'
    ? rawHistory
    : rawHistory.filter(d => (d.role || '').toLowerCase() === selectedRole.toLowerCase());

  const section = (i) => ({
    initial: { opacity: 0, y: 28 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' },
  });

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--obsidian)' }}>
        <Loader2 className="animate-spin" color="var(--gold)" size={32} />
      </div>
    );
  }

  // ==== PROGRESS LOGIC ==== //
  const progressData = filteredHistory.map((d, i) => ({
    label: `Session ${i + 1}`,
    score: d.overall_score || 0,
    date: new Date(d.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    role: d.role || 'Unknown'
  }));

  const hasData = progressData.length > 0;
  const delta = hasData ? (progressData[progressData.length - 1].score - progressData[0].score) : 0;
  const points = progressData.map((d, i) => ({ x: indexToX(i, progressData.length), y: scoreToY(d.score), ...d }));
  const polyline = points.map(p => `${p.x},${p.y}`).join(' ');

  const firstRec = filteredHistory[0] || {};
  const lastRec = filteredHistory[filteredHistory.length - 1] || {};

  const skillMetrics = [
    { label: 'Speaking Pace', first: firstRec.avg_wpm || 0, last: lastRec.avg_wpm || 0, unit: ' WPM', color: '#7ab8e8', icon: Mic },
    { label: 'Filler Words', first: firstRec.total_fillers || 0, last: lastRec.total_fillers || 0, unit: ' total', color: 'var(--accent-rose)', icon: MessageSquare, inverse: true },
    { label: 'Total Pauses', first: firstRec.total_pauses || 0, last: lastRec.total_pauses || 0, unit: ' total', color: 'var(--accent-teal)', icon: Clock, inverse: true },
    { label: 'Relevance Score', first: firstRec.avg_relevance || 0, last: lastRec.avg_relevance || 0, unit: '%', color: 'var(--gold)', icon: Activity },
  ];

  return (
    <div style={{ position: 'relative', minHeight: '100vh', isolation: 'isolate' }}>
      <ScrollStroke
        filterId="progress"
        viewBox="0 0 1200 2000"
        path="M200,2000 C200,1900 260,1820 320,1740 C380,1660 460,1620 500,1540 C540,1460 520,1360 560,1280 C600,1200 680,1160 720,1080 C760,1000 740,900 780,820 C820,740 900,700 940,620 C980,540 960,440 980,360 C1000,280 1060,220 1060,140 C1060,60 1020,0 1000,0"
        color="rgba(140,210,100,0.42)"
        glowColor="rgba(140,210,100,0.16)"
        dotColor="#8CD264"
        strokeWidth={2.5}
        side="right"
        scrollRange={[0, 0.88]}
      />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px', position: 'relative', zIndex: 2 }}>

        {/* Header */}
        <motion.div {...section(0)} style={{ textAlign: 'center', marginBottom: 36 }}>
          <div className="tag-gold" style={{ marginBottom: 14, display: 'inline-flex' }}>Analytics &amp; Trends</div>
          <h1 style={{ fontFamily: DISPLAY, fontSize: 'clamp(30px, 5vw, 44px)', fontWeight: 700, fontStyle: 'italic', color: 'var(--text-primary)', margin: '0 0 12px' }}>
            Interview Progress
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', fontFamily: SANS, margin: '0 0 24px' }}>
            Track your performance trajectory across your mock sessions.
          </p>

          {/* Role Filter Pills */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 8 }}>
            {availableRoles.map(r => {
              const active = selectedRole === r;
              return (
                <button
                  key={r}
                  onClick={() => setSelectedRole(r)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontFamily: SANS,
                    fontWeight: 500,
                    cursor: 'pointer',
                    background: active ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${active ? 'rgba(201,168,76,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    color: active ? 'var(--gold-light)' : 'var(--text-muted)',
                    transition: 'all 0.18s ease',
                  }}
                >
                  {r}
                </button>
              );
            })}
          </div>

          <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, var(--gold), transparent)', margin: '20px auto 0', maxWidth: 200 }} />
        </motion.div>

        {!hasData ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(201,168,76,0.08)', border: '1px dashed rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <TrendingUp size={24} color="var(--gold)" />
            </div>
            <h2 style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>
              No Progress Data for {selectedRole}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: SANS, margin: '0 0 24px', maxWidth: 360, marginInline: 'auto', lineHeight: 1.6 }}>
              Complete a mock interview session for <strong style={{ color: 'var(--gold)' }}>{selectedRole}</strong> to view tailored progress charts.
            </p>
            <button className="btn-gold" onClick={() => setCurrentPage('setup')} style={{ padding: '12px 28px' }}>
              Start Session <ArrowRight size={14} />
            </button>
          </div>
        ) : (
          <>

        {/* KPI Row */}
        <motion.div {...section(1)} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 40 }}>
          {[
            { label: 'Total Sessions', value: progressData.length, icon: Layers, color: 'var(--gold)' },
            { label: 'Latest Score', value: `${progressData[progressData.length - 1].score}`, sub: '/100', icon: BarChart2, color: 'var(--accent-teal)' },
            { label: 'Score Growth', value: delta >= 0 ? `+${delta}` : delta, sub: ' pts', icon: TrendingUp, color: delta >= 0 ? '#8cd264' : 'var(--accent-rose)' },
          ].map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 + i * 0.08, duration: 0.4 }}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderTop: `2px solid ${kpi.color}`,
                borderRadius: 14,
                padding: '22px 20px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{kpi.label}</span>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: `${kpi.color}1a`, border: `1px solid ${kpi.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <kpi.icon size={14} color={kpi.color} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                <span style={{ fontFamily: DISPLAY, fontSize: 34, fontWeight: 700, color: kpi.color }}>{kpi.value}</span>
                {kpi.sub && <span style={{ fontSize: 14, color: 'var(--text-muted)', fontFamily: MONO }}>{kpi.sub}</span>}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Line Chart */}
        <motion.div {...section(2)} ref={chartRef} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '28px 24px', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
            <TrendingUp size={14} color="var(--accent-teal)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: SANS }}>Score Improvement Trajectory</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ width: '100%', minWidth: 360, display: 'block' }}>
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#7ab8e8" />
                  <stop offset="100%" stopColor="var(--gold)" />
                </linearGradient>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(201,168,76,0.12)" />
                  <stop offset="100%" stopColor="rgba(201,168,76,0)" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              {gridLines.map(g => {
                const y = scoreToY(g);
                return (
                  <g key={g}>
                    <line x1={PAD_X} y1={y} x2={SVG_W - 20} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                    <text x={PAD_X - 8} y={y + 4} textAnchor="end" fontSize="9" fill="rgba(255,255,255,0.25)" fontFamily="DM Mono, monospace">{g}</text>
                  </g>
                );
              })}

              {/* Area fill */}
              {points.length > 1 && (
                <polygon
                  points={`${points.map(p => `${p.x},${p.y}`).join(' ')} ${points[points.length - 1].x},${PAD_Y + CHART_H} ${points[0].x},${PAD_Y + CHART_H}`}
                  fill="url(#areaGrad)"
                />
              )}

              {/* Vertical stems */}
              {points.map((p, i) => (
                <line key={i} x1={p.x} y1={p.y} x2={p.x} y2={PAD_Y + CHART_H} stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="3,4" />
              ))}

              {/* Polyline */}
              {points.length > 1 && (
                <motion.polyline
                  points={polyline}
                  fill="none"
                  stroke="url(#lineGrad)"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={chartInView ? { pathLength: 1, opacity: 1 } : {}}
                  transition={{ duration: 1.2, ease: 'easeInOut' }}
                />
              )}

              {/* Data points */}
              {points.map((p, i) => (
                <g key={i}>
                  {/* Score label */}
                  <rect x={p.x - 16} y={p.y - 26} width={32} height={18} rx={4} fill="rgba(201,168,76,0.15)" stroke="rgba(201,168,76,0.3)" strokeWidth="1" />
                  <text x={p.x} y={p.y - 13} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--gold)" fontFamily="DM Mono, monospace">{p.score}</text>

                  {/* Pulse ring on last point */}
                  {i === points.length - 1 && (
                    <motion.circle
                      cx={p.x} cy={p.y} r={10}
                      fill="none" stroke="var(--gold)" strokeWidth="1"
                      animate={{ r: [8, 14], opacity: [0.6, 0] }}
                      transition={{ repeat: Infinity, duration: 1.8, ease: 'easeOut' }}
                    />
                  )}
                  <circle cx={p.x} cy={p.y} r={5} fill={scoreColor(p.score)} stroke="var(--obsidian)" strokeWidth="2" />

                  {/* X labels */}
                  <text x={p.x} y={SVG_H - 4} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.45)" fontFamily="DM Mono, monospace">{p.date}</text>
                </g>
              ))}

              {/* Bars under each point */}
              {points.map((p, i) => (
                <motion.rect
                  key={i}
                  x={p.x - 5}
                  y={p.y + 6}
                  width={10}
                  height={Math.max(0, PAD_Y + CHART_H - p.y - 6)}
                  rx={3}
                  fill={scoreColor(p.score)}
                  opacity={0.2}
                  initial={{ scaleY: 0 }}
                  animate={chartInView ? { scaleY: 1 } : {}}
                  transition={{ delay: 0.8 + i * 0.1, duration: 0.5 }}
                  style={{ transformOrigin: `${p.x}px ${PAD_Y + CHART_H}px` }}
                />
              ))}
            </svg>
          </div>

          {/* X-axis labels row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: PAD_X, paddingRight: PAD_X, marginTop: 8 }}>
            {points.length === 1 && (
              <div style={{ textAlign: 'center', width: '100%' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', fontFamily: SANS }}>{progressData[0].label}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: MONO }}>{progressData[0].role}</div>
              </div>
            )}
            {points.length > 1 && progressData.map((d, i) => (
              <div key={i} style={{ textAlign: 'center', width: CHART_W / (progressData.length - 1) }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', fontFamily: SANS }}>{d.label}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: MONO }}>{d.role}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Skill Metrics */}
        {points.length > 1 && (
          <motion.div {...section(3)} style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <Activity size={14} color="var(--gold)" />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: MONO }}>Skill Metrics Over Time</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
              {skillMetrics.map((m, i) => (
                <MetricRow key={m.label} metric={m} delay={0.3 + i * 0.08} />
              ))}
            </div>
          </motion.div>
        )}

        {/* Session Cards */}
        <motion.div {...section(4)} style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <BarChart2 size={14} color="var(--gold)" />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: MONO }}>Past Sessions</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {/* Reverse progressData to show most recent first in the cards */}
            {[...progressData].reverse().map((d, i) => {
              const reverseIdx = progressData.length - i;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.07, duration: 0.4 }}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 14,
                    padding: '20px 18px',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{
                    position: 'absolute', top: -4, left: -4,
                    fontFamily: DISPLAY, fontSize: 80, fontWeight: 700,
                    color: 'rgba(255,255,255,0.04)',
                    lineHeight: 1, userSelect: 'none',
                  }}>
                    {String(reverseIdx).padStart(2, '0')}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{d.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: SANS, marginBottom: 10 }}>{d.role}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: MONO }}>{d.date}</span>
                      <span style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 700, color: scoreColor(d.score) }}>{d.score}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div {...section(5)} style={{ display: 'flex', justifyContent: 'center' }}>
          <motion.button
            className="btn-gold"
            onClick={() => setCurrentPage('setup')}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            style={{ padding: '14px 36px', fontSize: 14 }}
          >
            Practice Another Session
            <ArrowRight size={15} />
          </motion.button>
        </motion.div>
        </>
        )}

      </div>
    </div>
  );
}
