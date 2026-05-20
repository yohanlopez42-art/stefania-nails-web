// === MOCK DATA ===

export const SERVICES = [
  { id: 1, name: 'Esmaltado Semipermanente', price: 2500, duration: 45, active: true, category: 'Uñas', image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80' },
  { id: 2, name: 'Manicura Clásica', price: 1800, duration: 30, active: true, category: 'Manicura', image: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=400&q=80' },
  { id: 3, name: 'Escultura de Gel', price: 4200, duration: 90, active: true, category: 'Escultura', image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80' },
  { id: 4, name: 'Pedicura Spa', price: 3000, duration: 60, active: true, category: 'Pedicura', image: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=400&q=80' },
  { id: 5, name: 'Nail Art Premium', price: 3500, duration: 75, active: false, category: 'Arte', image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&q=80' },
  { id: 6, name: 'Kapping', price: 2800, duration: 50, active: true, category: 'Uñas', image: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=400&q=80' },
];

export const CLIENTS = [
  { id: 1, name: 'Valentina Ruiz', email: 'vale@mail.com', phone: '11-4444-5555', totalSpent: 28400, visits: 12, lastVisit: '2025-04-15', initials: 'VR' },
  { id: 2, name: 'Sofía Méndez', email: 'sofi@mail.com', phone: '11-2222-3333', totalSpent: 15200, visits: 7, lastVisit: '2025-04-20', initials: 'SM' },
  { id: 3, name: 'Camila Torres', email: 'cami@mail.com', phone: '11-6666-7777', totalSpent: 42600, visits: 18, lastVisit: '2025-04-22', initials: 'CT' },
  { id: 4, name: 'Luciana Pérez', email: 'luci@mail.com', phone: '11-8888-9999', totalSpent: 9800, visits: 4, lastVisit: '2025-03-30', initials: 'LP' },
  { id: 5, name: 'Martina López', email: 'marti@mail.com', phone: '11-1111-2222', totalSpent: 33100, visits: 14, lastVisit: '2025-04-18', initials: 'ML' },
];

export const APPOINTMENTS = [
  { id: 1, clientId: 1, clientName: 'Valentina Ruiz', serviceId: 1, serviceName: 'Esmaltado Semipermanente', date: '2025-05-02', time: '10:00', duration: 45, price: 2500, status: 'confirmed' },
  { id: 2, clientId: 2, clientName: 'Sofía Méndez', serviceId: 3, serviceName: 'Escultura de Gel', date: '2025-05-02', time: '11:30', duration: 90, price: 4200, status: 'pending' },
  { id: 3, clientId: 3, clientName: 'Camila Torres', serviceId: 2, serviceName: 'Manicura Clásica', date: '2025-05-02', time: '14:00', duration: 30, price: 1800, status: 'confirmed' },
  { id: 4, clientId: 4, clientName: 'Luciana Pérez', serviceId: 4, serviceName: 'Pedicura Spa', date: '2025-05-03', time: '09:00', duration: 60, price: 3000, status: 'confirmed' },
  { id: 5, clientId: 5, clientName: 'Martina López', serviceId: 1, serviceName: 'Esmaltado Semipermanente', date: '2025-05-01', time: '16:00', duration: 45, price: 2500, status: 'completed' },
  { id: 6, clientId: 1, clientName: 'Valentina Ruiz', serviceId: 6, serviceName: 'Kapping', date: '2025-04-25', time: '11:00', duration: 50, price: 2800, status: 'cancelled' },
];

export const DESIGNS = [
  { id: 1, name: 'French Romántico', category: 'Clásico', image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&q=80' },
  { id: 2, name: 'Floral Primavera', category: 'Arte', image: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=600&q=80' },
  { id: 3, name: 'Nude Degradé', category: 'Gel', image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&q=80' },
  { id: 4, name: 'Glitter Navideño', category: 'Temporada', image: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=600&q=80' },
  { id: 5, name: 'Marble Chic', category: 'Tendencia', image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&q=80' },
  { id: 6, name: 'Chrome Mirror', category: 'Tendencia', image: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=600&q=80' },
];

export const STATUS_LABELS = {
  confirmed: 'Confirmado',
  pending: 'Pendiente',
  cancelled: 'Cancelado',
  completed: 'Completado',
};

export const STATUS_CLASSES = {
  confirmed: 'badge-confirmed',
  pending: 'badge-pending',
  cancelled: 'badge-cancelled',
  completed: 'badge-completed',
};

export const formatPrice = (n) => `$${n.toLocaleString('es-AR')}`;
export const formatDate = (d) => {
  const date = new Date(d + 'T00:00:00');
  return date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
};
