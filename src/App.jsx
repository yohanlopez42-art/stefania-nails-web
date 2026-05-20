import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.js';
import AuthPage from './pages/AuthPage.jsx';
import AdminLayout from './AdminLayout.jsx';
import ClientView from './pages/ClientView.jsx';

export default function App() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null); // 'admin' | 'client' | null
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserData(session.user.id, session);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserData(session.user.id, session);
      else {
        setRole(null);
        setUserData(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchUserData(userId, sessionObj) {
    let { data, error } = await supabase
      .from('profiles')
      .select('id, role, full_name')
      .eq('id', userId)
      .single();

    if (!data && sessionObj?.user) {
      // If profile is missing, auto-create a basic one
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          full_name: sessionObj.user.user_metadata?.full_name || 'Usuario',
          email: sessionObj.user.email,
          role: 'client'
        })
        .select()
        .single();
      
      if (!insertError) data = newProfile;
    }

    if (data) {
      setRole(data.role);
      setUserData(data);
    } else {
      setRole('client'); // default fallback
      setUserData({ id: userId, full_name: 'Usuario', role: 'client' });
    }
    setLoading(false);
  }

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--text)' }}>Cargando...</div>;
  }

  if (!session) return <AuthPage onLogin={setSession} />;
  
  if (role === 'admin') return <AdminLayout onLogout={() => supabase.auth.signOut()} user={userData} />;
  
  return <ClientView onLogout={() => supabase.auth.signOut()} user={userData} />;
}
