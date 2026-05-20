import { useState, useEffect } from 'react';
import { formatPrice } from '../data.js';
import { Badge } from '../components/UI.jsx';
import { supabase } from '../supabaseClient.js';

export default function DashboardPage({ onNavigate, user }) {
  const [todayApts, setTodayApts] = useState([]);
  const [metrics, setMetrics] = useState({ revenue: 0, appointments: 0, clients: 0, monthRevenue: 0 });
  const [weekData, setWeekData] = useState([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD en hora local, no UTC
  const firstName = user?.full_name?.trim().split(' ')[0] || 'Stefi';

  const greeting = (() => {
    const h = new Date().getHours();
    if (h >= 5  && h < 12) return 'Buen día';
    if (h >= 12 && h < 20) return 'Buenas tardes';
    return 'Buenas noches';
  })();

  const fmtDateLong = (iso) => {
    const d = new Date(iso + 'T00:00');
    const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const days   = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
    return `${days[d.getDay()]} ${d.getDate()} de ${months[d.getMonth()]}`;
  };

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      // Today's appointments
      const { data: apts } = await supabase
        .from('appointments')
        .select('*, profiles(full_name), services(name)')
        .eq('appointment_date', today)
        .order('start_time', { ascending: true });

      if (apts) {
        const formatted = apts.map(a => ({
          ...a,
          clientName:  a.profiles?.full_name || 'Clienta',
          serviceName: a.services?.name      || 'Servicio',
          time:        a.start_time?.slice(0, 5) || '',
        }));
        setTodayApts(formatted);
        const revenue = formatted
          .filter(a => a.status === 'completed' || a.status === 'confirmed')
          .reduce((s, a) => s + Number(a.total_price || 0), 0);
        setMetrics(m => ({ ...m, revenue, appointments: formatted.length }));
      }

      // Monthly revenue
      const ym = today.slice(0, 7);
      const { data: monthApts } = await supabase
        .from('appointments')
        .select('total_price, status')
        .gte('appointment_date', `${ym}-01`)
        .lte('appointment_date', `${ym}-31`);
      if (monthApts) {
        const monthRevenue = monthApts
          .filter(a => a.status !== 'cancelled')
          .reduce((s, a) => s + Number(a.total_price || 0), 0);
        setMetrics(m => ({ ...m, monthRevenue }));
      }

      // Total clients
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'client');
      setMetrics(m => ({ ...m, clients: count || 0 }));

      // Week sparkline (Mon-Sun of current week)
      const now = new Date(today);
      const dow = now.getDay();
      const mon = new Date(now); mon.setDate(now.getDate() - ((dow + 6) % 7));
      const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(mon); d.setDate(mon.getDate() + i);
        return d.toISOString().slice(0, 10);
      });
      const { data: wkApts } = await supabase
        .from('appointments')
        .select('appointment_date, total_price, status')
        .gte('appointment_date', weekDays[0])
        .lte('appointment_date', weekDays[6]);
      if (wkApts) {
        const labels = ['LUN','MAR','MIÉ','JUE','VIE','SÁB','DOM'];
        setWeekData(weekDays.map((d, i) => ({
          label: labels[i],
          date: d,
          total: wkApts.filter(a => a.appointment_date === d && a.status !== 'cancelled')
                       .reduce((s, a) => s + Number(a.total_price || 0), 0),
        })));
      }

      setLoading(false);
    }
    fetchData();
  }, [today]);

  const maxWeek = Math.max(...weekData.map(d => d.total), 1);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--line)', borderTopColor: 'var(--accent)', animation: 'spin .7s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeIn .4s ease' }}>

      {/* Greeting */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 1.4, color: 'var(--ink-muted)', fontWeight: 700 }}>
            STUDIO · {fmtDateLong(today).toUpperCase()}
          </div>
          <h1 style={{
            margin: '4px 0 0', fontFamily: 'var(--font-display)',
            fontWeight: 400, fontSize: 'clamp(32px,5vw,44px)',
            letterSpacing: -0.6, lineHeight: 1.05, color: 'var(--ink)',
          }}>
            {greeting}, <em style={{ color: 'var(--accent)' }}>{firstName}</em>
          </h1>
        </div>
        <button
          onClick={() => onNavigate?.('calendar')}
          style={{
            height: 38, padding: '0 18px', borderRadius: 99,
            border: '1px solid var(--line)', background: 'var(--surface)',
            fontFamily: 'inherit', fontSize: 13, color: 'var(--ink-soft)', cursor: 'pointer',
          }}
        >
          Ver calendario →
        </button>
      </div>

      {/* Income hero card + sparkline */}
      <div style={{
        background: 'var(--ink)', color: 'var(--bg)',
        borderRadius: 18, overflow: 'hidden',
        display: 'grid', gridTemplateColumns: '1fr auto',
      }}>
        <div style={{ padding: '22px 24px 18px' }}>
          <div style={{ fontSize: 11, letterSpacing: 1.4, color: 'var(--accent-soft)', fontWeight: 700 }}>INGRESOS DE HOY</div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(40px,8vw,60px)',
            lineHeight: 1, marginTop: 6,
            letterSpacing: -1.5,
          }}>
            {formatPrice(metrics.revenue)}
          </div>
          <div style={{ fontSize: 13, color: '#e0c8c8', marginTop: 4 }}>
            {metrics.appointments} turno{metrics.appointments !== 1 ? 's' : ''} agendado{metrics.appointments !== 1 ? 's' : ''}
          </div>
          {/* Sparkline */}
          {weekData.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginTop: 18, height: 52 }}>
              {weekData.map(d => {
                const isToday = d.date === today;
                const h = (d.total / maxWeek) * 40 + 6;
                return (
                  <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <div style={{
                      width: '100%', height: h, borderRadius: 3,
                      background: isToday ? 'var(--accent)' : 'rgba(245,211,214,0.3)',
                    }} />
                    <div style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.3 }}>{d.label}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* KPI strip */}
      <div className="kpi-row">
        <div className="kpi-cell">
          <div className="kpi-label">Este mes</div>
          <div className="kpi-value">{formatPrice(metrics.monthRevenue)}</div>
          <div className="kpi-sub">↑ activo</div>
        </div>
        <div className="kpi-cell">
          <div className="kpi-label">Clientas</div>
          <div className="kpi-value">{metrics.clients}</div>
          <div className="kpi-sub" style={{ color: 'var(--ink-muted)' }}>registradas</div>
        </div>
        <div className="kpi-cell">
          <div className="kpi-label">Hoy</div>
          <div className="kpi-value">{metrics.appointments}</div>
          <div className="kpi-sub" style={{ color: 'var(--ink-muted)' }}>turno{metrics.appointments !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {/* Today's agenda */}
      <div>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 14,
        }}>
          <div>
            <div style={{ fontSize: 10.5, letterSpacing: 1.2, color: 'var(--ink-muted)', fontWeight: 700 }}>HOY</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--ink)', marginTop: 2, letterSpacing: -0.3 }}>
              Próximos turnos
            </div>
          </div>
          <button
            onClick={() => onNavigate?.('calendar')}
            style={{ fontSize: 12.5, color: 'var(--accent-deep)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Ver calendario →
          </button>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {todayApts.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--ink-muted)', fontSize: 14 }}>
              Hoy descansás. ☕
            </div>
          ) : todayApts.map((a, i) => (
            <div
              key={a.id}
              style={{
                display: 'flex', gap: 16, padding: '14px 20px',
                alignItems: 'center',
                borderBottom: i === todayApts.length - 1 ? 'none' : '1px solid var(--line-soft)',
                cursor: 'pointer',
                transition: 'background var(--t)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-soft)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ width: 54, textAlign: 'center', flexShrink: 0 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--ink)', lineHeight: 1 }}>{a.time}</div>
                <div style={{ fontSize: 10, color: 'var(--ink-muted)', marginTop: 2 }}>
                  {a.services?.duration_minutes || '—'} min
                </div>
              </div>
              <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--line-soft)' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{a.clientName}</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-muted)', marginTop: 2 }}>{a.serviceName}</div>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--accent-deep)', marginRight: 10 }}>
                {formatPrice(Number(a.total_price || 0))}
              </div>
              <Badge status={a.status} />
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div style={{
        background: 'var(--cream)', borderRadius: 18,
        padding: '24px', textAlign: 'center',
      }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, marginBottom: 6, color: 'var(--ink)' }}>
          Acciones rápidas
        </h3>
        <p style={{ color: 'var(--ink-muted)', marginBottom: 20, fontSize: 13.5 }}>
          Gestioná tu estudio desde un solo lugar.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => onNavigate?.('clients')}
            style={{
              height: 42, padding: '0 20px', borderRadius: 99,
              border: '1px solid var(--line)', background: 'var(--surface)',
              fontFamily: 'inherit', fontSize: 13.5, color: 'var(--ink)', cursor: 'pointer',
            }}
          >
            + Nueva clienta
          </button>
          <button
            onClick={() => onNavigate?.('services')}
            style={{
              height: 42, padding: '0 20px', borderRadius: 99,
              border: '1px solid var(--line)', background: 'var(--surface)',
              fontFamily: 'inherit', fontSize: 13.5, color: 'var(--ink)', cursor: 'pointer',
            }}
          >
            + Nuevo servicio
          </button>
          <button
            onClick={() => onNavigate?.('calendar')}
            style={{
              height: 42, padding: '0 20px', borderRadius: 99,
              border: 'none', background: 'var(--ink)',
              fontFamily: 'inherit', fontSize: 13.5, color: 'var(--bg)',
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            Agendar turno
          </button>
        </div>
      </div>
    </div>
  );
}
