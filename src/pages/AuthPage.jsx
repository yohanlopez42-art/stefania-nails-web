import { useState } from 'react';
import { supabase } from '../supabaseClient.js';

export default function AuthPage({ onLogin }) {
  const [mode, setMode]       = useState('login');
  const [email, setEmail]     = useState('');
  const [password, setPass]   = useState('');
  const [name, setName]       = useState('');
  const [phone, setPhone]     = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Completá todos los campos.'); return; }
    if (mode === 'register' && password !== confirm) { setError('Las contraseñas no coinciden.'); return; }
    setError(''); setLoading(true);

    if (mode === 'login') {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) setError(err.message);
      else if (data.session) onLogin(data.session);
    } else {
      const { data, error: err } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: name, phone } },
      });
      if (err) setError(err.message);
      else if (!data.session) setError('Revisá tu correo para confirmar el registro.');
      else onLogin(data.session);
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: 52,
            lineHeight: 1,
            color: 'var(--ink)',
            letterSpacing: -1.5,
          }}>
            stefania
          </div>
          <div style={{
            fontSize: 11, letterSpacing: 8,
            color: 'var(--accent)', marginTop: 8, fontWeight: 600,
          }}>
            · N A I L S ·
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--surface)',
          borderRadius: 24,
          padding: '28px 24px',
          border: '1px solid var(--line-soft)',
          boxShadow: 'var(--shadow-md)',
        }}>
          <h2 style={{
            margin: '0 0 4px',
            fontFamily: 'var(--font-display)',
            fontWeight: 400,
            fontSize: 28,
            color: 'var(--ink)',
          }}>
            {mode === 'login' ? 'Hola de nuevo' : 'Sumate al estudio'}
          </h2>
          <p style={{ margin: '0 0 20px', fontSize: 13.5, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
            {mode === 'login'
              ? 'Iniciá sesión para reservar tu próximo turno.'
              : 'Reservá, cancelá y mirá tu historial sin escribir por WhatsApp.'}
          </p>

          {error && (
            <div style={{
              background: 'var(--error-bg)',
              border: '1px solid rgba(169,74,74,0.25)',
              borderRadius: 12, padding: '10px 14px',
              marginBottom: 16, fontSize: 13, color: 'var(--danger)',
            }}>
              ⚠ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {mode === 'register' && (
              <>
                <AuthField label="Nombre completo" value={name} onChange={setName} placeholder="Camila Rivero" />
                <AuthField label="Teléfono" type="tel" value={phone} onChange={setPhone} placeholder="+54 11 ..." />
              </>
            )}
            <AuthField label="Email" type="email" value={email} onChange={setEmail} placeholder="hola@correo.com" />
            <AuthField label="Contraseña" type="password" value={password} onChange={setPass} placeholder="Mínimo 8 caracteres" />
            {mode === 'register' && (
              <AuthField label="Confirmar contraseña" type="password" value={confirm} onChange={setConfirm} placeholder="••••••••" />
            )}

            {mode === 'register' && (
              <div style={{
                background: 'var(--cream)', borderRadius: 14,
                padding: '12px 14px', fontSize: 12.5,
                color: 'var(--accent-deep)', lineHeight: 1.5,
              }}>
                Tus datos solo los ve Stefania. No compartimos información con terceros.
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                height: 52, borderRadius: 99, border: 'none',
                background: 'var(--ink)', color: 'var(--bg)',
                fontFamily: 'inherit', fontSize: 15, fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1, marginTop: 4,
                transition: 'opacity .15s',
              }}
            >
              {loading ? 'Cargando…' : mode === 'login' ? 'Ingresar' : 'Crear mi cuenta'}
            </button>

          </form>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13.5, color: 'var(--ink-muted)' }}>
            {mode === 'login' ? (
              <>¿Primera vez?{' '}
                <button onClick={() => { setMode('register'); setError(''); }}
                  style={{ color: 'var(--accent-deep)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontSize: 'inherit' }}>
                  Crear cuenta
                </button>
              </>
            ) : (
              <>¿Ya tenés cuenta?{' '}
                <button onClick={() => { setMode('login'); setError(''); }}
                  style={{ color: 'var(--accent-deep)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontSize: 'inherit' }}>
                  Ingresar
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthField({ label, type = 'text', value, onChange, placeholder }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 12.5, color: 'var(--ink-soft)', letterSpacing: 0.2 }}>{label}</span>
      <div style={{
        display: 'flex', alignItems: 'center',
        background: 'var(--surface)', border: '1px solid var(--line)',
        borderRadius: 14, padding: '0 14px', height: 48,
      }}>
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            flex: 1, height: '100%', border: 'none', outline: 'none',
            background: 'transparent', fontFamily: 'inherit',
            fontSize: 14.5, color: 'var(--ink)',
          }}
        />
      </div>
    </label>
  );
}
