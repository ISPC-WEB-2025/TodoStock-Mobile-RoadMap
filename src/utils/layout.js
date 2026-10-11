import dagre from 'dagre';

export const NODE_WIDTH = 300;
export const NODE_HEIGHT = 220;

/**
 * Aplica un layout jerárquico DAG inteligente por componentes conexos (Multi-component Packing).
 * Evita la torre vertical infinita separando y empaquetando cada árbol de dependencias
 * en una cuadrícula 2D panorámica balanceada.
 */
export function getLayoutedElements(nodes, edges, direction = 'LR') {
  if (!nodes || nodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  const nodeIds = new Set(nodes.map(n => n.id));

  // Filtrar aristas cuyos dos extremos estén en el conjunto de nodos visibles
  const activeEdges = edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));

  // 1. Construir lista de adyacencia no dirigida para encontrar componentes conexos
  const adj = new Map();
  nodes.forEach(n => adj.set(n.id, []));
  activeEdges.forEach(e => {
    adj.get(e.source).push(e.target);
    adj.get(e.target).push(e.source);
  });

  const visited = new Set();
  const components = [];

  nodes.forEach(n => {
    if (!visited.has(n.id)) {
      const compNodeIds = [];
      const queue = [n.id];
      visited.add(n.id);
      while (queue.length > 0) {
        const curr = queue.shift();
        compNodeIds.push(curr);
        for (const neighbor of adj.get(curr) || []) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }
      components.push(compNodeIds);
    }
  });

  // 2. Separar árboles de dependencia (tamaño > 1) de nodos aislados (tamaño === 1)
  const connectedComps = components.filter(c => c.length > 1);
  const isolatedComps = components.filter(c => c.length === 1);

  // 3. Calcular Dagre layout para cada árbol de dependencias
  const laidOutConnected = connectedComps.map(compNodeIds => {
    const cSet = new Set(compNodeIds);
    const compEdges = activeEdges.filter(e => cSet.has(e.source) && cSet.has(e.target));

    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({
      rankdir: direction,
      nodesep: 65,
      ranksep: 120,
      align: 'UL',
    });

    compNodeIds.forEach(id => {
      g.setNode(id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    });

    compEdges.forEach(e => {
      g.setEdge(e.source, e.target);
    });

    dagre.layout(g);

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    compNodeIds.forEach(id => {
      const pos = g.node(id);
      if (pos.x < minX) minX = pos.x;
      if (pos.x > maxX) maxX = pos.x;
      if (pos.y < minY) minY = pos.y;
      if (pos.y > maxY) maxY = pos.y;
    });

    const width = maxX - minX + NODE_WIDTH;
    const height = maxY - minY + NODE_HEIGHT;

    // Normalizar coordenadas relativas al origen del componente (0, 0)
    const localPositions = new Map();
    compNodeIds.forEach(id => {
      const pos = g.node(id);
      localPositions.set(id, {
        x: pos.x - minX,
        y: pos.y - minY,
      });
    });

    return {
      nodeIds: compNodeIds,
      localPositions,
      width,
      height,
    };
  });

  // Ordenar los árboles por tamaño (cantidad de nodos) descendente
  laidOutConnected.sort((a, b) => b.nodeIds.length - a.nodeIds.length);

  // 4. Empaquetado bidimensional 2D (Shelf Bin Packing) de los árboles
  const MAX_ROW_WIDTH = 3600; // Ancho objetivo para visión panorámica tipo 16:9
  const COL_GAP = 140;
  const ROW_GAP = 120;

  let currentX = 0;
  let currentY = 0;
  let rowMaxHeight = 0;

  const finalNodePositions = new Map();

  for (const comp of laidOutConnected) {
    if (currentX > 0 && currentX + comp.width > MAX_ROW_WIDTH) {
      // Salto a la siguiente fila
      currentX = 0;
      currentY += rowMaxHeight + ROW_GAP;
      rowMaxHeight = 0;
    }

    // Posicionar este componente
    for (const [id, localPos] of comp.localPositions.entries()) {
      finalNodePositions.set(id, {
        x: currentX + localPos.x,
        y: currentY + localPos.y,
      });
    }

    currentX += comp.width + COL_GAP;
    if (comp.height > rowMaxHeight) {
      rowMaxHeight = comp.height;
    }
  }

  // 5. Si hay nodos aislados en este lienzo, organizarlos en una grilla compacta multilínea abajo
  if (isolatedComps.length > 0) {
    if (connectedComps.length > 0) {
      currentY += rowMaxHeight + ROW_GAP * 1.5;
    }
    const GRID_COLS = 4;
    const GRID_GAP_X = 50;
    const GRID_GAP_Y = 50;

    isolatedComps.forEach((comp, idx) => {
      const id = comp[0];
      const col = idx % GRID_COLS;
      const row = Math.floor(idx / GRID_COLS);
      finalNodePositions.set(id, {
        x: col * (NODE_WIDTH + GRID_GAP_X),
        y: currentY + row * (NODE_HEIGHT + GRID_GAP_Y),
      });
    });
  }

  // 6. Construir nodos para React Flow
  const layoutedNodes = nodes.map(node => {
    const pos = finalNodePositions.get(node.id) || { x: 0, y: 0 };
    return {
      ...node,
      targetPosition: direction === 'LR' ? 'left' : 'top',
      sourcePosition: direction === 'LR' ? 'right' : 'bottom',
      position: {
        x: pos.x,
        y: pos.y,
      },
    };
  });

  return { nodes: layoutedNodes, edges: activeEdges };
}
