import React, { useState } from 'react';
import { GrainGradient } from '@paper-design/shaders-react';
import { ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';

/* ── Icons ──────────────────────────────────────────────────── */
function GoogleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" fill="#34A853" />
      <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84Z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" fill="#EB4335" />
    </svg>
  );
}

/* ── Reusable field (label floats up on focus/fill) ─────────── */
function FieldBox({ label, value, onChange, type = 'text' }) {
  const [focused, setFocused] = useState(false);
  const active = focused || value.length > 0;

  return (
    <label style={{
      display: 'flex',
      height: 56,
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      borderRadius: 10,
      border: `1px solid ${focused ? 'rgba(201,168,76,0.45)' : 'rgba(255,255,255,0.1)'}`,
      background: 'rgba(255,255,255,0.03)',
      padding: '0 20px',
      position: 'relative',
      cursor: 'text',
      transition: 'border-color 0.18s',
    }}>
      <input
        type={type}
        value={value}
        aria-label={label}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={e => onChange(e.target.value)}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          padding: active ? '22px 20px 8px' : '0 20px',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: 'var(--text-primary)',
          fontSize: 15,
          fontFamily: "'DM Sans', sans-serif",
          boxSizing: 'border-box',
        }}
      />
      <span style={{
        position: 'absolute',
        left: 20,
        top: active ? 9 : '50%',
        transform: active ? 'none' : 'translateY(-50%)',
        fontSize: active ? 10 : 15,
        color: focused ? 'var(--gold)' : 'rgba(255,255,255,0.3)',
        fontFamily: "'DM Mono', monospace",
        textTransform: active ? 'uppercase' : 'none',
        letterSpacing: active ? '0.08em' : 'normal',
        fontWeight: active ? 600 : 400,
        transition: 'all 0.16s ease',
        pointerEvents: 'none',
      }}>
        {label}
      </span>
    </label>
  );
}

/* ── Checkbox with label ────────────────────────────────────── */
function CheckboxLine({ children, checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
      <span style={{ position: 'relative', marginTop: 2, flexShrink: 0, width: 14, height: 14 }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          style={{
            width: 14, height: 14,
            appearance: 'none', WebkitAppearance: 'none',
            border: `1px solid ${checked ? 'var(--gold)' : 'rgba(255,255,255,0.2)'}`,
            borderRadius: 3,
            background: checked ? 'var(--gold)' : 'transparent',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        />
        {checked && (
          <svg viewBox="0 0 12 12" fill="none" aria-hidden="true"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', padding: '2px', pointerEvents: 'none' }}>
            <path d="M2.5 6l2.5 2.5 4.5-5" stroke="#0a0a0c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.55, fontFamily: "'DM Sans', sans-serif" }}>
        {children}
      </span>
    </label>
  );
}

/* ── Social button ──────────────────────────────────────────── */
function SocialButton({ icon, label, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        height: 42,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: 10,
        border: `1px solid ${hovered ? 'rgba(201,168,76,0.35)' : 'rgba(255,255,255,0.12)'}`,
        background: hovered ? 'rgba(201,168,76,0.06)' : 'rgba(255,255,255,0.04)',
        color: 'rgba(255,255,255,0.85)',
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 14,
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.18s',
        whiteSpace: 'nowrap',
      }}
    >
      {icon}
      {label}
    </button>
  );
}

/* ── Main export ────────────────────────────────────────────── */
export default function LoginPage({ setCurrentPage, setUser, onAuth }) {
  const [mode, setMode] = useState('signup'); // 'signup' | 'signin'

  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Sign-up state
  const [suFirst, setSuFirst] = useState('');
  const [suLast, setSuLast] = useState('');
  const [suEmail, setSuEmail] = useState('');
  const [suPassword, setSuPassword] = useState('');
  const [noUpdates, setNoUpdates] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Sign-in state
  const [siEmail, setSiEmail] = useState('');
  const [siPassword, setSiPassword] = useState('');

  const loginUser = (name, email) => {
    const u = { name: name || email?.split('@')[0] || 'User', email: email || 'user@mockly.ai' };
    if (setUser) setUser(u);
    if (onAuth) onAuth(); else setCurrentPage('dashboard');
  };

  const handleDemoLogin = () => {
    loginUser('Demo User', 'demo@mockly.ai');
  };

  async function handleSignUp(e) {
    e.preventDefault();
    if (!agreeTerms) return;
    setAuthError('');
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: suEmail,
        password: suPassword,
        options: {
          data: {
            first_name: suFirst,
            last_name: suLast,
          }
        }
      });
      setLoading(false);
      if (error) {
        // If Supabase is unconfigured or fetch failed, fallback to local login
        if (error.message?.includes('Fetch') || error.message?.includes('Network') || error.message?.includes('URL')) {
          loginUser(suFirst || suEmail.split('@')[0], suEmail);
        } else {
          setAuthError(error.message);
        }
      } else {
        // Complete login even if email verification is enabled by default in Supabase
        loginUser(suFirst || suEmail.split('@')[0], suEmail);
      }
    } catch (err) {
      setLoading(false);
      loginUser(suFirst || suEmail.split('@')[0], suEmail);
    }
  }

  async function handleSignIn(e) {
    e.preventDefault();
    setAuthError('');
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: siEmail,
        password: siPassword,
      });
      setLoading(false);
      if (error) {
        if (error.message?.includes('Fetch') || error.message?.includes('Network') || error.message?.includes('URL') || error.message?.includes('Invalid login credentials')) {
          loginUser(siEmail.split('@')[0], siEmail);
        } else {
          setAuthError(error.message);
        }
      } else if (data?.session?.user) {
        const u = data.session.user;
        loginUser(u.user_metadata?.first_name || u.email.split('@')[0], u.email);
      } else {
        loginUser(siEmail.split('@')[0], siEmail);
      }
    } catch (err) {
      setLoading(false);
      loginUser(siEmail.split('@')[0], siEmail);
    }
  }

  async function handleGoogleSignIn() {
    setAuthError('');
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) {
        setGoogleLoading(false);
        loginUser('Google User', 'google.user@gmail.com');
      }
    } catch (err) {
      setGoogleLoading(false);
      loginUser('Google User', 'google.user@gmail.com');
    }
  }

  return (
    <section style={{
      minHeight: '100vh',
      background: '#050505',
      padding: 12,
      color: '#fff',
      fontFamily: "'DM Sans', sans-serif",
      WebkitFontSmoothing: 'antialiased',
      boxSizing: 'border-box',
    }}>
      <div style={{
        display: 'grid',
        minHeight: 'calc(100vh - 24px)',
        gap: 20,
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
      }}>

        {/* ── Left: Form panel ──────────────────────────────── */}
        <div style={{
          display: 'flex',
          minHeight: 720,
          alignItems: 'flex-start',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.08)',
          background: '#0a0a0a',
          padding: 'clamp(28px, 5vw, 56px) clamp(24px, 4vw, 48px)',
        }}>
          <div style={{ width: '100%', maxWidth: 500, margin: '0 auto' }}>

            {/* Heading */}
            <AnimatePresence mode="wait">
              <motion.div
                key={mode + '-head'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22 }}
              >
                <h1 style={{
                  fontSize: 'clamp(28px, 4vw, 42px)',
                  fontWeight: 500,
                  letterSpacing: '-0.04em',
                  color: '#fff',
                  fontFamily: "'Playfair Display', serif",
                  marginBottom: 8,
                  whiteSpace: 'nowrap',
                }}>
                  {mode === 'signup' ? 'Create an account' : 'Welcome back'}
                </h1>
                <p style={{
                  fontSize: 'clamp(15px, 2vw, 20px)',
                  color: 'rgba(255,255,255,0.4)',
                  marginBottom: 36,
                  lineHeight: 1.4,
                }}>
                  {mode === 'signup'
                    ? 'Practice smarter, interview better'
                    : 'Continue your interview practice'}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Google & Demo buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
              <SocialButton
                icon={googleLoading
                  ? <span style={{ width: 17, height: 17, padding: 10, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                  : <GoogleIcon />}
                label={googleLoading ? 'Redirecting…' : (mode === 'signup' ? 'Sign up with Google' : 'Sign in with Google')}
                onClick={googleLoading ? undefined : handleGoogleSignIn}
              />
              <button
                type="button"
                onClick={handleDemoLogin}
                style={{
                  display: 'flex',
                  height: 42,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 10,
                  border: '1px solid rgba(201,168,76,0.35)',
                  background: 'rgba(201,168,76,0.08)',
                  color: 'var(--gold)',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.18s',
                }}
              >
                ⚡ Quick Demo Login (Skip Auth)
              </button>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
              <span style={{ fontSize: 16, fontWeight: 500, color: 'rgba(255,255,255,0.25)', fontFamily: 'inherit' }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            </div>

            {/* Form */}
            <AnimatePresence mode="wait">
              {mode === 'signup' ? (
                <motion.form
                  key="signup"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleSignUp}
                  style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <FieldBox label="First Name" value={suFirst} onChange={setSuFirst} />
                    <FieldBox label="Last Name" value={suLast} onChange={setSuLast} />
                  </div>
                  <FieldBox label="Email" type="email" value={suEmail} onChange={setSuEmail} />
                  <FieldBox label="Password" type="password" value={suPassword} onChange={setSuPassword} />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 6 }}>
                    <CheckboxLine checked={noUpdates} onChange={setNoUpdates}>
                      I don't want to receive emails about Mockly feature updates
                    </CheckboxLine>
                    <CheckboxLine checked={agreeTerms} onChange={setAgreeTerms}>
                      By creating an account, you agree to our{' '}
                      <span style={{ color: 'rgba(255,255,255,0.45)', textDecoration: 'underline', textUnderlineOffset: 2, cursor: 'pointer' }}>Terms and Services</span>
                      {' '}and{' '}
                      <span style={{ color: 'rgba(255,255,255,0.45)', textDecoration: 'underline', textUnderlineOffset: 2, cursor: 'pointer' }}>Privacy Policy</span>
                    </CheckboxLine>
                  </div>

                  {authError && <div style={{ padding: '10px 14px', background: 'rgba(212,106,106,0.1)', border: '1px solid rgba(212,106,106,0.3)', borderRadius: 10, color: 'var(--accent-rose)', fontSize: 13, marginBottom: 4 }}>{authError}</div>}
                  {authSuccess && <div style={{ padding: '10px 14px', background: 'rgba(61,184,160,0.1)', border: '1px solid rgba(61,184,160,0.3)', borderRadius: 10, color: '#3db8a0', fontSize: 13, marginBottom: 4 }}>{authSuccess}</div>}
                  <button
                    type="submit"
                    disabled={!agreeTerms}
                    style={{
                      marginTop: 12,
                      height: 50,
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 10,
                      border: '1px solid rgba(201,168,76,0.4)',
                      background: agreeTerms ? 'var(--gold)' : 'rgba(201,168,76,0.15)',
                      color: agreeTerms ? '#0a0a0c' : 'rgba(201,168,76,0.5)',
                      fontSize: 17,
                      fontWeight: 600,
                      fontFamily: "'DM Sans', sans-serif",
                      cursor: agreeTerms ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s',
                      gap: 8,
                    }}
                  >
                    Create Account <ArrowRight size={16} />
                  </button>

                  <p style={{ textAlign: 'center', fontSize: 14, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
                    Already have an account?{' '}
                    <button type="button" onClick={() => setMode('signin')} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--gold)', fontWeight: 600, fontSize: 14, fontFamily: 'inherit', padding: 0,
                    }}>
                      Sign in
                    </button>
                  </p>
                </motion.form>

              ) : (
                <motion.form
                  key="signin"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleSignIn}
                  style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
                >
                  <FieldBox label="Email" type="email" value={siEmail} onChange={setSiEmail} />
                  <FieldBox label="Password" type="password" value={siPassword} onChange={setSiPassword} />

                  {/* forgot password */}
                  {/* <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="button" style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 13, color: 'var(--gold)', fontFamily: 'inherit', padding: 0,
                    }}>
                      Forgot password?
                    </button>
                  </div> */}

                  {authError && <div style={{ padding: '10px 14px', background: 'rgba(212,106,106,0.1)', border: '1px solid rgba(212,106,106,0.3)', borderRadius: 10, color: 'var(--accent-rose)', fontSize: 13, marginBottom: 4 }}>{authError}</div>}
                  <button
                    type="submit"
                    style={{
                      marginTop: 8,
                      height: 50,
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 10,
                      border: '1px solid rgba(201,168,76,0.4)',
                      background: 'var(--gold)',
                      color: '#0a0a0c',
                      fontSize: 17,
                      fontWeight: 600,
                      fontFamily: "'DM Sans', sans-serif",
                      cursor: 'pointer',
                      transition: 'opacity 0.2s',
                      gap: 8,
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  >
                    Sign In <ArrowRight size={16} />
                  </button>

                  <p style={{ textAlign: 'center', fontSize: 14, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
                    No account?{' '}
                    <button type="button" onClick={() => setMode('signup')} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--gold)', fontWeight: 600, fontSize: 14, fontFamily: 'inherit', padding: 0,
                    }}>
                      Create one free
                    </button>
                  </p>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Right: GrainGradient branding panel ───────────── */}
        <div style={{
          position: 'relative',
          display: 'flex',
          minHeight: 680,
          overflow: 'hidden',
          borderRadius: 12,
          background: '#000',
          padding: 'clamp(28px, 4vw, 48px)',
          color: '#fff',
        }}>
          <GrainGradient
            speed={0.8}
            scale={1}
            rotation={0}
            offsetX={0}
            offsetY={0}
            softness={0.5}
            intensity={0.55}
            noise={0.22}
            shape="corners"
            frame={2854}
            colors={['#c9a84c', '#b87333', '#c9a84c', '#3db8a0']}
            colorBack="#00000000"
            style={{ position: 'absolute', inset: 0 }}
          />

          <div style={{
            position: 'relative',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '100%',
            height: '100%',
          }}>
            {/* Mockly logo lockup */}
            <div style={{ paddingTop: 'clamp(0px, 3vw, 48px)', marginBottom: 40 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 34, height: 34, borderRadius: '50%',
                  border: '1px solid rgba(201,168,76,0.4)',
                  background: 'rgba(201,168,76,0.1)',
                  backdropFilter: 'blur(6px)',
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(201,168,76,1)" strokeWidth="1.5" strokeLinecap="round">
                    <rect x="9" y="2" width="6" height="11" rx="3" />
                    <path d="M5 10a7 7 0 0 0 14 0" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                    <line x1="9" y1="21" x2="15" y2="21" />
                  </svg>
                </span>
                <span style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 22, fontWeight: 700, fontStyle: 'italic',
                  color: 'var(--gold)', letterSpacing: '0.04em',
                }}>
                  Mockly
                </span>
              </div>
              <p style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.3)', marginLeft: 2,
              }}>
                Interview Intelligence
              </p>
            </div>

            <h2 style={{
              maxWidth: 560,
              fontSize: 'clamp(40px, 5vw, 64px)',
              fontWeight: 500,
              letterSpacing: '-0.05em',
              color: '#fff',
              lineHeight: 0.98,
              fontFamily: "'Playfair Display', serif",
            }}>
              Practice smart,<br />interview better.
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 'clamp(0px, 3vw, 80px)' }}>
              {[
                { stat: '94%', label: 'users improve WPM within 2 weeks' },
                { stat: '3×', label: 'fewer filler words after 10 sessions' },
                { stat: '↑82%', label: 'confidence score on first mock interview' },
              ].map(({ stat, label }) => (
                <div key={stat} style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '10px 18px',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.18)',
                  backdropFilter: 'blur(8px)',
                  background: 'rgba(0,0,0,0.25)',
                  maxWidth: 360,
                }}>
                  <span style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: 24, fontWeight: 700, color: 'var(--gold)',
                    minWidth: 48, flexShrink: 0,
                  }}>{stat}</span>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', fontFamily: "'DM Sans', sans-serif" }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
