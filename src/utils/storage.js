const OVERRIDES_STORAGE_KEY = 'todostock_roadmap_manual_overrides_v1';
const AUTH_STORAGE_KEY = 'todostock_roadmap_auth_session_v1';

/**
 * Obtiene los overrides locales guardados en localStorage.
 * Estructura: { [nodeId]: 'COMPLETED' | 'OPEN' }
 */
export function getLocalOverrides() {
  try {
    const raw = localStorage.getItem(OVERRIDES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Error leyendo overrides de localStorage:', e);
    return {};
  }
}

/**
 * Guarda o actualiza el override local de una issue.
 */
export function setLocalOverride(nodeId, newStatus) {
  try {
    const current = getLocalOverrides();
    if (newStatus === null) {
      delete current[nodeId];
    } else {
      current[nodeId] = newStatus;
    }
    localStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(current));
    return current;
  } catch (e) {
    console.error('Error guardando override en localStorage:', e);
    return {};
  }
}

/**
 * Limpia todos los overrides locales y restablece a la fuente de la verdad de GitHub.
 */
export function clearAllLocalOverrides() {
  try {
    localStorage.removeItem(OVERRIDES_STORAGE_KEY);
  } catch (e) {
    console.error('Error limpiando overrides:', e);
  }
}

/**
 * Manejo de sesión de autenticación.
 */
export function isSessionAuthenticated() {
  try {
    const token = sessionStorage.getItem(AUTH_STORAGE_KEY) || localStorage.getItem(AUTH_STORAGE_KEY);
    return Boolean(token);
  } catch (e) {
    return false;
  }
}

export function saveSessionAuth(remember = true) {
  const token = 'auth_' + Date.now();
  if (remember) {
    localStorage.setItem(AUTH_STORAGE_KEY, token);
  } else {
    sessionStorage.setItem(AUTH_STORAGE_KEY, token);
  }
}

export function clearSessionAuth() {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (e) {
    console.error('Error cerrando sesión:', e);
  }
}
