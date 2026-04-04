// app/utils/identity.js

// Nom unique de la clé dans le localStorage
export const LS_IDENTITY = 'uu_identity';

// Lecture de l'identity depuis le localStorage
export function readIdentity() {
  try {
    const raw = localStorage.getItem(LS_IDENTITY) || '{}';
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

// Écriture de l'identity dans le localStorage
export function writeIdentity(next) {
  try {
    const serialized = JSON.stringify(next || {}, null, 2);
    localStorage.setItem(LS_IDENTITY, serialized);
  } catch (e) {
    console.error('Failed to write uu_identity to localStorage', e);
  }
}