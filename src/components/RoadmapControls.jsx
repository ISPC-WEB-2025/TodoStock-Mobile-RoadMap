import React from 'react';
import {
  Search,
  Filter,
  User,
  Tag,
  Sparkles,
  RotateCcw,
  LogOut,
  Maximize2,
  CheckCircle2,
  Play,
  Lock,
} from 'lucide-react';

export default function RoadmapControls({
  searchQuery,
  onSearchChange,
  selectedAssignee,
  onAssigneeChange,
  assigneesList,
  selectedLabel,
  onLabelChange,
  labelsList,
  selectedStatus,
  onStatusChange,
  stats,
  onResetOverrides,
  onFitView,
  onLogout,
}) {
  return (
    <header className="absolute top-4 left-4 right-4 z-20 flex flex-col gap-3 rounded-2xl border border-slate-800/90 bg-slate-900/95 p-3.5 shadow-2xl backdrop-blur-xl">
      {/* Fila Superior: Título, Métricas y Acciones Rápidas */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-md shadow-blue-500/20">
            <span className="font-mono text-sm font-bold text-white">TS</span>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              TodoStock Mobile — Roadmap DAG
              <span className="rounded-full bg-cyan-950 px-2 py-0.5 text-[10px] font-semibold text-cyan-400 border border-cyan-800/50">
                Live
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">
              Visualización de dependencias y desbloqueos para el equipo
            </p>
          </div>
        </div>

        {/* Métricas en Vivo */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950/70 px-2.5 py-1">
            <span className="text-slate-400">Total:</span>
            <span className="font-semibold text-white">{stats.total}</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-emerald-900/40 bg-emerald-950/30 px-2.5 py-1 text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="text-slate-400">Cerradas:</span>
            <span className="font-bold">{stats.closed}</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-cyan-500/50 bg-cyan-950/40 px-2.5 py-1 text-cyan-300 ring-1 ring-cyan-500/30">
            <Play className="h-3 w-3 fill-cyan-400 text-cyan-400" />
            <span>¡Listas para tomar!:</span>
            <span className="font-bold">{stats.unblockedReady}</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950/70 px-2.5 py-1 text-slate-400">
            <Lock className="h-3.5 w-3.5" />
            <span>Bloqueadas:</span>
            <span className="font-semibold text-slate-300">{stats.blocked}</span>
          </div>
        </div>

        {/* Botones de Utilidad */}
        <div className="flex items-center gap-2">
          {stats.overrideCount > 0 && (
            <button
              onClick={onResetOverrides}
              title="Restablecer todas las simulaciones al estado de GitHub"
              className="flex items-center gap-1.5 rounded-lg border border-amber-600/60 bg-amber-950/50 px-2.5 py-1 text-xs font-medium text-amber-300 hover:bg-amber-900/60 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restablecer ({stats.overrideCount})
            </button>
          )}

          <button
            onClick={onFitView}
            title="Centrar y encuadrar todo el grafo"
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Encuadrar
          </button>

          <button
            onClick={onLogout}
            title="Cerrar sesión"
            className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950/80 p-1.5 text-slate-400 hover:text-red-400 hover:border-red-900/50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Fila Inferior: Controles de Búsqueda y Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
        {/* Buscador */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por #issue, TK o título..."
            className="w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 transition-colors focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        {/* Filtro por Estado */}
        <div className="relative">
          <Filter className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full appearance-none rounded-xl border border-slate-800 bg-slate-950/80 pl-9 pr-8 py-1.5 text-xs text-white transition-colors focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value="ALL">Todos los estados</option>
            <option value="UNBLOCKED">🟢 ¡Listas para tomar hoy!</option>
            <option value="BLOCKED">🔒 Bloqueadas por dependencias</option>
            <option value="COMPLETED">✔ Completadas (Cerradas)</option>
          </select>
        </div>

        {/* Filtro por Asignado */}
        <div className="relative">
          <User className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <select
            value={selectedAssignee}
            onChange={(e) => onAssigneeChange(e.target.value)}
            className="w-full appearance-none rounded-xl border border-slate-800 bg-slate-950/80 pl-9 pr-8 py-1.5 text-xs text-white transition-colors focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value="ALL">Todos los asignados</option>
            <option value="UNASSIGNED">Sin asignar</option>
            {assigneesList.map((a) => (
              <option key={a.login} value={a.login}>
                {a.name || a.login}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro por Label */}
        <div className="relative">
          <Tag className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <select
            value={selectedLabel}
            onChange={(e) => onLabelChange(e.target.value)}
            className="w-full appearance-none rounded-xl border border-slate-800 bg-slate-950/80 pl-9 pr-8 py-1.5 text-xs text-white transition-colors focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value="ALL">Todas las etiquetas</option>
            {labelsList.map((label) => (
              <option key={label.name} value={label.name}>
                {label.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
}
