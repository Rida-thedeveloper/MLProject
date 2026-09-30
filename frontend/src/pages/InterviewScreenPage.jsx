import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Volume2, Mic, Square, ArrowLeft, ArrowRight,
  CheckCircle, AlertCircle, Award,
  Activity, MessageSquare, Zap, TrendingUp,
  BarChart2, Brain, AlignLeft, ChevronRight,
  Radio
} from 'lucide-react';
import ScrollStroke from '../components/ScrollStroke';
import { getQuestions } from '../data/questionBank';


/* ─── Waveform bars (animated while recording) ─────────────── */
function WaveformBars({ active }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 32 }}>
      {[0.4, 0.7, 1, 0.8, 0.5, 0.9, 0.6, 1, 0.75, 0.45, 0.85, 0.6].map((h, i) => (
        <motion.div
          key={i}
          animate={active ? {
            scaleY: [h, h * 0.4 + 0.1, h * 1.2, h * 0.6, h],
            opacity: [0.6, 1, 0.8, 1, 0.6],
          } : { scaleY: 0.15, opacity: 0.25 }}
          transition={active ? {
            duration: 0.8 + i * 0.07,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.06,
          } : { duration: 0.4 }}
          style={{
            width: 3,
            height: 28,
            borderRadius: 99,
            background: active
              ? `rgba(212,106,106,${0.5 + h * 0.5})`
              : 'rgba(255,255,255,0.12)',
            transformOrigin: 'center',
          }}
        />
      ))}
    </div>
  );
}

/* ─── Metric tile ───────────────────────────────────────────── */
function MetricTile({ label, value, sub, color, icon: Icon }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12,
        padding: '16px 18px',
        display: 'flex', flexDirection: 'column', gap: 8,
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Color accent top line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, ${color}aa, transparent)`,
      }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: 9, fontFamily: "'DM Mono', monospace",
          letterSpacing: '0.16em', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.3)',
        }}>
          {label}
        </span>
        {Icon && <Icon size={12} color={color} style={{ opacity: 0.7 }} />}
      </div>
      <div style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 28, fontWeight: 800, color,
        lineHeight: 1, letterSpacing: '-0.02em',
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 10, color: 'rgba(255,255,255,0.28)',
        fontFamily: "'DM Mono', monospace",
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {sub}
      </div>
    </motion.div>
  );
}

/* ─── Probability bar row ────────────────────────────────────── */
function ProbBar({ label, value, color }) {
  const pct = value != null ? Math.round(value * 100) : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{
          fontSize: 10, fontFamily: "'DM Mono', monospace",
          letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.35)',
        }}>
          {label}
        </span>
        <span style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 15, fontWeight: 700, color,
        }}>
          {pct}%
        </span>
      </div>
      <div style={{
        height: 4, borderRadius: 99,
        background: 'rgba(255,255,255,0.06)',
        overflow: 'hidden',
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          style={{ height: '100%', borderRadius: 99, background: color }}
        />
      </div>
    </div>
  );
}

/* ─── Speech Analysis Panel ─────────────────────────────────── */
function SpeechAnalysisPanel({ features, transcript, hesitation, feedback, relevance, isLoading, error }) {
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ marginTop: 28 }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
          paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          >
            <Activity size={14} color="#c9a84c" />
          </motion.div>
          <span style={{
            fontFamily: "'DM Mono', monospace", fontSize: 10,
            letterSpacing: '0.2em', textTransform: 'uppercase',
            color: 'rgba(201,168,76,0.7)',
          }}>
            Analyzing Speech
          </span>
          <div style={{ display: 'flex', gap: 3, marginLeft: 4 }}>
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                style={{ width: 4, height: 4, borderRadius: '50%', background: '#c9a84c' }}
              />
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
          {[0.1, 0.2, 0.3, 0.15, 0.25, 0.35].map((d, i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: d }}
              style={{
                height: 88, borderRadius: 12,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            />
          ))}
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          marginTop: 20,
          background: 'rgba(212,106,106,0.06)',
          border: '1px solid rgba(212,106,106,0.2)',
          borderRadius: 12, padding: '14px 18px',
          display: 'flex', gap: 12,
        }}
      >
        <AlertCircle size={15} color="#d46a6a" style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#d46a6a', margin: '0 0 3px' }}>Analysis Failed</p>
          <p style={{ fontSize: 12, color: 'rgba(212,106,106,0.6)', margin: 0 }}>{error}</p>
        </div>
      </motion.div>
    );
  }

  if (!features) return null;

  const isSilent = features.is_silent || hesitation?.is_silent || hesitation?.prediction === 'No Speech Detected';
  const silencePct = features.silence_ratio != null ? `${(features.silence_ratio * 100).toFixed(1)}%` : '—';

  const metrics = [
    { label: 'Speaking Rate', value: isSilent ? '0' : (features.wpm ?? '—'), sub: 'words / min', color: '#c9a84c', icon: TrendingUp },
    { label: 'Pause Count', value: features.pause_count ?? '—', sub: 'detected pauses', color: '#7ab8e8', icon: BarChart2 },
    { label: 'Avg Pause', value: features.average_pause != null ? `${features.average_pause}s` : '—', sub: 'per silence', color: '#3db8a0', icon: Activity },
    { label: 'Silence Ratio', value: silencePct, sub: 'of total recording', color: '#e89050', icon: Radio },
    { label: 'Filler Words', value: isSilent ? '0' : (features.filler_count ?? '—'), sub: features.fillers?.length ? features.fillers.join(', ') : 'none detected', color: '#d46a6a', icon: MessageSquare },
    { label: 'Repetitions', value: isSilent ? '0' : (features.repetition_count ?? '—'), sub: features.repeated_items?.length ? `"${features.repeated_items[0]}"…` : 'none detected', color: '#b07ae8', icon: Zap },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ marginTop: 28, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Silence Warning Banner if user was quiet */}
      {isSilent && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'rgba(212,106,106,0.08)',
            border: '1px solid rgba(212,106,106,0.25)',
            borderRadius: 12, padding: '12px 16px', marginBottom: 18,
            display: 'flex', alignItems: 'center', gap: 10
          }}
        >
          <AlertCircle size={16} color="#d46a6a" />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#f09090', fontFamily: "'DM Sans', sans-serif" }}>
            No Speech Detected: Microphone recorded silence or un-audible audio.
          </span>
        </motion.div>
      )}

      {/* Answer Relevance Card */}
      {relevance && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={{
            background: relevance.score >= 75 ? 'rgba(61,184,160,0.06)' : (relevance.score >= 40 ? 'rgba(201,168,76,0.06)' : 'rgba(212,106,106,0.06)'),
            border: `1px solid ${relevance.score >= 75 ? 'rgba(61,184,160,0.25)' : (relevance.score >= 40 ? 'rgba(201,168,76,0.25)' : 'rgba(212,106,106,0.25)')}`,
            borderRadius: 14, padding: '16px 20px', marginBottom: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Award size={18} color={relevance.score >= 75 ? '#3db8a0' : (relevance.score >= 40 ? '#c9a84c' : '#d46a6a')} />
            <div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>
                Answer Relevance
              </div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: '#fff' }}>
                {relevance.label || (relevance.score >= 75 ? 'Highly Relevant' : (relevance.score >= 40 ? 'Moderately Relevant' : 'Off-Topic / Low Relevance'))}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 800, color: relevance.score >= 75 ? '#3db8a0' : (relevance.score >= 40 ? '#c9a84c' : '#d46a6a') }}>
              {relevance.score}%
            </span>
          </div>
        </motion.div>
      )}

      {/* Suggested Ideal Answer Card */}
      {relevance?.ideal_answer && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            background: 'rgba(201,168,76,0.05)',
            border: '1px solid rgba(201,168,76,0.25)',
            borderRadius: 14, padding: '16px 20px', marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Zap size={15} color="#c9a84c" />
            <span style={{
              fontFamily: "'DM Mono', monospace", fontSize: 10,
              letterSpacing: '0.16em', textTransform: 'uppercase',
              color: '#c9a84c', fontWeight: 700,
            }}>
              Suggested Ideal Answer
            </span>
          </div>
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13, fontWeight: 500,
            color: 'rgba(255,255,255,0.85)',
            lineHeight: 1.6, margin: 0,
          }}>
            {relevance.ideal_answer}
          </p>
        </motion.div>
      )}

      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: 'rgba(201,168,76,0.1)',
          border: '1px solid rgba(201,168,76,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Activity size={13} color="#c9a84c" />
        </div>
        <span style={{
          fontFamily: "'DM Mono', monospace", fontSize: 10,
          letterSpacing: '0.2em', textTransform: 'uppercase',
          color: 'rgba(201,168,76,0.8)',
        }}>
          Speech Analysis
        </span>
      </div>

      {/* Metrics grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 20 }}>
        {metrics.map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <MetricTile {...m} />
          </motion.div>
        ))}
      </div>

      {/* Hesitation model */}
      {hesitation && !hesitation.error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 14, padding: '20px 22px', marginBottom: 14,
            position: 'relative', overflow: 'hidden',
          }}
        >
          {/* Gold top accent */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.4), transparent)',
          }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Brain size={13} color="#c9a84c" />
              <span style={{
                fontFamily: "'DM Mono', monospace", fontSize: 10,
                letterSpacing: '0.18em', textTransform: 'uppercase',
                color: 'rgba(201,168,76,0.7)',
              }}>
                Hesitation Model
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                fontFamily: "'DM Mono', monospace", fontSize: 9,
                color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em',
              }}>
                RF v2
              </span>
              {hesitation.prediction && (
                <span style={{
                  padding: '3px 10px', borderRadius: 999,
                  background: isSilent ? 'rgba(212,106,106,0.1)' : 'rgba(201,168,76,0.1)',
                  border: `1px solid ${isSilent ? 'rgba(212,106,106,0.25)' : 'rgba(201,168,76,0.25)'}`,
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 10, fontWeight: 600, color: isSilent ? '#d46a6a' : '#c9a84c',
                  letterSpacing: '0.08em',
                }}>
                  {hesitation.prediction}
                </span>
              )}
            </div>
          </div>

          {hesitation.probabilities && !isSilent && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <ProbBar label="Low" value={hesitation.probabilities['Low']} color="#3db8a0" />
              <ProbBar label="Medium" value={hesitation.probabilities['Medium']} color="#e8c96a" />
              <ProbBar label="High" value={hesitation.probabilities['High']} color="#d46a6a" />
            </div>
          )}
        </motion.div>
      )}

      {/* Feedback */}
      {feedback?.summary && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          style={{
            background: 'rgba(61,184,160,0.04)',
            border: '1px solid rgba(61,184,160,0.15)',
            borderRadius: 14, padding: '20px 22px', marginBottom: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <MessageSquare size={13} color="#3db8a0" />
            <span style={{
              fontFamily: "'DM Mono', monospace", fontSize: 10,
              letterSpacing: '0.18em', textTransform: 'uppercase',
              color: 'rgba(61,184,160,0.8)',
            }}>
              Feedback
            </span>
          </div>
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13, fontWeight: 500,
            color: 'rgba(255,255,255,0.75)',
            lineHeight: 1.7, marginBottom: 14,
          }}>
            {feedback.summary}
          </p>
          {feedback.suggestions?.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {feedback.suggestions.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <ChevronRight size={13} color="#3db8a0" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{
                    fontSize: 12, fontFamily: "'DM Sans', sans-serif",
                    color: 'rgba(255,255,255,0.45)', lineHeight: 1.6,
                  }}>
                    {s}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Transcript */}
      {transcript && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12, padding: '16px 18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <AlignLeft size={11} color="rgba(255,255,255,0.25)" />
            <span style={{
              fontFamily: "'DM Mono', monospace", fontSize: 9,
              letterSpacing: '0.18em', textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.25)',
            }}>
              Transcript
            </span>
          </div>
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13, color: 'rgba(255,255,255,0.38)',
            fontStyle: 'italic', lineHeight: 1.7, margin: 0,
          }}>
            "{transcript}"
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────── */
export default function InterviewScreenPage({
  setCurrentPage, interviewSetup, recordedAnswers, setRecordedAnswers,
  setSelectedAnswerIdx, selectedAnswerIdx,
}) {

  const [questions, setQuestions] = useState(() => getQuestions(interviewSetup));
  const sessionIdRef = useRef(interviewSetup?.sessionId);

  const [currentIdx, setCurrentIdx] = useState(selectedAnswerIdx ?? 0);
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const spokenIdxRef = useRef(-1);

  // Sync questions if sessionId changes or questionCount changes
  useEffect(() => {
    if (
      interviewSetup?.sessionId !== sessionIdRef.current ||
      questions.length !== (interviewSetup?.questionCount || 5)
    ) {
      sessionIdRef.current = interviewSetup?.sessionId;
      const fresh = getQuestions(interviewSetup);
      setQuestions(fresh);
      setCurrentIdx(0);
      spokenIdxRef.current = -1;
    }
  }, [interviewSetup]);

  const currentAnswer = recordedAnswers[currentIdx];
  const progress = ((currentIdx + 1) / questions.length) * 100;
  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const handlePlayQuestion = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(questions[currentIdx]);
    u.rate = 0.95;
    u.onstart = () => setIsSpeaking(true);
    u.onend = () => setIsSpeaking(false);
    u.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(u);
  };

  useEffect(() => {
    let tid;
    if (spokenIdxRef.current !== currentIdx) {
      if (!recordedAnswers[currentIdx]?.transcript) {
        tid = setTimeout(() => {
          handlePlayQuestion();
          spokenIdxRef.current = currentIdx;
        }, 500);
      } else {
        spokenIdxRef.current = currentIdx;
      }
    }
    return () => { if (tid) clearTimeout(tid); };
  }, [currentIdx]);

  const startRecording = async () => {
    setErrorMsg('');
    audioChunksRef.current = [];
    try {
      // ── Explicit audio constraints force the browser to select the default
      //    Communication microphone rather than silent 'Stereo Mix' devices.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false
      });

      // ── Diagnostics: verify we actually have a live audio track ──────────
      const audioTracks = stream.getAudioTracks();
      console.log('[Recording] Audio tracks:', audioTracks.length);
      if (audioTracks.length > 0) {
        console.log('[Recording] Track label:', audioTracks[0].label);
        console.log('[Recording] Track enabled:', audioTracks[0].enabled);
        console.log('[Recording] Track readyState:', audioTracks[0].readyState);
      }

      // ── Pick an audio-only mimeType so the browser doesn't default to
      //    video/webm (vp8+opus) which produces a container mismatch when
      //    the Blob is later relabelled as audio/webm ──────────────────────
      const preferredTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/ogg',
        'audio/mp4', // Fallback for Safari
      ];
      const mimeType = preferredTypes.find(t => MediaRecorder.isTypeSupported(t)) || '';
      console.log('[Recording] Selected mimeType:', mimeType || '(browser default)');

      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      console.log('[Recording] MediaRecorder.mimeType:', mr.mimeType);
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data?.size > 0) {
          audioChunksRef.current.push(e.data);
          console.log('[Recording] Chunk received:', e.data.size, 'bytes | total chunks:', audioChunksRef.current.length);
        }
      };

      mr.onstop = () => {
        const chunks = audioChunksRef.current;
        console.log('[Recording] Stop fired | chunks collected:', chunks.length);

        // Use the recorder's actual mimeType for the Blob — never hardcode
        // 'audio/webm' when the recorder may have used a different container.
        const blobType = mr.mimeType || 'audio/webm';
        const blob = new Blob(chunks, { type: blobType });
        console.log('[Recording] Final Blob size:', blob.size, 'bytes | type:', blob.type);

        if (blob.size < 1000) {
          console.warn('[Recording] WARNING: Blob is very small — recording may be silent or empty.');
        }

        setRecordedAnswers(prev => ({
          ...prev,
          [currentIdx]: {
            blob,
            url: URL.createObjectURL(blob),
            duration: timer,
            timestamp: new Date().toLocaleTimeString(),
            isAnalyzing: false, analyzeError: null, transcript: null, features: null,
          },
        }));
        stream.getTracks().forEach(t => t.stop());
      };

      // ── Use a 250 ms timeslice so audio data is flushed periodically.
      //    Without a timeslice, ondataavailable fires only once on stop and
      //    some browser/OS combinations flush silence if the pipeline isn't
      //    fully primed before the single flush occurs. ─────────────────────
      mr.start(250);
      setIsRecording(true);
      setTimer(0);
      timerIntervalRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    } catch (err) {
      console.error('[Recording] getUserMedia error:', err);
      setErrorMsg('Microphone permission denied or device not found.');
    }
  };



  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerIntervalRef.current);
    }
  };

  useEffect(() => { if (isRecording) stopRecording(); setTimer(0); setErrorMsg(''); }, [currentIdx]);
  useEffect(() => () => {
    clearInterval(timerIntervalRef.current);
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop();
  }, []);

  const handleSubmitAnswer = async () => {
    if (!currentAnswer?.blob || currentAnswer.isAnalyzing) return;
    setRecordedAnswers(prev => ({ ...prev, [currentIdx]: { ...prev[currentIdx], isAnalyzing: true, analyzeError: null } }));
    try {
      const fd = new FormData();
      fd.append('audio', currentAnswer.blob, 'recording.webm');
      fd.append('question', questions[currentIdx]);
      const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
      const res = await fetch(`${API_BASE}/api/analyze`, { method: 'POST', body: fd });
      if (!res.ok) { const e = await res.json().catch(() => { }); throw new Error(e?.detail || `Error ${res.status}`); }
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Analysis failed');
      setRecordedAnswers(prev => ({
        ...prev,
        [currentIdx]: { ...prev[currentIdx], transcript: data.transcript, features: data.features, hesitation: data.hesitation, feedback: data.feedback, relevance: data.relevance, isAnalyzing: false, analyzeError: null },
      }));
    } catch (err) {
      setRecordedAnswers(prev => ({
        ...prev,
        [currentIdx]: { ...prev[currentIdx], isAnalyzing: false, analyzeError: err.message || `Could not reach backend at ${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}` },
      }));
    }
  };

  const hasResult = currentAnswer?.transcript != null || currentAnswer?.features != null;

  return (
    <div style={{ position: 'relative', minHeight: '100vh', isolation: 'isolate' }}>
      <ScrollStroke
        filterId="interview"
        viewBox="0 0 1200 2400"
        path="M1100,0 C1080,100 1060,160 1080,260 C1100,360 1140,420 1120,520 C1100,620 1040,660 1040,760 C1040,860 1100,920 1080,1020 C1060,1120 1000,1160 980,1260 C960,1360 1000,1440 980,1540 C960,1640 900,1680 880,1780 C860,1880 900,1960 880,2060 C860,2160 800,2200 800,2300 C800,2380 820,2400 820,2400"
        color="rgba(80,200,220,0.4)"
        glowColor="rgba(80,200,220,0.15)"
        dotColor="#50C8DC"
        strokeWidth={2.5}
        side="right"
        scrollRange={[0, 0.88]}
      />

      <div style={{
        maxWidth: 1180, margin: '0 auto',
        padding: '28px 24px 60px',
        display: 'flex', gap: 22, flexWrap: 'wrap',
        position: 'relative', zIndex: 2,
      }}>

        {/* ══ LEFT COLUMN ══════════════════════════════════════════ */}
        <div style={{ flex: '1 1 520px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* ── Top status bar ── */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 12, padding: '12px 18px',
            }}
          >
            <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 15, fontWeight: 700, fontStyle: 'italic',
                color: 'var(--text-primary)', whiteSpace: 'nowrap',
              }}>
                {interviewSetup?.role || 'Interview'}
              </span>
              <span style={{
                padding: '2px 9px', borderRadius: 999,
                background: 'rgba(201,168,76,0.08)',
                border: '1px solid rgba(201,168,76,0.18)',
                fontFamily: "'DM Mono', monospace",
                fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
                color: 'rgba(201,168,76,0.7)', whiteSpace: 'nowrap',
              }}>
                {interviewSetup?.difficulty}
              </span>
              <span style={{
                padding: '2px 9px', borderRadius: 999,
                background: 'rgba(61,184,160,0.08)',
                border: '1px solid rgba(61,184,160,0.18)',
                fontFamily: "'DM Mono', monospace",
                fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
                color: 'rgba(61,184,160,0.7)', whiteSpace: 'nowrap',
              }}>
                {interviewSetup?.type}
              </span>
            </div>

            {/* Progress */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <span style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 11, color: 'rgba(255,255,255,0.3)',
                whiteSpace: 'nowrap',
              }}>
                {currentIdx + 1} / {questions.length}
              </span>
              <div style={{
                width: 80, height: 3, borderRadius: 99,
                background: 'rgba(255,255,255,0.07)', overflow: 'hidden',
              }}>
                <motion.div
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  style={{
                    height: '100%', borderRadius: 99,
                    background: 'linear-gradient(90deg, #c9a84c, #e8c96a)',
                  }}
                />
              </div>
            </div>
          </motion.div>

          {/* ── Question card ── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIdx}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 18, padding: '32px 28px',
                position: 'relative', overflow: 'hidden',
              }}
            >
              {/* Subtle top glow */}
              <div style={{
                position: 'absolute', top: 0, left: '50%',
                transform: 'translateX(-50%)',
                width: '70%', height: 120,
                background: 'radial-gradient(ellipse at top, rgba(201,168,76,0.06) 0%, transparent 70%)',
                pointerEvents: 'none',
              }} />

              {/* Question header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 14 }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  padding: '4px 12px', borderRadius: 999,
                  background: 'rgba(201,168,76,0.08)',
                  border: '1px solid rgba(201,168,76,0.2)',
                }}>
                  <span style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase',
                    color: 'rgba(201,168,76,0.8)',
                  }}>
                    Question {currentIdx + 1}
                  </span>
                </div>

                <motion.button
                  onClick={handlePlayQuestion}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '7px 14px', borderRadius: 8,
                    background: isSpeaking ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${isSpeaking ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    color: isSpeaking ? '#c9a84c' : 'rgba(255,255,255,0.4)',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 12, fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <Volume2 size={12} />
                  {isSpeaking ? 'Playing…' : 'Play Aloud'}
                </motion.button>
              </div>

              {/* Question text */}
              <div style={{
                borderLeft: '2px solid rgba(201,168,76,0.35)',
                paddingLeft: 20, marginBottom: 30,
              }}>
                <p style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 'clamp(18px, 2.5vw, 24px)',
                  fontWeight: 700, fontStyle: 'italic',
                  color: '#f0ede8',
                  lineHeight: 1.45, margin: 0,
                  letterSpacing: '-0.01em',
                }}>
                  "{questions[currentIdx]}"
                </p>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', marginBottom: 26 }} />

              {/* Response label */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.25)',
                }}>
                  Your Response
                </span>
                {currentAnswer && !isRecording && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 10, color: '#3db8a0',
                    }}
                  >
                    <CheckCircle size={10} />
                    {currentAnswer.duration}s captured
                  </motion.span>
                )}
              </div>

              {/* Error */}
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: 'rgba(212,106,106,0.07)',
                    border: '1px solid rgba(212,106,106,0.2)',
                    borderRadius: 10, padding: '10px 14px',
                    display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14,
                  }}
                >
                  <AlertCircle size={13} color="#d46a6a" />
                  <span style={{ fontSize: 12, color: '#d46a6a', fontFamily: "'DM Sans', sans-serif" }}>
                    {errorMsg}
                  </span>
                </motion.div>
              )}

              {/* ── Mic zone ── */}
              <div style={{
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: 16, padding: '36px 24px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22,
                position: 'relative', overflow: 'hidden',
              }}>
                <AnimatePresence mode="wait">
                  {isRecording ? (
                    <motion.div
                      key="recording"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, width: '100%' }}
                    >
                      {/* REC badge */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '5px 16px', borderRadius: 999,
                        background: 'rgba(212,106,106,0.1)',
                        border: '1px solid rgba(212,106,106,0.25)',
                      }}>
                        <motion.div
                          animate={{ opacity: [1, 0.2, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                          style={{ width: 7, height: 7, borderRadius: '50%', background: '#d46a6a' }}
                        />
                        <span style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: 11, fontWeight: 700,
                          color: '#d46a6a', letterSpacing: '0.12em',
                        }}>
                          REC &nbsp; {fmt(timer)}
                        </span>
                      </div>

                      {/* Waveform */}
                      <WaveformBars active={true} />

                      {/* Stop button */}
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <motion.div
                          animate={{ scale: [1, 1.12, 1], opacity: [0.3, 0.6, 0.3] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          style={{
                            position: 'absolute',
                            width: 100, height: 100, borderRadius: '50%',
                            background: 'radial-gradient(circle, rgba(212,106,106,0.12), transparent)',
                          }}
                        />
                        <motion.button
                          onClick={stopRecording}
                          whileHover={{ scale: 1.08 }}
                          whileTap={{ scale: 0.93 }}
                          style={{
                            width: 68, height: 68, borderRadius: '50%',
                            background: 'rgba(212,106,106,0.12)',
                            border: '1.5px solid rgba(212,106,106,0.4)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: '#ff9090',
                            position: 'relative', zIndex: 1,
                          }}
                        >
                          <Square size={20} fill="#ff9090" strokeWidth={0} />
                        </motion.button>
                      </div>

                      <span style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: 10, letterSpacing: '0.12em',
                        color: 'rgba(255,255,255,0.2)',
                      }}>
                        Click to stop recording
                      </span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="idle"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}
                    >
                      {/* Idle waveform */}
                      <WaveformBars active={false} />

                      {/* Mic button */}
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <motion.div
                          animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.3, 0.15] }}
                          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                          style={{
                            position: 'absolute',
                            width: 110, height: 110, borderRadius: '50%',
                            background: 'radial-gradient(circle, rgba(56,189,248,0.15), transparent)',
                          }}
                        />
                        <motion.div
                          animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.5, 0.3] }}
                          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
                          style={{
                            position: 'absolute',
                            width: 82, height: 82, borderRadius: '50%',
                            border: '1px solid rgba(56,189,248,0.2)',
                          }}
                        />
                        <motion.button
                          onClick={startRecording}
                          whileHover={{ scale: 1.08, boxShadow: '0 0 30px rgba(56,189,248,0.2)' }}
                          whileTap={{ scale: 0.93 }}
                          style={{
                            width: 68, height: 68, borderRadius: '50%',
                            background: 'radial-gradient(circle at 35% 35%, rgba(56,189,248,0.18), rgba(0,93,255,0.08))',
                            border: '1.5px solid rgba(56,189,248,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#60c8ff', cursor: 'pointer', position: 'relative', zIndex: 1,
                          }}
                        >
                          <Mic size={24} />
                        </motion.button>
                      </div>

                      <div style={{ textAlign: 'center' }}>
                        <p style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.6)',
                          margin: '0 0 4px',
                        }}>
                          {currentAnswer ? 'Re-record Response' : 'Record Response'}
                        </p>
                        <p style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: 10, letterSpacing: '0.1em',
                          color: 'rgba(255,255,255,0.2)', margin: 0,
                        }}>
                          Click the microphone to begin
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Audio preview */}
                {currentAnswer && !isRecording && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      width: '100%', maxWidth: 420,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: 10, padding: '12px 14px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.2)',
                      }}>
                        Audio Preview
                      </span>
                      <span style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: 9, color: 'rgba(201,168,76,0.5)',
                      }}>
                        {currentAnswer.timestamp}
                      </span>
                    </div>
                    <audio controls src={currentAnswer.url} style={{ width: '100%', height: 32 }} />
                  </motion.div>
                )}
              </div>

              {/* ── Speech Analysis ── */}
              {currentAnswer && !isRecording && (
                <SpeechAnalysisPanel
                  features={currentAnswer.features}
                  transcript={currentAnswer.transcript}
                  hesitation={currentAnswer.hesitation}
                  feedback={currentAnswer.feedback}
                  relevance={currentAnswer.relevance}
                  isLoading={currentAnswer.isAnalyzing}
                  error={currentAnswer.analyzeError}
                />
              )}

              {/* ── Action buttons ── */}
              {currentAnswer && !isRecording && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22, flexWrap: 'wrap' }}
                >
                  {!hasResult && !currentAnswer.isAnalyzing && (
                    <motion.button
                      onClick={handleSubmitAnswer}
                      whileHover={{ y: -1, boxShadow: '0 8px 28px rgba(201,168,76,0.3)' }}
                      whileTap={{ scale: 0.97 }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '10px 22px', borderRadius: 10,
                        background: 'linear-gradient(135deg, #c9a84c, #a8843a)',
                        border: '1px solid rgba(201,168,76,0.4)',
                        color: '#0a0804',
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 13, fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 4px 20px rgba(201,168,76,0.2)',
                      }}
                    >
                      <Activity size={13} />
                      Analyze Answer
                    </motion.button>
                  )}
                  {hasResult && !currentAnswer.isAnalyzing && (
                    <motion.button
                      onClick={() => { setSelectedAnswerIdx(currentIdx); setCurrentPage('feedback'); }}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.97 }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '10px 22px', borderRadius: 10,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.7)',
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 13, fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <Award size={13} />
                      Full Feedback
                    </motion.button>
                  )}
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* ── Navigation ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
            <motion.button
              onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
              disabled={currentIdx === 0}
              whileHover={currentIdx > 0 ? { x: -2 } : {}}
              whileTap={currentIdx > 0 ? { scale: 0.96 } : {}}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 18px', borderRadius: 9,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                color: 'rgba(255,255,255,0.4)',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13, fontWeight: 500,
                cursor: currentIdx === 0 ? 'not-allowed' : 'pointer',
                opacity: currentIdx === 0 ? 0.3 : 1,
              }}
            >
              <ArrowLeft size={13} />
              Previous
            </motion.button>

            <span style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 10, letterSpacing: '0.12em',
              color: 'rgba(255,255,255,0.18)',
            }}>
              {currentIdx + 1} of {questions.length}
            </span>

            {currentIdx < questions.length - 1 ? (
              <motion.button
                onClick={() => setCurrentIdx(i => i + 1)}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.96 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '9px 18px', borderRadius: 9,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  color: 'rgba(255,255,255,0.5)',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13, fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Next <ArrowRight size={13} />
              </motion.button>
            ) : (
              <motion.button
                onClick={() => setCurrentPage('report')}
                whileHover={{ y: -1, boxShadow: '0 8px 28px rgba(201,168,76,0.3)' }}
                whileTap={{ scale: 0.97 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 20px', borderRadius: 10,
                  background: 'linear-gradient(135deg, #c9a84c, #a8843a)',
                  border: '1px solid rgba(201,168,76,0.4)',
                  color: '#0a0804',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13, fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(201,168,76,0.2)',
                }}
              >
                Finish &amp; View Report <Award size={13} />
              </motion.button>
            )}
          </div>
        </div>

        {/* ══ RIGHT SIDEBAR ═════════════════════════════════════════ */}
        <div className="interview-sidebar" style={{
          width: 268, flexShrink: 0,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16, padding: '22px 18px',
          maxHeight: 'calc(100vh - 100px)',
          position: 'sticky', top: 88,
          overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
          alignSelf: 'flex-start',
        }}>
          {/* Sidebar header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22 }}>
            <div style={{
              width: 26, height: 26, borderRadius: 7,
              background: 'rgba(201,168,76,0.08)',
              border: '1px solid rgba(201,168,76,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <MessageSquare size={12} color="#c9a84c" />
            </div>
            <span style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 14, fontWeight: 700, fontStyle: 'italic',
              color: 'rgba(255,255,255,0.7)',
            }}>
              Session Log
            </span>
          </div>

          {/* Question list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {questions.map((q, idx) => {
              const a = recordedAnswers[idx];
              const isActive = idx === currentIdx;
              const isDone = a?.transcript != null;
              const isVisited = idx <= currentIdx;

              return (
                <motion.div
                  key={idx}
                  initial={false}
                  animate={{
                    opacity: isVisited ? 1 : 0.35,
                  }}
                  onClick={() => isVisited && setCurrentIdx(idx)}
                  style={{
                    cursor: isVisited ? 'pointer' : 'default',
                    borderRadius: 10,
                    padding: '10px 12px',
                    background: isActive ? 'rgba(201,168,76,0.07)' : 'transparent',
                    border: `1px solid ${isActive ? 'rgba(201,168,76,0.2)' : 'transparent'}`,
                    transition: 'all 0.2s',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    {/* Number badge */}
                    <div style={{
                      width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                      background: isActive ? 'rgba(201,168,76,0.15)' : isDone ? 'rgba(61,184,160,0.1)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${isActive ? 'rgba(201,168,76,0.3)' : isDone ? 'rgba(61,184,160,0.25)' : 'rgba(255,255,255,0.08)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 8, fontWeight: 700,
                      fontFamily: "'DM Mono', monospace",
                      color: isActive ? '#c9a84c' : isDone ? '#3db8a0' : 'rgba(255,255,255,0.25)',
                    }}>
                      {isDone ? <CheckCircle size={10} /> : idx + 1}
                    </div>

                    <span style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
                      color: isActive ? 'rgba(201,168,76,0.7)' : 'rgba(255,255,255,0.2)',
                    }}>
                      Q{idx + 1}
                    </span>

                    {isActive && (
                      <motion.div
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        style={{
                          marginLeft: 'auto', width: 5, height: 5, borderRadius: '50%',
                          background: '#c9a84c',
                        }}
                      />
                    )}
                  </div>

                  <p style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 11,
                    color: isActive ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)',
                    lineHeight: 1.5, margin: 0,
                    paddingLeft: 28,
                  }}>
                    {q}
                  </p>

                  {a?.transcript && (
                    <p style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 9, color: 'rgba(61,184,160,0.5)',
                      fontStyle: 'italic', margin: '5px 0 0', paddingLeft: 28,
                    }}>
                      "{a.transcript}"
                    </p>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Progress summary */}
          <div style={{
            marginTop: 18, paddingTop: 16,
            borderTop: '1px solid rgba(255,255,255,0.05)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.2)',
              }}>
                Answered
              </span>
              <span style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 9, color: 'rgba(201,168,76,0.6)',
              }}>
                {questions.filter((_, idx) => recordedAnswers[idx]?.transcript).length} / {questions.length}
              </span>
            </div>
            <div style={{ height: 2, borderRadius: 99, background: 'rgba(255,255,255,0.05)' }}>
              <motion.div
                animate={{
                  width: `${(questions.filter((_, idx) => recordedAnswers[idx]?.transcript).length / questions.length) * 100}%`,
                }}
                transition={{ duration: 0.5 }}
                style={{
                  height: '100%', borderRadius: 99,
                  background: 'linear-gradient(90deg, #3db8a0, #6dd8c4)',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .interview-sidebar { position: static !important; max-height: none !important; width: 100% !important; }
        }
      `}</style>
    </div>
  );
}
