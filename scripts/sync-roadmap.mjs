import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const REPO_OWNER = 'ISPC-WEB-2025';
const REPO_NAME = 'TodoStock-AppMovil';
const REPO = `${REPO_OWNER}/${REPO_NAME}`;

async function fetchIssues() {
  const isOffline = process.argv.includes('--offline');
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

  if (isOffline) {
    console.log('⚡ Modo offline activado: cargando raw-issues.json local...');
    return loadLocalRawIssues();
  }

  // Intentar primero con la CLI gh si está disponible
  try {
    console.log(`📡 Consultando issues de ${REPO} mediante GitHub CLI (gh)...`);
    const stdout = execSync(
      `gh issue list --repo ${REPO} --limit 300 --state all --json number,title,state,body,assignees,labels,url,updatedAt,milestone`,
      { encoding: 'utf8', maxBuffer: 15 * 1024 * 1024 }
    );
    const clean = stdout.replace(/^\uFEFF/, '').trim();
    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed) && parsed.length > 0) {
      console.log(`✅ ${parsed.length} issues obtenidas con gh.`);
      fs.writeFileSync(path.join(rootDir, 'raw-issues.json'), JSON.stringify(parsed, null, 2), 'utf-8');
      return parsed;
    }
  } catch (err) {
    console.warn('⚠️ No se pudo usar gh CLI directo:', err.message);
  }

  // Si hay token, intentar con fetch directo a la API de GitHub
  if (token) {
    try {
      console.log(`📡 Consultando GitHub REST API para ${REPO}...`);
      let allIssues = [];
      let page = 1;
      while (true) {
        const url = `https://api.github.com/repos/${REPO}/issues?state=all&per_page=100&page=${page}`;
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'TodoStock-Roadmap-Sync'
          }
        });
        if (!res.ok) {
          throw new Error(`GitHub API error ${res.status}: ${res.statusText}`);
        }
        const issues = await res.json();
        if (!issues || issues.length === 0) break;
        allIssues = allIssues.concat(issues);
        if (issues.length < 100) break;
        page++;
      }
      console.log(`✅ ${allIssues.length} issues obtenidas vía GitHub API.`);
      fs.writeFileSync(path.join(rootDir, 'raw-issues.json'), JSON.stringify(allIssues, null, 2), 'utf-8');
      return allIssues;
    } catch (err) {
      console.warn('⚠️ Error en fetch a GitHub API:', err.message);
    }
  }

  // Fallback final: archivo local raw-issues.json
  console.log('📂 Usando fallback local: raw-issues.json');
  return loadLocalRawIssues();
}

function loadLocalRawIssues() {
  const filePath = path.join(rootDir, 'raw-issues.json');
  if (!fs.existsSync(filePath)) {
    throw new Error(`No se encontró el archivo de fallback: ${filePath}`);
  }
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/^\uFEFF/, '');
  return JSON.parse(content);
}

function normalizeTk(raw) {
  if (!raw) return null;
  const match = raw.match(/TK0*(\d+)/i);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  return `TK${num < 10 ? '0' + num : num}`;
}

function parseIssueData(issue) {
  const title = (issue.title || '').trim();
  const body = (issue.body || '').trim();
  const number = issue.number;
  const state = (issue.state || 'OPEN').toUpperCase();

  // Excluir notificaciones automáticas de merge a develop (son logs de CI, no tareas)
  if (title.startsWith('🔀 Merge')) {
    return null;
  }

  // Detectar TK estrictamente desde el título para evitar secuestro de identificadores
  let tk = null;
  const titleTkMatch = title.match(/#?(TK0*\d+)/i);
  if (titleTkMatch) {
    tk = normalizeTk(titleTkMatch[1]);
  }

  // Extraer metadata estructurada del body
  const historiaMatch = body.match(/\*\*Historia:\*\*\s*([^\r\n·]+)/i);
  const areaMatch = body.match(/\*\*Área:\*\*\s*([^\r\n·]+)/i);
  const faseMatch = body.match(/\*\*Fase:\*\*\s*([^\r\n·]+)/i);
  const spMatch = body.match(/\*\*SP:\*\*\s*(\d+)/i);
  const capaMatch = body.match(/\*\*Capa:\*\*\s*([^\r\n·]+)/i);

  // Detectar Enabler / Épica asociada
  let enabler = null;
  const enablerMatch = title.match(/\[(ENABLER-QA|RNF-SEG|RNF-UX|RELEASE|MGMT)[^\]]*\]/i) ||
                       body.match(/\[(ENABLER-QA|RNF-SEG|RNF-UX|RELEASE|MGMT)[^\]]*\]/i);
  if (enablerMatch) {
    enabler = enablerMatch[0];
  } else if (historiaMatch && historiaMatch[1].trim().toUpperCase() === 'US15') {
    enabler = '[ENABLER-QA]';
  }

  // Extraer menciones de dependencia
  const rawDepTexts = [];
  const depRegex = /(?:depende\s+de|bloquead[oa]\s+por|requiere)[\s:*]+([^\r\n]+)/gi;
  let match;
  while ((match = depRegex.exec(body)) !== null) {
    rawDepTexts.push(match[1]);
  }

  const detectedDeps = [];
  for (const depText of rawDepTexts) {
    // Buscar referencias #123
    const issueRefs = depText.match(/#(\d+)/g) || [];
    for (const ref of issueRefs) {
      const refNum = parseInt(ref.replace('#', ''), 10);
      if (refNum !== number) {
        detectedDeps.push({ type: 'issue', value: refNum });
      }
    }
    // Buscar referencias TKxx
    const tkRefs = depText.match(/TK0*\d+/gi) || [];
    for (const ref of tkRefs) {
      const normTk = normalizeTk(ref);
      if (normTk && normTk !== tk) {
        detectedDeps.push({ type: 'tk', value: normTk });
      }
    }
  }

  // Requerimientos de automatización cubiertos por tests: [AUT-xx], [ACC-xx]
  const cubreMatch = body.match(/Lo cubre[:*]+\s*(TK0*\d+)/i);
  if (cubreMatch) {
    const normTk = normalizeTk(cubreMatch[1]);
    if (normTk && normTk !== tk) {
      detectedDeps.push({ type: 'tk', value: normTk });
    }
  }

  // Bugs o mejoras con corrección prevista
  const bugFixMatch = body.match(/(?:Corrección prevista|Relacionada con)[:*]+\s*([^\r\n]+)/i);
  if (bugFixMatch) {
    const tks = bugFixMatch[1].match(/TK0*\d+/gi) || [];
    for (const ref of tks) {
      const normTk = normalizeTk(ref);
      if (normTk && normTk !== tk) {
        detectedDeps.push({ type: 'tk', value: normTk });
      }
    }
  }

  // Detectar Sprint / Milestone
  let sprint = null;
  if (issue.milestone && issue.milestone.title) {
    sprint = issue.milestone.title;
  } else {
    for (const l of issue.labels || []) {
      const lm = (l.name || '').match(/sprint\s*(\d+)/i);
      if (lm) {
        sprint = `Sprint ${lm[1]}`;
        break;
      }
    }
  }

  if (!sprint) {
    if (number <= 54 || /devolución sprint 1|sprint 1/i.test(title)) {
      sprint = 'Sprint 1';
    } else if (/sprint\s*3/i.test(title) || /sprint\s*3/i.test(body)) {
      sprint = 'Sprint 3';
    } else {
      sprint = 'Sprint 2';
    }
  }

  return {
    id: `issue-${number}`,
    number,
    tk,
    title,
    body,
    state, // 'OPEN' | 'CLOSED'
    sprint,
    milestone: issue.milestone ? {
      number: issue.milestone.number,
      title: issue.milestone.title,
    } : { title: sprint },
    url: issue.url || `https://github.com/${REPO}/issues/${number}`,
    assignees: (issue.assignees || []).map(a => ({
      login: a.login,
      name: a.name || a.login,
      avatarUrl: a.avatarUrl || a.avatar_url || `https://github.com/${a.login}.png`
    })),
    labels: (issue.labels || []).map(l => ({
      name: l.name,
      color: l.color ? `#${l.color}` : '#94a3b8'
    })),
    meta: {
      historia: historiaMatch ? historiaMatch[1].trim() : null,
      area: areaMatch ? areaMatch[1].trim() : null,
      fase: faseMatch ? faseMatch[1].trim() : null,
      sp: spMatch ? parseInt(spMatch[1], 10) : null,
      capa: capaMatch ? capaMatch[1].trim() : null,
      enabler
    },
    rawDeps: detectedDeps
  };
}

async function run() {
  const rawList = await fetchIssues();
  const parsedIssues = rawList.map(parseIssueData).filter(Boolean);

  // Mapas para resolver dependencias rápidamente
  const issueByNumber = new Map();
  const issueByTk = new Map();

  for (const item of parsedIssues) {
    issueByNumber.set(item.number, item);
    if (item.tk) {
      issueByTk.set(item.tk, item);
    }
  }

  // Cargar configuración de overrides opcionales
  const overridePath = path.join(rootDir, 'config', 'dependencies-override.json');
  let manualEdges = [];
  if (fs.existsSync(overridePath)) {
    try {
      const config = JSON.parse(fs.readFileSync(overridePath, 'utf-8'));
      manualEdges = config.manualEdges || [];
    } catch (e) {
      console.warn('⚠️ No se pudo leer config/dependencies-override.json:', e.message);
    }
  }

  // Construir aristas (Edges) dirigidas: parent -> child
  const edgeSet = new Set();
  const edges = [];
  const incomingDepsMap = new Map(); // childId -> Set of parentIds

  function addEdge(sourceId, targetId, reason = 'auto') {
    if (sourceId === targetId) return;
    const edgeKey = `${sourceId}->${targetId}`;
    if (edgeSet.has(edgeKey)) return;
    edgeSet.add(edgeKey);

    edges.push({
      id: `edge-${edgeKey}`,
      source: sourceId,
      target: targetId,
      reason
    });

    if (!incomingDepsMap.has(targetId)) {
      incomingDepsMap.set(targetId, new Set());
    }
    incomingDepsMap.get(targetId).add(sourceId);
  }

  // 1. Resolver dependencias detectadas en issues
  for (const item of parsedIssues) {
    for (const dep of item.rawDeps) {
      let parent = null;
      if (dep.type === 'issue') {
        parent = issueByNumber.get(dep.value);
      } else if (dep.type === 'tk') {
        parent = issueByTk.get(dep.value);
      }
      if (parent) {
        addEdge(parent.id, item.id, `depends_on_${dep.value}`);
      }
    }
  }

  // 2. Agregar dependencias manuales del override
  for (const m of manualEdges) {
    const parent = issueByNumber.get(m.from) || issueByTk.get(m.from);
    const child = issueByNumber.get(m.to) || issueByTk.get(m.to);
    if (parent && child) {
      addEdge(parent.id, child.id, 'manual_override');
    }
  }

  // 3. Conectar entregables finales de QA hacia el hito [ENABLER-QA] #69
  const enabler69 = issueByNumber.get(69);
  if (enabler69) {
    const tk84 = issueByTk.get('TK84'); // Wiki Testing.md (integra pipeline JaCoCo, Newman y matriz)
    const tk96 = issueByTk.get('TK96'); // Informe de Accesibilidad
    const tk80 = issueByTk.get('TK80'); // Plan de pruebas
    if (tk84) addEdge(tk84.id, enabler69.id, 'enabler_milestone');
    if (tk96) addEdge(tk96.id, enabler69.id, 'enabler_milestone');
    if (tk80) addEdge(tk80.id, enabler69.id, 'enabler_milestone');
  }

  // 3. Calcular estados de Nodos y Aristas (Topología)
  const nodeStatusMap = new Map();
  for (const item of parsedIssues) {
    if (item.state === 'CLOSED') {
      nodeStatusMap.set(item.id, 'COMPLETED');
    }
  }

  // Resolver nodos abiertos: ¿UNBLOCKED o BLOCKED?
  const nodes = parsedIssues.map(item => {
    const isCompleted = item.state === 'CLOSED';
    const parentIds = incomingDepsMap.get(item.id) || new Set();
    const blockingParents = [];

    for (const parentId of parentIds) {
      if (nodeStatusMap.get(parentId) !== 'COMPLETED') {
        const parentItem = parsedIssues.find(i => i.id === parentId);
        blockingParents.push({
          id: parentId,
          number: parentItem?.number,
          tk: parentItem?.tk,
          title: parentItem?.title
        });
      }
    }

    let status = 'COMPLETED';
    if (!isCompleted) {
      status = blockingParents.length === 0 ? 'UNBLOCKED' : 'BLOCKED';
    }

    return {
      id: item.id,
      number: item.number,
      tk: item.tk,
      title: item.title,
      state: item.state,
      status, // 'COMPLETED' | 'UNBLOCKED' | 'BLOCKED'
      blockingParents,
      url: item.url,
      assignees: item.assignees,
      labels: item.labels,
      meta: item.meta,
      sprint: item.sprint,
      milestone: item.milestone
    };
  });

  // Calcular status de las aristas
  const styledEdges = edges.map(e => {
    const sourceNode = nodes.find(n => n.id === e.source);
    const isSourceCompleted = sourceNode?.status === 'COMPLETED';
    return {
      ...e,
      status: isSourceCompleted ? 'active' : 'inactive', // activa si la condición ya se cumplió
      animated: isSourceCompleted
    };
  });

  // Estadísticas globales
  const stats = {
    total: nodes.length,
    open: nodes.filter(n => n.state === 'OPEN').length,
    closed: nodes.filter(n => n.state === 'CLOSED').length,
    unblockedReady: nodes.filter(n => n.status === 'UNBLOCKED').length,
    blocked: nodes.filter(n => n.status === 'BLOCKED').length,
    lastUpdated: new Date().toISOString()
  };

  const outputPayload = {
    stats,
    nodes,
    edges: styledEdges
  };

  // Guardar en src/data y public/data
  const srcDataDir = path.join(rootDir, 'src', 'data');
  const publicDataDir = path.join(rootDir, 'public', 'data');
  fs.mkdirSync(srcDataDir, { recursive: true });
  fs.mkdirSync(publicDataDir, { recursive: true });

  const jsonStr = JSON.stringify(outputPayload, null, 2);
  fs.writeFileSync(path.join(srcDataDir, 'roadmap-data.json'), jsonStr, 'utf-8');
  fs.writeFileSync(path.join(publicDataDir, 'roadmap-data.json'), jsonStr, 'utf-8');

  console.log('==============================================');
  console.log('🎉 Roadmap sincronizado exitosamente:');
  console.log(`- Total Issues: ${stats.total}`);
  console.log(`- Cerradas (Completadas): ${stats.closed}`);
  console.log(`- Abiertas: ${stats.open}`);
  console.log(`  └─ 🟢 Desbloqueadas (Listas para tomar hoy): ${stats.unblockedReady}`);
  console.log(`  └─ 🔒 Bloqueadas por condiciones: ${stats.blocked}`);
  console.log(`- Aristas de dependencia generadas: ${styledEdges.length}`);
  console.log('==============================================');
}

run().catch(err => {
  console.error('❌ Error sincronizando el roadmap:', err);
  process.exit(1);
});
