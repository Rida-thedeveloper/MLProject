import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Custom minimal SVG icons — no emojis, no stock AI ──────────────────────
const Icons = {
  // Microphone — waveform bars
  Mic: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <line x1="9" y1="21" x2="15" y2="21" />
    </svg>
  ),
  // Analytics — clean bar chart
  Analytics: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <line x1="4" y1="20" x2="20" y2="20" />
      <rect x="5" y="13" width="3" height="7" rx="1" />
      <rect x="10.5" y="8" width="3" height="12" rx="1" />
      <rect x="16" y="4" width="3" height="16" rx="1" />
    </svg>
  ),
  // Difficulty — diamond / layers
  Layers: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 22 8.5 12 15 2 8.5" />
      <polyline points="2 15.5 12 22 22 15.5" />
      <polyline points="2 12 12 18.5 22 12" />
    </svg>
  ),
  // Feedback — speech bubble with line
  Feedback: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <line x1="8" y1="9" x2="16" y2="9" />
      <line x1="8" y1="13" x2="13" y2="13" />
    </svg>
  ),
  // Progress — upward arrow through a circle
  Trend: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  ),
};

const TRAITS = [
  {
    num: '01',
    Icon: Icons.Mic,
    label: 'AI Interviewer',
    desc: 'Adaptive questions that mirror real hiring panels',
  },
  {
    num: '02',
    Icon: Icons.Analytics,
    label: 'Precision Scoring',
    desc: 'Every answer graded across clarity, depth & delivery',
  },
  {
    num: '03',
    Icon: Icons.Layers,
    label: 'Adaptive Depth',
    desc: 'From entry-level screens to principal-level panels',
  },
  {
    num: '04',
    Icon: Icons.Feedback,
    label: 'Real-Time Critique',
    desc: 'Speech analysis powered by Whisper in milliseconds',
  },
  {
    num: '05',
    Icon: Icons.Trend,
    label: 'Growth Tracking',
    desc: 'Session timelines that show your trajectory clearly',
  },
];

// ── HandWritten-style SVG loop behind MOCKLY ───────────────────────────────
function LoopDraw() {
  const mkVariant = (delay, dur) => ({
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1, opacity: 1,
      transition: {
        pathLength: { delay, duration: dur, ease: [0.43, 0.13, 0.23, 0.96] },
        opacity: { delay, duration: 0.3 },
      },
    },
  });

  return (
    <motion.svg
      width="100%" height="100%"
      viewBox="0 0 440 320"
      initial="hidden" animate="visible"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      {/* Outer ellipse sweep */}
      <motion.path
        d="M 360 70 C 460 160, 400 270, 220 285 C 60 285, 20 210, 20 160 C 20 80, 120 35, 220 35 C 320 35, 360 130, 360 130"
        fill="none" strokeWidth="1.2"
        stroke="rgba(201,168,76,0.28)"
        strokeLinecap="round" strokeLinejoin="round"
        variants={mkVariant(0.4, 3.2)}
      />
      {/* Horizontal crossing arc */}
      <motion.path
        d="M 60 240 C 140 275, 300 275, 380 210"
        fill="none" strokeWidth="0.8"
        stroke="rgba(201,168,76,0.16)"
        strokeLinecap="round"
        variants={mkVariant(1.8, 2)}
      />
      {/* Small top-right flourish */}
      <motion.path
        d="M 340 55 C 370 40, 400 60, 390 90"
        fill="none" strokeWidth="0.8"
        stroke="rgba(201,168,76,0.18)"
        strokeLinecap="round"
        variants={mkVariant(2.6, 1)}
      />
    </motion.svg>
  );
}

// ── Animated number counter on the index ──────────────────────────────────
function TraitCard({ t, i }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 28 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.55 + i * 0.11, duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ x: 6, transition: { duration: 0.18 } }}
      style={{ display: 'flex', alignItems: 'center', gap: 0 }}
    >
      {/* Left accent line that grows in */}
      <motion.div
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ delay: 0.7 + i * 0.11, duration: 0.35, ease: 'easeOut' }}
        style={{
          width: '2px',
          height: '38px',
          background: i === 0
            ? 'var(--gold)'
            : 'rgba(201,168,76,0.25)',
          borderRadius: '2px',
          marginRight: '14px',
          flexShrink: 0,
          transformOrigin: 'top',
        }}
      />

      {/* Number index */}
      <span style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: 'clamp(9px, 0.75vw, 10px)',
        color: 'rgba(201,168,76,0.45)',
        letterSpacing: '0.1em',
        marginRight: '12px',
        flexShrink: 0,
        width: 18,
      }}>
        {t.num}
      </span>

      {/* Icon */}
      <span style={{
        color: i === 0 ? 'var(--gold)' : 'rgba(255,255,255,0.35)',
        marginRight: '12px',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
      }}>
        <t.Icon />
      </span>

      {/* Text */}
      <div>
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 'clamp(11px, 0.95vw, 13px)',
          fontWeight: 600,
          color: i === 0 ? 'var(--text-primary)' : 'rgba(255,255,255,0.65)',
          lineHeight: 1.25,
          marginBottom: 2,
          letterSpacing: '0.01em',
        }}>
          {t.label}
        </p>
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 'clamp(9px, 0.78vw, 11px)',
          color: 'var(--text-muted)',
          lineHeight: 1.45,
        }}>
          {t.desc}
        </p>
      </div>
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function IntroScreen({ onDone }) {
  const videoRef = useRef(null);
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(0);

  function dismiss() { setVisible(false); }

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = false;
    vid.play().catch(() => { vid.muted = true; vid.play().catch(() => {}); });
    const onEnd = () => dismiss();
    const onTime = () => { if (vid.duration) setProgress(vid.currentTime / vid.duration); };
    vid.addEventListener('ended', onEnd);
    vid.addEventListener('timeupdate', onTime);
    return () => { vid.removeEventListener('ended', onEnd); vid.removeEventListener('timeupdate', onTime); };
  }, []);

  return (
    <AnimatePresence onExitComplete={onDone}>
      {visible && (
        <motion.div
          key="intro"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'var(--obsidian)',
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            padding: '0 5vw',
            gap: '3.5vw',
          }}
        >
          {/* Subtle grain texture overlay */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`,
            backgroundSize: '256px 256px',
          }} />

          {/* ── LEFT: Mockly wordmark ──────────────────────────────── */}
          <div style={{
            position: 'relative', zIndex: 1,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              position: 'relative', width: '100%', maxWidth: 380,
              aspectRatio: '4/3',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <LoopDraw />

              <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
                {/* Letter-by-letter MOCKLY */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  {'MOCKLY'.split('').map((ch, i) => (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0, y: 20, filter: 'blur(6px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      transition={{ delay: 0.28 + i * 0.09, duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
                      style={{
                        fontFamily: "'Playfair Display', Georgia, serif",
                        fontSize: 'clamp(40px, 5.5vw, 72px)',
                        fontWeight: 700,
                        letterSpacing: '0.18em',
                        color: i % 2 === 0 ? 'var(--gold)' : 'var(--text-primary)',
                        lineHeight: 1,
                        display: 'inline-block',
                      }}
                    >
                      {ch}
                    </motion.span>
                  ))}
                </div>

                {/* Subtitle */}
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.1, duration: 0.6 }}
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 'clamp(9px, 0.8vw, 11px)',
                    letterSpacing: '0.32em',
                    color: 'rgba(201,168,76,0.55)',
                    textTransform: 'uppercase',
                    marginTop: '14px',
                  }}
                >
                  Interview Intelligence
                </motion.div>

                {/* Gold line — draws left to right */}
                <motion.div
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  transition={{ delay: 1.35, duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
                  style={{
                    height: '1px',
                    background: 'linear-gradient(90deg, transparent 0%, var(--gold) 40%, rgba(201,168,76,0.4) 70%, transparent 100%)',
                    marginTop: '18px',
                    transformOrigin: 'left',
                  }}
                />
              </div>
            </div>

            {/* Tagline below box */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.7, duration: 0.8 }}
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 'clamp(11px, 1vw, 14px)',
                color: 'var(--text-secondary)',
                textAlign: 'center',
                lineHeight: 1.7,
                maxWidth: 260,
                marginTop: 4,
              }}
            >
              Practice smarter. Speak confidently.<br />Land the role you deserve.
            </motion.p>
          </div>

          {/* ── CENTER: Video ──────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.65, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              position: 'relative', zIndex: 1,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '14px',
            }}
          >
            <div style={{ position: 'relative' }}>
              {/* Ambient glow behind video */}
              <div style={{
                position: 'absolute', inset: -20, borderRadius: '30px',
                background: 'radial-gradient(ellipse at center, rgba(201,168,76,0.06) 0%, transparent 70%)',
                pointerEvents: 'none',
              }} />
              <video
                ref={videoRef}
                src="/Intro_updated.mp4"
                autoPlay
                playsInline
                style={{
                  width: 'min(300px, 34vw)',
                  maxHeight: 'min(480px, 60vh)',
                  aspectRatio: '9/16',
                  objectFit: 'cover',
                  display: 'block',
                  borderRadius: '16px',
                  boxShadow: '0 0 0 1px rgba(201,168,76,0.15), 0 24px 64px rgba(0,0,0,0.5)',
                  position: 'relative', zIndex: 1,
                }}
              />
            </div>

            {/* Progress bar */}
            <div style={{ width: 'min(300px, 34vw)', height: '1px', background: 'rgba(255,255,255,0.07)', borderRadius: '1px' }}>
              <motion.div
                style={{
                  height: '100%', background: 'var(--gold)',
                  width: `${progress * 100}%`, borderRadius: '1px',
                  transition: 'width 0.25s linear',
                  boxShadow: '0 0 6px rgba(201,168,76,0.5)',
                }}
              />
            </div>

            {/* Skip */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 0.4 }}
              onClick={dismiss}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '8px 22px',
                background: 'rgba(255,255,255,0.03)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '100px',
                color: 'rgba(255,255,255,0.35)',
                fontFamily: "'DM Mono', monospace",
                fontSize: '11px', fontWeight: 400,
                letterSpacing: '0.12em', cursor: 'pointer', lineHeight: 1,
                textTransform: 'uppercase',
              }}
              whileHover={{
                background: 'rgba(201,168,76,0.08)',
                borderColor: 'rgba(201,168,76,0.25)',
                color: 'var(--gold)',
              }}
              whileTap={{ scale: 0.96 }}
            >
              Skip
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h9M8.5 4.5l3.5 3.5-3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="12" y="3.5" width="1.5" height="9" rx="0.75" fill="currentColor" />
              </svg>
            </motion.button>
          </motion.div>

          {/* ── RIGHT: Feature list ────────────────────────────────── */}
          <div style={{
            position: 'relative', zIndex: 1,
            display: 'flex', flexDirection: 'column',
            gap: 'clamp(14px, 2vh, 22px)',
          }}>
            {/* Section label */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                marginBottom: 2,
              }}
            >
              <div style={{ width: 16, height: '1px', background: 'rgba(201,168,76,0.4)' }} />
              <span style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 'clamp(8px, 0.7vw, 10px)',
                letterSpacing: '0.3em',
                color: 'rgba(201,168,76,0.5)',
                textTransform: 'uppercase',
              }}>
                Core capabilities
              </span>
            </motion.div>

            {/* Trait rows */}
            {TRAITS.map((t, i) => <TraitCard key={t.num} t={t} i={i} />)}

            {/* Bottom mark */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2, duration: 0.8 }}
              style={{
                marginTop: 4,
                fontFamily: "'DM Mono', monospace",
                fontSize: 'clamp(8px, 0.68vw, 9px)',
                letterSpacing: '0.2em',
                color: 'rgba(255,255,255,0.12)',
                textTransform: 'uppercase',
              }}
            >
              v2.0 · AI-Powered · 2025
            </motion.div>
          </div>

        </motion.div>
      )}
    </AnimatePresence>
  );
}
