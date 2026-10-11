# Spec 001: Roadmap Interactivo en Grafo (DAG) para TodoStock-AppMovil

## 1. Contexto y Problema

El repositorio `ISPC-WEB-2025/TodoStock-AppMovil` cuenta con ~90 issues abiertas distribuidas entre 5 desarrolladores y 1 documentador (Miguel, Candelaria, Virginia, Pedro, Aylen, Octavio). Con plazos ajustados, el equipo corre riesgo de bloquearse mutuamente si se toman tareas cuyas precondiciones técnicas o de negocio aún no fueron completadas.

GitHub Issues ofrece una vista plana de tickets, dificultando ver qué tareas habilitan a cuáles. Se requiere una herramienta visual dinámica que represente las issues como un Grafo Acíclico Dirigido (DAG) en tiempo real, permitiendo:
1. Saber de inmediato qué tareas están listas para comenzar hoy mismo.
2. Identificar qué tareas bloquean al resto del equipo.
3. Actualizarse automáticamente ante cambios en PRs e Issues.

---

## 2. Definición Funcional

### 2.1. Estados de Nodos (Issues)
- **`COMPLETED` (Completada):** Issue cerrada en GitHub.
  - *Estilo visual:* Nivel de brillo normal/alto, verde esmeralda, tilde de verificación, enlace a la issue cerrada.
- **`UNBLOCKED` (Desbloqueada / Lista para tomar):** Issue abierta en GitHub y **todas** sus dependencias previas están `COMPLETED`.
  - *Estilo visual:* Borde resaltado azul/cian vibrante con animación sutil de pulso, badge `"¡Lista para tomar!"`, avatar/nombre del asignado o badge `"Sin asignar"`.
- **`BLOCKED` (Bloqueada):** Issue abierta en GitHub y al menos una de sus dependencias previas sigue abierta (`OPEN`).
  - *Estilo visual:* Nodo "apagado", opacidad reducida (50%), color gris neutro, ícono de candado 🔒 y listado de las tareas que la bloquean (ej. `Bloqueada por: #TK05`).

### 2.2. Estados de Aristas (Líneas de Dependencia)
- **Activa / Desbloqueante (Sólida, color vibrante):** Une un nodo origen `COMPLETED` con su nodo destino. Representa que la condición ya fue satisfecha.
- **Inactiva / Bloqueante (Discontinua / Atenuada):** Une un nodo origen aún abierto con su nodo destino. Representa que el flujo está interrumpido en ese punto.

### 2.3. Herramientas y Filtros en la Interfaz
1. **Filtro por Asignado:** Ver solo mis issues y los bloqueos inmediatos.
2. **Filtro por Disponibilidad:** Switch para ver únicamente "Listas para tomar ahora mismo".
3. **Filtro por Área/Módulo:** Ciberseguridad, Testing, Automatización, Core, etc.
4. **Buscador Dinámico:** Búsqueda por número de issue (`#102`), código de ticket (`#TK48`), o texto del título.
5. **Barra de Métricas en Vivo:**
   - Total de issues
   - Abiertas vs. Cerradas
   - % de avance global
   - Tareas desbloqueadas listas para desarrollo

---

## 3. Arquitectura Técnica

### 3.1. Pipeline de Ingesta y Parsing
El script `scripts/sync-roadmap.mjs`:
1. Consulta la GitHub REST API (`https://api.github.com/repos/ISPC-WEB-2025/TodoStock-AppMovil/issues?state=all&per_page=100`).
2. Extrae:
   - Identificador `TK` del título o cuerpo (ej. `#TK48`).
   - Dependencias declaradas en el cuerpo (`**Depende de:** TK05`, `Bloqueado por: #12`, `Referencia: #69`).
   - Metadata estructurada (`Historia`, `Área`, `Fase`, `SP`, `Capa`).
   - Asignados y Labels.
3. Cruza con `config/dependencies-override.json` para mapeos adicionales o ajustes manuales.
4. Evalúa la condición topológica de cada nodo y arista.
5. Exporta el resultado en `src/data/roadmap-data.json`.

### 3.2. Frontend
- SPA basada en Vite + React.
- Canvas interactivo provisto por `@xyflow/react` (React Flow) con soporte de zoom, paneo, drag y minimapa.
- Algoritmo de posicionamiento automático jerárquico (`dagre`) de izquierda a derecha (Fases tempranas a la izquierda, entregas finales a la derecha).

### 3.3. Despliegue y CI/CD
- Despliegue automático a GitHub Pages vía GitHub Actions (`.github/workflows/deploy-pages.yml`).
- Disparadores:
  - Push a la rama principal del repositorio del Roadmap.
  - Evento `repository_dispatch` emitido desde `TodoStock-AppMovil` al cerrar PRs o editar issues.
  - Ejecución manual mediante `workflow_dispatch`.

---

## 4. Criterios de Aceptación

- [x] **CA1:** Todas las 169 issues (91 abiertas, 78 cerradas) de `TodoStock-AppMovil` se visualizan con sus datos reales (número, TK, título, asignado, labels).
- [x] **CA2:** Las dependencias detectadas en los cuerpos de las issues generan aristas dirigidas entre las bolitas/nodos correspondientes.
- [x] **CA3:** Los nodos bloqueados se muestran atenuados/apagados con ícono de candado, mientras que los nodos con condiciones cumplidas se muestran encendidos y listos para tomar.
- [x] **CA4:** La barra superior permite filtrar por responsable (asignado), estado de desbloqueo y buscar por texto.
- [x] **CA5:** El proyecto compila limpiamente para producción (`npm run build`) y está preparado para desplegarse en GitHub Pages.
