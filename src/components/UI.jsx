import { STATUS_LABELS, STATUS_CLASSES } from '../data.js';

export function Badge({ status, children }) {
  const label = children || STATUS_LABELS[status] || status;
  const cls   = STATUS_CLASSES[status] || 'badge-completed';
  return <span className={`badge ${cls}`}>{label}</span>;
}

export function Modal({ onClose, title, children, maxWidth = 440 }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth }} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
          <span className="modal-title">{title}</span>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:99, border:'1px solid var(--line-soft)', background:'var(--cream)', cursor:'pointer', display:'grid', placeItems:'center', color:'var(--ink-muted)', fontSize:13 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, type = 'text', value, onChange, placeholder, rows }) {
  return (
    <div className="field">
      {label && <label>{label}</label>}
      {rows ? (
        <textarea rows={rows} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ resize:'vertical' }} />
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </div>
  );
}

export function Spinner() {
  return (
    <div style={{ display:'flex', justifyContent:'center', padding:24 }}>
      <div style={{ width:24, height:24, borderRadius:'50%', border:'2px solid var(--line)', borderTopColor:'var(--accent)', animation:'spin .7s linear infinite' }} />
    </div>
  );
}

// Legacy exports still used in a few places
export function Avatar({ initials, name, size = '' }) {
  const letters = initials || (name ? name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() : '?');
  return <div className={`avatar ${size}`}>{letters}</div>;
}

export function EmptyState({ icon, title, subtitle, action, onAction }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <h3>{title}</h3>
      {subtitle && <p>{subtitle}</p>}
      {action && <button className="btn btn-primary btn-sm" onClick={onAction} style={{ marginTop:4 }}>{action}</button>}
    </div>
  );
}

export function SearchBar({ value, onChange, placeholder = 'Buscar...' }) {
  return (
    <div className="search-bar">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-muted)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
