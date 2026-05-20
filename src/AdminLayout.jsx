import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient.js';
import DashboardPage from './pages/DashboardPage.jsx';
import ClientsPage from './pages/ClientsPage.jsx';
import ServicesPage from './pages/ServicesPage.jsx';
import CatalogPage from './pages/CatalogPage.jsx';
import CalendarPage from './pages/CalendarPage.jsx';
import CollectionsPage from './pages/CollectionsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Hoy',        icon: HomeIcon },
  { id: 'calendar',  label: 'Calendario', icon: CalIcon  },
  { id: 'clients',   label: 'Clientas',   icon: UserIcon },
  { id: 'services',  label: 'Servicios',  icon: ListIcon },
  { id: 'collections', label: 'Diseños',  icon: GridIcon },
  { id: 'settings',  label: 'Configuración', icon: CogIcon },
];

const STATUS_LABELS = { confirmed: 'Confirmado', pending: 'Pendiente', cancelled: 'Cancelado', completed: 'Completado' };
const STATUS_COLORS = { confirmed: '#4caf8a', pending: '#c8973a', cancelled: '#c0392b', completed: '#888' };

export default function AdminLayout({ onLogout, user }) {
  const [active, setActive] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);

  // ── Search state ──
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [searchClients, setSearchClients] = useState([]);
  const [searchApts,    setSearchApts]    = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const inputRef = useRef(null);

  // Open with ⌘K / Ctrl+K, close with Escape
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(o => !o); }
      if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Load data once when search opens
  useEffect(() => {
    if (!searchOpen) return;
    setSearchLoading(true);
    setTimeout(() => inputRef.current?.focus(), 50);
    Promise.all([
      supabase.from('profiles').select('id, full_name, email').eq('role', 'client').order('full_name'),
      supabase.from('appointments')
        .select('id, appointment_date, start_time, status, profiles(full_name), services(name)')
        .order('appointment_date', { ascending: false }).limit(200),
    ]).then(([{ data: c }, { data: a }]) => {
      setSearchClients(c || []);
      setSearchApts(a || []);
      setSearchLoading(false);
    });
  }, [searchOpen]);

  const q = searchQuery.toLowerCase().trim();
  const filteredClients = (q
    ? searchClients.filter(c => c.full_name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q))
    : searchClients
  ).slice(0, 5);

  const filteredApts = (q
    ? searchApts.filter(a =>
        a.profiles?.full_name?.toLowerCase().includes(q) ||
        a.services?.name?.toLowerCase().includes(q) ||
        a.appointment_date?.includes(q) ||
        a.start_time?.includes(q)
      )
    : searchApts
  ).slice(0, 5);

  const closeSearch = () => { setSearchOpen(false); setSearchQuery(''); };

  const pages = {
    dashboard:   <DashboardPage onNavigate={setActive} user={user} />,
    calendar:    <CalendarPage />,
    clients:     <ClientsPage />,
    services:    <ServicesPage />,
    catalog:     <CatalogPage />,
    collections: <CollectionsPage />,
    settings:    <SettingsPage />,
  };

  const firstName = user?.full_name?.trim().split(' ')[0] || 'Stefania';

  return (
    <div className="admin-shell">
      {/* ── Sidebar (desktop) ── */}
      <aside className="admin-sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-text">stefania<span>.</span></div>
          <div className="sidebar-logo-sub">NAILS · STUDIO</div>
        </div>

        <div className="sidebar-label">NAVEGACIÓN</div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => {
            const on = active === item.id;
            return (
              <button
                key={item.id}
                className={`sidebar-item ${on ? 'active' : ''}`}
                onClick={() => setActive(item.id)}
              >
                <item.icon />
                {item.label}
                {on && <span className="dot" />}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-avatar">{firstName.charAt(0)}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{user?.full_name || 'Stefania'}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>Admin · dueña</div>
          </div>
          <button
            onClick={onLogout}
            style={{ marginLeft: 'auto', color: 'var(--ink-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, display: 'grid', placeItems: 'center' }}
            title="Cerrar sesión"
          >
            <LogOutIcon />
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="admin-main">
        {/* Mobile header */}
        <div className="mobile-header">
          <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 20, color: 'var(--ink)' }}>
            stefania<span style={{ color: 'var(--accent)' }}>.</span>nails
          </div>
          <button
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--ink)', padding: 4 }}
            onClick={() => setMobileOpen(o => !o)}
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile nav overlay */}
        {mobileOpen && (
          <div
            style={{
              position: 'fixed', inset: 0, background: 'rgba(43,29,29,0.5)',
              zIndex: 300, display: 'flex',
            }}
            onClick={() => setMobileOpen(false)}
          >
            <div
              style={{
                width: 260, height: '100%', background: 'var(--surface)',
                padding: '24px 14px', display: 'flex', flexDirection: 'column',
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 24, color: 'var(--ink)', paddingLeft: 10, marginBottom: 28 }}>
                stefania<span style={{ color: 'var(--accent)' }}>.</span>
              </div>
              <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                {NAV_ITEMS.map(item => {
                  const on = active === item.id;
                  return (
                    <button
                      key={item.id}
                      className={`sidebar-item ${on ? 'active' : ''}`}
                      onClick={() => { setActive(item.id); setMobileOpen(false); }}
                    >
                      <item.icon />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
              <button
                onClick={onLogout}
                style={{
                  padding: '12px 16px', borderRadius: 12, background: 'var(--cream)',
                  color: 'var(--danger)', fontWeight: 600, fontSize: 14,
                  border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
                }}
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        )}

        {/* Admin topbar (desktop) */}
        <div className="admin-topbar">
          <button
            onClick={() => setSearchOpen(true)}
            className="admin-topbar-search"
            style={{ cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
          >
            <SearchIcon />
            <span style={{ color: 'var(--ink-muted)', fontSize: 13 }}>Buscar clienta, turno…</span>
            <span style={{ marginLeft: 'auto', fontSize: 10, padding: '2px 6px', border: '1px solid var(--line)', borderRadius: 5, color: 'var(--ink-dim)' }}>⌘K</span>
          </button>
          <button
            onClick={onLogout}
            style={{
              height: 38, padding: '0 14px', borderRadius: 99,
              background: 'transparent', border: '1px solid var(--line)',
              fontFamily: 'inherit', fontSize: 12.5, color: 'var(--ink-soft)', cursor: 'pointer',
            }}
          >
            Salir
          </button>
        </div>

        <div className="admin-content">
          {pages[active]}
        </div>
      </div>

      {/* ── Search modal ── */}
      {searchOpen && (
        <div
          onClick={closeSearch}
          style={{ position: 'fixed', inset: 0, background: 'rgba(43,29,29,0.45)', zIndex: 600, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '10vh' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 560, background: 'var(--surface)', borderRadius: 18, boxShadow: '0 24px 64px rgba(43,29,29,0.22)', overflow: 'hidden', margin: '0 16px' }}
          >
            {/* Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--line-soft)' }}>
              <SearchIcon />
              <input
                ref={inputRef}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar clienta, turno, servicio…"
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, background: 'transparent', fontFamily: 'inherit', color: 'var(--ink)' }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-muted)', fontSize: 20, lineHeight: 1, padding: 0 }}>×</button>
              )}
            </div>

            {/* Results */}
            <div style={{ maxHeight: 420, overflowY: 'auto' }}>
              {searchLoading ? (
                <div style={{ textAlign: 'center', padding: 28, color: 'var(--ink-muted)', fontSize: 13 }}>Cargando…</div>
              ) : (
                <>
                  {/* Clients */}
                  {filteredClients.length > 0 && (
                    <>
                      <div style={{ padding: '10px 18px 4px', fontSize: 10, letterSpacing: 1.2, fontWeight: 700, color: 'var(--ink-muted)' }}>CLIENTAS</div>
                      {filteredClients.map(c => (
                        <button key={c.id} onClick={() => { setActive('clients'); closeSearch(); }}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'background .1s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--cream)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18, color: 'var(--accent-deep)', flexShrink: 0 }}>
                            {c.full_name?.charAt(0) || '?'}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{c.full_name}</div>
                            {c.email && <div style={{ fontSize: 12, color: 'var(--ink-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</div>}
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--ink-dim)' }}>Ver clienta →</span>
                        </button>
                      ))}
                    </>
                  )}

                  {/* Appointments */}
                  {filteredApts.length > 0 && (
                    <>
                      <div style={{ padding: '10px 18px 4px', fontSize: 10, letterSpacing: 1.2, fontWeight: 700, color: 'var(--ink-muted)', marginTop: filteredClients.length ? 4 : 0 }}>TURNOS</div>
                      {filteredApts.map(a => (
                        <button key={a.id} onClick={() => { setActive('calendar'); closeSearch(); }}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--cream)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', lineHeight: 1 }}>
                              {new Date(a.appointment_date + 'T00:00').getDate()}
                            </div>
                            <div style={{ fontSize: 8, color: 'var(--ink-muted)', fontWeight: 700, letterSpacing: 0.5 }}>
                              {['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'][new Date(a.appointment_date + 'T00:00').getMonth()]}
                            </div>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{a.profiles?.full_name || 'Clienta'}</div>
                            <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{a.start_time?.slice(0,5)} hs · {a.services?.name || 'Servicio'}</div>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: STATUS_COLORS[a.status] || 'var(--ink-muted)', flexShrink: 0 }}>
                            {STATUS_LABELS[a.status] || a.status}
                          </span>
                        </button>
                      ))}
                    </>
                  )}

                  {filteredClients.length === 0 && filteredApts.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-muted)', fontSize: 13 }}>
                      {q ? `Sin resultados para "${searchQuery}"` : 'Escribí para buscar…'}
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={{ padding: '10px 18px', borderTop: '1px solid var(--line-soft)', display: 'flex', gap: 20, fontSize: 11, color: 'var(--ink-dim)' }}>
              <span>↩ abrir sección</span>
              <span>Esc cerrar</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Mini icons ── */
function HomeIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1v-9z"/></svg>; }
function CalIcon()  { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3.5" y="5.5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4" strokeLinecap="round"/></svg>; }
function UserIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6" strokeLinecap="round"/></svg>; }
function ListIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>; }
function GridIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>; }
function CogIcon()  { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" strokeLinejoin="round"/></svg>; }
function SearchIcon(){ return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/></svg>; }
function LogOutIcon(){ return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>; }
