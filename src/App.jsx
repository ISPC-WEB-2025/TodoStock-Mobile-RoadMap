import React, { useState, useMemo, useCallback, useRef } from 'react';
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

const nodeTypes = {
  issueNode: IssueNode,
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => isSessionAuthenticated());
  const [localOverrides, setLocalOverrides] = useState(() => getLocalOverrides());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedAssignee, setSelectedAssignee] = useState('ALL');
  const [selectedLabel, setSelectedLabel] = useState('ALL');
  const [activeModalIssue, setActiveModalIssue] = useState(null);

  const reactFlowInstanceRef = useRef(null);

  // 1. Recalcular el grafo dinámico con las simulaciones locales
  const dynamicGraph = useMemo(() => {
    return recalculateGraph(
      initialRoadmapData.nodes,
      initialRoadmapData.edges,
      localOverrides
    );
  }, [localOverrides]);

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

  // 4. Filtrar nodos según los controles
  const filteredNodes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return dynamicGraph.nodes.filter((node) => {
      // Filtro texto
      if (q) {
        const matchesTk = node.tk?.toLowerCase().includes(q);
        const matchesNum = String(node.number).includes(q);
        const matchesTitle = node.title?.toLowerCase().includes(q);
        if (!matchesTk && !matchesNum && !matchesTitle) return false;
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

      // Filtro etiqueta
      if (selectedLabel !== 'ALL') {
        const hasLabel = node.labels?.some((l) => l.name === selectedLabel);
        if (!hasLabel) return false;
      }

      return true;
    });
  }, [dynamicGraph.nodes, searchQuery, selectedStatus, selectedAssignee, selectedLabel]);

  // 5. Filtrar aristas conectadas a los nodos visibles
  const visibleNodeIds = useMemo(() => {
    return new Set(filteredNodes.map((n) => n.id));
  }, [filteredNodes]);

  const filteredEdges = useMemo(() => {
    return dynamicGraph.edges.filter((e) => {
      return visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target);
    });
  }, [dynamicGraph.edges, visibleNodeIds]);

  // 6. Aplicar Layout DAG (dagre)
  const layoutedElements = useMemo(() => {
    const reactFlowNodes = filteredNodes.map((n) => ({
      id: n.id,
      type: 'issueNode',
      data: {
        ...n,
        onToggleSimulate: handleToggleSimulate,
        onSelectNode: (data) => setActiveModalIssue(data),
      },
      position: { x: 0, y: 0 },
    }));

    return getLayoutedElements(reactFlowNodes, filteredEdges, 'LR');
  }, [filteredNodes, filteredEdges, handleToggleSimulate]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedElements.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedElements.edges);

  React.useEffect(() => {
    setNodes(layoutedElements.nodes);
    setEdges(layoutedElements.edges);
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
        selectedAssignee={selectedAssignee}
        onAssigneeChange={setSelectedAssignee}
        assigneesList={assigneesList}
        selectedLabel={selectedLabel}
        onLabelChange={setSelectedLabel}
        labelsList={labelsList}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        stats={dynamicGraph.stats}
        onResetOverrides={handleResetOverrides}
        onFitView={handleFitView}
        onLogout={handleLogout}
      />

      {/* Canvas del Grafo DAG */}
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
        minZoom={0.1}
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
