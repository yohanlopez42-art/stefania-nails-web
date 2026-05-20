import { useState, useEffect } from 'react';
import { SERVICES, formatPrice } from '../data.js';
import { Badge, Modal, Spinner } from '../components/UI.jsx';
import { supabase } from '../supabaseClient.js';

// ── Helpers ──────────────────────────────────────────────────
const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function getCalendarDays(year, month) {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const days  = [];
  // Sunday-start padding
  for (let i = 0; i < first.getDay(); i++) days.push(null);
  for (let i = 1; i <= last.getDate(); i++) {
    const d = new Date(year, month, i);
    days.push(d.toISOString().split('T')[0]);
  }
  while (days.length < 35) days.push(null);
  return days;
}

// bookedRanges = [{ startMins, endMins }] — computed from start_time + duration, never from DB end_time
function isTimeOverlapping(checkTime, durationMins, bookedRanges) {
  const [h, m] = checkTime.split(':').map(Number);
  const start  = h * 60 + m;
  const end    = start + durationMins; // Use actual service duration
  if (end > 20 * 60) return true;
  for (const r of bookedRanges) {
    if (start < r.endMins && end > r.startMins) return true;
  }
  return false;
}

function toRanges(rows) {
  return (rows || []).map(a => {
    const [h, m] = a.start_time.split(':').map(Number);
    const startMins = h * 60 + m;
    const [eh, em] = a.end_time.split(':').map(Number);
    const endMins = eh * 60 + em;
    return { startMins, endMins };
  });
}

function generateTimeSlots() {
  const slots = [];
  for (let h = 9; h < 20; h++) {
    slots.push(`${String(h).padStart(2,'0')}:00`);
    slots.push(`${String(h).padStart(2,'0')}:30`);
  }
  return slots;
}
const ALL_SLOTS = generateTimeSlots();

const fmtDateLong = (iso) => {
  const d = new Date(iso + 'T00:00');
  const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const days   = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  return `${days[d.getDay()]} ${d.getDate()} de ${months[d.getMonth()]}`;
};

// ── Nav config ────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'home',     label: 'Inicio',     Icon: HomeIcon     },
  { id: 'services', label: 'Servicios',  Icon: ListIcon     },
  { id: 'catalog',  label: 'Diseños',    Icon: GridIcon     },
  { id: 'history',  label: 'Mis turnos', Icon: CalendarIcon },
];

// ── Root ─────────────────────────────────────────────────────
export default function ClientView({ onLogout, user }) {
  const [active,       setActive]  = useState('home');
  const [bookingStep,  setStep]    = useState(0);
  const [bookingData,  setBooking] = useState({ service: null, date: '', time: '' });
  const [bookedRanges, setBusy]    = useState([]);
  const [loadingTimes, setLT]      = useState(false);
  const [dbServices,   setServices]= useState([]);
  const [clientApts,   setApts]    = useState([]);
  const [viewMonth,    setVMonth]  = useState(new Date().getMonth());
  const [viewYear,     setVYear]   = useState(new Date().getFullYear());
  const [menuOpen,     setMenu]    = useState(false);
  const [confirming,    setConfirming]   = useState(false);
  const [busyLoadError, setBusyLoadError] = useState(false);

  const calDays  = getCalendarDays(viewYear, viewMonth);
  const todayStr = new Date().toLocaleDateString('en-CA'); // Local YYYY-MM-DD

  const nextMonth = () => { if (viewMonth === 11) { setVMonth(0); setVYear(y => y+1); } else setVMonth(m => m+1); };
  const prevMonth = () => { if (viewMonth === 0)  { setVMonth(11); setVYear(y => y-1); } else setVMonth(m => m-1); };

  const fetchApts = async () => {
    if (!user) return;
    const { data } = await supabase.from('appointments')
      .select('*, services(name, duration_minutes)')
      .eq('client_id', user.id)
      .order('appointment_date', { ascending: false });
    if (data) {
      setApts(data.map(a => ({
        ...a,
        serviceName: a.services?.name || 'Servicio',
        duration:    a.services?.duration_minutes,
        date:        a.appointment_date,
        time:        a.start_time?.slice(0,5) || '',
        price:       a.total_price || 0,
      })));
    }
  };

  useEffect(() => { fetchApts(); }, [user]);

  useEffect(() => {
    supabase.from('services').select('*').eq('active', true)
      .then(({ data }) => setServices(data?.length ? data : SERVICES.filter(s => s.active)));
  }, []);

  useEffect(() => {
    if (!bookingData.date) return;
    setLT(true);
    setBusyLoadError(false);
    supabase.from('appointments')
      .select('start_time, end_time')
      .eq('appointment_date', bookingData.date)
      .in('status', ['confirmed', 'pending'])
      .then(({ data, error }) => {
        setBusy(error ? [] : toRanges(data));
        setBusyLoadError(!!error);
        setLT(false);
      });
  }, [bookingData.date]);

  const upcoming = clientApts.filter(a =>
    (a.status === 'confirmed' || a.status === 'pending') && a.date >= todayStr
  )[0];

  const startBooking = (svc = null) => {
    setBooking({ service: svc, date: '', time: '' });
    setStep(svc ? 2 : 1);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font-body)' }}>

      {/* ── Sticky header ── */}
      <header style={{
        background: 'rgba(251,243,238,0.94)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--line-soft)',
        position: 'sticky', top: 0, zIndex: 200,
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0 24px', height: 62,
          maxWidth: 1100, margin: '0 auto',
        }}>
          {/* Logo */}
          <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 22, color: 'var(--ink)', letterSpacing: -0.5, lineHeight: 1 }}>
            stefania<span style={{ color: 'var(--accent)' }}>.</span>nails
          </div>

          {/* Desktop nav */}
          <nav style={{ display: 'flex', gap: 2 }} className="hide-mobile">
            {NAV_ITEMS.map(n => (
              <button key={n.id} className={`nav-link ${active === n.id ? 'active' : ''}`} onClick={() => setActive(n.id)}>
                {n.label}
              </button>
            ))}
          </nav>

          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'radial-gradient(circle, var(--accent-soft), var(--cream))', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 17, color: 'var(--accent-deep)' }}>
              {(user?.full_name || 'C').charAt(0)}
            </div>
            <button className="hide-mobile" onClick={onLogout} style={{ height: 34, padding: '0 14px', borderRadius: 99, border: '1px solid var(--line)', background: 'transparent', fontFamily: 'inherit', fontSize: 12.5, color: 'var(--ink-muted)', cursor: 'pointer' }}>
              Salir
            </button>
            {/* Hamburger */}
            <button
              onClick={() => setMenu(o => !o)}
              style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--ink)', padding: 4 }}
              className="mobile-menu-btn"
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile full-screen menu */}
      {menuOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--surface)', zIndex: 250, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <button onClick={() => setMenu(false)} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', fontSize: 26, cursor: 'pointer', color: 'var(--ink)' }}>✕</button>
          {NAV_ITEMS.map(n => (
            <button key={n.id} onClick={() => { setActive(n.id); setMenu(false); }} style={{
              fontSize: 22, padding: '12px 40px', borderRadius: 99, border: 'none', fontFamily: 'var(--font-display)', cursor: 'pointer',
              background: active === n.id ? 'var(--cream)' : 'transparent',
              color: active === n.id ? 'var(--accent-deep)' : 'var(--ink)',
              fontStyle: active === n.id ? 'italic' : 'normal',
            }}>{n.label}</button>
          ))}
          <button onClick={onLogout} style={{ marginTop: 24, fontSize: 13, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            Cerrar sesión
          </button>
        </div>
      )}

      {/* ── Page content ── */}
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '36px 24px 110px' }}>
        {active === 'home'     && <HomeTab     upcoming={upcoming} user={user} onBook={() => startBooking()} onNavigate={setActive} />}
        {active === 'services' && <ServicesTab services={dbServices} onBook={startBooking} />}
        {active === 'catalog'  && <CatalogTab />}
        {active === 'history'  && <HistoryTab  appointments={clientApts} />}
      </main>

      {/* WhatsApp FAB */}
      <a
        href={`https://wa.me/2235323878?text=${encodeURIComponent(`¡Hola Stefania! Soy ${user?.full_name || 'una clienta'}. Te escribo desde tu web ✨`)}`}
        target="_blank" rel="noopener noreferrer"
        className="whatsapp-float"
      >
        <svg width="28" height="28" viewBox="0 0 32 32" fill="white" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 2C8.268 2 2 8.268 2 16c0 2.52.686 4.88 1.88 6.9L2 30l7.28-1.86A13.94 13.94 0 0 0 16 30c7.732 0 14-6.268 14-14S23.732 2 16 2zm0 25.5a11.44 11.44 0 0 1-5.83-1.59l-.42-.25-4.32 1.1 1.13-4.2-.27-.43A11.47 11.47 0 0 1 4.5 16C4.5 9.648 9.648 4.5 16 4.5S27.5 9.648 27.5 16 22.352 27.5 16 27.5zm6.29-8.56c-.34-.17-2.02-1-2.34-1.11-.31-.11-.54-.17-.77.17-.23.34-.88 1.11-1.08 1.34-.2.23-.4.26-.74.09-.34-.17-1.44-.53-2.74-1.69-1.01-.9-1.69-2.01-1.89-2.35-.2-.34-.02-.52.15-.69.15-.15.34-.4.51-.6.17-.2.23-.34.34-.57.11-.23.06-.43-.03-.6-.09-.17-.77-1.86-1.06-2.55-.28-.67-.56-.58-.77-.59-.2-.01-.43-.01-.66-.01-.23 0-.6.09-.91.43-.31.34-1.2 1.17-1.2 2.86s1.23 3.32 1.4 3.55c.17.23 2.42 3.69 5.86 5.18.82.35 1.46.56 1.96.72.82.26 1.57.22 2.16.13.66-.1 2.02-.83 2.31-1.63.28-.8.28-1.49.2-1.63-.09-.14-.32-.23-.66-.4z"/>
        </svg>
      </a>

      {/* Mobile bottom nav */}
      <nav className="bottom-nav">
        {NAV_ITEMS.map(n => (
          <button key={n.id} className={`bottom-nav-item ${active === n.id ? 'active' : ''}`} onClick={() => setActive(n.id)}>
            <n.Icon />
            <span className="bottom-nav-label">{n.label}</span>
          </button>
        ))}
      </nav>

      {/* ── Booking modal ── */}
      {bookingStep > 0 && (
        <Modal onClose={() => setStep(0)} title="" maxWidth={500}>

          {/* Step bar */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
            {[1,2,3].map(s => (
              <div key={s} style={{ flex: 1, height: 4, borderRadius: 99, background: bookingStep >= s ? 'var(--accent)' : 'var(--line)', transition: 'background .3s' }} />
            ))}
          </div>

          {/* Step 1 — Service */}
          {bookingStep === 1 && (
            <div className="pop-in">
              <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 30, color: 'var(--ink)', letterSpacing: -0.5, marginBottom: 4 }}>
                ¿Qué te hacés?
              </div>
              <p style={{ color: 'var(--ink-muted)', fontSize: 13.5, marginBottom: 20 }}>Elegí un servicio para comenzar.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '58vh', overflowY: 'auto', paddingRight: 2 }}>
                {dbServices.map(s => {
                  const on = bookingData.service?.id === s.id;
                  return (
                    <button key={s.id} onClick={() => { setBooking(b => ({...b, service: s})); setStep(2); }}
                      style={{
                        textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                        background: on ? 'var(--ink)' : 'var(--surface)',
                        color: on ? 'var(--bg)' : 'var(--ink)',
                        border: `1px solid ${on ? 'transparent' : 'var(--line-soft)'}`,
                        borderRadius: 16, padding: '14px 18px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        transition: 'all var(--t)',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600 }}>{s.name}</div>
                        <div style={{ fontSize: 12, color: on ? 'rgba(251,243,238,0.7)' : 'var(--ink-muted)', marginTop: 3 }}>
                          {s.duration_minutes || s.duration} min {s.category ? `· ${s.category}` : ''}
                        </div>
                      </div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: on ? 'var(--accent-soft)' : 'var(--accent-deep)', flexShrink: 0, marginLeft: 14 }}>
                        {formatPrice(s.price)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2 — Date + time */}
          {bookingStep === 2 && (
            <div className="pop-in">
              <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 30, color: 'var(--ink)', letterSpacing: -0.5, marginBottom: 4 }}>
                Elegí el día.
              </div>
              <p style={{ color: 'var(--ink-muted)', fontSize: 13.5, marginBottom: 20 }}>Domingo: cerrado.</p>

              {/* Month nav */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, color: 'var(--ink)' }}>
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={prevMonth} style={{ width: 32, height: 32, borderRadius: 99, border: '1px solid var(--line)', background: 'var(--surface)', cursor: 'pointer', color: 'var(--ink-soft)', fontSize: 14 }}>‹</button>
                  <button onClick={nextMonth} style={{ width: 32, height: 32, borderRadius: 99, border: '1px solid var(--line)', background: 'var(--surface)', cursor: 'pointer', color: 'var(--ink-soft)', fontSize: 14 }}>›</button>
                </div>
              </div>

              {/* Calendar */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, marginBottom: 18 }}>
                {['D','L','M','M','J','V','S'].map((d,i) => (
                  <div key={i} style={{ textAlign: 'center', fontSize: 9.5, fontWeight: 700, color: 'var(--ink-dim)', paddingBottom: 6 }}>{d}</div>
                ))}
                {calDays.map((fullDate, idx) => {
                  if (!fullDate) return <div key={`e${idx}`} />;
                  const on      = bookingData.date === fullDate;
                  const isToday = fullDate === todayStr;
                  const isPast  = fullDate < todayStr;
                  const isSun   = new Date(fullDate+'T00:00').getDay() === 0;
                  const off     = isPast || isSun;
                  return (
                    <button key={fullDate} disabled={off} onClick={() => !off && setBooking(b => ({...b, date: fullDate, time: ''}))}
                      style={{
                        aspectRatio: '1', borderRadius: 10, border: 'none', fontFamily: 'inherit',
                        background: on ? 'var(--accent)' : (isToday ? 'var(--cream)' : 'transparent'),
                        color: on ? '#fff' : (off ? 'var(--ink-dim)' : 'var(--ink)'),
                        fontWeight: on || isToday ? 700 : 400,
                        fontSize: 13, cursor: off ? 'not-allowed' : 'pointer',
                        opacity: off ? 0.38 : 1, transition: 'background var(--t)',
                      }}
                    >
                      {new Date(fullDate+'T00:00').getDate()}
                    </button>
                  );
                })}
              </div>

              {/* Time slots */}
              {bookingData.date && (
                <>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 10 }}>
                    Horarios · {fmtDateLong(bookingData.date)}
                  </div>
                  {loadingTimes ? <Spinner /> : busyLoadError ? (
                    <div style={{ padding: '14px 16px', background: 'rgba(184,101,112,0.10)', borderRadius: 12, fontSize: 13, color: 'var(--danger)', textAlign: 'center', lineHeight: 1.5 }}>
                      No se pudo cargar la disponibilidad.<br/>
                      <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>Contactá a Stefania por WhatsApp para reservar.</span>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 7 }}>
                      {ALL_SLOTS.map(t => {
                        const dur      = bookingData.service?.duration_minutes || bookingData.service?.duration || 90;
                        const [th, tm] = t.split(':').map(Number);
                        const nowMin   = bookingData.date === todayStr
                          ? new Date().getHours() * 60 + new Date().getMinutes() : -1;
                        const isPast   = bookingData.date < todayStr || (bookingData.date === todayStr && th * 60 + tm <= nowMin);
                        const taken    = isPast || isTimeOverlapping(t, dur, bookedRanges);
                        const on       = bookingData.time === t;
                        return (
                          <button key={t} disabled={taken} onClick={() => !taken && setBooking(b => ({...b, time: t}))}
                            className={taken ? "slot-taken" : ""}
                            style={{
                              height: 40, borderRadius: 10, fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
                              background: on ? 'var(--ink)' : (taken ? 'var(--bg-soft)' : 'var(--surface)'),
                              border: `1px solid ${on ? 'transparent' : 'var(--line-soft)'}`,
                              color: on ? 'var(--bg)' : (taken ? 'var(--ink-dim)' : 'var(--ink)'),
                              cursor: taken ? 'not-allowed' : 'pointer', opacity: taken ? 0.65 : 1,
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                          >
                            <span>{t}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {!busyLoadError && (
                    <div style={{ marginTop: 12, padding: '9px 13px', background: 'var(--cream)', borderRadius: 10, fontSize: 12, color: 'var(--accent-deep)', lineHeight: 1.4 }}>
                      Los horarios tachados ya están reservados.
                    </div>
                  )}
                </>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStep(1)}>Atrás</button>
                <button className="btn btn-primary" style={{ flex: 2 }} disabled={!bookingData.date || !bookingData.time || busyLoadError} onClick={() => setStep(3)}>
                  Continuar
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Confirm */}
          {bookingStep === 3 && (
            <div className="pop-in">
              <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 30, color: 'var(--ink)', letterSpacing: -0.5, marginBottom: 20 }}>
                Confirmá tu turno.
              </div>

              <div style={{ background: 'var(--cream)', borderRadius: 18, overflow: 'hidden', marginBottom: 16 }}>
                {[
                  ['Servicio', bookingData.service?.name],
                  ['Día',      fmtDateLong(bookingData.date)],
                  ['Horario',  bookingData.time + ' hs'],
                ].map(([k, v], i, arr) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 18px', borderBottom: i < arr.length - 1 ? '1px solid var(--line-soft)' : 'none' }}>
                    <span style={{ color: 'var(--ink-muted)', fontSize: 13 }}>{k}</span>
                    <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', textAlign: 'right', maxWidth: '65%' }}>{v}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: 'var(--surface)' }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>Total</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--accent-deep)', letterSpacing: -0.5 }}>
                    {formatPrice(bookingData.service?.price || 0)}
                  </span>
                </div>
              </div>

              <div style={{ padding: '11px 14px', background: 'rgba(184,101,112,0.08)', borderRadius: 12, fontSize: 12.5, color: 'var(--accent-deep)', lineHeight: 1.5, marginBottom: 20 }}>
                Tu reserva queda <strong>pendiente</strong> hasta que Stefania la confirme.
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStep(2)}>Atrás</button>
                <button className="btn btn-primary" style={{ flex: 2 }} disabled={confirming} onClick={async () => {
                  setConfirming(true);
                  try {
                    const dur = bookingData.service?.duration_minutes || bookingData.service?.duration || 90;
                    const [h, m] = bookingData.time.split(':').map(Number);
                    // ── CAPA 1: validación contra bookedRanges local (instantánea) ──
                    const [lh, lm] = bookingData.time.split(':').map(Number);
                    const lStart   = lh * 60 + lm;
                    const lEnd     = lStart + dur;
                    if (bookedRanges.length > 0 && bookedRanges.some(r => {
                      const aStart = r.startMins;
                      const aEnd   = r.endMins; 
                      return lStart < aEnd && lEnd > aStart;
                    })) {
                      setBooking(b => ({ ...b, time: '' }));
                      setStep(2);
                      alert('Ese horario ya fue tomado. Por favor elegí otro horario.');
                      return;
                    }

                    // ── CAPA 2: verificación fresca en DB antes del INSERT ──
                    const { data: dayApts, error: avErr } = await supabase
                      .from('appointments')
                      .select('start_time, end_time')
                      .eq('appointment_date', bookingData.date)
                      .in('status', ['confirmed', 'pending']);
                    if (avErr) throw new Error('No se pudo verificar disponibilidad. Intentá de nuevo.');
                    const [nh, nm] = bookingData.time.split(':').map(Number);
                    const nStart   = nh * 60 + nm;
                    const nEnd     = nStart + dur;
                    const blocked  = (dayApts || []).some(a => {
                      const [ah, am] = a.start_time.split(':').map(Number);
                      const aStart   = ah * 60 + am;
                      const [eh, em] = a.end_time.split(':').map(Number);
                      const aEnd     = eh * 60 + em;
                      return nStart < aEnd && nEnd > aStart;
                    });
                    if (blocked) {
                      setBusy(toRanges(dayApts));
                      setStep(2);
                      alert('Horario ya ocupado. Por favor elegí otro.');
                      return;
                    }
                    const total = nh * 60 + nm + dur;
                    const endStr = `${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}:00`;
                    const { error } = await supabase.from('appointments').insert({
                      client_id:        user.id,
                      service_id:       bookingData.service.id,
                      appointment_date: bookingData.date,
                      start_time:       `${bookingData.time}:00`,
                      end_time:         endStr,
                      status:           'pending',
                      total_price:      Number(bookingData.service.price),
                    });
                    if (error) throw error;
                    await fetchApts();
                    setStep(4);
                  } catch (err) {
                    const isOverlap = err.message?.toLowerCase().includes('ocupado') || 
                                      err.message?.toLowerCase().includes('overlap') || 
                                      err.message?.toLowerCase().includes('exclusion');
                    if (isOverlap) {
                      setBooking(b => ({ ...b, time: '' }));
                      supabase.from('appointments').select('start_time')
                        .eq('appointment_date', bookingData.date)
                        .in('status', ['confirmed', 'pending'])
                        .then(({ data }) => { if (data) setBusy(toRanges(data)); });
                      setStep(2);
                      alert('⚠ Ese horario ya está ocupado (validación de seguridad). Por favor elegí otro.');
                    } else {
                      alert('Error al reservar: ' + err.message);
                    }
                  }
                  finally { setConfirming(false); }
                }}>
                  {confirming ? 'Verificando disponibilidad…' : 'Confirmar reserva'}
                </button>
              </div>
            </div>
          )}

          {/* Step 4 — Success */}
          {bookingStep === 4 && (
            <div className="pop-in" style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ width: 88, height: 88, borderRadius: '50%', margin: '0 auto 20px', background: 'radial-gradient(circle, var(--accent-soft) 0%, var(--cream) 70%)', display: 'grid', placeItems: 'center', color: 'var(--accent-deep)' }}>
                <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12.5l4.5 4.5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 38, color: 'var(--ink)', letterSpacing: -0.8, lineHeight: 1 }}>¡Listo!</div>
              <p style={{ color: 'var(--ink-soft)', fontSize: 14.5, lineHeight: 1.6, marginTop: 10, marginBottom: 28 }}>
                Tu turno está <strong>pendiente</strong>.<br/>Stefania lo confirma en las próximas horas.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button className="btn btn-primary btn-full btn-lg" onClick={() => { setStep(0); setActive('history'); }}>Ver mis turnos</button>
                <button className="btn btn-secondary btn-full" onClick={() => setStep(0)}>Volver al inicio</button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

// ── Home tab ──────────────────────────────────────────────────
function HomeTab({ upcoming, user, onBook, onNavigate }) {
  const [collections, setCollections] = useState([]);
  const [hero,        setHero]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const firstName = user?.full_name?.trim().split(' ')[0] || 'Hola';

  useEffect(() => {
    Promise.all([
      supabase.from('collections').select('*').order('created_at', { ascending: false }),
      supabase.from('hero_config').select('*').order('created_at', { ascending: false }).limit(1).single(),
    ]).then(([{ data: coll }, { data: heroData }]) => {
      if (coll) setCollections(coll);
      if (heroData) setHero(heroData);
      setLoading(false);
    });
  }, []);

  return (
    <div style={{ animation: 'fadeIn .4s ease' }}>

      {/* Greeting */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, letterSpacing: 1.4, color: 'var(--ink-muted)', fontWeight: 700 }}>
          BIENVENIDA
        </div>
        <h1 style={{ margin: '6px 0 0', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 400, fontSize: 'clamp(36px,6vw,52px)', letterSpacing: -1, lineHeight: 1.05, color: 'var(--ink)' }}>
          {firstName}<em style={{ color: 'var(--accent)' }}> ✻</em>
        </h1>
      </div>

      {/* Upcoming or CTA card */}
      {upcoming ? (
        <div style={{ background: 'var(--ink)', color: 'var(--bg)', borderRadius: 20, padding: '22px 24px', marginBottom: 24 }}>
          <div style={{ fontSize: 10.5, letterSpacing: 1.4, color: 'var(--accent-soft)', fontWeight: 700, marginBottom: 6 }}>PRÓXIMO TURNO</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px,4vw,30px)', letterSpacing: -0.5, lineHeight: 1.1, marginBottom: 4 }}>
            {fmtDateLong(upcoming.date)}
          </div>
          <div style={{ fontSize: 14, color: '#e0c8c8' }}>{upcoming.time} hs · {upcoming.serviceName}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
            <button onClick={() => onNavigate('history')} style={{ height: 38, padding: '0 18px', borderRadius: 99, border: 'none', background: 'var(--accent)', color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Ver detalles</button>
            <button style={{ height: 38, padding: '0 16px', borderRadius: 99, border: '1px solid rgba(255,255,255,.2)', background: 'transparent', color: 'var(--bg)', fontFamily: 'inherit', fontSize: 13, cursor: 'pointer' }}>Reagendar</button>
          </div>
        </div>
      ) : (
        <div style={{ background: 'var(--cream)', borderRadius: 20, padding: '22px 24px', marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 'clamp(22px,4vw,30px)', color: 'var(--ink)', lineHeight: 1.2, marginBottom: 14 }}>
            Sin turnos próximos.<br/>
            <span style={{ color: 'var(--accent)' }}>¿Reservamos?</span>
          </div>
          <button onClick={onBook} style={{ height: 46, padding: '0 24px', borderRadius: 99, border: 'none', background: 'var(--ink)', color: 'var(--bg)', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Reservar turno →
          </button>
        </div>
      )}

      {/* Quick actions */}
      <div style={{ marginBottom: 36 }}>
        {[
          { label: 'Ver diseños', sub: 'Explorá la galería del estudio', icon: '✦', onClick: () => onNavigate('catalog') },
        ].map(q => (
          <button key={q.label} onClick={q.onClick} style={{ width: '100%', textAlign: 'left', cursor: 'pointer', background: 'var(--surface)', borderRadius: 18, padding: '18px 20px', border: '1px solid var(--line-soft)', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--cream)', display: 'grid', placeItems: 'center', color: 'var(--accent)', fontSize: 22, fontFamily: 'var(--font-display)', flexShrink: 0 }}>{q.icon}</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink)' }}>{q.label}</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-muted)', marginTop: 3 }}>{q.sub}</div>
            </div>
            <div style={{ marginLeft: 'auto', color: 'var(--ink-dim)', fontSize: 20 }}>→</div>
          </button>
        ))}
      </div>

      {/* Hero banner */}
      {!loading && hero?.image_url && (
        <section style={{ marginBottom: 48 }}>
          <div style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', aspectRatio: '16/7' }}>
            <img src={hero.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            {(hero.title_line1 || hero.title_line2) && (
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(43,29,29,.45) 0%, transparent 65%)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 8%' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px,4vw,48px)', lineHeight: 1.05, color: '#fff', textShadow: '0 2px 12px rgba(43,29,29,.3)' }}>
                  {hero.title_line1}<br/>{hero.title_line2}
                </div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
            <button onClick={onBook} style={{ height: 52, padding: '0 64px', borderRadius: 99, border: 'none', background: 'var(--ink)', color: 'var(--bg)', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer', letterSpacing: 0.5 }}>
              {hero.button_text || 'RESERVAR TURNO'}
            </button>
          </div>
        </section>
      )}

      {/* Collections magazine grid */}
      {collections.length > 0 && (
        <section style={{ marginBottom: 56 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 28 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 'clamp(28px,4vw,40px)', fontWeight: 400, color: 'var(--ink)', letterSpacing: -0.5, margin: 0 }}>
              Nuestras Colecciones
            </h2>
            <button onClick={() => onNavigate('catalog')} style={{ fontSize: 13, color: 'var(--accent-deep)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              Ver todas →
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 20 }}>
            {collections.slice(0, 6).map(c => (
              <div key={c.id} className="magazine-design-card">
                <div className="magazine-design-img-wrapper">
                  <img src={c.image_url} alt={c.title} />
                </div>
                <div>
                  <div className="magazine-design-name">{c.title}</div>
                  {c.description && <div className="magazine-design-desc">{c.description}</div>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 40, marginTop: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 32 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 26, color: 'var(--ink)', marginBottom: 6, letterSpacing: -0.5 }}>
              stefania<span style={{ color: 'var(--accent)' }}>.</span>nails
            </div>
            <div style={{ fontSize: 10, letterSpacing: 4, color: 'var(--accent)', fontWeight: 700 }}>ESPACIO DE BELLEZA</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <a href="https://www.instagram.com/stefania.nails24/" target="_blank" rel="noopener noreferrer" style={{ padding: '8px 16px', borderRadius: 99, background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>Instagram</a>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10.5, letterSpacing: 1.2, fontWeight: 700, color: 'var(--ink-muted)', marginBottom: 12 }}>CONTACTO</div>
            {['📍 Mar del Plata, Argentina', '📞 +54 223 532-3878'].map(t => (
              <div key={t} style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 6 }}>{t}</div>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 32, fontSize: 12, color: 'var(--ink-dim)', textAlign: 'center' }}>
          © 2026 stefania.nails — Mar del Plata
        </div>
      </footer>
    </div>
  );
}

// ── Services tab ──────────────────────────────────────────────
function ServicesTab({ services, onBook }) {
  const list = (services?.length ? services : SERVICES).filter(s => s.active !== false);

  return (
    <div style={{ animation: 'fadeIn .4s ease' }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 10.5, letterSpacing: 1.2, color: 'var(--ink-muted)', fontWeight: 700 }}>MENÚ</div>
        <h1 style={{ margin: '6px 0 6px', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 400, fontSize: 'clamp(32px,5vw,48px)', letterSpacing: -0.8, lineHeight: 1, color: 'var(--ink)' }}>
          Servicios
        </h1>
        <p style={{ color: 'var(--ink-muted)', fontSize: 13.5 }}>
          Precios actualizados · {new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Service list — editorial rows */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {list.map((s, i) => (
          <button
            key={s.id}
            onClick={() => onBook(s)}
            style={{
              display: 'flex', alignItems: 'center', gap: 20,
              padding: '20px 0',
              borderTop: '1px solid var(--line-soft)',
              borderBottom: i === list.length - 1 ? '1px solid var(--line-soft)' : 'none',
              background: 'transparent', cursor: 'pointer', textAlign: 'left',
              fontFamily: 'inherit', width: '100%',
              transition: 'background var(--t)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--cream)'; e.currentTarget.style.paddingLeft = '12px'; e.currentTarget.style.paddingRight = '12px'; e.currentTarget.style.marginLeft = '-12px'; e.currentTarget.style.width = 'calc(100% + 24px)'; e.currentTarget.style.borderRadius = '14px'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.paddingLeft = '0'; e.currentTarget.style.paddingRight = '0'; e.currentTarget.style.marginLeft = '0'; e.currentTarget.style.width = '100%'; e.currentTarget.style.borderRadius = '0'; }}
          >
            {/* Letter icon */}
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--cream)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 28, color: 'var(--accent-deep)', flexShrink: 0 }}>
              {s.name.charAt(0)}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.2 }}>{s.name}</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-muted)', marginTop: 4 }}>
                {s.duration_minutes || s.duration} min{s.category ? ` · ${s.category}` : ''}
              </div>
            </div>

            {/* Price + CTA */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--ink)', letterSpacing: -0.5, lineHeight: 1 }}>
                {formatPrice(s.price)}
              </div>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--ink)', display: 'grid', placeItems: 'center', color: 'var(--bg)', flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Booking CTA banner */}
      <div style={{ marginTop: 36, background: 'var(--ink)', borderRadius: 20, padding: '28px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 'clamp(20px,3vw,28px)', color: '#fff', letterSpacing: -0.3 }}>¿Te animás?</div>
          <div style={{ fontSize: 13, color: '#e0c8c8', marginTop: 4 }}>Reservá en segundos, sin escribir por WhatsApp.</div>
        </div>
        <button onClick={() => onBook()} style={{ height: 46, padding: '0 28px', borderRadius: 99, border: 'none', background: 'var(--accent)', color: '#fff', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          Reservar turno
        </button>
      </div>
    </div>
  );
}

// ── Catalog tab ───────────────────────────────────────────────
function CatalogTab() {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('Todos');

  useEffect(() => {
    supabase.from('designs').select('*').eq('active', true).order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setDesigns(data); setLoading(false); });
  }, []);

  const categories = ['Todos', ...new Set(designs.map(d => d.description).filter(Boolean))];
  const filtered   = filter === 'Todos' ? designs : designs.filter(d => d.description === filter);

  return (
    <div style={{ animation: 'fadeIn .4s ease' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10.5, letterSpacing: 1.2, color: 'var(--ink-muted)', fontWeight: 700 }}>GALERÍA</div>
        <h1 style={{ margin: '6px 0 6px', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 400, fontSize: 'clamp(32px,5vw,48px)', letterSpacing: -0.8, lineHeight: 1, color: 'var(--ink)' }}>
          Diseños
        </h1>
        <p style={{ color: 'var(--ink-muted)', fontSize: 13.5 }}>
          {designs.length} diseños · actualizado frecuentemente
        </p>
      </div>

      {/* Filter pills */}
      <div className="pills-row">
        {categories.map(c => (
          <button key={c} className={`pill ${filter === c ? 'active' : ''}`} onClick={() => setFilter(c)}>{c}</button>
        ))}
      </div>

      {/* Magazine grid */}
      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '56px 24px', color: 'var(--ink-muted)', fontSize: 14 }}>
          No hay diseños en esta categoría.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
          {filtered.map((d, i) => (
            <div
              key={d.id}
              className="magazine-design-card"
              style={{ gridRow: i % 5 === 0 ? 'span 2' : 'span 1' }}
            >
              <div
                className="magazine-design-img-wrapper"
                style={{ aspectRatio: i % 5 === 0 ? '3/4' : '4/5' }}
              >
                <img src={d.image_url || d.image} alt={d.title} />
              </div>
              <div>
                <div className="magazine-design-name" style={{ fontSize: 17 }}>{d.title}</div>
                {d.description && <div className="magazine-design-desc">{d.description}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── History tab ───────────────────────────────────────────────
function HistoryTab({ appointments }) {
  const [tab, setTab] = useState('upcoming');
  const todayStr  = new Date().toISOString().split('T')[0];
  const upcoming  = appointments.filter(a => a.date >= todayStr && a.status !== 'cancelled' && a.status !== 'completed');
  const history   = appointments.filter(a => a.status === 'completed' || a.date < todayStr || a.status === 'cancelled');
  const list      = tab === 'upcoming' ? upcoming : history;

  return (
    <div style={{ animation: 'fadeIn .4s ease' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10.5, letterSpacing: 1.2, color: 'var(--ink-muted)', fontWeight: 700 }}>CUENTA</div>
        <h1 style={{ margin: '6px 0 0', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 400, fontSize: 'clamp(32px,5vw,46px)', letterSpacing: -0.8, lineHeight: 1, color: 'var(--ink)' }}>
          Mis turnos
        </h1>
      </div>

      {/* Segmented control */}
      <div style={{ display: 'inline-flex', gap: 3, padding: 4, background: 'var(--line-soft)', borderRadius: 99, marginBottom: 24 }}>
        {[['upcoming', `Próximos ${upcoming.length > 0 ? `(${upcoming.length})` : ''}`], ['history', 'Historial']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            height: 36, padding: '0 18px', borderRadius: 99, border: 'none', cursor: 'pointer',
            background: tab === k ? 'var(--surface)' : 'transparent',
            color: tab === k ? 'var(--ink)' : 'var(--ink-muted)',
            fontFamily: 'inherit', fontWeight: tab === k ? 600 : 500, fontSize: 13,
            boxShadow: tab === k ? 'var(--shadow-sm)' : 'none',
            transition: 'all var(--t)',
          }}>{l}</button>
        ))}
      </div>

      {/* List */}
      {list.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line-soft)', borderRadius: 18, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>{tab === 'upcoming' ? '🗓️' : '✨'}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--ink)', marginBottom: 6 }}>
            {tab === 'upcoming' ? 'Sin turnos próximos' : 'Sin historial aún'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-muted)' }}>
            {tab === 'upcoming' ? 'Reservá un turno para verlo aquí.' : 'Tus turnos completados aparecerán acá.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.map(a => (
            <div key={a.id} style={{ display: 'flex', gap: 16, padding: '18px 20px', background: 'var(--surface)', border: '1px solid var(--line-soft)', borderRadius: 18, alignItems: 'center' }}>
              {/* Date block */}
              <div style={{ width: 54, textAlign: 'center', background: 'var(--cream)', borderRadius: 12, padding: '8px 0', flexShrink: 0 }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--accent-deep)', letterSpacing: 0.5 }}>
                  {new Date(a.date+'T00:00').toLocaleDateString('es-AR', { weekday: 'short' }).toUpperCase()}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--ink)', lineHeight: 1.1 }}>
                  {new Date(a.date+'T00:00').getDate()}
                </div>
                <div style={{ fontSize: 9.5, color: 'var(--ink-muted)' }}>
                  {new Date(a.date+'T00:00').toLocaleDateString('es-AR', { month: 'short' })}
                </div>
              </div>

              {/* Divider */}
              <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--line-soft)' }} />

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{a.serviceName}</div>
                  <Badge status={a.status} />
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-muted)', marginTop: 4 }}>{a.time} hs</div>
              </div>

              {/* Price */}
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--accent-deep)', flexShrink: 0, letterSpacing: -0.3 }}>
                {formatPrice(a.price)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────
function HomeIcon()     { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1v-9z"/></svg>; }
function ListIcon()     { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>; }
function GridIcon()     { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>; }
function CalendarIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3.5" y="5.5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4" strokeLinecap="round"/></svg>; }
