import { useState, useEffect, useRef } from 'react';
import { Modal, Field } from '../components/UI.jsx';
import { supabase } from '../supabaseClient.js';

export default function CollectionsPage() {
  const [showForm, setShowForm]         = useState(false);
  const [collections, setCollections]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [uploading, setUploading]       = useState(false);

  const [title, setTitle]               = useState('');
  const [description, setDescription]   = useState('');
  const [imageFile, setImageFile]       = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileRef                         = useRef(null);

  const fetchCollections = async () => {
    setLoading(true);
    const { data } = await supabase.from('collections').select('*').order('created_at',{ascending:false});
    if (data) setCollections(data);
    setLoading(false);
  };

  useEffect(() => { fetchCollections(); }, []);

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
      const { error: ue } = await supabase.storage.from('collections').upload(path, imageFile);
      if (ue) throw ue;
      const { data:{ publicUrl } } = supabase.storage.from('collections').getPublicUrl(path);
      const { error: ie } = await supabase.from('collections').insert({ title, description, image_url:publicUrl });
      if (ie) throw ie;
      setShowForm(false); setTitle(''); setDescription(''); setImageFile(null); setImagePreview(null);
      fetchCollections();
    } catch (err) { alert('Error: '+err.message); }
    finally { setUploading(false); }
  };

  const handleDelete = async (c) => {
    if (!confirm('¿Eliminar esta colección?')) return;
    try {
      const { error } = await supabase.from('collections').delete().eq('id',c.id);
      if (error) throw error;
      if (c.image_url?.includes('supabase.co')) {
        const path = c.image_url.split('/').pop();
        await supabase.storage.from('collections').remove([path]);
      }
      fetchCollections();
    } catch (err) { alert('Error: '+err.message); }
  };

  return (
    <>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:28, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:10.5, letterSpacing:1.2, color:'var(--ink-muted)', fontWeight:700 }}>GALERÍA</div>
          <h1 style={{ fontFamily:'var(--font-display)', fontWeight:400, fontSize:'clamp(28px,4vw,38px)', letterSpacing:-0.5, lineHeight:1.1, color:'var(--ink)', marginTop:4 }}>
            Diseños
          </h1>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{ height:44, padding:'0 20px', borderRadius:99, border:'none', background:'var(--ink)', color:'var(--bg)', fontFamily:'inherit', fontSize:13.5, fontWeight:600, cursor:'pointer' }}
        >
          + Nueva colección
        </button>
      </div>

      <p style={{ fontSize:13, color:'var(--ink-muted)', marginBottom:28, lineHeight:1.5 }}>
        Estas imágenes aparecen en la galería pública del estudio.
      </p>

      {/* Grid */}
      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:40 }}>
          <div style={{ width:24, height:24, borderRadius:'50%', border:'2px solid var(--line)', borderTopColor:'var(--accent)', animation:'spin .7s linear infinite' }} />
        </div>
      ) : collections.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 24px', background:'var(--surface)', borderRadius:20, border:'2px dashed var(--line)' }}>
          <div style={{ fontSize:48, marginBottom:16 }}>📸</div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:24, color:'var(--ink)', marginBottom:8 }}>Sin colecciones</div>
          <div style={{ fontSize:13.5, color:'var(--ink-muted)' }}>Subí una foto para mostrar tu trabajo.</div>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:20 }}>
          {collections.map(c => (
            <div key={c.id} style={{ borderRadius:20, overflow:'hidden', background:'var(--surface)', border:'1px solid var(--line-soft)', position:'relative', boxShadow:'var(--shadow-sm)' }}>
              <div style={{ aspectRatio:'4/3', overflow:'hidden', background:'var(--cream)' }}>
                <img
                  src={c.image_url} alt={c.title}
                  style={{ width:'100%', height:'100%', objectFit:'cover', display:'block', transition:'transform .4s ease' }}
                  onMouseEnter={e => e.target.style.transform='scale(1.04)'}
                  onMouseLeave={e => e.target.style.transform='scale(1)'}
                />
              </div>
              <div style={{ padding:'14px 16px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:18, color:'var(--ink)', lineHeight:1.2 }}>{c.title}</div>
                    {c.description && <div style={{ fontSize:12.5, color:'var(--ink-muted)', marginTop:4, lineHeight:1.4 }}>{c.description}</div>}
                  </div>
                  <button
                    onClick={() => handleDelete(c)}
                    style={{ width:32, height:32, borderRadius:'50%', background:'rgba(169,74,74,0.1)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--danger)', flexShrink:0, marginLeft:10 }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload modal */}
      {showForm && (
        <Modal onClose={() => setShowForm(false)} title="Nueva colección" maxWidth={480}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <input type="file" ref={fileRef} onChange={handleFileSelect} accept="image/*" style={{ display:'none' }} />

            <div
              onClick={() => fileRef.current.click()}
              style={{
                border: `2px dashed ${imagePreview ? 'transparent' : 'var(--accent)'}`,
                borderRadius:16, cursor:'pointer', overflow:'hidden',
                aspectRatio:'16/10', background:'var(--cream)',
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
              }}
            >
              {imagePreview ? (
                <img src={imagePreview} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="Preview" />
              ) : (
                <>
                  <div style={{ fontSize:36, marginBottom:10 }}>🖼️</div>
                  <div style={{ fontSize:14, fontWeight:600, color:'var(--accent)' }}>Subir imagen</div>
                  <div style={{ fontSize:12, color:'var(--ink-muted)', marginTop:4 }}>Recomendado 1200×800px</div>
                </>
              )}
            </div>

            <Field label="Título" value={title} onChange={setTitle} placeholder="Ej. Marmolado Lilac" />
            <Field label="Descripción (opcional)" value={description} onChange={setDescription} placeholder="Esmaltado Semipermanente + Nail Art" rows={2} />

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
