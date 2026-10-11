# AGENTS.md — Reglas del Proyecto (TodoStock-Mobile-RoadMap)

Este repositorio contiene la aplicación web del **Roadmap Interactivo Dinámico en Grafo (DAG)** para el proyecto **TodoStock-AppMovil** (`ISPC-WEB-2025/TodoStock-AppMovil`).

---

## 1. Propósito y Arquitectura

1. **Objetivo Principal:** Visualizar en forma de grafo de nodos ("bolitas") el estado de las ~90 issues pendientes del proyecto móvil, mostrando qué issues están bloqueadas por otras para evitar cuellos de botella y trabajo bloqueado entre los miembros del equipo.
2. **Estados Visuales:**
   - 🟢 **Completada (`COMPLETED`):** Issue cerrada en GitHub (color verde esmeralda / tilde).
   - 🔵 **Desbloqueada / Lista para tomar (`UNBLOCKED`):** Issue abierta cuyas dependencias ya están todas completadas (borde resaltado / indicador de disponibilidad).
   - ⚪ **Bloqueada (`BLOCKED`):** Issue abierta con al menos una dependencia pendiente (apagada, opacidad reducida, ícono de candado indicando qué issue la bloquea).
3. **Líneas de Conexión (Aristas / Edges):**
   - **Activa (Energizada):** La issue condición origen ya está completada.
   - **Inactiva (Atenuada / Discontinua):** La issue condición origen aún está abierta.

---

## 2. Stack Tecnológico

- **Frontend:** React 18 / 19, Vite, `@xyflow/react` (React Flow), Tailwind CSS, Lucide Icons, Dagre (cálculo de layout jerárquico).
- **Scripts de Sincronización:** Node.js (ESM, `scripts/sync-roadmap.mjs`) que consulta la API de GitHub o consume snapshots locales.
- **Hosting / Deploy:** GitHub Pages mediante GitHub Actions (`.github/workflows/deploy-pages.yml`).

---

## 3. Flujo de Datos

```
GitHub (TodoStock-AppMovil)
        │
        ▼ (issues, PRs, body: "Depende de TK...", labels, assignees)
scripts/sync-roadmap.mjs
        │
        ├──+ config/dependencies-override.json (ajustes/dependencias manuales)
        ▼
src/data/roadmap-data.json (y public/data/roadmap-data.json)
        │
        ▼
React Flow Canvas (App.jsx + IssueNode.jsx + layout.js)
```

---

## 4. Comandos de Desarrollo

- `npm run dev`: Inicia el servidor de desarrollo local (Vite).
- `npm run build`: Compila la aplicación estática optimizada para producción.
- `npm run preview`: Previsualiza el build de producción.
- `npm run sync`: Ejecuta la sincronización contra la API de GitHub de `TodoStock-AppMovil`.
- `npm run sync:offline`: Regenera el grafo usando el archivo local `raw-issues.json` sin llamar a la red.

---

## 5. Reglas de Contribución y Código

1. **Rutas Relativas:** Configurar siempre `base: './'` en `vite.config.js` para asegurar compatibilidad con GitHub Pages.
2. **Sin Credenciales:** Nunca commitear tokens de GitHub o secrets en archivos fuente. El script lee `process.env.GITHUB_TOKEN` o `process.env.GH_TOKEN`, o utiliza la CLI `gh` autenticada.
3. **Manejo de Datos Híbrido:** Si se detectan nuevas dependencias en el texto de las issues en GitHub (`**Depende de:** TK...`), el script las parsea automáticamente. Cualquier ajuste excepcional o atajo puede definirse en `config/dependencies-override.json`.
