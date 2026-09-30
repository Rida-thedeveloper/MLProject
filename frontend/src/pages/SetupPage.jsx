import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  ArrowRight, Play, Check, Code2, MessageCircle, Layers,
  Zap, Flame, Sprout, Clock, Briefcase
} from 'lucide-react';
import ScrollStroke from '../components/ScrollStroke';

/* ── Fade-up variant factory ─────────────────────────────── */
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1], delay } },
});

/* ── Step section wrapper ─────────────────────────────────── */
function StepSection({ number, label, color = '#c9a84c', children, delay = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px 0px' });

  return (
    <motion.div ref={ref} {...fadeUp(delay)} style={{ display: 'flex', gap: 28, alignItems: 'flex-start' }}>
      {/* Step number */}
      <div style={{ flexShrink: 0, width: 52, paddingTop: 4, textAlign: 'right' }}>
        <motion.span
          initial={{ opacity: 0.04, y: 16, filter: 'blur(2px)' }}
          animate={inView
            ? { opacity: 0.22, y: 0, filter: 'blur(0px)' }
            : { opacity: 0.04, y: 16, filter: 'blur(2px)' }
          }
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: delay + 0.15 }}
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 48, fontWeight: 900, fontStyle: 'italic',
            color: color,
            lineHeight: 1,
            display: 'block',
            userSelect: 'none',
          }}
        >
          {number}
        </motion.span>
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={inView ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: delay + 0.3 }}
          style={{ width: '100%', height: 1, background: `${color}55`, marginTop: 6, transformOrigin: 'right' }}
        />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          marginBottom: 20,
        }}>
          <span style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 10, fontWeight: 600,
            letterSpacing: '0.2em', textTransform: 'uppercase',
            color: color,
          }}>
            {label}
          </span>
        </div>
        {children}
      </div>
    </motion.div>
  );
}

/* ── Divider ─────────────────────────────────────────────── */
function GoldDivider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '4px 0' }}>
      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
      <div style={{
        width: 5, height: 5, borderRadius: '50%',
        background: 'rgba(201,168,76,0.35)',
        boxShadow: '0 0 6px rgba(201,168,76,0.3)',
      }} />
      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
    </div>
  );
}

/* ── Role pill ───────────────────────────────────────────── */
function RolePill({ label, selected, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      animate={{
        background: selected ? 'rgba(201,168,76,0.14)' : 'rgba(255,255,255,0.03)',
        borderColor: selected ? 'rgba(201,168,76,0.4)' : 'rgba(255,255,255,0.08)',
        color: selected ? '#e8c96a' : '#9b9896',
        boxShadow: selected ? '0 0 18px rgba(201,168,76,0.12)' : '0 0 0px transparent',
      }}
      transition={{ duration: 0.2 }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '9px 18px',
        borderRadius: 999,
        border: '1px solid',
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 13, fontWeight: 500,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        transition: 'none',
      }}
    >
      <AnimatePresence>
        {selected && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ display: 'flex' }}
          >
            <Check size={11} strokeWidth={2.5} />
          </motion.span>
        )}
      </AnimatePresence>
      {label}
    </motion.button>
  );
}

/* ── Difficulty / Type card ──────────────────────────────── */
function ChoiceCard({ id, desc, icon: Icon, selected, onClick, accentColor, dots = 1 }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      animate={{
        background: selected
          ? `rgba(${accentColor}, 0.09)`
          : 'rgba(255,255,255,0.02)',
        borderColor: selected
          ? `rgba(${accentColor}, 0.35)`
          : 'rgba(255,255,255,0.07)',
        boxShadow: selected
          ? `0 4px 24px rgba(${accentColor}, 0.1), 0 0 0 1px rgba(${accentColor}, 0.12) inset`
          : '0 0 0 transparent',
      }}
      transition={{ duration: 0.22 }}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
        gap: 12, padding: '20px 18px',
        borderRadius: 14, border: '1px solid',
        cursor: 'pointer',
        textAlign: 'left',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Icon */}
      <motion.div
        animate={{ color: selected ? `rgb(${accentColor})` : '#5c5a57' }}
        transition={{ duration: 0.2 }}
        style={{ display: 'flex' }}
      >
        <Icon size={18} />
      </motion.div>

      {/* Text */}
      <div>
        <motion.div
          animate={{ color: selected ? `rgb(${accentColor})` : '#f0ede8' }}
          transition={{ duration: 0.2 }}
          style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, marginBottom: 4 }}
        >
          {id}
        </motion.div>
        <div style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 10, color: '#5c5a57', letterSpacing: '0.06em',
        }}>
          {desc}
        </div>
      </div>

      {/* Intensity dots */}
      <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
        {[1, 2, 3].map(i => (
          <motion.div
            key={i}
            animate={{
              background: selected && i <= dots
                ? `rgba(${accentColor}, 0.7)`
                : 'rgba(255,255,255,0.08)',
            }}
            transition={{ duration: 0.2, delay: i * 0.04 }}
            style={{ width: 16, height: 3, borderRadius: 2 }}
          />
        ))}
      </div>

      {/* Selected glow top edge */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            exit={{ scaleX: 0, opacity: 0 }}
            style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              height: 2,
              background: `rgba(${accentColor}, 0.6)`,
              transformOrigin: 'left',
            }}
          />
        )}
      </AnimatePresence>
    </motion.button>
  );
}

/* ── Count card ──────────────────────────────────────────── */
function CountCard({ count, time, selected, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      animate={{
        background: selected ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.02)',
        borderColor: selected ? 'rgba(201,168,76,0.35)' : 'rgba(255,255,255,0.07)',
        boxShadow: selected ? '0 4px 32px rgba(201,168,76,0.1)' : 'none',
      }}
      transition={{ duration: 0.22 }}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 10, padding: '28px 20px',
        borderRadius: 16, border: '1px solid',
        cursor: 'pointer', position: 'relative', overflow: 'hidden',
      }}
    >
      <motion.div
        animate={{
          color: selected ? '#c9a84c' : 'rgba(255,255,255,0.12)',
          textShadow: selected ? '0 0 40px rgba(201,168,76,0.35)' : '0 0 0px transparent',
        }}
        transition={{ duration: 0.25 }}
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 64, fontWeight: 900, fontStyle: 'italic',
          lineHeight: 1,
        }}
      >
        {count}
      </motion.div>

      <div style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 12, color: '#5c5a57', fontWeight: 500,
      }}>
        questions
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '4px 10px',
        borderRadius: 999,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <Clock size={10} color="#5c5a57" />
        <span style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 10, color: '#5c5a57', letterSpacing: '0.06em',
        }}>
          {time}
        </span>
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            exit={{ scaleX: 0, opacity: 0 }}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              height: 2,
              background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.6), transparent)',
              transformOrigin: 'center',
            }}
          />
        )}
      </AnimatePresence>
    </motion.button>
  );
}

/* ── Main Page ───────────────────────────────────────────── */
export default function SetupPage({
  setCurrentPage, interviewSetup, setInterviewSetup,
  setRecordedAnswers, setSelectedAnswerIdx,
}) {
  const [role, setRole] = useState(interviewSetup.role || 'Software Engineer');
  const [difficulty, setDifficulty] = useState(interviewSetup.difficulty || 'Intermediate');
  const [type, setType] = useState(interviewSetup.type || 'Technical');
  const [questionCount, setQuestionCount] = useState(interviewSetup.questionCount || 5);
  const [shimmer, setShimmer] = useState(false);
  const btnRef = useRef(null);

  const roles = ["Software Engineer", "Frontend Developer", "Backend Developer", "AI/ML Engineer", "Data Analyst"];

  const difficulties = [
    { id: "Beginner", desc: "Foundational concepts", icon: Sprout, dots: 1 },
    { id: "Intermediate", desc: "Real-world depth", icon: Flame, dots: 2 },
    { id: "Advanced", desc: "Senior-level rigor", icon: Zap, dots: 3 },
  ];

  const types = [
    { id: "Technical", desc: "Coding & systems", icon: Code2 },
    { id: "Behavioral", desc: "Soft skills & stories", icon: MessageCircle },
    { id: "Mixed", desc: "Both question types", icon: Layers },
  ];

  const handleStart = () => {
    // Clear all previous interview responses so past sessions don't leak into new ones
    if (typeof setRecordedAnswers === 'function') setRecordedAnswers({});
    if (typeof setSelectedAnswerIdx === 'function') setSelectedAnswerIdx(null);
    setInterviewSetup({ role, difficulty, type, questionCount: Number(questionCount), sessionId: crypto.randomUUID() });
    setCurrentPage('interview');
  };

  const summaryItems = [
    { label: 'Role', value: role.replace('Developer', 'Dev').replace('Engineer', 'Eng') },
    { label: 'Level', value: difficulty },
    { label: 'Type', value: type },
    { label: 'Qs', value: questionCount },
  ];

  return (
    <div style={{ position: 'relative', minHeight: '100vh', isolation: 'isolate' }}>
      <ScrollStroke
        filterId="setup"
        viewBox="0 0 1200 1600"
        path="M0,200 C60,160 140,180 200,260 C260,340 240,460 300,540 C360,620 460,620 520,700 C580,780 560,900 600,980 C640,1060 720,1080 760,1160 C800,1240 780,1360 760,1460 C740,1560 700,1580 680,1600"
        color="rgba(230,155,80,0.42)"
        glowColor="rgba(230,155,80,0.16)"
        dotColor="#E69B50"
        strokeWidth={2.5}
        side="left"
      />

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '56px 24px 120px', position: 'relative', zIndex: 2 }}>

        {/* ── Hero ── */}
        <motion.div {...fadeUp(0)} style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '5px 14px',
            borderRadius: 999,
            background: 'rgba(201,168,76,0.08)',
            border: '1px solid rgba(201,168,76,0.2)',
            marginBottom: 24,
          }}>
            <Briefcase size={11} color="#c9a84c" />
            <span style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 10, fontWeight: 600,
              letterSpacing: '0.2em', textTransform: 'uppercase',
              color: 'rgba(201,168,76,0.8)',
            }}>
              Session Setup
            </span>
          </div>

          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(32px, 5vw, 48px)',
            fontWeight: 800, fontStyle: 'italic',
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            marginBottom: 16,
          }}>
            Configure your{' '}
            <em style={{ color: 'var(--gold)', fontStyle: 'italic' }}>session</em>
          </h1>

          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 15, color: 'rgba(255,255,255,0.35)',
            maxWidth: 440, margin: '0 auto',
            lineHeight: 1.7, fontWeight: 300,
          }}>
            Tailor the difficulty, format, and length to match your target role.
          </p>

          {/* Decorative rule */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 36, maxWidth: 320, margin: '36px auto 0' }}>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.08))' }} />
            <div style={{
              width: 6, height: 6,
              background: 'var(--gold)',
              transform: 'rotate(45deg)',
              boxShadow: '0 0 10px rgba(201,168,76,0.5)',
              flexShrink: 0,
            }} />
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left, transparent, rgba(255,255,255,0.08))' }} />
          </div>
        </motion.div>

        {/* ── Sections ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>

          {/* ── 01 Role ── */}
          <StepSection number="01" label="Target Role" color="#c9a84c" delay={0.1}>
            <div style={{
              display: 'flex', gap: 10, flexWrap: 'wrap',
            }}>
              {roles.map(r => (
                <RolePill key={r} label={r} selected={role === r} onClick={() => setRole(r)} />
              ))}
            </div>
          </StepSection>

          <GoldDivider />

          {/* ── 02 Difficulty ── */}
          <StepSection number="02" label="Difficulty" color="#4a8fd4" delay={0.15}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {difficulties.map(d => (
                <ChoiceCard
                  key={d.id}
                  {...d}
                  selected={difficulty === d.id}
                  onClick={() => setDifficulty(d.id)}
                  accentColor="74,143,212"
                />
              ))}
            </div>
          </StepSection>

          <GoldDivider />

          {/* ── 03 Type ── */}
          <StepSection number="03" label="Interview Type" color="#3db8a0" delay={0.2}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {types.map((t, i) => (
                <ChoiceCard
                  key={t.id}
                  {...t}
                  dots={i + 1}
                  selected={type === t.id}
                  onClick={() => setType(t.id)}
                  accentColor="61,184,160"
                />
              ))}
            </div>
          </StepSection>

          <GoldDivider />

          {/* ── 04 Count ── */}
          <StepSection number="04" label="Question Count" color="#c9a84c" delay={0.25}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, maxWidth: 360 }}>
              <CountCard count={5} time="~20 min" selected={questionCount === 5} onClick={() => setQuestionCount(5)} />
              <CountCard count={10} time="~40 min" selected={questionCount === 10} onClick={() => setQuestionCount(10)} />
            </div>
          </StepSection>

        </div>

        {/* ── Session Preview ── */}
        <motion.div
          {...fadeUp(0.35)}
          style={{
            marginTop: 52,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 14,
            padding: '18px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.18)', marginRight: 4,
            }}>
              Preview
            </span>
            {summaryItems.map(item => (
              <div key={item.label} style={{ position: 'relative', overflow: 'hidden' }}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={item.value}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '4px 10px',
                      borderRadius: 999,
                      background: 'rgba(201,168,76,0.08)',
                      border: '1px solid rgba(201,168,76,0.18)',
                    }}
                  >
                    <span style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 9, color: 'rgba(201,168,76,0.5)',
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                    }}>
                      {item.label}
                    </span>
                    <span style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 12, color: '#c9a84c', fontWeight: 600,
                    }}>
                      {item.value}
                    </span>
                  </motion.div>
                </AnimatePresence>
              </div>
            ))}
          </div>

          <div style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.12)',
          }}>
            Ready to launch
          </div>
        </motion.div>

        {/* ── Launch Button ── */}
        <motion.div {...fadeUp(0.42)} style={{ marginTop: 20 }}>
          <motion.button
            ref={btnRef}
            onClick={handleStart}
            onHoverStart={() => setShimmer(true)}
            onHoverEnd={() => setShimmer(false)}
            whileHover={{ y: -2, boxShadow: '0 12px 40px rgba(201,168,76,0.35)' }}
            whileTap={{ scale: 0.98, y: 0 }}
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '18px 28px',
              borderRadius: 14,
              border: '1px solid rgba(201,168,76,0.4)',
              background: 'linear-gradient(135deg, #c9a84c 0%, #a8843a 100%)',
              color: '#0a0804',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 15, fontWeight: 700,
              cursor: 'pointer',
              position: 'relative', overflow: 'hidden',
              boxShadow: '0 4px 24px rgba(201,168,76,0.22)',
            }}
          >
            {/* Shimmer sweep */}
            <AnimatePresence>
              {shimmer && (
                <motion.div
                  initial={{ x: '-110%' }}
                  animate={{ x: '110%' }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.55, ease: 'easeInOut' }}
                  style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.28) 50%, transparent 70%)',
                    pointerEvents: 'none',
                  }}
                />
              )}
            </AnimatePresence>

            <Play size={15} fill="currentColor" />
            Launch Interview Session
            <ArrowRight size={15} />
          </motion.button>
        </motion.div>

      </div>
    </div>
  );
}
