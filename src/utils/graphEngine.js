/**
 * Recalcula en caliente la topología del grafo en base a los datos de GitHub
 * combinados con las simulaciones manuales locales de localStorage.
 */
export function recalculateGraph(rawNodes, rawEdges, localOverrides = {}) {
  // 1. Determinar el estado base (respetando override local si existe)
  const effectiveStateMap = new Map();
  for (const node of rawNodes) {
    if (localOverrides[node.id] !== undefined) {
      effectiveStateMap.set(node.id, localOverrides[node.id]); // 'COMPLETED' o 'OPEN'
    } else {
      effectiveStateMap.set(node.id, node.state === 'CLOSED' ? 'COMPLETED' : 'OPEN');
    }
  }

  // 2. Mapear dependencias entrantes (parent -> child)
  const incomingMap = new Map(); // childId -> Set of parentIds
  const outgoingMap = new Map(); // parentId -> Set of childIds

  for (const edge of rawEdges) {
    if (!incomingMap.has(edge.target)) incomingMap.set(edge.target, new Set());
    incomingMap.get(edge.target).add(edge.source);

    if (!outgoingMap.has(edge.source)) outgoingMap.set(edge.source, new Set());
    outgoingMap.get(edge.source).add(edge.target);
  }

  // 3. Evaluar cada nodo
  const evaluatedNodes = rawNodes.map((node) => {
    const isOverride = localOverrides[node.id] !== undefined;
    const baseState = effectiveStateMap.get(node.id);
    const parentIds = incomingMap.get(node.id) || new Set();

    const blockingParents = [];
    for (const pId of parentIds) {
      if (effectiveStateMap.get(pId) !== 'COMPLETED') {
        const pNode = rawNodes.find((n) => n.id === pId);
        blockingParents.push({
          id: pId,
          number: pNode?.number,
          tk: pNode?.tk,
          title: pNode?.title,
        });
      }
    }

    let status = 'COMPLETED';
    if (baseState !== 'COMPLETED') {
      status = blockingParents.length === 0 ? 'UNBLOCKED' : 'BLOCKED';
    }

    // Identificar dependientes que desbloquea este nodo
    const dependentChildIds = outgoingMap.get(node.id) || new Set();

    return {
      ...node,
      status, // 'COMPLETED' | 'UNBLOCKED' | 'BLOCKED'
      isOverride,
      simulatedState: isOverride ? baseState : null,
      blockingParents,
      dependentChildCount: dependentChildIds.size,
    };
  });

  // 4. Evaluar cada arista (línea activa si el origen está COMPLETED)
  const evaluatedEdges = rawEdges.map((edge) => {
    const isSourceCompleted = effectiveStateMap.get(edge.source) === 'COMPLETED';
    return {
      ...edge,
      status: isSourceCompleted ? 'active' : 'inactive',
      animated: isSourceCompleted,
      style: isSourceCompleted
        ? { stroke: '#10b981', strokeWidth: 2.5 }
        : { stroke: '#475569', strokeWidth: 1.5, strokeDasharray: '5,5' },
    };
  });

  // 5. Estadísticas dinámicas de tareas operativas
  // Las Historias de Usuario son contenedores funcionales, no tareas de desarrollo pendientes
  const taskNodes = evaluatedNodes.filter((n) => !n.isUserStory);
  const stats = {
    total: taskNodes.length,
    open: taskNodes.filter((n) => effectiveStateMap.get(n.id) !== 'COMPLETED').length,
    closed: taskNodes.filter((n) => effectiveStateMap.get(n.id) === 'COMPLETED').length,
    unblockedReady: taskNodes.filter((n) => n.status === 'UNBLOCKED').length,
    blocked: taskNodes.filter((n) => n.status === 'BLOCKED').length,
    overrideCount: Object.keys(localOverrides).length,
    userStoriesCount: evaluatedNodes.filter((n) => n.isUserStory).length,
  };

  return { nodes: evaluatedNodes, edges: evaluatedEdges, stats };
}
