// Campus Reachability & Emergency Route Audit Visualizer Logic

let graphData = null;
let currentMode = 'dfs'; // 'dfs', 'bfs', 'static'
let currentStepIdx = 0;
let isPlaying = false;
let playInterval = null;
let selectedRouteTarget = null;

// Canvas & Camera State
const canvas = document.getElementById('graphCanvas');
const ctx = canvas.getContext('2d');
let nodePositions = {}; // id -> { x, y, vx, vy, isDragging }
let transform = { x: 0, y: 0, scale: 1 };
let isPanning = false;
let startPan = { x: 0, y: 0 };
let draggedNode = null;

// DOM Elements
const rawInput = document.getElementById('rawInput');
const presetSelect = document.getElementById('presetSelect');
const runAuditBtn = document.getElementById('runAuditBtn');
const resetViewBtn = document.getElementById('resetViewBtn');
const modeDfsBtn = document.getElementById('modeDfsBtn');
const modeBfsBtn = document.getElementById('modeBfsBtn');
const modeStaticBtn = document.getElementById('modeStaticBtn');
const playPauseBtn = document.getElementById('playPauseBtn');
const stepPrevBtn = document.getElementById('stepPrevBtn');
const stepNextBtn = document.getElementById('stepNextBtn');
const resetAnimBtn = document.getElementById('resetAnimBtn');
const speedRange = document.getElementById('speedRange');
const stepBadge = document.getElementById('stepBadge');
const stepMessage = document.getElementById('stepMessage');
const stdoutContent = document.getElementById('stdoutContent');
const copyStdoutBtn = document.getElementById('copyStdoutBtn');
const routesList = document.getElementById('routesList');

// Metrics elements
const metricN = document.getElementById('metricN');
const metricM = document.getElementById('metricM');
const metricComponents = document.getElementById('metricComponents');
const metricSource = document.getElementById('metricSource');
const metricQ = document.getElementById('metricQ');

const DEFAULT_PRESETS = [
  {
    name: 'Sample1',
    data: '6 5\n0 2\n0 1\n1 3\n2 3\n4 5\n0 3\n3\n5\n0\n'
  },
  {
    name: 'Sample2',
    data: '3 0\n1 2\n1\n0\n'
  },
  {
    name: 'single_vertex',
    data: '1 0\n0 1\n0\n'
  },
  {
    name: 'source_not_smallest',
    data: '5 3\n0 1\n2 3\n3 4\n2 4\n4\n0\n1\n2\n'
  },
  {
    name: 'tie_shortest_route',
    data: '4 4\n0 1\n0 2\n1 3\n2 3\n0 2\n3\n2\n'
  }
];

// Client-Side Graph Solver Engine (100% compliant with problem02_campus_audit.py)
function solveCampusAuditClient(raw_input_text) {
  const tokens = raw_input_text.trim().split(/\s+/);
  if (!tokens || tokens.length < 2 || tokens[0] === '') {
    return { error: 'Input is too short or empty.' };
  }

  try {
    const n = parseInt(tokens[0], 10);
    const m = parseInt(tokens[1], 10);
    let idx = 2;
    const edges = [];
    const adj = Array.from({ length: n }, () => []);

    for (let i = 0; i < m; i++) {
      if (idx + 1 >= tokens.length) break;
      const u = parseInt(tokens[idx], 10);
      const v = parseInt(tokens[idx + 1], 10);
      edges.push([u, v]);
      adj[u].push(v);
      adj[v].push(u);
      idx += 2;
    }

    const s = parseInt(tokens[idx], 10);
    const q = parseInt(tokens[idx + 1], 10);
    idx += 2;

    const targets = [];
    for (let i = 0; i < q; i++) {
      targets.push(parseInt(tokens[idx + i], 10));
    }

    // Sort adjacency lists ascending
    for (let u = 0; u < n; u++) {
      adj[u].sort((a, b) => a - b);
    }

    // 1. Connected components
    const component_label = new Array(n).fill(-1);
    let num_components = 0;

    function comp_dfs(u, label) {
      component_label[u] = label;
      for (const v of adj[u]) {
        if (component_label[v] === -1) {
          comp_dfs(v, label);
        }
      }
    }

    for (let i = 0; i < n; i++) {
      if (component_label[i] === -1) {
        num_components++;
        comp_dfs(i, i);
      }
    }

    // 2. DFS traversal step-by-step
    const dfs_visited = new Array(n).fill(false);
    const dfs_order = [];
    const dfs_steps = [];

    function dfs(u, p) {
      dfs_visited[u] = true;
      dfs_order.push(u);
      dfs_steps.push({
        type: 'visit',
        vertex: u,
        from: p,
        visited: dfs_visited.map((v, i) => v ? i : null).filter(x => x !== null),
        traversal: [...dfs_order],
        message: (p === null ? `Start DFS at source vertex ${u}` : `DFS entered vertex ${u} from neighbor ${p}`)
      });

      for (const v of adj[u]) {
        if (!dfs_visited[v]) {
          dfs(v, u);
        } else {
          dfs_steps.push({
            type: 'check_visited',
            vertex: v,
            from: u,
            visited: dfs_visited.map((val, i) => val ? i : null).filter(x => x !== null),
            traversal: [...dfs_order],
            message: `Neighbor ${v} of vertex ${u} is already visited. Skipping.`
          });
        }
      }
    }

    dfs(s, null);

    // 3. BFS traversal step-by-step
    const dist = new Array(n).fill(-1);
    const parent = new Array(n).fill(-1);
    const bfs_order = [];
    const bfs_steps = [];

    dist[s] = 0;
    parent[s] = s;
    const queue = [s];

    bfs_steps.push({
      type: 'enqueue',
      vertex: s,
      from: null,
      dist: [...dist],
      parent: [...parent],
      queue: [...queue],
      traversal: [...bfs_order],
      message: `Enqueue source vertex ${s} (distance 0)`
    });

    while (queue.length > 0) {
      const u = queue.shift();
      bfs_order.push(u);
      bfs_steps.push({
        type: 'dequeue',
        vertex: u,
        from: (u !== s ? parent[u] : null),
        dist: [...dist],
        parent: [...parent],
        queue: [...queue],
        traversal: [...bfs_order],
        message: `Dequeued vertex ${u} (distance ${dist[u]})`
      });

      for (const v of adj[u]) {
        if (dist[v] === -1) {
          dist[v] = dist[u] + 1;
          parent[v] = u;
          queue.push(v);
          bfs_steps.push({
            type: 'enqueue',
            vertex: v,
            from: u,
            dist: [...dist],
            parent: [...parent],
            queue: [...queue],
            traversal: [...bfs_order],
            message: `Discovered unvisited neighbor ${v} from ${u}. Set distance=${dist[v]}, parent=${u}, and enqueue.`
          });
        } else {
          bfs_steps.push({
            type: 'already_marked',
            vertex: v,
            from: u,
            dist: [...dist],
            parent: [...parent],
            queue: [...queue],
            traversal: [...bfs_order],
            message: `Neighbor ${v} already discovered (distance=${dist[v]}). Skipping enqueue.`
          });
        }
      }
    }

    // Reconstruct routes
    const routes = [];
    const stdoutLines = [];
    stdoutLines.push(`COMPONENTS ${num_components}`);
    stdoutLines.push(`LABELS ${component_label.join(' ')}`);
    stdoutLines.push(`DFS ${dfs_order.join(' ')}`);
    stdoutLines.push(`BFS ${bfs_order.join(' ')}`);

    for (const t of targets) {
      if (dist[t] === -1) {
        routes.push({ target: t, reachable: false, distance: -1, path: [] });
        stdoutLines.push(`ROUTE ${t} UNREACHABLE`);
      } else {
        const path = [];
        let curr = t;
        while (curr !== s) {
          path.push(curr);
          curr = parent[curr];
        }
        path.push(s);
        path.reverse();
        routes.push({ target: t, reachable: true, distance: dist[t], path });
        stdoutLines.push(`ROUTE ${t} ${dist[t]} ${path.join(' ')}`);
      }
    }

    const raw_stdout = stdoutLines.join('\n') + '\n';

    return {
      n,
      m,
      edges,
      source: s,
      q,
      targets,
      components: {
        count: num_components,
        labels: component_label
      },
      dfs: {
        order: dfs_order,
        steps: dfs_steps
      },
      bfs: {
        order: bfs_order,
        dist,
        parent,
        steps: bfs_steps
      },
      routes,
      raw_stdout
    };
  } catch (e) {
    return { error: 'Failed to parse input: ' + e.message };
  }
}

// Fetch presets from server with fallback
async function loadPresets() {
  let samples = [];
  try {
    const res = await fetch('/api/samples');
    if (res.ok) {
      samples = await res.json();
    }
  } catch (err) {
    // API not found or network error
  }

  if (!samples || samples.length === 0) {
    try {
      const res = await fetch('samples.json');
      if (res.ok) {
        samples = await res.json();
      }
    } catch (e) {}
  }

  if (!samples || samples.length === 0) {
    samples = DEFAULT_PRESETS;
  }

  presetSelect.innerHTML = '<option value="">Choose Preset...</option>';
  samples.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.data;
    opt.textContent = s.name;
    presetSelect.appendChild(opt);
  });

  // Default to Sample1 if available
  const sample1 = samples.find(s => s.name.toLowerCase().includes('sample1'));
  if (sample1) {
    rawInput.value = sample1.data;
    presetSelect.value = sample1.data;
    runAudit();
  } else if (samples.length > 0) {
    rawInput.value = samples[0].data;
    presetSelect.value = samples[0].data;
    runAudit();
  }
}

presetSelect.addEventListener('change', () => {
  if (presetSelect.value) {
    rawInput.value = presetSelect.value;
    runAudit();
  }
});

// Run Audit via API with fallback to Client Engine
async function runAudit() {
  const inputText = rawInput.value.trim();
  if (!inputText) return;

  pauseAnimation();

  let data = null;
  const statusPill = document.getElementById('serverStatus');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: inputText }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      data = await res.json();
      if (statusPill) {
        statusPill.innerHTML = '<span class="dot"></span> Local Server Active';
      }
    }
  } catch (err) {
    // Falls back to client-side
  }

  if (!data || data.error) {
    data = solveCampusAuditClient(inputText);
    if (statusPill) {
      statusPill.innerHTML = '<span class="dot"></span> Client Engine Active';
    }
  }

  if (data.error) {
    alert('Audit error: ' + data.error);
    return;
  }

  graphData = data;
  selectedRouteTarget = null;
  currentStepIdx = 0;

  updateMetrics();
  updateRoutesList();
  stdoutContent.textContent = data.raw_stdout || 'No output.';
  initNodeLayout();
  updateStepView();
}

runAuditBtn.addEventListener('click', runAudit);

// Update overview metrics
function updateMetrics() {
  metricN.textContent = graphData.n;
  metricM.textContent = graphData.m;
  metricComponents.textContent = graphData.components.count;
  metricSource.textContent = graphData.source;
  metricQ.textContent = graphData.q;
}

// Update routes list
function updateRoutesList() {
  routesList.innerHTML = '';
  if (!graphData.routes || graphData.routes.length === 0) {
    routesList.innerHTML = '<div class="empty-state">No target routes defined.</div>';
    return;
  }

  graphData.routes.forEach(route => {
    const item = document.createElement('div');
    item.className = 'route-item';
    if (selectedRouteTarget === route.target) {
      item.classList.add('selected');
    }

    const info = document.createElement('div');
    info.className = 'route-info';

    const header = document.createElement('div');
    header.className = 'route-header';
    header.innerHTML = `<span>Target ${route.target}</span>`;

    const pathStr = document.createElement('div');
    pathStr.className = 'route-path-str';
    pathStr.textContent = route.reachable ? route.path.join(' → ') : 'No emergency path';

    info.appendChild(header);
    info.appendChild(pathStr);

    const badge = document.createElement('span');
    badge.className = `route-badge ${route.reachable ? 'reachable' : 'unreachable'}`;
    badge.textContent = route.reachable ? `d = ${route.distance}` : 'UNREACHABLE';

    item.appendChild(info);
    item.appendChild(badge);

    item.addEventListener('click', () => {
      if (selectedRouteTarget === route.target) {
        selectedRouteTarget = null;
        item.classList.remove('selected');
      } else {
        selectedRouteTarget = route.target;
        document.querySelectorAll('.route-item').forEach(el => el.classList.remove('selected'));
        item.classList.add('selected');
      }
      requestAnimationFrame(drawGraph);
    });

    routesList.appendChild(item);
  });
}

// Copy output button
copyStdoutBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(stdoutContent.textContent);
  copyStdoutBtn.textContent = 'Copied!';
  setTimeout(() => { copyStdoutBtn.textContent = 'Copy Output'; }, 1500);
});

// Layout initialization
function initNodeLayout() {
  resizeCanvas();
  const n = graphData.n;
  const width = canvas.width / (window.devicePixelRatio || 1);
  const height = canvas.height / (window.devicePixelRatio || 1);
  const centerX = width / 2;
  const centerY = height / 2;

  // Group nodes by component
  const componentsMap = {};
  for (let i = 0; i < n; i++) {
    const label = graphData.components.labels[i];
    if (!componentsMap[label]) componentsMap[label] = [];
    componentsMap[label].push(i);
  }

  const compKeys = Object.keys(componentsMap);
  const compCount = compKeys.length;

  nodePositions = {};
  compKeys.forEach((key, compIndex) => {
    const compNodes = componentsMap[key];
    // Center for this component
    const angle = (compIndex / compCount) * 2 * Math.PI;
    const compRadius = compCount === 1 ? 0 : Math.min(width, height) * 0.25;
    const cX = centerX + Math.cos(angle) * compRadius;
    const cY = centerY + Math.sin(angle) * compRadius;

    // Distribute nodes in a circle around component center
    const nodeRadius = compNodes.length === 1 ? 0 : Math.min(120, 30 + compNodes.length * 15);
    compNodes.forEach((nodeId, idx) => {
      const nodeAngle = (idx / compNodes.length) * 2 * Math.PI;
      nodePositions[nodeId] = {
        x: cX + Math.cos(nodeAngle) * nodeRadius,
        y: cY + Math.sin(nodeAngle) * nodeRadius,
        vx: 0,
        vy: 0,
        isDragging: false
      };
    });
  });

  resetCamera();
  requestAnimationFrame(drawGraph);
}

function resetCamera() {
  transform = { x: 0, y: 0, scale: 1 };
  requestAnimationFrame(drawGraph);
}
resetViewBtn.addEventListener('click', resetCamera);

function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', () => {
  resizeCanvas();
  requestAnimationFrame(drawGraph);
});

// Color generator per component
function getComponentColor(label) {
  const hue = (label * 137.5) % 360;
  return `hsl(${hue}, 70%, 55%)`;
}

// Draw the graph
function drawGraph() {
  if (!graphData) return;
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.width / dpr;
  const height = canvas.height / dpr;

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.translate(transform.x, transform.y);
  ctx.scale(transform.scale, transform.scale);

  // Active step details
  let activeVertex = null;
  let activeFrom = null;
  let visitedSet = new Set();
  let enqueuedSet = new Set();

  if (currentMode === 'dfs' && graphData.dfs.steps.length > 0) {
    const step = graphData.dfs.steps[currentStepIdx] || {};
    activeVertex = step.vertex;
    activeFrom = step.from;
    visitedSet = new Set(step.visited || []);
  } else if (currentMode === 'bfs' && graphData.bfs.steps.length > 0) {
    const step = graphData.bfs.steps[currentStepIdx] || {};
    activeVertex = step.vertex;
    activeFrom = step.from;
    const distList = step.dist || [];
    distList.forEach((d, idx) => {
      if (d !== -1) enqueuedSet.add(idx);
    });
  }

  // Find edges on the selected route
  const routeEdges = new Set();
  if (selectedRouteTarget !== null) {
    const route = graphData.routes.find(r => r.target === selectedRouteTarget);
    if (route && route.reachable && route.path.length > 1) {
      for (let i = 0; i < route.path.length - 1; i++) {
        const u = route.path[i];
        const v = route.path[i + 1];
        routeEdges.add(`${Math.min(u, v)}-${Math.max(u, v)}`);
      }
    }
  }

  // 1. Draw Edges
  graphData.edges.forEach(([u, v]) => {
    const posU = nodePositions[u];
    const posV = nodePositions[v];
    if (!posU || !posV) return;

    const edgeKey = `${Math.min(u, v)}-${Math.max(u, v)}`;
    const isOnRoute = routeEdges.has(edgeKey);
    const isStepEdge = (activeVertex === u && activeFrom === v) || (activeVertex === v && activeFrom === u);

    ctx.beginPath();
    ctx.moveTo(posU.x, posU.y);
    ctx.lineTo(posV.x, posV.y);

    if (isOnRoute) {
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else if (isStepEdge) {
      ctx.strokeStyle = '#00f2fe';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#00f2fe';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  });

  // 2. Draw Nodes
  for (let i = 0; i < graphData.n; i++) {
    const pos = nodePositions[i];
    if (!pos) continue;

    const isSource = i === graphData.source;
    const isTarget = graphData.targets.includes(i);
    const isActive = i === activeVertex;
    const isVisited = visitedSet.has(i);
    const isEnqueued = enqueuedSet.has(i);
    const compLabel = graphData.components.labels[i];
    const compColor = getComponentColor(compLabel);

    const radius = isSource ? 22 : 18;

    // Outer glow for active vertex
    if (isActive) {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius + 8, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(0, 242, 254, 0.25)';
      ctx.fill();
    }

    // Outer ring for component
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, 2 * Math.PI);
    
    // Fill node body
    if (isSource) {
      ctx.fillStyle = '#f59e0b'; // Amber beacon
    } else if (isActive) {
      ctx.fillStyle = '#00f2fe'; // Active Cyan
    } else if (currentMode === 'dfs' && isVisited) {
      ctx.fillStyle = '#6366f1'; // Traversed indigo
    } else if (currentMode === 'bfs' && isEnqueued) {
      ctx.fillStyle = '#3b82f6'; // Discovered blue
    } else {
      ctx.fillStyle = '#1e293b'; // Default slate
    }
    ctx.fill();

    // Node border
    ctx.lineWidth = isSource ? 3 : 2;
    ctx.strokeStyle = isSource ? '#ffffff' : (isTarget ? '#ec4899' : compColor);
    ctx.stroke();

    // Target badge / indicator
    if (isTarget) {
      ctx.beginPath();
      ctx.arc(pos.x + 12, pos.y - 12, 6, 0, 2 * Math.PI);
      ctx.fillStyle = '#ec4899';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Node label (Index)
    ctx.fillStyle = isActive || isSource ? '#031525' : '#ffffff';
    ctx.font = `600 ${isSource ? 13 : 12}px JetBrains Mono`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(i.toString(), pos.x, pos.y);

    // Component mini label below node
    ctx.fillStyle = compColor;
    ctx.font = '500 9px Inter';
    ctx.fillText(`C:${compLabel}`, pos.x, pos.y + radius + 10);
  }

  ctx.restore();
}

// Mode switching
modeDfsBtn.addEventListener('click', () => setMode('dfs'));
modeBfsBtn.addEventListener('click', () => setMode('bfs'));
modeStaticBtn.addEventListener('click', () => setMode('static'));

function setMode(mode) {
  currentMode = mode;
  modeDfsBtn.classList.toggle('active', mode === 'dfs');
  modeBfsBtn.classList.toggle('active', mode === 'bfs');
  modeStaticBtn.classList.toggle('active', mode === 'static');

  pauseAnimation();
  currentStepIdx = 0;
  updateStepView();
}

// Step View & Animation
function updateStepView() {
  if (!graphData) return;

  if (currentMode === 'dfs') {
    const steps = graphData.dfs.steps;
    const step = steps[currentStepIdx];
    if (step) {
      stepBadge.textContent = `DFS Step ${currentStepIdx + 1}/${steps.length}`;
      stepMessage.textContent = step.message;
    } else {
      stepBadge.textContent = 'DFS Complete';
      stepMessage.textContent = `Traversal order: [${graphData.dfs.order.join(', ')}]`;
    }
  } else if (currentMode === 'bfs') {
    const steps = graphData.bfs.steps;
    const step = steps[currentStepIdx];
    if (step) {
      stepBadge.textContent = `BFS Step ${currentStepIdx + 1}/${steps.length}`;
      stepMessage.textContent = step.message;
    } else {
      stepBadge.textContent = 'BFS Complete';
      stepMessage.textContent = `Discovery order: [${graphData.bfs.order.join(', ')}]`;
    }
  } else {
    stepBadge.textContent = 'Static View';
    stepMessage.textContent = `Connected Components: ${graphData.components.count} | Select a target route on the left to highlight.`;
  }

  requestAnimationFrame(drawGraph);
}

function nextStep() {
  if (!graphData) return;
  const steps = currentMode === 'dfs' ? graphData.dfs.steps : graphData.bfs.steps;
  if (currentStepIdx < steps.length - 1) {
    currentStepIdx++;
    updateStepView();
  } else {
    pauseAnimation();
  }
}

function prevStep() {
  if (currentStepIdx > 0) {
    currentStepIdx--;
    updateStepView();
  }
}

function resetAnimation() {
  pauseAnimation();
  currentStepIdx = 0;
  updateStepView();
}

function togglePlay() {
  if (isPlaying) {
    pauseAnimation();
  } else {
    startAnimation();
  }
}

function startAnimation() {
  if (!graphData || currentMode === 'static') return;
  const steps = currentMode === 'dfs' ? graphData.dfs.steps : graphData.bfs.steps;
  if (currentStepIdx >= steps.length - 1) {
    currentStepIdx = 0;
  }
  isPlaying = true;
  playPauseBtn.textContent = '⏸';
  const speed = parseInt(speedRange.value, 10);
  const delay = Math.max(80, 1100 - speed * 100);
  playInterval = setInterval(() => {
    nextStep();
  }, delay);
}

function pauseAnimation() {
  isPlaying = false;
  playPauseBtn.textContent = '▶';
  if (playInterval) {
    clearInterval(playInterval);
    playInterval = null;
  }
}

stepNextBtn.addEventListener('click', nextStep);
stepPrevBtn.addEventListener('click', prevStep);
resetAnimBtn.addEventListener('click', resetAnimation);
playPauseBtn.addEventListener('click', togglePlay);
speedRange.addEventListener('input', () => {
  if (isPlaying) {
    pauseAnimation();
    startAnimation();
  }
});

// Canvas Interactions (Pan, Zoom, Drag nodes)
function getCanvasCoords(e) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const clientX = e.clientX - rect.left;
  const clientY = e.clientY - rect.top;
  return {
    x: (clientX - transform.x) / transform.scale,
    y: (clientY - transform.y) / transform.scale
  };
}

canvas.addEventListener('mousedown', (e) => {
  const coords = getCanvasCoords(e);
  // Check if clicked a node
  for (let i = 0; i < (graphData ? graphData.n : 0); i++) {
    const pos = nodePositions[i];
    if (!pos) continue;
    const dist = Math.hypot(pos.x - coords.x, pos.y - coords.y);
    if (dist <= 22) {
      draggedNode = pos;
      pos.isDragging = true;
      return;
    }
  }

  isPanning = true;
  startPan = { x: e.clientX - transform.x, y: e.clientY - transform.y };
});

window.addEventListener('mousemove', (e) => {
  if (draggedNode) {
    const coords = getCanvasCoords(e);
    draggedNode.x = coords.x;
    draggedNode.y = coords.y;
    requestAnimationFrame(drawGraph);
  } else if (isPanning) {
    transform.x = e.clientX - startPan.x;
    transform.y = e.clientY - startPan.y;
    requestAnimationFrame(drawGraph);
  }
});

window.addEventListener('mouseup', () => {
  if (draggedNode) {
    draggedNode.isDragging = false;
    draggedNode = null;
  }
  isPanning = false;
});

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  transform.x = mouseX - (mouseX - transform.x) * zoomFactor;
  transform.y = mouseY - (mouseY - transform.y) * zoomFactor;
  transform.scale *= zoomFactor;
  requestAnimationFrame(drawGraph);
}, { passive: false });

// Bottom Tabs switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    const tabId = btn.getAttribute('data-tab');
    document.getElementById(tabId).classList.add('active');
  });
});

// Initial boot
window.addEventListener('DOMContentLoaded', () => {
  resizeCanvas();
  loadPresets();
});
