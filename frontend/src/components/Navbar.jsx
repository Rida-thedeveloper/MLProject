import React, { useState } from 'react';
import { Mic, BarChart2, History, LayoutDashboard, Settings, LogIn, Award, Menu, X, LogOut } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function Navbar({ currentPage, setCurrentPage, user, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'setup', label: 'New Session', icon: Settings },
    { id: 'history', label: 'History', icon: History },
    { id: 'progress', label: 'Progress', icon: BarChart2 },
  ];

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'rgba(10,10,12,0.88)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>

          {/* Logo */}
          <button
            onClick={() => setCurrentPage('landing')}
            style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, rgba(201,168,76,0.15) 0%, rgba(201,168,76,0.05) 100%)',
              border: '1px solid rgba(201,168,76,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Mic size={16} color="var(--gold)" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 20, color: 'var(--text-primary)', lineHeight: 1 }}>
                Mockly
              </div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.12em', fontFamily: 'DM Mono, monospace', marginTop: 2 }}>
                AI INTERVIEW COACH
              </div>
            </div>
          </button>

          {/* Desktop Nav */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="desktop-nav">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '7px 14px', borderRadius: 8,
                    background: isActive ? 'rgba(201,168,76,0.1)' : 'transparent',
                    border: isActive ? '1px solid rgba(201,168,76,0.2)' : '1px solid transparent',
                    color: isActive ? 'var(--gold-light)' : 'var(--text-muted)',
                    fontSize: 13, fontWeight: 500, cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--surface-2)'; } }}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; } }}
                >
                  <Icon size={14} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {!user && (
              <button
                onClick={() => setCurrentPage('login')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 8,
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  transition: 'all 0.15s',
                  fontFamily: "'DM Sans', sans-serif",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)'; e.currentTarget.style.color = 'var(--gold)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                <LogIn size={13} />
                Sign In
              </button>
            )}

            <button
              onClick={() => setCurrentPage('setup')}
              className="btn-gold"
              style={{ padding: '8px 18px', fontSize: 13, borderRadius: 8 }}
            >
              <Mic size={13} />
              Start Interview
            </button>

            {user && (
              <button
                onClick={() => setCurrentPage('dashboard')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  borderRadius: 999, padding: '5px 12px 5px 5px',
                  cursor: 'pointer', transition: 'border-color 0.15s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(201,168,76,0.3), rgba(201,168,76,0.1))',
                  border: '1px solid rgba(201,168,76,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: 'var(--gold)',
                  fontFamily: 'DM Sans, sans-serif',
                }}>
                  {user.name.charAt(0)}
                </div>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>
                  {user.name.split(' ')[0]}
                </span>
              </button>
            )}

            {user && (
              <button
                onClick={async () => {
                  if (onLogout) {
                    await onLogout();
                  } else {
                    try { await supabase.auth.signOut(); } catch (e) {}
                    setCurrentPage('landing');
                  }
                }}
                title="Log Out"
                aria-label="Log Out"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 12px', borderRadius: 8,
                  background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: 'var(--text-secondary)',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  fontFamily: "'DM Sans', sans-serif",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = '#f87171';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.45)';
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.16)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                }}
              >
                <LogOut size={13} />
                <span style={{ fontSize: 12 }}>Logout</span>
              </button>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4 }}
              className="mobile-menu-toggle"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div style={{
          background: 'var(--charcoal)', borderTop: '1px solid var(--border)',
          padding: '12px 24px 16px',
        }}>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setCurrentPage(item.id); setMobileOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '10px 12px', borderRadius: 8,
                  background: isActive ? 'var(--gold-dim)' : 'transparent',
                  border: 'none', color: isActive ? 'var(--gold-light)' : 'var(--text-secondary)',
                  fontSize: 14, fontWeight: 500, cursor: 'pointer', marginBottom: 2,
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                <Icon size={15} />
                {item.label}
              </button>
            );
          })}

          {user && (
            <button
              onClick={async () => {
                setMobileOpen(false);
                if (onLogout) await onLogout();
                else {
                  try { await supabase.auth.signOut(); } catch (e) {}
                  setCurrentPage('landing');
                }
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '10px 12px', borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)', color: '#f87171',
                fontSize: 14, fontWeight: 500, cursor: 'pointer', marginTop: 10,
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              <LogOut size={15} />
              Logout ({user.name})
            </button>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-toggle { display: flex !important; }
        }
      `}</style>
    </header>
  );
}
