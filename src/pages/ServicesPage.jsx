import { useState, useEffect } from 'react';
import { formatPrice } from '../data.js';
import { Modal, Field } from '../components/UI.jsx';
import { supabase } from '../supabaseClient.js';

export default function ServicesPage() {
  const [activeTab, setActiveTab] = useState('Todos');
  const [search, setSearch]       = useState('');
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState(null);
  const [services, setServices]   = useState([]);
  const [loading, setLoading]     = useState(true);

  const [name, setName]           = useState('');
  const [category, setCategory]   = useState('');
  const [duration, setDuration]   = useState('');
  const [price, setPrice]         = useState('');
  const [isActive, setIsActive]   = useState(true);

  const fetchServices = async () => {
    setLoading(true);
    const { data } = await supabase.from('services').select('*').order('name');
    if (data) setServices(data);
    setLoading(false);
  };

  useEffect(() => { fetchServices(); }, []);

  const categories = ['Todos', ...new Set(services.map(s => s.category).filter(Boolean))];

  const filtered = services.filter(s => {
    const matchCat  = activeTab === 'Todos' || s.category === activeTab;
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const openEdit = (s) => {
    setEditing(s); setName(s.name); setCategory(s.category||'');
    setDuration(s.duration_minutes||''); setPrice(s.price||''); setIsActive(s.active); setShowForm(true);
  };

  const openNew = () => {
    setEditing(null); setName(''); setCategory(''); setDuration(''); setPrice(''); setIsActive(true); setShowForm(true);
  };

  const handleSave = async () => {
    if (!name || !price || !duration) { alert('Completá los campos obligatorios.'); return; }
    try {
      const payload = { name, category, duration_minutes:Number(duration), price:Number(price), active:isActive };
      const { error } = editing
        ? await supabase.from('services').update(payload).eq('id',editing.id)
        : await supabase.from('services').insert(payload);
      if (error) throw error;
      setShowForm(false); fetchServices();
    } catch (err) { alert('Error: '+err.message); }
  };

  const toggleActive = async (s) => {
    const { error } = await supabase.from('services').update({ active:!s.active }).eq('id',s.id);
    if (!error) setServices(prev => prev.map(x => x.id===s.id ? {...x, active:!x.active} : x));
    else alert('Error: '+error.message);
  };

  return (
    <>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:28, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:10.5, letterSpacing:1.2, color:'var(--ink-muted)', fontWeight:700 }}>CATÁLOGO</div>
          <h1 style={{ fontFamily:'var(--font-display)', fontWeight:400, fontSize:'clamp(28px,4vw,38px)', letterSpacing:-0.5, lineHeight:1.1, color:'var(--ink)', marginTop:4 }}>
            Servicios
          </h1>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, height:44, padding:'0 16px', background:'var(--surface)', border:'1px solid var(--line-soft)', borderRadius:99 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-muted)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." style={{ border:'none', outline:'none', background:'transparent', fontSize:13.5, color:'var(--ink)', width:120 }} />
          </div>
          <button onClick={openNew} style={{ height:44, padding:'0 20px', borderRadius:99, border:'none', background:'var(--ink)', color:'var(--bg)', fontFamily:'inherit', fontSize:13.5, fontWeight:600, cursor:'pointer' }}>
            + Nuevo servicio
          </button>
        </div>
      </div>

      {/* Category pills */}
      <div className="pills-row">
        {categories.map(c => (
          <button key={c} className={`pill ${activeTab===c ? 'active':''}`} onClick={() => setActiveTab(c)}>{c}</button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:40 }}>
          <div style={{ width:24, height:24, borderRadius:'50%', border:'2px solid var(--line)', borderTopColor:'var(--accent)', animation:'spin .7s linear infinite' }} />
        </div>
      ) : (
        <div className="grid-3">
          {filtered.map(s => (
            <div key={s.id} className="card" style={{ display:'flex', flexDirection:'column', gap:14, padding:'20px 22px' }}>
              {/* Icon + name */}
              <div style={{ display:'flex', gap:14, alignItems:'center' }}>
                <div style={{ width:48, height:48, borderRadius:14, background:'var(--cream)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontStyle:'italic', fontSize:22, color:'var(--accent-deep)', flexShrink:0 }}>
                  {s.name.charAt(0)}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14.5, fontWeight:600, color:'var(--ink)', lineHeight:1.2 }}>{s.name}</div>
                  <div style={{ fontSize:12, color:'var(--ink-muted)', marginTop:3 }}>
                    {s.duration_minutes} min{s.category ? ` · ${s.category}` : ''}
                  </div>
                </div>
              </div>

              {/* Price */}
              <div style={{ fontFamily:'var(--font-display)', fontSize:26, color:'var(--ink)', letterSpacing:-0.5, lineHeight:1 }}>
                {formatPrice(s.price)}
              </div>

              {/* Footer */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:12, borderTop:'1px solid var(--line-soft)' }}>
                <button
                  onClick={() => toggleActive(s)}
                  style={{
                    height:26, padding:'0 12px', borderRadius:99, border:'none', cursor:'pointer',
                    background: s.active ? 'rgba(93,138,110,0.12)' : 'var(--cream)',
                    color: s.active ? 'var(--ok)' : 'var(--ink-muted)',
                    fontSize:11.5, fontWeight:700, fontFamily:'inherit',
                  }}
                >
                  {s.active ? '● Activo' : '○ Inactivo'}
                </button>
                <button onClick={() => openEdit(s)} style={{ fontSize:12.5, color:'var(--ink-muted)', background:'none', border:'none', cursor:'pointer' }}>
                  Editar →
                </button>
              </div>
            </div>
          ))}

          {/* Empty */}
          {filtered.length === 0 && (
            <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'48px 24px', color:'var(--ink-muted)', fontSize:14 }}>
              No hay servicios en esta categoría.
            </div>
          )}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <Modal onClose={() => setShowForm(false)} title={editing ? 'Editar servicio' : 'Nuevo servicio'}>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <Field label="Nombre del servicio" value={name} onChange={setName} placeholder="Ej. Esmaltado Semi" />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <Field label="Categoría" value={category} onChange={setCategory} placeholder="Uñas" />
              <Field label="Duración (min)" type="number" value={duration} onChange={setDuration} placeholder="45" />
            </div>
            <Field label="Precio ($)" type="number" value={price} onChange={setPrice} placeholder="2500" />

            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'var(--cream)', borderRadius:12, cursor:'pointer' }} onClick={() => setIsActive(a => !a)}>
              <button
                className={`toggle ${isActive ? 'on' : ''}`}
                onClick={e => { e.stopPropagation(); setIsActive(a => !a); }}
              >
                <div className="toggle-dot" />
              </button>
              <span style={{ fontSize:13.5, color:'var(--ink)', fontWeight:500 }}>Servicio visible para clientas</span>
            </div>

            <div style={{ display:'flex', gap:10, marginTop:8 }}>
              <button className="btn btn-secondary btn-full" onClick={() => setShowForm(false)}>Cancelar</button>
              <button className="btn btn-primary btn-full" onClick={handleSave}>Guardar</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
