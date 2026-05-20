import { useState, useEffect, useRef } from 'react';
import { Modal, Field } from '../components/UI.jsx';
import { supabase } from '../supabaseClient.js';

export default function CatalogPage() {
  const [activeTab, setActiveTab]       = useState('Todos');
  const [showForm, setShowForm]         = useState(false);
  const [designs, setDesigns]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [uploading, setUploading]       = useState(false);

  const [title, setTitle]               = useState('');
  const [category, setCategory]         = useState('');
  const [imageFile, setImageFile]       = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileRef                         = useRef(null);

  const fetchDesigns = async () => {
    setLoading(true);
    const { data } = await supabase.from('designs').select('*').eq('active',true).order('created_at',{ascending:false});
    if (data) setDesigns(data);
    setLoading(false);
  };

  useEffect(() => { fetchDesigns(); }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!imageFile || !title) { alert('Elegí una imagen y ponle un título.'); return; }
    setUploading(true);
    try {
      const ext  = imageFile.name.split('.').pop();
      const path = `${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: ue } = await supabase.storage.from('catalog').upload(path, imageFile);
      if (ue) throw ue;
      const { data:{ publicUrl } } = supabase.storage.from('catalog').getPublicUrl(path);
      const { error: ie } = await supabase.from('designs').insert({ title, description:category, image_url:publicUrl, active:true });
      if (ie) throw ie;
      setShowForm(false); setTitle(''); setCategory(''); setImageFile(null); setImagePreview(null);
      fetchDesigns();
    } catch (err) { alert('Error: '+err.message); }
    finally { setUploading(false); }
  };

  const handleDelete = async (d) => {
    if (!confirm('¿Eliminar este diseño?')) return;
    try {
      const { error } = await supabase.from('designs').delete().eq('id',d.id);
      if (error) throw error;
      if (d.image_url?.includes('supabase.co')) {
        await supabase.storage.from('catalog').remove([d.image_url.split('/').pop()]);
      }
      fetchDesigns();
    } catch (err) { alert('Error: '+err.message); }
  };

  const categories = ['Todos', ...new Set(designs.map(d => d.description).filter(Boolean))];
  const filtered   = activeTab === 'Todos' ? designs : designs.filter(d => d.description === activeTab);

  return (
    <>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:28, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:10.5, letterSpacing:1.2, color:'var(--ink-muted)', fontWeight:700 }}>CATÁLOGO</div>
          <h1 style={{ fontFamily:'var(--font-display)', fontWeight:400, fontSize:'clamp(28px,4vw,38px)', letterSpacing:-0.5, lineHeight:1.1, color:'var(--ink)', marginTop:4 }}>
            Diseños
          </h1>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{ height:44, padding:'0 20px', borderRadius:99, border:'none', background:'var(--ink)', color:'var(--bg)', fontFamily:'inherit', fontSize:13.5, fontWeight:600, cursor:'pointer' }}
        >
          + Subir diseño
        </button>
      </div>

      {/* Pills */}
      <div className="pills-row">
        {categories.map(c => (
          <button key={c} className={`pill ${activeTab===c?'active':''}`} onClick={() => setActiveTab(c)}>{c}</button>
        ))}
      </div>

      {/* Gallery grid */}
      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:40 }}>
          <div style={{ width:24, height:24, borderRadius:'50%', border:'2px solid var(--line)', borderTopColor:'var(--accent)', animation:'spin .7s linear infinite' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 24px', background:'var(--surface)', borderRadius:20, border:'2px dashed var(--line)' }}>
          <div style={{ fontSize:48, marginBottom:16 }}>🎨</div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:24, color:'var(--ink)', marginBottom:8 }}>Sin diseños</div>
          <div style={{ fontSize:13.5, color:'var(--ink-muted)' }}>Subí un diseño para que aparezca aquí.</div>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:16 }}>
          {filtered.map(d => (
            <div key={d.id} className="magazine-design-card" style={{ position:'relative' }}>
              <div className="magazine-design-img-wrapper">
                <img src={d.image_url} alt={d.title} />
              </div>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
                <div>
                  <div className="magazine-design-name">{d.title}</div>
                  {d.description && <div className="magazine-design-desc">{d.description}</div>}
                </div>
                <button
                  onClick={() => handleDelete(d)}
                  style={{ width:28, height:28, borderRadius:'50%', background:'rgba(169,74,74,0.1)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--danger)', flexShrink:0, marginTop:2 }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload modal */}
      {showForm && (
        <Modal onClose={() => setShowForm(false)} title="Subir diseño" maxWidth={460}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <input type="file" ref={fileRef} onChange={handleFileSelect} accept="image/*" style={{ display:'none' }} />
            <div
              onClick={() => fileRef.current.click()}
              style={{ border:`2px dashed ${imagePreview ? 'transparent':'var(--accent)'}`, borderRadius:16, cursor:'pointer', overflow:'hidden', aspectRatio:'4/5', background:'var(--cream)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}
            >
              {imagePreview ? (
                <img src={imagePreview} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="Preview" />
              ) : (
                <>
                  <div style={{ fontSize:36, marginBottom:10 }}>🎨</div>
                  <div style={{ fontSize:13.5, fontWeight:600, color:'var(--accent)' }}>Subir imagen</div>
                  <div style={{ fontSize:12, color:'var(--ink-muted)', marginTop:4 }}>JPG · PNG · WebP</div>
                </>
              )}
            </div>
            <Field label="Título" value={title} onChange={setTitle} placeholder="Ej. Francesitas Neón" />
            <Field label="Categoría" value={category} onChange={setCategory} placeholder="Ej. Arte" />
            <div style={{ display:'flex', gap:10, marginTop:4 }}>
              <button className="btn btn-secondary btn-full" onClick={() => setShowForm(false)}>Cancelar</button>
              <button className="btn btn-primary btn-full" onClick={handleUpload} disabled={uploading}>
                {uploading ? 'Subiendo…' : 'Publicar'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
