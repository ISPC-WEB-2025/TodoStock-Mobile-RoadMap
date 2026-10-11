/**
 * Configuración de autenticación para acceso de equipo a TodoStock Mobile Roadmap.
 *
 * Usuario requerido: "CodeLab"
 * Clave por defecto configurada: "codelab2025" (hash SHA-256 precalculado).
 * Para cambiar la clave por la tuya:
 * 1. Generá el SHA-256 de tu clave (ej. usando: echo -n "tu_clave" | sha256sum o en una herramienta online).
 * 2. Reemplazá el valor de DEFAULT_SHA256_HASH a continuación.
 */

export const AUTH_CONFIG = {
  REQUIRED_USERNAME: 'CodeLab',
  // Se lee de la variable de entorno VITE_ROADMAP_PASSWORD_HASH
  // Localmente: desde tu archivo .env.local (ignorado por git)
  // En GitHub Pages: configurado como Secret en Settings -> Secrets and variables -> Actions
  DEFAULT_SHA256_HASH: import.meta.env.VITE_ROADMAP_PASSWORD_HASH || '',
};

/**
 * Calcula el SHA-256 de un texto usando Web Crypto API nativo del navegador.
 */
export async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Valida credenciales ingresadas.
 */
export async function validateCredentials(username, password) {
  if (username.trim().toLowerCase() !== AUTH_CONFIG.REQUIRED_USERNAME.toLowerCase()) {
    return false;
  }
  const inputHash = await sha256(password);
  return inputHash.toLowerCase() === AUTH_CONFIG.DEFAULT_SHA256_HASH.toLowerCase();
}
