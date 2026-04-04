// app/utils/colors.js
// Centralisation du mapping hex -> classe CSS pour les machines

const HEX_TO_CLASS = {
  '#60A5FA': 'c-blue',
  '#22D3EE': 'c-cyan',
  '#34D399': 'c-cyan',
  '#F59E0B': 'c-orange',
  '#7A1B3C': 'c-bordeaux',
  '#8B1E3F': 'c-bordeaux',
  '#EF4444': 'c-bordeaux',
  '#A78BFA': 'c-violet',
  '#14B8A6': 'c-turquoise',
  '#F472B6': 'c-pink',
  '#FACC15': 'c-yellow',  
  '#6366F1': 'c-indigo',  
  '#6B7280': 'c-gray',    
  '': 'c-none',
};

export function normalizeMachineColor(hex) {
  const key = String(hex || '').trim().toUpperCase();
  if (!key) return '';
  if (key === '#34D399') return '#22D3EE';
  if (key === '#EF4444') return '#7A1B3C';
  if (key === '#8B1E3F') return '#7A1B3C';
  return key;
}

export function colorClass(hex) {
  const key = String(hex || '').trim().toUpperCase();
  return HEX_TO_CLASS[key] || 'c-none';
}
