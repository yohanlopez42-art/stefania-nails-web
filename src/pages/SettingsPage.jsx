import { useState, useEffect, useRef } from 'react';
import { Field, Spinner } from '../components/UI.jsx';
import { supabase } from '../supabaseClient.js';

export default function SettingsPage() {
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [hero, setHero]                 = useState({ image_url:'', title_line1:'', title_line2:'', button_text:'RESERVAR TURNO' });
  const [imageFile, setImageFile]       = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileRef                         = useRef(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('hero_config').select('*').order('created_at',{ascending:false}).limit(1).single();
      if (data) { setHero(data); setImagePreview(data.image_url); }
      setLoading(false);
    })();
  }, []);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let finalUrl = hero.image_url;
      if (imageFile) {
        const ext  = imageFile.name.split('.').pop();
        const path = `${Date.now()}.${ext}`;
        const { error: ue } = await supabase.storage.from('hero').upload(path, imageFile, { contentType:imageFile.type });
        if (ue) throw ue;
        const { data:{ publicUrl } } = supabase.storage.from('hero').getPublicUrl(path);
        finalUrl = publicUrl;
      }
      const { error } = await supabase.from('hero_config').insert({ image_url:finalUrl, title_line1:hero.title_line1, title_line2:hero.title_line2, button_text:hero.button_text });
      if (error) throw error;
      alert('¡Configuración guardada!');
      // refresh
      const { data } = await supabase.from('hero_config').select('*').order('created_at',{ascending:false}).limit(1).single();
      if (data) { setHero(data); setImagePreview(data.image_url); }
    } catch (err) { alert('Error: '+err.message); }
    finally { setSaving(false); }
  };

  if (loading) return <Spinner />;

  return (
    <>
      {/* Header */}
      <div style={{ marginBottom:32 }}>
        <div style={{ fontSize:10.5, letterSpacing:1.2, color:'var(--ink-muted)', fontWeight:700 }}>ADMINISTRACIÓN</div>
        <h1 style={{ fontFamily:'var(--font-display)', fontWeight:400, fontSize:'clamp(28px,4vw,38px)', letterSpacing:-0.5, lineHeight:1.1, color:'var(--ink)', marginTop:4 }}>
          Configuración
        </h1>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, alignItems:'start' }}>

        {/* Form card */}
        <div className="card" style={{ padding:28 }}>
          <div style={{ fontSize:10.5, letterSpacing:1.2, color:'var(--ink-muted)', fontWeight:700, marginBottom:6 }}>BANNER PRINCIPAL</div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:22, color:'var(--ink)', marginBottom:24 }}>Hero del portal de clientas</div>

          {/* Image upload */}
          <input type="file" ref={fileRef} onChange={handleFile} accept="image/*" style={{ display:'none' }} />
          <div
            onClick={() => fileRef.current.click()}
            style={{ borderRadius:14, border:`2px dashed ${imagePreview ? 'transparent':'var(--accent)'}`, cursor:'pointer', overflow:'hidden', aspectRatio:'16/9', background:'var(--cream)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:20, position:'relative' }}
          >
            {imagePreview ? (
              <>
                <img src={imagePreview} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} alt="preview" />
                <div style={{ position:'absolute', inset:0, background:'rgba(43,29,29,0.35)', display:'flex', alignItems:'center', justifyContent:'center', opacity:0, transition:'opacity .2s' }}
                  onMouseEnter={e => e.currentTarget.style.opacity=1}
                  onMouseLeave={e => e.currentTarget.style.opacity=0}
                >
                  <span style={{ color:'#fff', fontSize:13, fontWeight:600 }}>Cambiar imagen</span>
                </div>
              </>
            ) : (
              <div style={{ textAlign:'center', padding:20 }}>
                <div style={{ fontSize:32, marginBottom:8 }}>🖼️</div>
                <div style={{ fontSize:13.5, fontWeight:600, color:'var(--accent)' }}>Subir imagen de fondo</div>
                <div style={{ fontSize:12, color:'var(--ink-muted)', marginTop:4 }}>Recomendado 1920×1080px</div>
              </div>
            )}
          </div>

          {/* Text fields */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <Field label="Título línea 1" value={hero.title_line1} onChange={v => setHero({...hero, title_line1:v})} placeholder="El Arte en tus" />
            <Field label="Título línea 2" value={hero.title_line2} onChange={v => setHero({...hero, title_line2:v})} placeholder="Manos" />
            <Field label="Texto del botón" value={hero.button_text} onChange={v => setHero({...hero, button_text:v})} placeholder="RESERVAR TURNO" />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            style={{ marginTop:24, width:'100%', height:48, borderRadius:99, border:'none', background:'var(--ink)', color:'var(--bg)', fontFamily:'inherit', fontSize:14, fontWeight:600, cursor:saving?'not-allowed':'pointer', opacity:saving?.7:1 }}
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>

        {/* Live preview card */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div className="card" style={{ padding:'16px 20px' }}>
            <div style={{ fontSize:10.5, letterSpacing:1.2, color:'var(--ink-muted)', fontWeight:700, marginBottom:4 }}>VISTA PREVIA</div>
            <div style={{ fontSize:12, color:'var(--ink-muted)' }}>Así verán las clientas el banner de inicio</div>
          </div>

          {/* Mini hero preview */}
          <div style={{ borderRadius:18, overflow:'hidden', position:'relative', aspectRatio:'16/10', background:'var(--cream)', boxShadow:'var(--shadow-md)' }}>
            {imagePreview && (
              <img src={imagePreview} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block', position:'absolute', inset:0 }} alt="" />
            )}
            <div style={{
              position:'absolute', inset:0,
              background:'linear-gradient(to right, rgba(43,29,29,0.4) 0%, transparent 70%)',
              display:'flex', flexDirection:'column', justifyContent:'center',
              padding:'24px 28px',
            }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:'clamp(18px,3vw,28px)', lineHeight:1.1, color:'#fff', textShadow:'0 2px 8px rgba(43,29,29,0.3)', marginBottom:16 }}>
                {hero.title_line1 || 'El Arte en tus'}<br/>{hero.title_line2 || 'Manos'}
              </div>
              <div style={{ display:'inline-flex', background:'var(--ink)', color:'var(--bg)', padding:'10px 20px', borderRadius:99, fontSize:11, fontWeight:700, letterSpacing:1, width:'fit-content' }}>
                {hero.button_text || 'RESERVAR TURNO'}
              </div>
            </div>
          </div>

          {/* Info card */}
          <div className="card" style={{ padding:'16px 20px', background:'var(--cream)' }}>
            <div style={{ fontSize:10.5, letterSpacing:1.2, color:'var(--ink-muted)', fontWeight:700, marginBottom:8 }}>INFORMACIÓN</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {[
                ['Imagen', 'Se guarda en Supabase Storage'],
                ['Cambios', 'Se aplican en tiempo real al portal'],
                ['Formato', 'JPG o PNG, min. 1920×1080px'],
              ].map(([k,v]) => (
                <div key={k} style={{ display:'flex', gap:8, fontSize:12.5, color:'var(--ink-soft)' }}>
                  <span style={{ color:'var(--ink-muted)', minWidth:60 }}>{k}</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Responsive */}
      <style>{`@media (max-width: 900px) { .settings-grid { grid-template-columns: 1fr !important; } }`}</style>
    </>
  );
}
