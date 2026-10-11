import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { CheckCircle2, Lock, Play, ExternalLink, User, Sparkles, Layers, FlaskConical, AlertTriangle } from 'lucide-react';

const IssueNode = ({ data, selected }) => {
  const {
    number,
    tk,
    title,
    status,
    blockingParents = [],
    dependentChildCount = 0,
    assignees = [],
    labels = [],
    meta = {},
    isOverride,
    onToggleSimulate,
    onSelectNode,
  } = data;

  const isCompleted = status === 'COMPLETED';
  const isUnblocked = status === 'UNBLOCKED';
  const isBlocked = status === 'BLOCKED';

  const isTestingTask = 
    meta?.area?.toLowerCase() === 'testing' ||
    labels?.some(l => l.name?.toLowerCase().includes('testing') || l.name?.toLowerCase().includes('automatización') || l.name?.toLowerCase().includes('accesibilidad')) ||
    Boolean(title && (/^\[(AUT|ACC)-/i.test(title) || /ejecución de casos/i.test(title) || /tests? unitarios?/i.test(title) || /plan de pruebas/i.test(title)));

  // Estilos según el estado
  let borderClass = 'border-slate-800';
  let bgClass = 'bg-slate-900/80';
  let glowClass = '';

  if (data.isExternalBlocker) {
    borderClass = 'border-amber-500/80 ring-2 ring-amber-500/40';
    bgClass = 'bg-slate-950/95';
    glowClass = 'shadow-lg shadow-amber-950/50';
  } else if (isCompleted) {
    borderClass = 'border-emerald-500/70';
    bgClass = 'bg-emerald-950/20';
    glowClass = 'shadow-md shadow-emerald-950/40';
  } else if (isUnblocked) {
    borderClass = 'border-cyan-400 ring-2 ring-cyan-500/30';
    bgClass = 'bg-cyan-950/30';
    glowClass = 'shadow-lg shadow-cyan-500/20';
  } else if (isBlocked) {
    borderClass = 'border-slate-800/80 opacity-60 hover:opacity-100 transition-opacity';
    bgClass = 'bg-slate-950/90';
  }

  if (selected) {
    borderClass += ' ring-2 ring-white/80';
  }

  const primaryAssignee = assignees[0];

  return (
    <div
      onClick={() => onSelectNode?.(data)}
      className={`group relative w-[290px] cursor-pointer rounded-xl border p-3.5 backdrop-blur-md transition-all duration-200 hover:scale-[1.02] ${borderClass} ${bgClass} ${glowClass}`}
    >
      {/* Target handle para dependencias entrantes (Izquierda) */}
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-slate-900 !bg-slate-400 transition-colors group-hover:!bg-cyan-400"
      />

      {/* Banner si es una tarea externa que bloquea al usuario filtrado */}
      {data.isExternalBlocker && (
        <div className="mb-2.5 flex items-center justify-between gap-1 rounded-md bg-amber-950/90 px-2 py-1 text-[10px] font-semibold text-amber-300 border border-amber-600/70 shadow-sm animate-pulse">
          <span className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />
            Bloquea a tu tarea:
          </span>
          <span className="font-mono text-white bg-amber-900/80 px-1 py-0.2 rounded font-bold">
            {data.blockingTargets?.join(', ') || 'Tu tarea'}
          </span>
        </div>
      )}

      {/* Header: TK / #Issue + Estado */}
      <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-slate-800/60">
        <div className="flex items-center gap-1.5 overflow-hidden">
          {tk ? (
            <span className="rounded bg-cyan-950 px-1.5 py-0.5 text-[11px] font-mono font-bold text-cyan-300 border border-cyan-800/60">
              {tk}
            </span>
          ) : null}
          <span className="text-xs font-mono font-medium text-slate-400">
            #{number}
          </span>
          {isOverride && (
            <span
              title="Estado simulado localmente en este navegador"
              className="flex items-center gap-0.5 rounded bg-amber-950/80 px-1 py-0.2 text-[10px] font-semibold text-amber-300 border border-amber-700/50"
            >
              <Sparkles className="h-2.5 w-2.5" /> Simulado
            </span>
          )}
        </div>

        {/* Status Badge */}
        {isCompleted && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/80 px-2 py-0.5 text-[11px] font-semibold text-emerald-300 border border-emerald-700/50">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Cerrada
          </span>
        )}
        {isUnblocked && (
          <span
            title={isTestingTask ? 'Desbloqueada: Los desarrollos previos ya están completados. Lista para ejecutar o diseñar la prueba.' : 'Desbloqueada: Lista para tomar.'}
            className="inline-flex items-center gap-1 rounded-full bg-cyan-950/90 px-2 py-0.5 text-[11px] font-bold text-cyan-300 border border-cyan-500 animate-pulse"
          >
            {isTestingTask ? (
              <>
                <FlaskConical className="h-2.5 w-2.5 text-cyan-400" /> ¡Para probar!
              </>
            ) : (
              <>
                <Play className="h-2.5 w-2.5 fill-cyan-400 text-cyan-400" /> ¡Lista!
              </>
            )}
          </span>
        )}
        {isBlocked && (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-800/80 px-2 py-0.5 text-[11px] font-medium text-slate-400 border border-slate-700">
            <Lock className="h-2.5 w-2.5 text-slate-400" /> Bloqueada
          </span>
        )}
      </div>

      {/* Title */}
      <h3
        title={title}
        className="mt-2 line-clamp-2 text-xs font-medium leading-relaxed text-slate-200 group-hover:text-white"
      >
        {title}
      </h3>

      {/* Blocking indicator if blocked */}
      {isBlocked && blockingParents.length > 0 && (
        <div className="mt-2 rounded bg-slate-900/90 px-2 py-1 text-[11px] text-slate-400 border border-slate-800">
          <span className="text-amber-400 font-medium">Espera a: </span>
          {blockingParents
            .slice(0, 2)
            .map((p) => p.tk || `#${p.number}`)
            .join(', ')}
          {blockingParents.length > 2 ? ` (+${blockingParents.length - 2})` : ''}
        </div>
      )}

      {/* Meta tags & Labels */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1">
        {meta.enabler && (
          <span className="rounded bg-indigo-950/90 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-300 border border-indigo-800/60">
            {meta.enabler}
          </span>
        )}
        {meta.historia && !meta.enabler && (
          <span className="rounded bg-blue-950/70 px-1.5 py-0.5 text-[10px] font-mono text-blue-300 border border-blue-800/50">
            {meta.historia}
          </span>
        )}
        {meta.area && (
          <span className="rounded bg-slate-800/80 px-1.5 py-0.5 text-[10px] text-slate-300">
            {meta.area}
          </span>
        )}
        {labels.slice(0, 2).map((l, idx) => (
          <span
            key={idx}
            className="rounded px-1.5 py-0.5 text-[10px] font-medium text-slate-300"
            style={{ backgroundColor: `${l.color}25`, border: `1px solid ${l.color}50` }}
          >
            {l.name}
          </span>
        ))}
        {data.isBranchCollapsed && (
          <span className="rounded bg-amber-950/90 px-1.5 py-0.5 text-[10px] font-medium text-amber-300 border border-amber-800/60">
            +{dependentChildCount} ocultos
          </span>
        )}
      </div>

      {/* Footer: Asignado + Desbloquea a + Botón simulación */}
      <div className="mt-3 flex items-center justify-between border-t border-slate-800/60 pt-2 text-xs text-slate-400">
        <div className="flex items-center gap-1.5 overflow-hidden">
          {primaryAssignee ? (
            <div className="flex items-center gap-1.5" title={primaryAssignee.name}>
              <img
                src={primaryAssignee.avatarUrl}
                alt={primaryAssignee.name}
                className="h-5 w-5 rounded-full border border-slate-700 object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <span className="truncate text-[11px] font-medium text-slate-300">
                {primaryAssignee.name}
              </span>
            </div>
          ) : (
            <span className="flex items-center gap-1 text-[11px] italic text-slate-400">
              <User className="h-3 w-3" /> Sin asignar
            </span>
          )}
        </div>

        {/* Quick simulation toggle button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSimulate?.(data.id, isCompleted ? 'OPEN' : 'COMPLETED');
          }}
          title={isCompleted ? 'Simular como abierta' : 'Simular como completada'}
          className={`flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-medium transition-colors ${
            isCompleted
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              : 'bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300'
          }`}
        >
          {isCompleted ? 'Reabrir' : 'Simular ✔'}
        </button>
      </div>

      {/* Botón interactivo para colapsar / expandir ramas aguas abajo */}
      {dependentChildCount > 0 && data.onToggleCollapse && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            data.onToggleCollapse(data.id);
          }}
          title={
            data.isBranchCollapsed
              ? `Expandir rama (${dependentChildCount} dependientes)`
              : `Colapsar rama (${dependentChildCount} dependientes)`
          }
          className={`absolute -right-3 top-1/2 -translate-y-1/2 z-20 flex h-6 w-6 items-center justify-center rounded-full border shadow-lg text-xs font-bold transition-transform hover:scale-110 ${
            data.isBranchCollapsed
              ? 'bg-amber-500 border-amber-300 text-slate-950 ring-2 ring-amber-400/40'
              : 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700 hover:text-white'
          }`}
        >
          {data.isBranchCollapsed ? '+' : '−'}
        </button>
      )}

      {/* Source handle para dependencias salientes (Derecha) */}
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-slate-900 !bg-slate-400 transition-colors group-hover:!bg-cyan-400"
      />
    </div>
  );
};

export default memo(IssueNode);
