import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';

import IssueNode from './components/IssueNode';
import RoadmapControls from './components/RoadmapControls';
import IssueDetailModal from './components/IssueDetailModal';
import LoginGate from './components/LoginGate';

import initialRoadmapData from './data/roadmap-data.json';
import { getLayoutedElements } from './utils/layout';
import { recalculateGraph } from './utils/graphEngine';
import {
  getLocalOverrides,
  setLocalOverride,
  clearAllLocalOverrides,
  isSessionAuthenticated,
  clearSessionAuth,
} from './utils/storage';
import { CheckCircle2, Play, Lock, Sparkles, ExternalLink, User } from 'lucide-react';

const nodeTypes = {
  issueNode: IssueNode,
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => isSessionAuthenticated());
  const [localOverrides, setLocalOverrides] = useState(() => getLocalOverrides());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSprint, setSelectedSprint] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedAssignee, setSelectedAssignee] = useState('ALL');
  const [selectedLabel, setSelectedLabel] = useState('ALL');
  const [activeModalIssue, setActiveModalIssue] = useState(null);

  // Estados visuales mejorados
  const [activeTab, setActiveTab] = useState('DAG'); // 'DAG' | 'INDEPENDENT'
  const [hideCompleted, setHideCompleted] = useState(true); // Ocultar cerradas por defecto
  const [includeBlockers, setIncludeBlockers] = useState(true); // Incluir tareas bloqueantes al filtrar por responsable
  const [collapsedNodes, setCollapsedNodes] = useState(new Set()); // Nodos con ramas plegadas

  const reactFlowInstanceRef = useRef(null);

  // 1. Recalcular el grafo dinámico con las simulaciones locales
  const dynamicGraph = useMemo(() => {
    return recalculateGraph(
      initialRoadmapData.nodes,
      initialRoadmapData.edges,
      localOverrides
    );
  }, [localOverrides]);

  // Identificar qué nodos forman parte de cadenas de dependencias
  const connectedNodeIds = useMemo(() => {
    const set = new Set();
    dynamicGraph.edges.forEach((e) => {
      set.add(e.source);
      set.add(e.target);
    });
    return set;
  }, [dynamicGraph.edges]);

  // 2. Extraer listas únicas de asignados y etiquetas
  const assigneesList = useMemo(() => {
    const map = new Map();
    initialRoadmapData.nodes.forEach((n) => {
      n.assignees?.forEach((a) => {
        if (!map.has(a.login)) map.set(a.login, a);
      });
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const labelsList = useMemo(() => {
    const map = new Map();
    initialRoadmapData.nodes.forEach((n) => {
      n.labels?.forEach((l) => {
        if (!map.has(l.name)) map.set(l.name, l);
      });
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const sprintsList = useMemo(() => {
    const set = new Set();
    initialRoadmapData.nodes.forEach((n) => {
      const s = n.sprint || n.milestone?.title;
      if (s) {
        const sm = s.match(/sprint\s*(\d+)/i);
        if (sm) set.add(`Sprint ${sm[1]}`);
        else set.add(s);
      }
    });
    set.add('Sprint 1');
    set.add('Sprint 2');
    set.add('Sprint 3');
    set.add('Sprint 4');
    return Array.from(set).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 999;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 999;
      return numA - numB;
    });
  }, []);

  // 3. Handlers para simulación local
  const handleToggleSimulate = useCallback((nodeId, newStatus) => {
    const updated = setLocalOverride(nodeId, newStatus);
    setLocalOverrides({ ...updated });
    setActiveModalIssue((prev) => {
      if (prev && prev.id === nodeId) {
        return { ...prev, isOverride: true, status: newStatus };
      }
      return prev;
    });
  }, []);

  const handleResetOverrides = useCallback(() => {
    clearAllLocalOverrides();
    setLocalOverrides({});
  }, []);

  const handleLogout = useCallback(() => {
    clearSessionAuth();
    setIsAuthenticated(false);
  }, []);

  // Handler para colapsar / desplegar ramas dependientes
  const handleToggleCollapse = useCallback((nodeId) => {
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const handleResetCollapsed = useCallback(() => {
    setCollapsedNodes(new Set());
  }, []);

  // Calcular nodos ocultos por ramas colapsadas
  const hiddenByCollapseIds = useMemo(() => {
    if (collapsedNodes.size === 0) return new Set();
    const hidden = new Set();
    const outgoing = new Map();
    dynamicGraph.edges.forEach((e) => {
      if (!outgoing.has(e.source)) outgoing.set(e.source, []);
      outgoing.get(e.source).push(e.target);
    });

    collapsedNodes.forEach((cId) => {
      const queue = [...(outgoing.get(cId) || [])];
      while (queue.length > 0) {
        const curr = queue.shift();
        if (!hidden.has(curr)) {
          hidden.add(curr);
          for (const nxt of outgoing.get(curr) || []) {
            queue.push(nxt);
          }
        }
      }
    });
    return hidden;
  }, [collapsedNodes, dynamicGraph.edges]);

  // 4. Filtrar nodos según los controles y pestaña activa
  const filterNodeFn = useCallback((node) => {
    const q = searchQuery.toLowerCase().trim();

    // Filtro texto
    if (q) {
      const matchesTk = node.tk?.toLowerCase().includes(q);
      const matchesNum = String(node.number).includes(q);
      const matchesTitle = node.title?.toLowerCase().includes(q);
      if (!matchesTk && !matchesNum && !matchesTitle) return false;
    }

    // Toggle de completadas
    if (hideCompleted && node.status === 'COMPLETED') {
      return false;
    }

    // Filtro estado
    if (selectedStatus !== 'ALL') {
      if (node.status !== selectedStatus) return false;
    }

    // Filtro asignado
    if (selectedAssignee !== 'ALL') {
      if (selectedAssignee === 'UNASSIGNED') {
        if (node.assignees && node.assignees.length > 0) return false;
      } else {
        const hasUser = node.assignees?.some((a) => a.login === selectedAssignee);
        if (!hasUser) return false;
      }
    }

    // Filtro Sprint
    if (selectedSprint !== 'ALL') {
      const rawSprint = node.sprint || node.milestone?.title;
      let nodeSprint = rawSprint;
      if (rawSprint) {
        const sm = rawSprint.match(/sprint\s*(\d+)/i);
        if (sm) nodeSprint = `Sprint ${sm[1]}`;
      }
      if (nodeSprint !== selectedSprint) return false;
    }

    // Filtro etiqueta
    if (selectedLabel !== 'ALL') {
      const hasLabel = node.labels?.some((l) => l.name === selectedLabel);
      if (!hasLabel) return false;
    }

    return true;
  }, [searchQuery, hideCompleted, selectedSprint, selectedStatus, selectedAssignee, selectedLabel]);

  // Nodos para el lienzo DAG
  const dagNodes = useMemo(() => {
    // 1. Nodos base que coinciden con los filtros
    const baseNodes = dynamicGraph.nodes.filter((node) => {
      // Debe formar parte de una cadena de dependencias
      if (!connectedNodeIds.has(node.id)) return false;
      // No debe estar oculto por una rama colapsada
      if (hiddenByCollapseIds.has(node.id)) return false;
      return filterNodeFn(node);
    });

    // 2. Si se filtra por un responsable y está activo includeBlockers:
    // Buscar los nodos padres que bloquean directamente a las tareas del usuario
    if (selectedAssignee !== 'ALL' && includeBlockers) {
      const baseNodeIds = new Set(baseNodes.map((n) => n.id));
      const blockerNodesMap = new Map(); // parentId -> nodeObj con meta

      dynamicGraph.edges.forEach((edge) => {
        if (baseNodeIds.has(edge.target)) {
          const targetNode = baseNodes.find((n) => n.id === edge.target);
          const parentNode = dynamicGraph.nodes.find((n) => n.id === edge.source);

          if (parentNode && !baseNodeIds.has(parentNode.id)) {
            // Si hideCompleted está activo, solo incluir padres abiertos/bloqueantes
            if (!hideCompleted || parentNode.status !== 'COMPLETED') {
              const targetLabel = targetNode?.tk || `#${targetNode?.number}`;
              if (!blockerNodesMap.has(parentNode.id)) {
                blockerNodesMap.set(parentNode.id, {
                  ...parentNode,
                  isExternalBlocker: true,
                  blockingTargets: [targetLabel],
                });
              } else {
                const existing = blockerNodesMap.get(parentNode.id);
                if (!existing.blockingTargets.includes(targetLabel)) {
                  existing.blockingTargets.push(targetLabel);
                }
              }
            }
          }
        }
      });

      return [...baseNodes, ...Array.from(blockerNodesMap.values())];
    }

    return baseNodes;
  }, [
    dynamicGraph.nodes,
    dynamicGraph.edges,
    connectedNodeIds,
    hiddenByCollapseIds,
    filterNodeFn,
    selectedAssignee,
    includeBlockers,
    hideCompleted,
  ]);

  // Nodos para la pestaña de Tareas Independientes
  const independentNodes = useMemo(() => {
    return dynamicGraph.nodes.filter((node) => {
      if (connectedNodeIds.has(node.id)) return false;
      return filterNodeFn(node);
    });
  }, [dynamicGraph.nodes, connectedNodeIds, filterNodeFn]);

  // Conteo total de independientes sin filtros de búsqueda
  const totalIndependentCount = useMemo(() => {
    return dynamicGraph.nodes.filter((node) => !connectedNodeIds.has(node.id)).length;
  }, [dynamicGraph.nodes, connectedNodeIds]);

  // 5. Filtrar aristas del DAG
  const dagNodeIds = useMemo(() => new Set(dagNodes.map((n) => n.id)), [dagNodes]);

  const filteredEdges = useMemo(() => {
    return dynamicGraph.edges.filter((e) => {
      return dagNodeIds.has(e.source) && dagNodeIds.has(e.target);
    });
  }, [dynamicGraph.edges, dagNodeIds]);

  // 6. Aplicar Layout DAG 2D empaquetado (layout.js)
  const layoutedElements = useMemo(() => {
    const reactFlowNodes = dagNodes.map((n) => ({
      id: n.id,
      type: 'issueNode',
      data: {
        ...n,
        isBranchCollapsed: collapsedNodes.has(n.id),
        onToggleCollapse: handleToggleCollapse,
        onToggleSimulate: handleToggleSimulate,
        onSelectNode: (data) => setActiveModalIssue(data),
      },
      position: { x: 0, y: 0 },
    }));

    return getLayoutedElements(reactFlowNodes, filteredEdges, 'LR');
  }, [dagNodes, filteredEdges, collapsedNodes, handleToggleCollapse, handleToggleSimulate]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedElements.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedElements.edges);

  useEffect(() => {
    setNodes(layoutedElements.nodes);
    setEdges(layoutedElements.edges);
    const timer = setTimeout(() => {
      if (reactFlowInstanceRef.current && layoutedElements.nodes.length > 0) {
        reactFlowInstanceRef.current.fitView({ padding: 0.25, duration: 400 });
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [layoutedElements, setNodes, setEdges]);

  const handleFitView = useCallback(() => {
    if (reactFlowInstanceRef.current) {
      reactFlowInstanceRef.current.fitView({ padding: 0.2, duration: 400 });
    }
  }, []);

  if (!isAuthenticated) {
    return <LoginGate onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#090d16]">
      {/* Controles de Navegación y Filtros */}
      <RoadmapControls
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedSprint={selectedSprint}
        onSprintChange={setSelectedSprint}
        sprintsList={sprintsList}
        selectedAssignee={selectedAssignee}
        onAssigneeChange={setSelectedAssignee}
        assigneesList={assigneesList}
        selectedLabel={selectedLabel}
        onLabelChange={setSelectedLabel}
        labelsList={labelsList}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        stats={dynamicGraph.stats}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hideCompleted={hideCompleted}
        onToggleHideCompleted={() => setHideCompleted((prev) => !prev)}
        includeBlockers={includeBlockers}
        onToggleIncludeBlockers={() => setIncludeBlockers((prev) => !prev)}
        independentCount={totalIndependentCount}
        collapsedCount={collapsedNodes.size}
        onResetCollapsed={handleResetCollapsed}
        onResetOverrides={handleResetOverrides}
        onFitView={handleFitView}
        onLogout={handleLogout}
      />

      {/* Contenido según la pestaña activa */}
      {activeTab === 'DAG' ? (
        /* Canvas del Grafo DAG */
        <div className="h-full w-full pt-44">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            onInit={(instance) => {
              reactFlowInstanceRef.current = instance;
              instance.fitView({ padding: 0.2 });
            }}
            minZoom={0.08}
            maxZoom={1.5}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#1e293b" gap={28} size={1} />
            <Controls position="bottom-right" className="m-4" />
            <MiniMap
              position="bottom-left"
              className="m-4"
              nodeColor={(node) => {
                const status = node.data?.status;
                if (status === 'COMPLETED') return '#10b981';
                if (status === 'UNBLOCKED') return '#06b6d4';
                return '#475569';
              }}
            />
          </ReactFlow>
        </div>
      ) : (
        /* Cuadrícula de Tareas Independientes */
        <div className="h-full w-full overflow-y-auto px-6 pt-48 pb-12">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  Tareas Independientes y de Gestión
                  <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-300">
                    {independentNodes.length} visibles
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Issues que no bloquean ni tienen prerrequisitos técnicos de código directo.
                </p>
              </div>
            </div>

            {independentNodes.length === 0 ? (
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-12 text-center">
                <p className="text-sm text-slate-400">
                  No hay tareas independientes que coincidan con los filtros aplicados.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {independentNodes.map((task) => {
                  const isCompleted = task.status === 'COMPLETED';
                  const primaryAssignee = task.assignees?.[0];

                  return (
                    <div
                      key={task.id}
                      onClick={() => setActiveModalIssue(task)}
                      className={`group relative flex flex-col justify-between rounded-xl border p-4 backdrop-blur-md transition-all duration-200 hover:scale-[1.02] cursor-pointer ${
                        isCompleted
                          ? 'border-emerald-500/50 bg-emerald-950/20 shadow-md shadow-emerald-950/30'
                          : 'border-slate-800 bg-slate-900/80 hover:border-cyan-500/50 hover:bg-slate-900'
                      }`}
                    >
                      <div>
                        {/* Header tarjeta */}
                        <div className="flex items-center justify-between gap-1 pb-2 border-b border-slate-800/60">
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            {task.tk && (
                              <span className="rounded bg-cyan-950 px-1.5 py-0.5 text-[11px] font-mono font-bold text-cyan-300 border border-cyan-800/60">
                                {task.tk}
                              </span>
                            )}
                            <span className="text-xs font-mono font-medium text-slate-400">
                              #{task.number}
                            </span>
                            {task.isOverride && (
                              <span className="flex items-center gap-0.5 rounded bg-amber-950 px-1 py-0.2 text-[10px] font-semibold text-amber-300 border border-amber-700/50">
                                <Sparkles className="h-2.5 w-2.5" /> Simulado
                              </span>
                            )}
                          </div>

                          {isCompleted ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/80 px-2 py-0.5 text-[11px] font-semibold text-emerald-300 border border-emerald-700/50">
                              <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Cerrada
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-cyan-950/90 px-2 py-0.5 text-[11px] font-bold text-cyan-300 border border-cyan-500">
                              <Play className="h-2.5 w-2.5 fill-cyan-400 text-cyan-400" /> Lista
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h3 className="mt-2 text-xs font-semibold leading-snug text-slate-200 group-hover:text-white line-clamp-3">
                          {task.title}
                        </h3>

                        {/* Badges / Labels */}
                        <div className="mt-2.5 flex flex-wrap items-center gap-1">
                          {task.meta?.area && (
                            <span className="rounded bg-slate-800/80 px-1.5 py-0.5 text-[10px] text-slate-300">
                              {task.meta.area}
                            </span>
                          )}
                          {task.labels?.slice(0, 2).map((l, idx) => (
                            <span
                              key={idx}
                              className="rounded px-1.5 py-0.5 text-[10px] font-medium text-slate-300"
                              style={{ backgroundColor: `${l.color}25`, border: `1px solid ${l.color}50` }}
                            >
                              {l.name}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="mt-4 flex items-center justify-between border-t border-slate-800/60 pt-2 text-xs text-slate-400">
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

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSimulate(task.id, isCompleted ? 'OPEN' : 'COMPLETED');
                          }}
                          className={`flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-medium transition-colors ${
                            isCompleted
                              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                              : 'bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300'
                          }`}
                        >
                          {isCompleted ? 'Reabrir' : 'Simular ✔'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Detalle */}
      {activeModalIssue && (
        <IssueDetailModal
          issue={activeModalIssue}
          onClose={() => setActiveModalIssue(null)}
          onToggleSimulate={handleToggleSimulate}
        />
      )}
    </div>
  );
}
