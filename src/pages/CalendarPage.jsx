import { useState, useEffect } from 'react';
import { formatPrice } from '../data.js';
import { Badge, Modal, Field } from '../components/UI.jsx';
import { supabase } from '../supabaseClient.js';

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const TODAY = new Date().toLocaleDateString('en-CA'); // Local YYYY-MM-DD

function getCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  const days = [];
  // Monday-start: shift Sunday (0) to end
  const pad = (firstDay.getDay() + 6) % 7;
  for (let i = 0; i < pad; i++) days.push(null);
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const d = new Date(year, month, i);
    days.push(d.toISOString().split('T')[0]);
  }
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function fmtDateSec(iso) {
  const d = new Date(iso + 'T00:00');
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
}

// busy = [{ startMins, endMins }] — always computed from start_time + duration, never from DB end_time
function isSlotOverlapping(slot, durationMins, busy) {
  const [h, m] = slot.split(':').map(Number);
  const start  = h * 60 + m;
  const end    = start + durationMins; // Use actual service duration
  if (end > 20 * 60) return true;
  for (const r of busy) {
    if (start < r.endMins && end > r.startMins) return true;
  }
  return false;
}

const fmtMins = t => `${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;

function toRanges(rows) {
  return (rows || []).map(a => {
    const [h, m] = a.start_time.split(':').map(Number);
    const startMins = h * 60 + m;
    const [eh, em] = a.end_time.split(':').map(Number);
    const endMins = eh * 60 + em;
    return { startMins, endMins };
  });
}

const BOOKING_SLOTS = (() => {
  const s = [];
  for (let h = 9; h < 20; h++) {
    s.push(`${String(h).padStart(2,'0')}:00`);
    s.push(`${String(h).padStart(2,'0')}:30`);
  }
  return s;
})();

export default function CalendarPage() {
  const [appointments, setAppointments]   = useState([]);
  const [selectedDate, setSelectedDate]   = useState(TODAY);
  const [showDetail, setShowDetail]       = useState(null);
  const [showBooking, setShowBooking]     = useState(false);
  const [loading, setLoading]             = useState(true);
  const [viewMonth, setViewMonth]         = useState(new Date().getMonth());
  const [viewYear, setViewYear]           = useState(new Date().getFullYear());

  // Form state
  const [clients, setClients]             = useState([]);
  const [services, setServices]           = useState([]);
  const [clientSearch, setClientSearch]   = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [bookingDate, setBookingDate]     = useState(TODAY);
  const [bookingTime, setBookingTime]     = useState('10:00');
  const [saving, setSaving]               = useState(false);
  const [modalBusy,    setModalBusy]      = useState([]);
  const [loadingSlots, setLoadingSlots]   = useState(false);

  const fetchAppointments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('appointments')
      .select('*, profiles(full_name), services(name, duration_minutes)')
      .order('appointment_date').order('start_time');
    if (data) {
      setAppointments(data.map(a => ({
        ...a,
        date:        a.appointment_date,
        time:        a.start_time?.slice(0, 5) || '',
        clientName:  a.profiles?.full_name || 'Clienta',
        serviceName: a.services?.name || 'Servicio',
        duration:    a.services?.duration_minutes || 60,
        price:       a.total_price,
      })));
    }
    setLoading(false);
  };

  const fetchFormOptions = async () => {
    const { data: cData } = await supabase.from('profiles').select('id,full_name').eq('role','client').order('full_name');
    const { data: sData } = await supabase.from('services').select('id,name,price,duration_minutes').eq('active',true).order('name');
    if (cData) setClients(cData);
    if (sData) setServices(sData);
  };

  useEffect(() => { fetchAppointments(); fetchFormOptions(); }, []);

  // Fetch fresh busy ranges whenever date changes or modal opens
  // Joins services to compute end time — never relies on stored end_time column
  useEffect(() => {
    if (!showBooking || !bookingDate) return;
    setLoadingSlots(true);
    setBookingTime('');
    supabase.from('appointments')
      .select('start_time, end_time')
      .eq('appointment_date', bookingDate)
      .in('status', ['confirmed', 'pending'])
      .then(({ data, error }) => {
        setModalBusy(error ? [] : toRanges(data));
        setLoadingSlots(false);
      });
  }, [bookingDate, showBooking]);

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1); } else setViewMonth(m => m-1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1); } else setViewMonth(m => m+1); };
  const calDays   = getCalendarDays(viewYear, viewMonth);

  const forDay = appointments.filter(a => a.date === selectedDate);
  const filteredClients = clientSearch
    ? clients.filter(c => c.full_name.toLowerCase().includes(clientSearch.toLowerCase()))
    : [];

  const handleSaveBooking = async () => {
    if ((!selectedClientId && !clientSearch) || !selectedServiceId || !bookingDate || !bookingTime) {
      alert('Por favor, completá todos los campos.'); return;
    }
    setSaving(true);
    try {
      let clientId = selectedClientId;
      if (!clientId && clientSearch) {
        const { data: np, error: pe } = await supabase.from('profiles').insert({ full_name: clientSearch, role: 'client' }).select().single();
        if (pe) throw pe;
        clientId = np.id;
      }
      const service  = services.find(s => s.id === selectedServiceId);
      const [h, m]   = bookingTime.split(':').map(Number);
      const duration = service.duration_minutes || 60;
      const endMins  = h * 60 + m + duration;
      const endTime  = `${String(Math.floor(endMins/60)).padStart(2,'0')}:${String(endMins%60).padStart(2,'0')}:00`;

      // ── CAPA 1: validación contra estado local (instantánea, sin DB) ──
      const nStart = h * 60 + m;
      const nEnd   = nStart + duration;
      const localBlocked = appointments.some(a => {
        if (a.date !== bookingDate) return false;
        if (!['confirmed', 'pending'].includes(a.status)) return false;
        const [ah, am] = a.time.split(':').map(Number);
        const aStart   = ah * 60 + am;
        const aEnd     = aStart + a.duration;
        return nStart < aEnd && nEnd > aStart;
      });
      if (localBlocked) {
        alert(`⚠ Horario ya ocupado (${bookingTime} hs). Elegí otro horario.`);
        setBookingTime('');
        setSaving(false);
        return;
      }

      // ── CAPA 2: verificación fresca en DB antes del INSERT ──
      const { data: dayApts, error: avErr } = await supabase
        .from('appointments')
        .select('start_time, end_time')
        .eq('appointment_date', bookingDate)
        .in('status', ['confirmed', 'pending']);
      if (avErr) throw new Error('No se pudo verificar disponibilidad. Intentá de nuevo.');
      const dbBlocked = (dayApts || []).some(a => {
        const [ah, am] = a.start_time.split(':').map(Number);
        const aStart   = ah * 60 + am;
        const [eh, em] = a.end_time.split(':').map(Number);
        const aEnd     = eh * 60 + em;
        return nStart < aEnd && nEnd > aStart;
      });
      if (dbBlocked) {
        alert(`⚠ Horario ya ocupado. El próximo disponible es a las ${fmtMins(nEnd)} hs.`);
        setModalBusy(toRanges(dayApts));
        setBookingTime('');
        setSaving(false);
        return;
      }
      const { error } = await supabase.from('appointments').insert({
        client_id: clientId, service_id: selectedServiceId,
        appointment_date: bookingDate, start_time: `${bookingTime}:00`, end_time: endTime,
        status: 'confirmed', total_price: service.price,
      });
      if (error) throw error;
      setShowBooking(false);
      setClientSearch(''); setSelectedClientId(''); setSelectedServiceId(''); setBookingTime(''); setModalBusy([]);
      fetchAppointments(); fetchFormOptions();
    } catch (err) {
      const isOverlap = err.message?.toLowerCase().includes('ocupado') || 
                        err.message?.toLowerCase().includes('overlap') || 
                        err.message?.toLowerCase().includes('exclusion');
      if (isOverlap) {
        supabase.from('appointments').select('start_time')
          .eq('appointment_date', bookingDate).in('status', ['confirmed','pending'])
          .then(({ data }) => { if (data) setModalBusy(toRanges(data)); });
        setBookingTime('');
        alert('⚠ Ese horario ya está ocupado (validación de seguridad). Por favor elegí otro.');
      } else {
        alert('Error: ' + err.message);
      }
    }
    finally { setSaving(false); }
  };

  const handleStatus = async (apt, status) => {
    if (status === 'confirmed') {
      const [ah, am] = apt.time.split(':').map(Number);
      const aStart = ah * 60 + am;
      const aEnd   = aStart + 90;
      const conflict = appointments.some(a => {
        if (a.id === apt.id || a.date !== apt.date || a.status === 'cancelled') return false;
        const [bh, bm] = a.time.split(':').map(Number);
        const bStart = bh * 60 + bm;
        return aStart < (bStart + 90) && aEnd > bStart;
      });
      if (conflict) {
        alert(`⚠ No se puede confirmar: hay un turno solapado a las ${apt.time} hs. Cancelá el conflicto primero.`);
        return;
      }
    }
    const { error } = await supabase.from('appointments').update({ status }).eq('id', apt.id);
    if (!error) { fetchAppointments(); setShowDetail(null); }
    else alert('Error: ' + error.message);
  };

  const handleDelete = async (apt) => {
    if (!confirm('¿Borrar este turno definitivamente?')) return;
    const { error } = await supabase.from('appointments').delete().eq('id', apt.id);
    if (!error) { fetchAppointments(); setShowDetail(null); }
    else alert('Error: ' + error.message);
  };

  return (
    <>
      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:28, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:10.5, letterSpacing:1.2, color:'var(--ink-muted)', fontWeight:700 }}>AGENDA</div>
          <h1 style={{ fontFamily:'var(--font-display)', fontWeight:400, fontSize:'clamp(28px,4vw,38px)', letterSpacing:-0.5, lineHeight:1.1, color:'var(--ink)', marginTop:4 }}>
            Turnos
          </h1>
        </div>
        <button
          onClick={() => setShowBooking(true)}
          style={{ height:42, padding:'0 22px', borderRadius:99, border:'none', background:'var(--ink)', color:'var(--bg)', fontFamily:'inherit', fontSize:13.5, fontWeight:600, cursor:'pointer' }}
        >
          + Nuevo turno
        </button>
      </div>

      {/* ── Two-column layout ── */}
      <div className="cal-two-col" style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:24, alignItems:'start' }}>

        {/* Left: Mini Calendar */}
        <div className="card" style={{ padding:20, position:'sticky', top:20 }}>
          {/* Month nav */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <button onClick={prevMonth} style={{ width:28, height:28, borderRadius:99, border:'1px solid var(--line)', background:'var(--surface)', cursor:'pointer', display:'grid', placeItems:'center', color:'var(--ink-soft)', fontSize:12 }}>‹</button>
            <span style={{ fontFamily:'var(--font-display)', fontSize:15, color:'var(--ink)' }}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button onClick={nextMonth} style={{ width:28, height:28, borderRadius:99, border:'1px solid var(--line)', background:'var(--surface)', cursor:'pointer', display:'grid', placeItems:'center', color:'var(--ink-soft)', fontSize:12 }}>›</button>
          </div>

          {/* Day labels */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:4 }}>
            {['L','M','X','J','V','S','D'].map(d => (
              <div key={d} style={{ textAlign:'center', fontSize:9, fontWeight:700, color:'var(--ink-dim)', padding:'4px 0' }}>{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
            {calDays.map((date, i) => {
              if (!date) return <div key={`e${i}`} />;
              const isToday    = date === TODAY;
              const isSelected = date === selectedDate;
              const hasDot     = appointments.some(a => a.date === date && a.status !== 'cancelled');
              return (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  style={{
                    aspectRatio:'1/1', borderRadius:8, border:'none', cursor:'pointer',
                    background: isSelected ? 'var(--ink)' : isToday ? 'var(--cream)' : 'transparent',
                    color: isSelected ? 'var(--bg)' : isToday ? 'var(--accent-deep)' : 'var(--ink)',
                    fontWeight: (isSelected || isToday) ? 700 : 400,
                    fontSize:12, position:'relative', transition:'background var(--t)',
                  }}
                >
                  {new Date(date+'T00:00').getDate()}
                  {hasDot && !isSelected && (
                    <div style={{ position:'absolute', bottom:2, left:'50%', transform:'translateX(-50%)', width:4, height:4, borderRadius:'50%', background:'var(--accent)' }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Busy times for selected day */}
          <div style={{ marginTop:18, paddingTop:14, borderTop:'1px solid var(--line-soft)' }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:1.2, color:'var(--ink-muted)', marginBottom:8 }}>
              {fmtDateSec(selectedDate).toUpperCase()}
            </div>
            {forDay.filter(a => a.status !== 'cancelled').length === 0 ? (
              <div style={{ fontSize:12, color:'var(--ink-muted)', fontStyle:'italic' }}>Día libre ✨</div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {forDay.filter(a => a.status !== 'cancelled').map(a => (
                  <div key={a.id} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12 }}>
                    <div style={{ width:4, height:4, borderRadius:'50%', background:'var(--accent)', flexShrink:0 }} />
                    <span style={{ color:'var(--ink)', fontWeight:600 }}>{a.time}</span>
                    <span style={{ color:'var(--ink-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.clientName}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Day's appointments */}
        <div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:22, color:'var(--ink)', letterSpacing:-0.3, marginBottom:14 }}>
            {fmtDateSec(selectedDate).charAt(0).toUpperCase() + fmtDateSec(selectedDate).slice(1)}
          </div>

          {loading ? (
            <div style={{ display:'flex', justifyContent:'center', padding:40 }}>
              <div style={{ width:24, height:24, borderRadius:'50%', border:'2px solid var(--line)', borderTopColor:'var(--accent)', animation:'spin .7s linear infinite' }} />
            </div>
          ) : forDay.length === 0 ? (
            <div className="card" style={{ textAlign:'center', padding:'48px 24px', borderStyle:'dashed' }}>
              <div style={{ fontSize:36, marginBottom:12 }}>🌿</div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:18, color:'var(--ink)', marginBottom:4 }}>Día libre</div>
              <div style={{ fontSize:13, color:'var(--ink-muted)' }}>No hay turnos para este día.</div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {forDay.map(apt => (
                <div
                  key={apt.id}
                  onClick={() => setShowDetail(apt)}
                  style={{
                    display:'flex', gap:16, padding:'16px 20px', alignItems:'center',
                    background:'var(--surface)', border:'1px solid var(--line-soft)',
                    borderRadius:16, cursor:'pointer', transition:'box-shadow var(--t)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                >
                  <div style={{ width:56, textAlign:'center', flexShrink:0 }}>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:22, color:'var(--ink)', lineHeight:1 }}>{apt.time}</div>
                    <div style={{ fontSize:10, color:'var(--ink-muted)', marginTop:2 }}>{apt.duration} min</div>
                  </div>
                  <div style={{ width:1, alignSelf:'stretch', background:'var(--line-soft)' }} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:600, color:'var(--ink)' }}>{apt.clientName}</div>
                    <div style={{ fontSize:12.5, color:'var(--ink-muted)', marginTop:2 }}>{apt.serviceName}</div>
                  </div>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:18, color:'var(--accent-deep)', marginRight:8 }}>
                    {formatPrice(Number(apt.price || 0))}
                  </div>
                  <Badge status={apt.status} />
                </div>
              ))}
            </div>
          )}

          {/* Upcoming section */}
          {!loading && (
            <div style={{ marginTop:32 }}>
              <div style={{ fontSize:10.5, letterSpacing:1.2, color:'var(--ink-muted)', fontWeight:700, marginBottom:14 }}>PRÓXIMOS TURNOS</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {appointments
                  .filter(a => a.date > selectedDate && a.status !== 'cancelled')
                  .slice(0, 5)
                  .map(apt => (
                    <div
                      key={apt.id}
                      onClick={() => { setSelectedDate(apt.date); setShowDetail(apt); }}
                      style={{
                        display:'flex', gap:14, padding:'12px 16px', alignItems:'center',
                        background:'var(--surface)', border:'1px solid var(--line-soft)',
                        borderRadius:14, cursor:'pointer',
                      }}
                    >
                      <div style={{
                        width:38, height:38, borderRadius:10, background:'var(--cream)',
                        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                        flexShrink:0,
                      }}>
                        <div style={{ fontSize:16, fontWeight:700, lineHeight:1, color:'var(--ink)' }}>
                          {new Date(apt.date+'T00:00').getDate()}
                        </div>
                        <div style={{ fontSize:8, fontWeight:700, color:'var(--ink-muted)', letterSpacing:0.5 }}>
                          {['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'][new Date(apt.date+'T00:00').getMonth()]}
                        </div>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13.5, fontWeight:600, color:'var(--ink)' }}>{apt.clientName}</div>
                        <div style={{ fontSize:12, color:'var(--ink-muted)' }}>{apt.time} · {apt.serviceName}</div>
                      </div>
                      <Badge status={apt.status} />
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Detail Modal ── */}
      {showDetail && (
        <Modal onClose={() => setShowDetail(null)} title="Detalle del turno">
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:22, color:'var(--ink)', lineHeight:1.1 }}>{showDetail.clientName}</div>
                <div style={{ fontSize:13.5, color:'var(--ink-muted)', marginTop:4 }}>{showDetail.serviceName}</div>
              </div>
              <Badge status={showDetail.status} />
            </div>

            <div style={{ height:1, background:'var(--line-soft)' }} />

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[
                ['Fecha', new Date(showDetail.date+'T00:00').toLocaleDateString('es-AR',{day:'numeric',month:'long'})],
                ['Hora',  showDetail.time + ' hs'],
                ['Duración', showDetail.duration + ' min'],
                ['Total', formatPrice(Number(showDetail.price||0))],
              ].map(([k,v]) => (
                <div key={k} style={{ background:'var(--cream)', borderRadius:12, padding:'12px 14px' }}>
                  <div style={{ fontSize:10.5, color:'var(--ink-muted)', fontWeight:700, letterSpacing:0.8, marginBottom:4 }}>{k.toUpperCase()}</div>
                  <div style={{ fontFamily: k==='Total' ? 'var(--font-display)' : 'inherit', fontSize: k==='Total' ? 20 : 14, fontWeight:600, color: k==='Total' ? 'var(--accent-deep)' : 'var(--ink)' }}>{v}</div>
                </div>
              ))}
            </div>

            <div style={{ display:'flex', gap:10, marginTop:6 }}>
              {showDetail.status === 'pending' && (
                <button className="btn btn-primary" style={{ flex:1 }} onClick={() => handleStatus(showDetail,'confirmed')}>✓ Confirmar</button>
              )}
              {showDetail.status === 'confirmed' && (
                <button className="btn btn-primary" style={{ flex:1, background:'var(--ok)' }} onClick={() => handleStatus(showDetail,'completed')}>✓ Completar</button>
              )}
              {showDetail.status !== 'cancelled' && showDetail.status !== 'completed' && (
                <button className="btn btn-danger" style={{ flex:1 }} onClick={() => handleStatus(showDetail,'cancelled')}>✕ Cancelar</button>
              )}
            </div>
            <button
              onClick={() => handleDelete(showDetail)}
              style={{ width:'100%', padding:'10px 16px', borderRadius:12, border:'1px dashed var(--line)', background:'transparent', fontSize:12, color:'var(--ink-muted)', cursor:'pointer' }}
            >
              🗑 Eliminar permanentemente
            </button>
          </div>
        </Modal>
      )}

      {/* ── New Booking Modal ── */}
      {showBooking && (
        <Modal onClose={() => setShowBooking(false)} title="Nuevo turno">
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {/* Client search */}
            <div style={{ position:'relative' }}>
              <label style={{ display:'block', fontSize:12.5, color:'var(--ink-soft)', marginBottom:6, fontWeight:500 }}>Clienta</label>
              <input
                type="text"
                placeholder="Nombre de la clienta..."
                value={clientSearch}
                onChange={e => { setClientSearch(e.target.value); setSelectedClientId(''); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                style={{ width:'100%', height:48, padding:'0 14px', borderRadius:14, border:'1px solid var(--line)', background:'var(--surface)', fontFamily:'inherit', fontSize:14, color:'var(--ink)', outline:'none' }}
              />
              {showSuggestions && clientSearch && filteredClients.length > 0 && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'var(--surface)', border:'1px solid var(--line-soft)', borderRadius:14, zIndex:10, marginTop:4, boxShadow:'var(--shadow-md)', maxHeight:160, overflowY:'auto' }}>
                  {filteredClients.map(c => (
                    <div
                      key={c.id}
                      onClick={() => { setSelectedClientId(c.id); setClientSearch(c.full_name); setShowSuggestions(false); }}
                      style={{ padding:'10px 14px', cursor:'pointer', fontSize:13.5, borderBottom:'1px solid var(--line-soft)' }}
                      onMouseEnter={e => e.currentTarget.style.background='var(--cream)'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}
                    >{c.full_name}</div>
                  ))}
                </div>
              )}
            </div>

            {/* Service */}
            <div className="field" style={{ marginBottom:0 }}>
              <label>Servicio</label>
              <select value={selectedServiceId} onChange={e => setSelectedServiceId(e.target.value)} style={{ width:'100%', height:48, padding:'0 14px', borderRadius:14, border:'1px solid var(--line)', background:'var(--surface)', fontFamily:'inherit', fontSize:14, color:'var(--ink)', outline:'none' }}>
                <option value="">Seleccionar servicio...</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name} — {formatPrice(s.price)}</option>)}
              </select>
            </div>

            {/* Date */}
            <Field label="Fecha" type="date" value={bookingDate} onChange={v => { setBookingDate(v); setBookingTime(''); }} />

            {/* Slot grid — shown once both date and service are selected */}
            {bookingDate && selectedServiceId ? (
              <div>
                <label style={{ display:'block', fontSize:12.5, color:'var(--ink-soft)', marginBottom:8, fontWeight:500 }}>Horario</label>
                {loadingSlots ? (
                  <div style={{ display:'flex', justifyContent:'center', padding:16 }}>
                    <div style={{ width:20, height:20, borderRadius:'50%', border:'2px solid var(--line)', borderTopColor:'var(--accent)', animation:'spin .7s linear infinite' }} />
                  </div>
                ) : (
                  <>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
                      {BOOKING_SLOTS.map(t => {
                        const svc      = services.find(s => s.id === selectedServiceId);
                        const dur      = svc?.duration_minutes || 90;
                        const [th, tm] = t.split(':').map(Number);
                        const slotMin  = th * 60 + tm;
                        const nowMin   = bookingDate === TODAY
                          ? new Date().getHours() * 60 + new Date().getMinutes() : -1;
                        const isPast   = bookingDate < TODAY || (bookingDate === TODAY && slotMin <= nowMin);
                        const taken    = isPast || isSlotOverlapping(t, dur, modalBusy);
                        const on       = bookingTime === t;
                        return (
                          <button key={t} type="button" disabled={taken} onClick={() => !taken && setBookingTime(t)}
                            className={taken ? "slot-taken" : ""}
                            style={{
                              height:38, borderRadius:10, fontFamily:'inherit', fontSize:12.5, fontWeight:500,
                              background: on ? 'var(--ink)' : (taken ? 'var(--bg-soft)' : 'var(--surface)'),
                              border: `1px solid ${on ? 'transparent' : 'var(--line-soft)'}`,
                              color: on ? 'var(--bg)' : (taken ? 'var(--ink-dim)' : 'var(--ink)'),
                              cursor: taken ? 'not-allowed' : 'pointer',
                              opacity: taken ? 0.65 : 1,
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                          >
                            <span>{t}</span>
                          </button>
                        );
                      })}
                    </div>
                    {modalBusy.length > 0 && (
                      <div style={{ marginTop:8, padding:'8px 12px', background:'var(--cream)', borderRadius:10, fontSize:12, color:'var(--ink-muted)', lineHeight:1.8 }}>
                        🔒 Bloqueados:{' '}
                        {modalBusy.map((r, i) => (
                          <span key={i} style={{ marginRight:8, fontWeight:600, color:'var(--accent-deep)' }}>
                            {fmtMins(r.startMins)}–{fmtMins(r.endMins)}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div style={{ padding:'10px 12px', background:'var(--cream)', borderRadius:10, fontSize:12.5, color:'var(--ink-muted)' }}>
                {!selectedServiceId ? 'Seleccioná un servicio para ver los horarios disponibles.' : 'Elegí una fecha para ver disponibilidad.'}
              </div>
            )}

            <div style={{ display:'flex', gap:10, marginTop:8 }}>
              <button className="btn btn-secondary btn-full" onClick={() => setShowBooking(false)} disabled={saving}>Cancelar</button>
              <button
                className="btn btn-primary btn-full"
                onClick={handleSaveBooking}
                disabled={saving || Boolean(bookingDate && selectedServiceId && !bookingTime)}
              >
                {saving ? 'Guardando…'
                  : (bookingDate && selectedServiceId && !bookingTime) ? 'Horario no disponible'
                  : 'Agendar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

    </>
  );
}
