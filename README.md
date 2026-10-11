# 🗺️ TodoStock Mobile — Roadmap DAG Dinámico

Aplicación web interactiva que representa el backlog de **~90 issues abiertas** del repositorio [TodoStock-AppMovil](https://github.com/ISPC-WEB-2025/TodoStock-AppMovil) en forma de **Grafo Acíclico Dirigido (DAG)**, mostrando visualmente qué tareas bloquean a cuáles para coordinar al equipo sin cuellos de botella ni bloqueos mutuos.

---

## 🚀 Características Principales

1. **Visualización de Nodos y Dependencias en Grafo:**
   - 🟢 **Completada:** Issue cerrada en GitHub (verde esmeralda con tilde).
   - 🔵 **¡Lista para tomar hoy!:** Issue abierta cuyas precondiciones técnicas ya están 100% completas (borde cian vibrante con animación).
   - ⚪ **Bloqueada:** Issue abierta que depende de otra(s) aún no terminada(s) (nodo apagado con candado 🔒 indicando qué issue la bloquea).
2. **Líneas de Conexión Dinámicas:**
   - **Activa (Energizada):** La issue condición origen ya está completada.
   - **Inactiva (Atenuada / Discontinua):** La issue condición origen sigue abierta.
3. **Filtros Avanzados en la Barra Superior:**
   - 👤 **Filtro por Asignado:** Ver las tareas de cada integrante (Miguel, Virginia, Candelaria, Pedro, Aylen) o las "Sin asignar".
   - 🏷️ **Filtro por Label:** Ciberseguridad, Testing, Automatización, etc.
   - 🚦 **Filtro por Estado:** Solo desbloqueadas listas para empezar, solo bloqueadas o todas.
   - 🔍 **Buscador Dinámico:** Búsqueda en tiempo real por número `#102`, código `#TK48` o palabras clave.
4. **Simulación Manual Local ("What-If"):**
   - Hacé click en cualquier nodo para simular su cierre o reapertura.
   - El grafo **recalcula las dependencias al instante** en el navegador, prendiendo las líneas y desbloqueando las issues hijas.
   - Se guarda en el `localStorage` del navegador sin tocar GitHub ni comprometer seguridad.
   - Incluye botón **"Restablecer"** para volver a la fuente de la verdad de GitHub en 1 click.
5. **Acceso Seguro con Contraseña (SHA-256):**
   - Pantalla de acceso inicial para que solo el equipo pueda ver el estado.
   - Usuario: `CodeLab`
   - Clave validada criptográficamente con hash SHA-256 en el cliente (100% compatible con GitHub Pages).

---

## 🛠️ Stack Tecnológico

- **Frontend:** React 18, Vite, `@xyflow/react` (React Flow), Tailwind CSS, Lucide Icons, Dagre.
- **Sincronización:** Node.js (ESM, `scripts/sync-roadmap.mjs`) que procesa la API de GitHub o snapshots locales.
- **CI/CD:** GitHub Actions (`.github/workflows/deploy-pages.yml`) desplegando automáticamente en GitHub Pages.

---

## 📦 Instalación y Uso Local

```bash
# 1. Clonar el repositorio
git clone https://github.com/ISPC-WEB-2025/TodoStock-Mobile-RoadMap.git
cd TodoStock-Mobile-RoadMap

# 2. Instalar dependencias
npm install

# 3. Iniciar el servidor de desarrollo local
npm run dev
```

La aplicación abrirá `http://localhost:5173`.
Credenciales de acceso:
- **Usuario:** `CodeLab`
- **Contraseña:** La configurada en tu `.env.local` (ver instrucciones abajo)

### 🔐 Configuración de la Contraseña del Equipo (Segura)
La contraseña nunca se sube al repositorio. Para configurarla:

1. **En desarrollo local:**
   - Creá un archivo `.env.local` (ignorado automáticamente por git).
   - Generá el hash SHA-256 de tu clave (ej. `echo -n "tu_clave" | sha256sum`).
   - Agregá la variable:
     ```env
     VITE_ROADMAP_PASSWORD_HASH=tu_hash_sha256_aqui
     ```

2. **En GitHub Pages (Producción):**
   - En el repositorio de GitHub, andá a **Settings** > **Secrets and variables** > **Actions**.
   - Creá un **Repository Secret** llamado `ROADMAP_PASSWORD_HASH` con el valor del hash SHA-256 de la clave.
   - El workflow lo inyectará automáticamente durante el build de GitHub Pages sin exponer la contraseña en el código.

---

## 🔄 Sincronización con GitHub

Para actualizar las issues directamente desde `ISPC-WEB-2025/TodoStock-AppMovil`:

```bash
# Con GitHub CLI (gh) autenticado en tu máquina:
npm run sync

# O pasando un token personal:
GITHUB_TOKEN=tu_token_de_github npm run sync

# O si estás sin conexión (utiliza el archivo local raw-issues.json):
npm run sync:offline
```

---

## 🌐 Despliegue en GitHub Pages

1. En GitHub, ve a **Settings** > **Pages** de este repositorio.
2. En **Build and deployment**, seleccioná **Source: GitHub Actions**.
3. En cada `git push` a `main`, el workflow `.github/workflows/deploy-pages.yml` sincronizará los datos, compilará y publicará la web automáticamente.

---

## 🤝 Automatización con TodoStock-AppMovil (Webhook/Dispatch)

Para que el Roadmap se actualice solo cada vez que se cierre un PR o se modifique una Issue en `TodoStock-AppMovil`:
1. Copiá el archivo `.github/workflows/notify-roadmap.yml.template` al repositorio `TodoStock-AppMovil` como `.github/workflows/notify-roadmap.yml`.
2. Configurá un Secret en `TodoStock-AppMovil` llamado `ROADMAP_DISPATCH_TOKEN` con un Personal Access Token (PAT) con permisos de `repo`.

---

## 🔮 Backlog Técnico y Mejoras Futuras

- [ ] **Cifrado AES-256-GCM del dataset:** Migrar del gate SHA-256 actual a un cifrado simétrico en tiempo de compilación del archivo `roadmap-data.json`, usando la clave del equipo (derivada con PBKDF2/Web Crypto API) para que los datos estén matemáticamente inaccesibles sin la contraseña, incluso desde las DevTools del navegador.
- [ ] **Exportación de estado:** Permitir exportar la simulación actual en formato imagen (PNG/SVG) o reporte Markdown para compartir en las dailies del equipo.
