import { useState, useEffect } from 'react';
import { formatPrice } from '../data.js';
import { Badge, Modal, Field } from '../components/UI.jsx';
import { supabase } from '../supabaseClient.js';

export default function ClientsPage() {
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [clients, setClients]   = useState([]);
  const [loading, setLoading]   = useState(true);

  const [newName, setNewName]   = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [saving, setSaving]     = useState(false);

  const fetchClients = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from('profiles').select('*').eq('role','client');
    const { data: apts }     = await supabase.from('appointments').select('*').in('status',['confirmed','completed']);
    if (profiles) {
      setClients(profiles.map(p => {
        const pa = apts?.filter(a => a.client_id === p.id) || [];
        const names = (p.full_name?.trim().split(' ') || []).filter(Boolean);
        return {
          ...p,
          name: p.full_name,
          initials: names.length >= 2 ? (names[0][0]+names[names.length-1][0]).toUpperCase() : (p.full_name?.slice(0,2).toUpperCase() || '??'),
          visits: pa.length,
          totalSpent: pa.reduce((s,a) => s+Number(a.total_price||0), 0),
          lastVisit: pa.length > 0 ? pa.sort((a,b)=>b.appointment_date.localeCompare(a.appointment_date))[0].appointment_date : null,
        };
      }));
    }
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, []);

  const handleSave = async () => {
    if (!newName) { alert('Ingresá el nombre.'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').insert({ full_name:newName, email:newEmail, phone:newPhone, role:'client' });
      if (error) throw error;
      setShowForm(false); setNewName(''); setNewEmail(''); setNewPhone('');
      fetchClients();
    } catch (err) { alert('Error: '+err.message); }
    finally { setSaving(false); }
  };

  const filtered = clients.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (selected) return <ClientDetail client={selected} onBack={() => { setSelected(null); fetchClients(); }} />;

  return (
    <>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:28, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:10.5, letterSpacing:1.2, color:'var(--ink-muted)', fontWeight:700 }}>GESTIÓN</div>
          <h1 style={{ fontFamily:'var(--font-display)', fontWeight:400, fontSize:'clamp(28px,4vw,38px)', letterSpacing:-0.5, lineHeight:1.1, color:'var(--ink)', marginTop:4 }}>
            Clientas
          </h1>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, height:44, padding:'0 16px', background:'var(--surface)', border:'1px solid var(--line-soft)', borderRadius:99 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-muted)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar clienta..."
              style={{ border:'none', outline:'none', background:'transparent', fontSize:13.5, color:'var(--ink)', width:160 }}
            />
          </div>
          <button
            onClick={() => setShowForm(true)}
            style={{ height:44, padding:'0 20px', borderRadius:99, border:'none', background:'var(--ink)', color:'var(--bg)', fontFamily:'inherit', fontSize:13.5, fontWeight:600, cursor:'pointer' }}
          >
            + Nueva clienta
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="kpi-row" style={{ marginBottom:24 }}>
        <div className="kpi-cell">
          <div className="kpi-label">Total</div>
          <div className="kpi-value">{clients.length}</div>
          <div className="kpi-sub" style={{ color:'var(--ink-muted)' }}>registradas</div>
        </div>
        <div className="kpi-cell">
          <div className="kpi-label">Con turnos</div>
          <div className="kpi-value">{clients.filter(c => c.visits > 0).length}</div>
          <div className="kpi-sub" style={{ color:'var(--ink-muted)' }}>activas</div>
        </div>
        <div className="kpi-cell">
          <div className="kpi-label">Promedio</div>
          <div className="kpi-value" style={{ fontSize:'clamp(20px,3vw,30px)' }}>
            {clients.length > 0 ? formatPrice(Math.round(clients.reduce((s,c)=>s+c.totalSpent,0)/clients.length)) : '$0'}
          </div>
          <div className="kpi-sub" style={{ color:'var(--ink-muted)' }}>gastado</div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:40 }}>
          <div style={{ width:24, height:24, borderRadius:'50%', border:'2px solid var(--line)', borderTopColor:'var(--accent)', animation:'spin .7s linear infinite' }} />
        </div>
      ) : (
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          {filtered.length === 0 ? (
            <div style={{ padding:'48px 24px', textAlign:'center', color:'var(--ink-muted)', fontSize:14 }}>
              {search ? 'No encontramos clientas con ese nombre.' : 'Aún no hay clientas registradas.'}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Clienta</th>
                  <th>Contacto</th>
                  <th>Turnos</th>
                  <th>Última visita</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} style={{ cursor:'pointer' }} onClick={() => setSelected(c)}>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <div className="avatar">
                          <span style={{ fontFamily:'var(--font-display)', fontStyle:'italic', fontSize:16, color:'var(--accent-deep)' }}>{c.initials}</span>
                        </div>
                        <div>
                          <div style={{ fontWeight:600, fontSize:13.5, color:'var(--ink)' }}>{c.name}</div>
                          {c.email && <span style={{ fontSize:10, color:'var(--ok)', background:'rgba(93,138,110,0.12)', padding:'2px 6px', borderRadius:99, fontWeight:700 }}>Registrada</span>}
                        </div>
                      </div>
                    </td>
                    <td style={{ color:'var(--ink-muted)', fontSize:12.5 }}>
                      <div>{c.email || '—'}</div>
                      <div>{c.phone || '—'}</div>
                    </td>
                    <td>
                      <span className="badge badge-accent">{c.visits} {c.visits === 1 ? 'turno' : 'turnos'}</span>
                    </td>
                    <td style={{ color:'var(--ink-muted)', fontSize:13 }}>
                      {c.lastVisit ? new Date(c.lastVisit+'T00:00').toLocaleDateString('es-AR',{day:'numeric',month:'short'}) : '—'}
                    </td>
                    <td>
                      <span style={{ fontFamily:'var(--font-display)', fontSize:17, color:'var(--accent-deep)', fontWeight:400 }}>{formatPrice(c.totalSpent)}</span>
                    </td>
                    <td>
                      <button style={{ fontSize:12.5, color:'var(--ink-muted)', background:'none', border:'none', cursor:'pointer' }}>Ver →</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* New client modal */}
      {showForm && (
        <Modal onClose={() => setShowForm(false)} title="Nueva clienta">
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <Field label="Nombre completo" value={newName} onChange={setNewName} placeholder="Ana García" />
            <Field label="Email" type="email" value={newEmail} onChange={setNewEmail} placeholder="ana@email.com" />
            <Field label="Teléfono" type="tel" value={newPhone} onChange={setNewPhone} placeholder="11-1234-5678" />
            <div style={{ display:'flex', gap:10, marginTop:12 }}>
              <button className="btn btn-secondary btn-full" onClick={() => setShowForm(false)} disabled={saving}>Cancelar</button>
              <button className="btn btn-primary btn-full" onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function ClientDetail({ client, onBack }) {
  const [history, setHistory]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showBooking, setShowBooking] = useState(false);
  const [services, setServices] = useState([]);
  const [selServiceId, setSelServiceId] = useState('');
  const [bDate, setBDate]       = useState(new Date().toLocaleDateString('en-CA'));
  const [bTime, setBTime]       = useState('');
  const [modalBusy, setModalBusy] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving]     = useState(false);

  const BOOKING_SLOTS = [
    '09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30',
    '13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30',
    '17:00','17:30','18:00','18:30','19:00','19:30'
  ];

  const TODAY = new Date().toLocaleDateString('en-CA');

  function isSlotOverlapping(slot, durationMins, busy) {
    const [h, m] = slot.split(':').map(Number);
    const start  = h * 60 + m;
    const end    = start + durationMins;
    if (end > 20 * 60) return true;
    for (const r of busy) {
      if (start < r.endMins && end > r.startMins) return true;
    }
    return false;
  }

  function toRanges(rows) {
    return (rows || []).map(a => {
      const [h, m] = a.start_time.split(':').map(Number);
      const [eh, em] = a.end_time.split(':').map(Number);
      return { startMins: h * 60 + m, endMins: eh * 60 + em };
    });
  }

  const fmtMins = (m) => {
    const hh = Math.floor(m / 60);
    const mm = m % 60;
    return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
  };

  useEffect(() => {
    if (!bDate) return;
    setLoadingSlots(true);
    supabase.from('appointments')
      .select('start_time, end_time')
      .eq('appointment_date', bDate)
      .in('status', ['confirmed', 'pending'])
      .then(({ data }) => {
        setModalBusy(toRanges(data));
        setLoadingSlots(false);
      });
  }, [bDate, showBooking]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('appointments').select('*,services(name)').eq('client_id',client.id).order('appointment_date',{ascending:false});
      if (data) setHistory(data.map(a => ({ ...a, serviceName:a.services?.name||'Servicio', date:a.appointment_date, time:a.start_time?.slice(0,5)||'', price:a.total_price })));
      const { data: sd } = await supabase.from('services').select('*').eq('active',true).order('name');
      if (sd) setServices(sd);
      setLoading(false);
    })();
  }, [client.id]);

  const handleBook = async () => {
    if (!selServiceId || !bDate || !bTime) { alert('Completá todos los campos.'); return; }
    setSaving(true);
    try {
      const s = services.find(x => x.id === selServiceId);
      const dur = s.duration_minutes || 60;
      const [h,m] = bTime.split(':').map(Number);
      const nStart = h * 60 + m;
      const nEnd   = nStart + dur;

      // Fresh DB check
      const { data: dayApts, error: avErr } = await supabase.from('appointments')
        .select('start_time, end_time')
        .eq('appointment_date', bDate)
        .in('status', ['confirmed', 'pending']);
      
      if (avErr) throw new Error('No se pudo verificar disponibilidad.');
      
      const blocked = (dayApts || []).some(a => {
        const [ah, am] = a.start_time.split(':').map(Number);
        const [eh, em] = a.end_time.split(':').map(Number);
        const aStart = ah * 60 + am;
        const aEnd   = eh * 60 + em;
        return nStart < aEnd && nEnd > aStart;
      });

      if (blocked) {
        setModalBusy(toRanges(dayApts));
        alert('⚠ Ese horario ya está ocupado. Por favor elegí otro.');
        setBTime('');
        return;
      }

      const endStr = `${String(Math.floor(nEnd/60)).padStart(2,'0')}:${String(nEnd%60).padStart(2,'0')}:00`;

      const { error } = await supabase.from('appointments').insert({
        client_id:client.id, service_id:selServiceId,
        appointment_date:bDate, start_time:`${bTime}:00`,
        end_time: endStr,
        status:'confirmed', total_price:s.price,
      });
      if (error) {
        if (error.message?.includes('overlap') || error.message?.includes('exclusion')) {
          alert('⚠ Error de solapamiento en el servidor. Por favor elegí otro horario.');
          setBTime('');
          return;
        }
        throw error;
      }
      setShowBooking(false);
      setBTime('');
      const { data } = await supabase.from('appointments').select('*,services(name)').eq('client_id',client.id).order('appointment_date',{ascending:false});
      if (data) setHistory(data.map(a => ({ ...a, serviceName:a.services?.name||'Servicio', date:a.appointment_date, time:a.start_time?.slice(0,5)||'', price:a.total_price })));
    } catch (err) { alert('Error: '+err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    const msg = client.email
      ? '⚠️ Esta clienta tiene cuenta registrada. ¿Borrar de todas formas?'
      : '¿Borrar esta clienta definitivamente?';
    if (!confirm(msg)) return;
    const { error } = await supabase.from('profiles').delete().eq('id',client.id);
    if (!error) onBack(); else alert('Error: '+error.message);
  };

  return (
    <>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28, flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={onBack} style={{ height:36, padding:'0 14px', borderRadius:99, border:'1px solid var(--line)', background:'var(--surface)', fontFamily:'inherit', fontSize:13, color:'var(--ink-soft)', cursor:'pointer' }}>← Clientas</button>
          <span style={{ color:'var(--line)' }}>/</span>
          <span style={{ fontFamily:'var(--font-display)', fontSize:20, color:'var(--ink)' }}>{client.name}</span>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={handleDelete} style={{ height:36, padding:'0 14px', borderRadius:99, border:'1px solid rgba(169,74,74,0.3)', background:'transparent', fontFamily:'inherit', fontSize:12.5, color:'var(--danger)', cursor:'pointer' }}>Eliminar</button>
          <button onClick={() => setShowBooking(true)} style={{ height:36, padding:'0 16px', borderRadius:99, border:'none', background:'var(--ink)', color:'var(--bg)', fontFamily:'inherit', fontSize:13, fontWeight:600, cursor:'pointer' }}>+ Nuevo turno</button>
        </div>
      </div>

      {showBooking && (
        <Modal onClose={() => setShowBooking(false)} title={`Nuevo turno · ${client.name}`}>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div className="field" style={{ marginBottom:0 }}>
              <label>Servicio</label>
              <select value={selServiceId} onChange={e => setSelServiceId(e.target.value)} style={{ width:'100%', height:48, padding:'0 14px', borderRadius:14, border:'1px solid var(--line)', background:'var(--surface)', fontFamily:'inherit', fontSize:14, color:'var(--ink)', outline:'none' }}>
                <option value="">Seleccionar...</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name} — {formatPrice(s.price)}</option>)}
              </select>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:12 }}>
              <Field label="Fecha" type="date" value={bDate} onChange={setBDate} />
            </div>

            {bDate && selServiceId && (
              <div>
                <label style={{ display:'block', fontSize:12, color:'var(--ink-soft)', marginBottom:8, fontWeight:600 }}>Horario</label>
                {loadingSlots ? (
                  <div style={{ display:'flex', justifyContent:'center', padding:16 }}>
                    <div style={{ width:20, height:20, borderRadius:'50%', border:'2px solid var(--line)', borderTopColor:'var(--accent)', animation:'spin .7s linear infinite' }} />
                  </div>
                ) : (
                  <>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
                      {BOOKING_SLOTS.map(t => {
                        const svc = services.find(s => s.id === selServiceId);
                        const dur = svc?.duration_minutes || 90;
                        const [th, tm] = t.split(':').map(Number);
                        const slotMin = th * 60 + tm;
                        const nowMin = bDate === TODAY ? new Date().getHours() * 60 + new Date().getMinutes() : -1;
                        const isPast = bDate < TODAY || (bDate === TODAY && slotMin <= nowMin);
                        const taken = isPast || isSlotOverlapping(t, dur, modalBusy);
                        const on = bTime === t;
                        return (
                          <button key={t} type="button" disabled={taken} onClick={() => !taken && setBTime(t)}
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
                      <div style={{ marginTop:8, padding:'8px 12px', background:'var(--cream)', borderRadius:10, fontSize:11.5, color:'var(--ink-muted)', lineHeight:1.6 }}>
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
            )}

            <div style={{ display:'flex', gap:10, marginTop:8 }}>
              <button className="btn btn-secondary btn-full" onClick={() => setShowBooking(false)} disabled={saving}>Cancelar</button>
              <button className="btn btn-primary btn-full" onClick={handleBook} disabled={saving || !bTime}>{saving ? 'Agendando…' : 'Agendar'}</button>
            </div>
          </div>
        </Modal>
      )}

      <div className="client-detail-grid" style={{ display:'grid', gridTemplateColumns:'260px 1fr', gap:20, alignItems:'start' }}>
        {/* Profile card */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div className="card" style={{ textAlign:'center', padding:'28px 20px' }}>
            <div style={{ width:72, height:72, borderRadius:'50%', background:'radial-gradient(circle,var(--accent-soft),var(--cream))', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', fontFamily:'var(--font-display)', fontStyle:'italic', fontSize:30, color:'var(--accent-deep)' }}>
              {client.initials}
            </div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:20, color:'var(--ink)', marginBottom:4 }}>{client.name}</div>
            <div style={{ fontSize:12, color:'var(--ink-muted)', marginBottom:14 }}>{client.email || 'Sin email'}</div>
            <span className="badge badge-accent">{client.visits} turnos</span>
            <div style={{ marginTop:18, paddingTop:14, borderTop:'1px solid var(--line-soft)' }}>
              <div style={{ fontSize:10.5, letterSpacing:1.2, color:'var(--ink-muted)', fontWeight:700, marginBottom:6 }}>TOTAL INVERTIDO</div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:30, color:'var(--accent-deep)' }}>{formatPrice(client.totalSpent)}</div>
            </div>
          </div>
          <div className="card" style={{ padding:'16px 20px' }}>
            <div style={{ fontSize:10.5, letterSpacing:1.2, color:'var(--ink-muted)', fontWeight:700, marginBottom:12 }}>CONTACTO</div>
            {[['Email', client.email||'—'], ['Teléfono', client.phone||'—']].map(([k,v]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--line-soft)', fontSize:13 }}>
                <span style={{ color:'var(--ink-muted)' }}>{k}</span>
                <span style={{ fontWeight:500, color:'var(--ink)' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* History */}
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--line-soft)' }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:20, color:'var(--ink)' }}>Historial de turnos</div>
          </div>
          {loading ? (
            <div style={{ padding:32, textAlign:'center', color:'var(--ink-muted)' }}>Cargando…</div>
          ) : history.length === 0 ? (
            <div style={{ padding:'40px 24px', textAlign:'center', color:'var(--ink-muted)', fontSize:14 }}>Sin historial aún.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Servicio</th>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Precio</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {history.map(apt => (
                  <tr key={apt.id}>
                    <td style={{ fontWeight:500 }}>{apt.serviceName}</td>
                    <td style={{ color:'var(--ink-muted)', fontSize:13 }}>
                      {new Date(apt.date+'T00:00').toLocaleDateString('es-AR',{day:'numeric',month:'short',year:'numeric'})}
                    </td>
                    <td style={{ color:'var(--ink-muted)', fontSize:13 }}>{apt.time}</td>
                    <td style={{ fontFamily:'var(--font-display)', fontSize:16, color:'var(--accent-deep)' }}>{formatPrice(apt.price)}</td>
                    <td><Badge status={apt.status} /></td>
                    <td>
                      <button
                        onClick={async () => {
                          if (!confirm('¿Borrar este turno?')) return;
                          const { error } = await supabase.from('appointments').delete().eq('id',apt.id);
                          if (!error) setHistory(prev => prev.filter(a => a.id !== apt.id));
                          else alert('Error: '+error.message);
                        }}
                        style={{ fontSize:12, color:'var(--danger)', background:'none', border:'none', cursor:'pointer' }}
                      >🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </>
  );
}
