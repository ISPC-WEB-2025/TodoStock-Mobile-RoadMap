import React from 'react';
import {
  X,
  ExternalLink,
  CheckCircle2,
  Lock,
  Play,
  Sparkles,
  User,
  Tag,
  ArrowRight,
  Shield,
  Layers,
  FlaskConical,
  AlertTriangle,
} from 'lucide-react';

export default function IssueDetailModal({
  issue,
  onClose,
  onToggleSimulate,
}) {
  if (!issue) return null;

  const isCompleted = issue.status === 'COMPLETED';
  const isUnblocked = issue.status === 'UNBLOCKED';
  const isBlocked = issue.status === 'BLOCKED';

  const isTestingTask = 
    issue.meta?.area?.toLowerCase() === 'testing' ||
    issue.labels?.some(l => l.name?.toLowerCase().includes('testing') || l.name?.toLowerCase().includes('automatización') || l.name?.toLowerCase().includes('accesibilidad')) ||
    Boolean(issue.title && (/^\[(AUT|ACC)-/i.test(issue.title) || /ejecución de casos/i.test(issue.title) || /tests? unitarios?/i.test(issue.title) || /plan de pruebas/i.test(issue.title)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header Modal */}
        <div className="flex items-start justify-between border-b border-slate-800/80 p-5 bg-slate-950/40">
          <div className="space-y-1.5 pr-6">
            <div className="flex flex-wrap items-center gap-2">
              {issue.tk && (
                <span className="rounded bg-cyan-950 px-2 py-0.5 text-xs font-mono font-bold text-cyan-300 border border-cyan-800/60">
                  {issue.tk}
                </span>
              )}
              <span className="text-xs font-mono text-slate-400">
                #{issue.number}
              </span>
              {issue.isOverride && (
                <span className="flex items-center gap-1 rounded bg-amber-950 px-2 py-0.5 text-xs font-semibold text-amber-300 border border-amber-800/50">
                  <Sparkles className="h-3 w-3" /> Simulado localmente
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-white">{issue.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Alerta si es una tarea externa que bloquea al usuario filtrado */}
          {issue.isExternalBlocker && (
            <div className="rounded-xl border border-amber-500/70 bg-amber-950/40 p-3.5 text-xs text-amber-200 flex items-start gap-2.5 shadow-sm">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-300">Esta tarea está bloqueando tu trabajo:</p>
                <p className="text-amber-200/90 mt-0.5">
                  Tu tarea <span className="font-mono font-bold text-white bg-amber-900/80 px-1.5 py-0.5 rounded">{issue.blockingTargets?.join(', ') || 'asignada'}</span> no puede avanzar hasta que esta issue sea finalizada.
                </p>
              </div>
            </div>
          )}

          {/* Status Banner */}
          <div
            className={`flex items-center justify-between rounded-xl p-3.5 border ${
              isCompleted
                ? 'border-emerald-700/50 bg-emerald-950/30 text-emerald-300'
                : isUnblocked
                ? 'border-cyan-500/50 bg-cyan-950/30 text-cyan-300'
                : 'border-slate-800 bg-slate-950/60 text-slate-400'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {isCompleted && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
              {isUnblocked && (
                isTestingTask ? (
                  <FlaskConical className="h-5 w-5 text-cyan-400" />
                ) : (
                  <Play className="h-5 w-5 fill-cyan-400 text-cyan-400" />
                )
              )}
              {isBlocked && <Lock className="h-5 w-5 text-slate-400" />}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider">
                  {isCompleted
                    ? 'Completada / Cerrada'
                    : isUnblocked
                    ? (isTestingTask ? '¡Desbloqueada y Lista para probar!' : '¡Desbloqueada y Lista para comenzar!')
                    : 'Bloqueada por tareas previas'}
                </p>
                <p className="text-xs opacity-80">
                  {isCompleted
                    ? 'Condición cumplida: habilita el avance de las issues siguientes.'
                    : isUnblocked
                    ? (isTestingTask
                        ? 'Los desarrollos y prerrequisitos previos ya están finalizados en el repositorio. La prueba ya puede ejecutarse o diseñarse.'
                        : 'Todas las dependencias previas fueron satisfechas.')
                    : 'Aguardando que finalicen las tareas bloqueantes.'}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                onToggleSimulate?.(issue.id, isCompleted ? 'OPEN' : 'COMPLETED');
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all shadow-sm ${
                isCompleted
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {isCompleted ? 'Reabrir simulación' : 'Simular como terminada'}
            </button>
          </div>

          {/* Bloqueos y dependencias */}
          {isBlocked && issue.blockingParents?.length > 0 && (
            <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
                Tareas que bloquean esta issue ({issue.blockingParents.length}):
              </h3>
              <div className="space-y-1.5">
                {issue.blockingParents.map((parent) => (
                  <div
                    key={parent.id}
                    className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-800"
                  >
                    <span className="font-mono text-cyan-400 font-semibold">
                      {parent.tk || `#${parent.number}`}
                    </span>
                    <span className="truncate">{parent.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meta & Labels */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
              <span className="text-slate-400 block mb-1">Asignados:</span>
              <div className="flex flex-wrap gap-2">
                {issue.assignees?.length > 0 ? (
                  issue.assignees.map((a) => (
                    <div key={a.login} className="flex items-center gap-1.5 text-slate-200 font-medium">
                      <img
                        src={a.avatarUrl}
                        alt={a.name}
                        className="h-4 w-4 rounded-full border border-slate-700"
                      />
                      <span>{a.name || a.login}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-slate-500 italic">Sin asignar</span>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
              <span className="text-slate-400 block mb-1">Metadatos estructurados:</span>
              <div className="space-y-0.5 text-slate-300">
                {(issue.sprint || issue.milestone?.title) && (
                  <div>Sprint: <span className="font-semibold text-cyan-300">🎯 {issue.sprint || issue.milestone?.title}</span></div>
                )}
                {issue.meta?.historia && <div>Historia: <span className="font-semibold text-white">{issue.meta.historia}</span></div>}
                {issue.meta?.area && <div>Área: <span className="font-semibold text-white">{issue.meta.area}</span></div>}
                {issue.meta?.sp && <div>Story Points: <span className="font-semibold text-white">{issue.meta.sp}</span></div>}
                {issue.meta?.fase && <div>Fase: <span className="font-semibold text-white">{issue.meta.fase}</span></div>}
              </div>
            </div>
          </div>

          {/* Labels */}
          {issue.labels?.length > 0 && (
            <div>
              <span className="text-xs text-slate-400 block mb-1.5">Etiquetas:</span>
              <div className="flex flex-wrap gap-1.5">
                {issue.labels.map((l, idx) => (
                  <span
                    key={idx}
                    className="rounded-md px-2 py-0.5 text-xs font-medium text-slate-300"
                    style={{ backgroundColor: `${l.color}25`, border: `1px solid ${l.color}60` }}
                  >
                    {l.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description body snippet */}
          {issue.body && (
            <div>
              <span className="text-xs text-slate-400 block mb-1.5">Descripción de la Issue:</span>
              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                {issue.body}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800/80 p-4 bg-slate-950/60">
          <span className="text-xs text-slate-400">
            Fuente de datos: <span className="text-slate-300">GitHub (TodoStock-AppMovil)</span>
          </span>
          <a
            href={issue.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-xl bg-cyan-600/90 px-3.5 py-2 text-xs font-semibold text-white hover:bg-cyan-500 transition-colors shadow-lg shadow-cyan-600/20"
          >
            Abrir en GitHub
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
