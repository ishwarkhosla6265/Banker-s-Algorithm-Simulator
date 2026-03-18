/**
 * Banker's Algorithm Simulator — Enhanced v2
 * ==========================================
 * NEW Features:
 *  - Full algorithm trace table (pass-by-pass)
 *  - Matrix row highlighting per step
 *  - Process State Timeline (Waiting/Running/Done/Blocked)
 *  - State Snapshot table in Step panel
 *  - Need vs Work Comparison panel
 *  - Resource Request Simulator (Resource-Request Algorithm)
 *  - Deadlock Detection mode
 *  - Header stats (processes, resources, state)
 *  - Print/Export support
 *  - Speed control for auto-play
 *  - Legend panel toggle
 */
'use strict';

/* ============================================================
   STATE
   ============================================================ */
let S = {
  n: 0, m: 0,
  allocation: [], maximum: [], need: [], available: [], totalRes: [],
  safeSeq: [], isSafe: null,
  steps: [], currentStep: -1,
  autoTimer: null,
  initialized: false,
  traceData: [],       // full pass-by-pass trace
  timeline: [],        // per-step process states for timeline
};

/* ============================================================
   DOM HELPERS
   ============================================================ */
const $ = id => document.getElementById(id);
const show = el => el && el.classList.remove('hidden');
const hide = el => el && el.classList.add('hidden');
const qs = s => document.querySelector(s);

const EL = {
  numProcesses: $('numProcesses'),
  numResources: $('numResources'),
  initBtn: $('initBtn'), randomBtn: $('randomBtn'),
  checkSafetyBtn: $('checkSafetyBtn'), stepByStepBtn: $('stepByStepBtn'),
  deadlockBtn: $('deadlockBtn'), resetBtn: $('resetBtn'),
  prevStepBtn: $('prevStepBtn'), nextStepBtn: $('nextStepBtn'),
  autoPlayBtn: $('autoPlayBtn'), speedSelect: $('speedSelect'),
  matricesCard: $('matrices-card'), resultCard: $('result-card'),
  stepPanel: $('stepPanel'), comparisonCard: $('comparisonCard'),
  flowCard: $('flowCard'), timelineCard: $('timelineCard'),
  availableGrid: $('availableGrid'),
  allocationHeader: $('allocationHeader'), allocationBody: $('allocationBody'),
  maxHeader: $('maxHeader'), maxBody: $('maxBody'),
  needHeader: $('needHeader'), needBody: $('needBody'),
  resultBanner: $('resultBanner'), resultIcon: $('resultIcon'),
  resultState: $('resultState'), resultDetail: $('resultDetail'),
  safeSequenceBox: $('safeSequenceBox'), statsRow: $('statsRow'),
  stepLog: $('stepLog'), stepCounter: $('stepCounter'),
  workVectorDisplay: $('workVectorDisplay'), stateSnapshot: $('stateSnapshot'),
  comparisonContainer: $('comparisonContainer'),
  flowContainer: $('flowContainer'), resourceGraph: $('resourceGraph'),
  timelineContainer: $('timelineContainer'),
  systemStatus: $('systemStatus'),
  themeToggle: $('themeToggle'), themeIcon: $('themeIcon'),
  themeLabel: qs('.theme-label'),
  sidebar: $('sidebar'), sidebarOverlay: $('sidebarOverlay'),
  mobileMenuBtn: $('mobileMenuBtn'), toastContainer: $('toastContainer'),
  legendToggle: $('matrixLegend'), legendPanel: $('legendPanel'),
  requestNotice: $('requestNotice'), requestForm: $('requestForm'),
  requestProcess: $('requestProcess'), requestVector: $('requestVector'),
  runRequestBtn: $('runRequestBtn'), clearRequestBtn: $('clearRequestBtn'),
  requestResult: $('requestResult'), requestResultBanner: $('requestResultBanner'),
  requestSteps: $('requestSteps'),
  traceContent: $('traceContent'),
  hstatProcesses: $('hstatProcesses'), hstatResources: $('hstatResources'), hstatState: $('hstatState'),
};

/* ============================================================
   PRESET EXAMPLES
   ============================================================ */
const EXAMPLES = [
  {
    n: 5, m: 3,
    allocation: [[0, 1, 0], [2, 0, 0], [3, 0, 2], [2, 1, 1], [0, 0, 2]],
    maximum: [[7, 5, 3], [3, 2, 2], [9, 0, 2], [2, 2, 2], [4, 3, 3]],
    available: [3, 3, 2],
  },
  {
    n: 4, m: 3,
    allocation: [[1, 0, 2], [2, 1, 0], [1, 2, 1], [0, 1, 3]],
    maximum: [[3, 3, 3], [4, 2, 1], [2, 3, 3], [2, 2, 4]],
    available: [0, 0, 0],
  },
  {
    n: 3, m: 2,
    allocation: [[1, 0], [0, 1], [2, 1]],
    maximum: [[2, 2], [1, 3], [3, 2]],
    available: [1, 1],
  },
];

/* ============================================================
   BOOT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  initNavigation();
  loadTheme();
});

/* ============================================================
   EVENT BINDING
   ============================================================ */
function bindEvents() {
  EL.initBtn.addEventListener('click', handleInit);
  EL.randomBtn.addEventListener('click', handleRandom);
  EL.checkSafetyBtn.addEventListener('click', handleCheckSafety);
  EL.stepByStepBtn.addEventListener('click', handleStepByStep);
  EL.deadlockBtn.addEventListener('click', handleDeadlockDetect);
  EL.resetBtn.addEventListener('click', handleReset);
  EL.prevStepBtn.addEventListener('click', goToPrev);
  EL.nextStepBtn.addEventListener('click', goToNext);
  EL.autoPlayBtn.addEventListener('click', toggleAutoPlay);
  EL.themeToggle.addEventListener('click', toggleTheme);
  EL.mobileMenuBtn.addEventListener('click', openSidebar);
  EL.sidebarOverlay.addEventListener('click', closeSidebar);
  EL.legendToggle.addEventListener('click', toggleLegend);
  EL.runRequestBtn.addEventListener('click', handleResourceRequest);
  EL.clearRequestBtn.addEventListener('click', clearRequest);

  // Quick actions (sidebar)
  $('navRandom').addEventListener('click', e => { e.preventDefault(); handleRandom(); });
  $('navReset').addEventListener('click', e => { e.preventDefault(); handleReset(); });
  $('navPrint').addEventListener('click', e => { e.preventDefault(); window.print(); });

  // Live need computation
  document.addEventListener('input', e => {
    if (e.target.classList.contains('cell-input')) computeNeedDOM();
  });
}

/* ============================================================
   NAVIGATION
   ============================================================ */
function initNavigation() {
  document.querySelectorAll('.nav-link[data-section]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      navigateTo(link.dataset.section);
      closeSidebar();
    });
  });
}

function navigateTo(id) {
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const lnk = document.querySelector(`[data-section="${id}"]`);
  if (lnk) lnk.classList.add('active');
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const sec = $(`section-${id}`);
  if (sec) sec.classList.add('active');
}

/* ============================================================
   THEME
   ============================================================ */
function loadTheme() { applyTheme(localStorage.getItem('bankerTheme') || 'dark'); }
function toggleTheme() {
  const next = document.body.classList.contains('light-theme') ? 'dark' : 'light';
  applyTheme(next); localStorage.setItem('bankerTheme', next);
}
function applyTheme(t) {
  const b = document.body;
  if (t === 'light') {
    b.classList.add('light-theme'); b.classList.remove('dark-theme');
    EL.themeIcon.textContent = '🌙';
    if (EL.themeLabel) EL.themeLabel.textContent = 'Dark Mode';
  } else {
    b.classList.add('dark-theme'); b.classList.remove('light-theme');
    EL.themeIcon.textContent = '☀';
    if (EL.themeLabel) EL.themeLabel.textContent = 'Light Mode';
  }
}

/* ============================================================
   SIDEBAR / LEGEND
   ============================================================ */
function openSidebar() { EL.sidebar.classList.add('open'); EL.sidebarOverlay.classList.add('visible'); }
function closeSidebar() { EL.sidebar.classList.remove('open'); EL.sidebarOverlay.classList.remove('visible'); }
function toggleLegend() {
  const hidden = EL.legendPanel.classList.contains('hidden');
  hidden ? show(EL.legendPanel) : hide(EL.legendPanel);
  EL.legendToggle.textContent = hidden ? 'Hide Legend ▴' : 'Show Legend ▾';
}

/* ============================================================
   INIT MATRICES
   ============================================================ */
function handleInit() {
  const n = +EL.numProcesses.value, m = +EL.numResources.value;
  if (!validateCfg(n, m)) return;
  S.n = n; S.m = m; S.isSafe = null; S.safeSeq = []; S.steps = []; S.currentStep = -1; S.initialized = true;
  buildMatrices(n, m);
  show(EL.matricesCard);
  ['result-card', 'stepPanel', 'comparisonCard', 'flowCard', 'timelineCard'].forEach(id => hide($(id)));
  setStatus('Ready', '');
  updateHeaderStats();
  showToast('✅ Matrices initialized.', 'success');
  stopAutoPlay();
}

function validateCfg(n, m) {
  if (!n || n < 1 || n > 10) { showToast('⚠ Processes: 1–10', 'error'); return false; }
  if (!m || m < 1 || m > 8) { showToast('⚠ Resources: 1–8', 'error'); return false; }
  return true;
}

/* ============================================================
   BUILD MATRICES IN DOM
   ============================================================ */
function buildMatrices(n, m) {
  const labels = resourceLabels(m);

  // Available
  EL.availableGrid.innerHTML = '';
  labels.forEach((l, j) => {
    const g = document.createElement('div');
    g.className = 'avail-input-group';
    g.innerHTML = `<span class="avail-label">${l}</span>
      <input class="avail-input" type="number" min="0" max="99" id="avail_${j}" value="0" aria-label="Available ${l}" />`;
    EL.availableGrid.appendChild(g);
  });

  // Helper: build allocation/max tables
  function buildTable(hEl, bEl, prefix, readOnly) {
    hEl.innerHTML = `<th></th>${labels.map(l => `<th>${l}</th>`).join('')}`;
    bEl.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const tr = document.createElement('tr');
      tr.id = `row_${prefix}_${i}`;
      tr.innerHTML = `<td class="row-label">P${i}</td>`;
      for (let j = 0; j < m; j++) {
        const td = document.createElement('td');
        td.innerHTML = readOnly
          ? `<span class="need-cell" id="${prefix}_${i}_${j}">0</span>`
          : `<input class="cell-input" type="number" min="0" max="99" id="${prefix}_${i}_${j}" value="0" />`;
        tr.appendChild(td);
      }
      bEl.appendChild(tr);
    }
  }
  buildTable(EL.allocationHeader, EL.allocationBody, 'alloc', false);
  buildTable(EL.maxHeader, EL.maxBody, 'max', false);
  buildTable(EL.needHeader, EL.needBody, 'need', true);
  computeNeedDOM();
}

/* ============================================================
   READ & COMPUTE
   ============================================================ */
function readMatrices() {
  const { n, m } = S;
  S.available = Array.from({ length: m }, (_, j) => +($(`avail_${j}`)?.value || 0) || 0);
  S.allocation = []; S.maximum = [];
  for (let i = 0; i < n; i++) {
    S.allocation.push(Array.from({ length: m }, (_, j) => +($(`alloc_${i}_${j}`)?.value || 0) || 0));
    S.maximum.push(Array.from({ length: m }, (_, j) => +($(`max_${i}_${j}`)?.value || 0) || 0));
  }
  S.need = S.maximum.map((row, i) => row.map((v, j) => v - S.allocation[i][j]));
  S.totalRes = S.available.map((av, j) => av + S.allocation.reduce((s, r) => s + r[j], 0));
}

function computeNeedDOM() {
  if (!S.initialized) return;
  for (let i = 0; i < S.n; i++) {
    for (let j = 0; j < S.m; j++) {
      const aEl = $(`alloc_${i}_${j}`), mEl = $(`max_${i}_${j}`), nEl = $(`need_${i}_${j}`);
      if (!aEl || !mEl || !nEl) continue;
      const v = (+mEl.value || 0) - (+aEl.value || 0);
      nEl.textContent = v;
      nEl.className = 'need-cell' + (v < 0 ? ' negative' : '');
    }
  }
}

function validateMatrices() {
  readMatrices();
  const { n, m, allocation, maximum, need, available } = S;
  const labels = resourceLabels(m);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < m; j++)
      if (need[i][j] < 0) { showToast(`❌ Alloc[P${i}][${labels[j]}] > Max — invalid.`, 'error'); return false; }
  for (let j = 0; j < m; j++)
    if (available[j] < 0) { showToast('❌ Available cannot be negative.', 'error'); return false; }
  return true;
}

/* ============================================================
   BANKER'S SAFETY ALGORITHM (with full trace & timeline)
   ============================================================ */
function runSafety() {
  const { n, m, allocation, need, available } = S;
  const work = [...available];
  const finish = new Array(n).fill(false);
  const safeSeq = [];
  const steps = [];
  const traceData = [];   // pass → rows
  const timeline = [];    // per-step snapshots [{pStates:[]}]

  // Record initial process states
  const genTimeline = (runningIdx = -1) =>
    Array.from({ length: n }, (_, i) => {
      if (finish[i]) return 'done';
      if (i === runningIdx) return 'running';
      return 'waiting';
    });

  steps.push({
    type: 'info', title: 'Initialization',
    body: `Work = [${work.join(', ')}]\nAll processes: Finish = false`,
    work: [...work], finish: [...finish], processIdx: -1,
  });
  timeline.push({ pStates: genTimeline(), work: [...work], iterLabel: 'Init' });

  let passNum = 0;
  let progress = true;

  while (progress) {
    progress = false;
    passNum++;
    const passRows = [];

    for (let i = 0; i < n; i++) {
      if (finish[i]) {
        passRows.push({ pid: i, status: 'done', work: [...work], finish: [...finish], workAfter: null });
        continue;
      }

      const canRun = need[i].every((req, j) => req <= work[j]);
      if (canRun) {
        const oldWork = [...work];
        for (let j = 0; j < m; j++) work[j] += allocation[i][j];
        finish[i] = true; safeSeq.push(i); progress = true;

        steps.push({
          type: 'success',
          title: `Pass ${passNum} — P${i} can proceed`,
          body: `Need[P${i}] = [${need[i].join(', ')}] ≤ Work [${oldWork.join(', ')}] ✓\n` +
            `Work ← [${oldWork.join(', ')}] + Alloc[P${i}] [${allocation[i].join(', ')}] = [${work.join(', ')}]\n` +
            `Finish[P${i}] = true`,
          work: [...work], finish: [...finish], processIdx: i, isSuccess: true,
          comparisonData: need[i].map((req, j) => ({ j, req, avail: oldWork[j], ok: req <= oldWork[j] })),
        });
        passRows.push({ pid: i, status: 'selected', need: [...need[i]], workBefore: [...oldWork], work: [...work], finish: [...finish], workAfter: [...work] });
        timeline.push({ pStates: genTimeline(), work: [...work], iterLabel: `P${i} runs` });
      } else {
        const firstFail = need[i].findIndex((req, j) => req > work[j]);
        passRows.push({
          pid: i, status: 'skipped', need: [...need[i]], workBefore: [...work], work: [...work], finish: [...finish], workAfter: null,
          failJ: firstFail
        });
      }
    }

    traceData.push({ passNum, rows: passRows, workAtEnd: [...work] });
  }

  const safe = finish.every(f => f);

  if (safe) {
    steps.push({
      type: 'info', title: '✅ Safe State Confirmed',
      body: `All ${n} processes completed.\nSafe Sequence: ${safeSeq.map(i => `P${i}`).join(' → ')}`,
      work: [...work], finish: [...finish], processIdx: -1, isFinal: true,
    });
    timeline.push({ pStates: new Array(n).fill('done'), work: [...work], iterLabel: 'Done' });
  } else {
    const blocked = finish.map((f, i) => !f ? `P${i}` : null).filter(Boolean);
    steps.push({
      type: 'failed', title: '⛔ Unsafe State',
      body: `No further progress possible.\nBlocked processes: ${blocked.join(', ')}`,
      work: [...work], finish: [...finish], processIdx: -1, isFinal: true,
    });
    timeline.push({
      pStates: finish.map((f, i) => f ? 'done' : 'blocked'),
      work: [...work], iterLabel: 'Unsafe'
    });
  }

  return { safe, safeSeq, steps, traceData, timeline };
}

/* ============================================================
   HANDLERS
   ============================================================ */
function handleCheckSafety() {
  if (!S.initialized) { showToast('⚠ Initialize matrices first.', 'warning'); return; }
  if (!validateMatrices()) return;
  setStatus('Analyzing…', 'running'); stopAutoPlay();

  setTimeout(() => {
    const res = runSafety();
    applyResult(res);
    hide(EL.stepPanel); hide(EL.comparisonCard);
    showToast(res.safe
      ? `✅ Safe! Sequence: ${res.safeSeq.map(i => `P${i}`).join('→')}`
      : '⚠ Unsafe state — deadlock possible!',
      res.safe ? 'success' : 'warning');
  }, 80);
}

function handleStepByStep() {
  if (!S.initialized) { showToast('⚠ Initialize matrices first.', 'warning'); return; }
  if (!validateMatrices()) return;
  stopAutoPlay();
  setStatus('Stepping…', 'running');

  const res = runSafety();
  applyResult(res);
  S.currentStep = 0;

  show(EL.stepPanel); show(EL.comparisonCard);
  renderStep(0);
  updateStepControls();
  showToast('▶ Step-by-step active. Use controls to progress.', 'info');
}

function handleDeadlockDetect() {
  if (!S.initialized) { showToast('⚠ Initialize matrices first.', 'warning'); return; }
  if (!validateMatrices()) return;
  setStatus('Detecting…', 'running');

  setTimeout(() => {
    // Deadlock detection: check if any process is permanently blocked
    const { n, m, allocation, need, available } = S;
    const work = [...available];
    const finish = new Array(n).fill(false);
    let changed = true;

    // Mark processes that request 0 resources as immediately done (available but not requesting)
    for (let i = 0; i < n; i++) {
      if (need[i].every(v => v === 0)) finish[i] = true;
    }

    while (changed) {
      changed = false;
      for (let i = 0; i < n; i++) {
        if (finish[i]) continue;
        if (need[i].every((req, j) => req <= work[j])) {
          for (let j = 0; j < m; j++) work[j] += allocation[i][j];
          finish[i] = true; changed = true;
        }
      }
    }

    const deadlocked = finish.map((f, i) => !f ? i : null).filter(v => v !== null);
    const banner = EL.resultBanner;

    if (deadlocked.length === 0) {
      showToast('✅ No deadlock detected. System is safe.', 'success');
      banner.className = 'result-banner safe';
      EL.resultIcon.textContent = '✅';
      EL.resultState.textContent = 'NO DEADLOCK';
      EL.resultDetail.textContent = 'All processes can complete. No deadlock condition exists.';
      setStatus('No Deadlock', 'safe');
    } else {
      showToast(`⛔ Deadlock! Processes ${deadlocked.map(i => `P${i}`).join(', ')} are deadlocked.`, 'error');
      banner.className = 'result-banner deadlock';
      EL.resultIcon.textContent = '🔴';
      EL.resultState.textContent = `DEADLOCK DETECTED`;
      EL.resultDetail.textContent = `Deadlocked processes: ${deadlocked.map(i => `P${i}`).join(', ')}. ` +
        `These ${deadlocked.length} process(es) are waiting for resources that can never be released.`;
      setStatus('Deadlock!', 'unsafe');
    }

    EL.safeSequenceBox.innerHTML = deadlocked.length === 0
      ? `<span style="color:var(--neon);font-size:.85rem;font-weight:600;">✅ No process is in deadlock.</span>`
      : deadlocked.map(i => `<div class="seq-item"><div class="seq-badge" style="border-color:var(--warn);color:var(--warn);">P${i}</div></div>`).join('<span class="seq-arrow">⚡</span>');

    show(EL.resultCard);
    updateHeaderStats(deadlocked.length === 0 ? 'Safe' : 'Deadlock');
  }, 80);
}

function handleReset() {
  stopAutoPlay(); clearMatrixHighlights();
  Object.assign(S, {
    n: 0, m: 0, allocation: [], maximum: [], need: [], available: [], totalRes: [],
    safeSeq: [], isSafe: null, steps: [], currentStep: -1, initialized: false, traceData: [], timeline: [],
  });
  ['matrices-card', 'result-card', 'stepPanel', 'comparisonCard', 'flowCard', 'timelineCard'].forEach(id => hide($(id)));
  EL.numProcesses.value = '5'; EL.numResources.value = '3';
  $('traceContent').innerHTML = `<div class="trace-placeholder"><div class="trace-placeholder-icon">📋</div><div>Run simulation to see the full algorithm trace here.</div></div>`;
  EL.requestForm && hide(EL.requestForm);
  EL.requestNotice && show(EL.requestNotice);
  setStatus('Idle', '');
  updateHeaderStats();
  showToast('↺ Reset complete.', 'info');
}

/* ============================================================
   RANDOM DATA GENERATOR
   ============================================================ */
function handleRandom() {
  const n = +EL.numProcesses.value, m = +EL.numResources.value;
  if (!validateCfg(n, m)) return;
  if (!S.initialized || S.n !== n || S.m !== m) {
    S.n = n; S.m = m; S.initialized = true;
    buildMatrices(n, m); show(EL.matricesCard);
  }

  const total = Array.from({ length: m }, () => Math.floor(Math.random() * 9) + 5);
  const allocData = Array.from({ length: n }, () => new Array(m).fill(0));
  const rem = [...total];

  for (let i = 0; i < n; i++)
    for (let j = 0; j < m; j++) {
      const cap = Math.floor(rem[j] / (n - i));
      allocData[i][j] = Math.floor(Math.random() * (cap + 1));
      rem[j] -= allocData[i][j];
    }

  const maxData = allocData.map((row, i) =>
    row.map((v, j) => {
      const hi = Math.min(total[j], v + Math.floor(Math.random() * 5) + 1);
      return v >= hi ? hi : Math.floor(Math.random() * (hi - v + 1)) + v;
    })
  );

  for (let j = 0; j < m; j++) { const el = $(`avail_${j}`); if (el) el.value = rem[j]; }
  for (let i = 0; i < n; i++)
    for (let j = 0; j < m; j++) {
      const a = $(`alloc_${i}_${j}`), mx = $(`max_${i}_${j}`);
      if (a) a.value = allocData[i][j]; if (mx) mx.value = maxData[i][j];
    }
  computeNeedDOM();
  ['result-card', 'stepPanel', 'comparisonCard', 'flowCard', 'timelineCard'].forEach(id => hide($(id)));
  clearMatrixHighlights();
  showToast('🎲 Random data generated!', 'success');
}

/* ============================================================
   LOAD EXAMPLE
   ============================================================ */
function loadExample(idx) {
  const ex = EXAMPLES[idx]; if (!ex) return;
  EL.numProcesses.value = ex.n; EL.numResources.value = ex.m;
  S.n = ex.n; S.m = ex.m; S.initialized = true;
  buildMatrices(ex.n, ex.m); show(EL.matricesCard);
  for (let j = 0; j < ex.m; j++) { const el = $(`avail_${j}`); if (el) el.value = ex.available[j]; }
  for (let i = 0; i < ex.n; i++)
    for (let j = 0; j < ex.m; j++) {
      const a = $(`alloc_${i}_${j}`), mx = $(`max_${i}_${j}`);
      if (a) a.value = ex.allocation[i][j]; if (mx) mx.value = ex.maximum[i][j];
    }
  computeNeedDOM();
  ['result-card', 'stepPanel', 'comparisonCard', 'flowCard', 'timelineCard'].forEach(id => hide($(id)));
  clearMatrixHighlights();
  setStatus('Example Loaded', '');
  updateHeaderStats();
  showToast(`💡 Example ${idx + 1} loaded — click Check Safety.`, 'success');
  navigateTo('simulator');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.loadExample = loadExample;

/* ============================================================
   APPLY FULL RESULT
   ============================================================ */
function applyResult(res) {
  S.isSafe = res.safe; S.safeSeq = res.safeSeq;
  S.steps = res.steps; S.traceData = res.traceData; S.timeline = res.timeline;
  S.currentStep = -1;

  displayResult(res);
  buildFlowViz(res.safeSeq, res.safe);
  buildResourceGraph();
  buildTimeline(res.timeline);
  buildTraceTable(res.traceData);

  show(EL.resultCard); show(EL.flowCard); show(EL.timelineCard);
  setStatus(res.safe ? 'Safe State' : 'Unsafe State', res.safe ? 'safe' : 'unsafe');
  updateHeaderStats(res.safe ? 'Safe' : 'Unsafe');
}

/* ============================================================
   DISPLAY RESULT
   ============================================================ */
function displayResult({ safe, safeSeq }) {
  const banner = EL.resultBanner;
  banner.className = 'result-banner ' + (safe ? 'safe' : 'unsafe');
  EL.resultIcon.textContent = safe ? '✅' : '⛔';
  EL.resultState.textContent = safe ? 'SAFE STATE' : 'UNSAFE STATE';
  EL.resultDetail.textContent = safe
    ? `A safe sequence exists. All ${S.n} processes complete without deadlock.`
    : 'No safe sequence found. System may deadlock depending on future requests.';

  EL.safeSequenceBox.innerHTML = '';
  if (safe && safeSeq.length) {
    safeSeq.forEach((pid, ord) => {
      const item = document.createElement('div');
      item.className = 'seq-item';
      item.style.setProperty('--delay', `${ord * 0.08}s`);
      item.innerHTML = `<div class="seq-badge" title="Executes at position ${ord + 1}">P${pid}</div>
        ${ord < safeSeq.length - 1 ? '<span class="seq-arrow">→</span>' : ''}`;
      EL.safeSequenceBox.appendChild(item);
    });
  } else if (!safe) {
    EL.safeSequenceBox.innerHTML = `<span style="color:var(--warn);font-size:.84rem;font-weight:600;">⚠ No safe sequence — deadlock possible.</span>`;
  }
  buildStatsRow(safe, safeSeq);
}

function buildStatsRow(safe, safeSeq) {
  const { n, m, available, allocation, totalRes } = S;
  const totalAlloc = allocation.reduce((s, row) => s + row.reduce((a, b) => a + b, 0), 0);
  EL.statsRow.innerHTML = `
    <div class="stat-chip"><span class="stat-chip-val">${n}</span><span class="stat-chip-label">Processes</span></div>
    <div class="stat-chip"><span class="stat-chip-val">${m}</span><span class="stat-chip-label">Resource Types</span></div>
    <div class="stat-chip"><span class="stat-chip-val">${safe ? safeSeq.length : 0}/${n}</span><span class="stat-chip-label">Complete</span></div>
    <div class="stat-chip"><span class="stat-chip-val">${totalAlloc}</span><span class="stat-chip-label">Total Allocated</span></div>
    <div class="stat-chip"><span class="stat-chip-val" style="color:${safe ? 'var(--neon)' : 'var(--warn)'};">${safe ? 'SAFE' : 'UNSAFE'}</span><span class="stat-chip-label">System State</span></div>
  `;
}

/* ============================================================
   STEP-BY-STEP RENDERING
   ============================================================ */
function renderStep(idx) {
  const { steps, timeline } = S;
  EL.stepLog.innerHTML = '';

  // Show all steps up to idx, highlight current
  steps.slice(0, idx + 1).forEach((step, i) => {
    const isActive = i === idx;
    const entry = document.createElement('div');
    entry.className = `step-entry ${step.type}${isActive ? ' active-step' : ''}`;
    entry.innerHTML = `
      <div class="step-title">
        ${step.processIdx >= 0 ? `<span class="step-process-tag ${step.isSuccess ? 'tag-safe' : 'tag-skip'}">P${step.processIdx}</span>` : ''}
        ${step.title}
      </div>
      <div style="white-space:pre-line;margin-top:4px;font-size:.78rem;">${step.body}</div>
    `;
    if (isActive) entry.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    EL.stepLog.appendChild(entry);
  });
  EL.stepLog.scrollTop = EL.stepLog.scrollHeight;

  // Highlight matrices
  clearMatrixHighlights();
  const step = steps[idx];
  if (step && step.processIdx >= 0) {
    highlightMatrixRow(step.processIdx, step.isSuccess ? 'row-highlight' : 'row-highlight');
    if (step.comparisonData) buildComparison([step], idx);
  }

  // State snapshot table
  if (step) renderStateSnapshot(step);

  // Update Work vector display
  renderWorkVector(step);

  // Timeline highlight
  if (timeline[idx]) highlightTimeline(idx);

  EL.stepCounter.textContent = `Step ${idx + 1} / ${steps.length}`;
}

function renderStateSnapshot(step) {
  const { n, m } = S;
  const labels = resourceLabels(m);
  const finish = step.finish || [];

  let html = `<table class="snapshot-table"><thead><tr><th>PID</th>`;
  labels.forEach(l => { html += `<th>Need[${l}]</th>`; });
  html += `<th>Work ≥ Need?</th><th>Finish</th></tr></thead><tbody>`;

  for (let i = 0; i < n; i++) {
    const done = finish[i];
    const running = step.processIdx === i;
    let cls = '';
    if (done && running) cls = 'snap-running';
    else if (done) cls = 'snap-done';
    else if (step.isFinal && !done) cls = 'snap-blocked';

    html += `<tr class="${cls}"><td class="pid-col">P${i}</td>`;
    for (let j = 0; j < m; j++) {
      const n_val = S.need[i]?.[j] ?? '?';
      html += `<td>${n_val}</td>`;
    }
    const canRun = S.need[i]?.every((req, j) => req <= (step.work?.[j] ?? 0));
    html += `<td>${done ? '—' : (canRun ? '<span style="color:var(--neon)">✓</span>' : '<span style="color:var(--warn)">✗</span>')}</td>`;
    html += `<td style="color:${done ? 'var(--neon)' : 'var(--warn)'};font-weight:700;">${done ? 'true' : 'false'}</td>`;
    html += `</tr>`;
  }
  html += `</tbody></table>`;
  EL.stateSnapshot.innerHTML = html;
}

function renderWorkVector(step) {
  if (!step) return;
  const labels = resourceLabels(S.m);
  const w = step.work || [];
  const workStr = labels.map((l, j) => `<span style="color:var(--neon)">${l}=${w[j] ?? '?'}</span>`).join(', ');
  const finStr = (step.finish || []).map((f, i) => `P${i}:<span style="color:${f ? 'var(--neon)' : 'var(--warn)'}">${f ? '✓' : '✗'}</span>`).join('  ');
  EL.workVectorDisplay.innerHTML = `
    <span class="wv-label">Work</span>&nbsp; [${workStr}]
    <br/><span class="wv-label">Finish</span>&nbsp; ${finStr}
  `;
}

/* ============================================================
   COMPARISON PANEL
   ============================================================ */
function buildComparison(steps, idx) {
  const step = steps[idx];
  if (!step || !step.comparisonData) { EL.comparisonContainer.innerHTML = '<div style="color:var(--text-3);font-size:.82rem;padding:8px;">Select a step that evaluates a process.</div>'; return; }
  const labels = resourceLabels(S.m);
  const pid = step.processIdx;
  const allOk = step.comparisonData.every(c => c.ok);

  let html = `
    <div class="comparison-row" style="border-color:${allOk ? 'var(--neon)' : 'var(--warn)'};">
      <span class="cmp-pid">P${pid}</span>
      <div class="cmp-cells">
        ${step.comparisonData.map(c => `
          <div class="cmp-cell ${c.ok ? 'ok' : 'fail'}" title="Need[P${pid}][${labels[c.j]}]=${c.req} vs Work[${labels[c.j]}]=${c.avail}">
            <span class="cmp-label">${labels[c.j]}:</span>
            <strong>${c.req}</strong>
            <span style="font-size:.75rem;">${c.ok ? '≤' : '>'}</span>
            <strong>${c.avail}</strong>
            <span style="font-size:.8rem;">${c.ok ? '✓' : '✗'}</span>
          </div>
        `).join('')}
      </div>
      <div class="cmp-result ${allOk ? 'ok' : 'fail'}">${allOk ? '✅ CAN RUN' : '⛔ BLOCKED'}</div>
    </div>
    <div style="font-size:.78rem;color:var(--text-3);padding:6px 2px;">
      ${allOk
      ? `P${pid} can run because ALL Need[i][j] ≤ Work[j].`
      : `P${pid} is blocked because at least one Need[i][j] > Work[j].`}
    </div>
  `;
  EL.comparisonContainer.innerHTML = html;
}

function updateComparisonForStep(idx) {
  if (EL.comparisonCard.classList.contains('hidden')) return;
  const step = S.steps[idx];
  if (step && step.comparisonData) {
    buildComparison(S.steps, idx);
  } else {
    EL.comparisonContainer.innerHTML = `<div style="color:var(--text-3);font-size:.82rem;padding:8px;">Step ${idx + 1}: ${step?.title || 'No comparison data for this step.'}</div>`;
  }
}

/* ============================================================
   MATRIX ROW HIGHLIGHTING
   ============================================================ */
function highlightMatrixRow(pid, cls) {
  ['alloc', 'max', 'need'].forEach(prefix => {
    for (let i = 0; i < S.n; i++) {
      const tr = $(`row_${prefix}_${i}`);
      if (!tr) continue;
      tr.className = i === pid ? cls : (i < S.n ? '' : '');
    }
    // Also tint individual cells
    for (let j = 0; j < S.m; j++) {
      const cell = $(`${prefix}_${pid}_${j}`);
      if (cell) cell.classList.add('highlight-eval');
    }
  });
}

function clearMatrixHighlights() {
  for (let i = 0; i < S.n; i++) {
    ['alloc', 'max', 'need'].forEach(prefix => {
      const tr = $(`row_${prefix}_${i}`);
      if (tr) tr.className = '';
      for (let j = 0; j < S.m; j++) {
        const cell = $(`${prefix}_${i}_${j}`);
        if (cell) cell.classList.remove('highlight-eval', 'highlight-ok', 'highlight-fail', 'highlight-done');
      }
    });
  }
}

/* ============================================================
   TIMELINE
   ============================================================ */
function buildTimeline(timeline) {
  if (!timeline || !timeline.length) return;
  const { n } = S;
  const numSteps = timeline.length;
  let html = '';

  for (let i = 0; i < n; i++) {
    html += `<div class="tl-row"><span class="tl-pid">P${i}</span><div class="tl-track">`;
    timeline.forEach((snap, si) => {
      const state = snap.pStates[i];
      const label = state === 'running' ? '▶' : state === 'done' ? '✓' : state === 'blocked' ? '✗' : '·';
      html += `<div class="tl-cell ${state}" id="tlcell_${i}_${si}" title="P${i} at step ${si}: ${state}">${label}</div>`;
    });
    html += `</div></div>`;
  }

  // Step labels
  html += `<div class="tl-row"><span class="tl-pid" style="font-size:.6rem;"></span><div class="tl-track">`;
  timeline.forEach(snap => {
    html += `<div class="tl-step-label">${snap.iterLabel || ''}</div>`;
  });
  html += `</div></div>`;

  EL.timelineContainer.innerHTML = html;
}

function highlightTimeline(stepIdx) {
  if (stepIdx < 0 || stepIdx >= S.timeline.length) return;
  for (let i = 0; i < S.n; i++) {
    for (let si = 0; si < S.timeline.length; si++) {
      const cell = $(`tlcell_${i}_${si}`);
      if (cell) cell.classList.toggle('active-step', si === stepIdx);
    }
  }
}

/* ============================================================
   FULL TRACE TABLE
   ============================================================ */
function buildTraceTable(traceData) {
  if (!traceData || !traceData.length) return;
  const labels = resourceLabels(S.m);
  let html = '';

  traceData.forEach(pass => {
    html += `<div class="trace-pass">
      <div class="trace-pass-label">Pass ${pass.passNum}</div>
      <table class="trace-tbl">
        <thead><tr>
          <th>PID</th>
          <th>Need [${labels.join(',')}]</th>
          <th>Work [${labels.join(',')}]</th>
          <th>Need ≤ Work?</th>
          <th>Finish</th>
          <th>Action</th>
        </tr></thead><tbody>`;

    pass.rows.forEach(row => {
      const { pid, status, need, workBefore, finish } = row;
      const trCls = status === 'selected' ? 'tc-selected' : status === 'done' ? 'tc-done' : 'tc-skipped';
      const actionBadge = status === 'selected'
        ? `<span class="tc-badge selected">✓ Selected</span>`
        : status === 'done'
          ? `<span class="tc-badge done">Already Done</span>`
          : `<span class="tc-badge skipped">✗ Skipped</span>`;

      const needArr = need || S.need[pid] || [];
      const wb = workBefore || pass.rows[0]?.workBefore || [];
      const canRun = needArr.every((req, j) => req <= (wb[j] ?? 0));
      const finV = finish ? finish[pid] : false;

      html += `<tr class="${trCls}">
        <td class="tc-pid">P${pid}</td>
        <td>[${needArr.join(', ')}]</td>
        <td>[${wb.join(', ')}]</td>
        <td>${status === 'done' ? '—' : (canRun ? '<span style="color:var(--neon)">Yes</span>' : '<span style="color:var(--warn)">No</span>')}</td>
        <td style="color:${finV ? 'var(--neon)' : 'var(--warn)'};font-weight:700;">${finV}</td>
        <td>${actionBadge}</td>
      </tr>`;
    });

    html += `</tbody></table>
      <div style="font-size:.74rem;color:var(--text-3);margin-top:6px;padding-left:4px;">
        Work at end of pass ${pass.passNum}: [${pass.workAtEnd.join(', ')}]
      </div>
    </div>`;
  });

  $('traceContent').innerHTML = html || `<div class="trace-placeholder"><div class="trace-placeholder-icon">📋</div><div>No trace data.</div></div>`;
  // Also navigate if user is looking at trace tab
  if ($('section-trace').classList.contains('active')) {
    showToast('📋 Trace table updated!', 'info');
  }
}

/* ============================================================
   FLOW VISUALIZATION
   ============================================================ */
function buildFlowViz(safeSeq, safe) {
  EL.flowContainer.innerHTML = '';
  if (!safe || !safeSeq.length) {
    EL.flowContainer.innerHTML = `<div style="text-align:center;color:var(--warn);padding:20px;font-size:.87rem;font-weight:600;">⛔ No safe execution flow — deadlock possible.</div>`;
    return;
  }
  safeSeq.forEach((pid, ord) => {
    const el = document.createElement('div');
    el.className = 'flow-process';
    el.style.animationDelay = `${ord * 0.1}s`;
    el.innerHTML = `<div class="flow-node" title="P${pid} executes #${ord + 1}">P${pid}</div><span class="flow-order">#${ord + 1}</span>`;
    EL.flowContainer.appendChild(el);
    if (ord < safeSeq.length - 1) {
      const arr = document.createElement('div');
      arr.className = 'flow-arrow'; arr.textContent = '→';
      EL.flowContainer.appendChild(arr);
    }
  });
}

function buildResourceGraph() {
  const { m, allocation, available } = S;
  const labels = resourceLabels(m);
  const allocated = labels.map((_, j) => allocation.reduce((s, r) => s + (r[j] || 0), 0));
  const total = labels.map((_, j) => allocated[j] + (available[j] || 0));

  let html = `<div class="resource-graph-title">Resource Utilization</div><div class="resource-bars">`;
  labels.forEach((label, j) => {
    const tot = total[j] || 1, alloc = allocated[j], avail = available[j] || 0;
    const pct = Math.min(100, Math.round((alloc / tot) * 100));
    html += `<div class="resource-bar-item">
      <span class="resource-bar-label">${label}</span>
      <div class="resource-bar-track" title="${alloc} allocated / ${tot} total">
        <div class="resource-bar-fill" style="width:${pct}%"></div>
      </div>
      <span class="resource-bar-info">${alloc}/${tot} · ${avail} free</span>
    </div>`;
  });
  EL.resourceGraph.innerHTML = html + '</div>';
}

/* ============================================================
   STEP NAVIGATION
   ============================================================ */
function goToNext() {
  if (S.currentStep < S.steps.length - 1) {
    S.currentStep++;
    renderStep(S.currentStep);
    updateStepControls();
    updateComparisonForStep(S.currentStep);
  }
}
function goToPrev() {
  if (S.currentStep > 0) {
    S.currentStep--;
    renderStep(S.currentStep);
    updateStepControls();
    updateComparisonForStep(S.currentStep);
  }
}
function updateStepControls() {
  EL.prevStepBtn.disabled = S.currentStep <= 0;
  EL.nextStepBtn.disabled = S.currentStep >= S.steps.length - 1;
}
function toggleAutoPlay() {
  if (S.autoTimer) {
    stopAutoPlay(); EL.autoPlayBtn.textContent = '⏩ Auto Play';
  } else {
    EL.autoPlayBtn.textContent = '⏸ Pause';
    const delay = +(EL.speedSelect.value) || 900;
    S.autoTimer = setInterval(() => {
      if (S.currentStep >= S.steps.length - 1) { stopAutoPlay(); EL.autoPlayBtn.textContent = '⏩ Auto Play'; return; }
      goToNext();
    }, delay);
  }
}
function stopAutoPlay() {
  if (S.autoTimer) { clearInterval(S.autoTimer); S.autoTimer = null; }
  EL.autoPlayBtn.textContent = '⏩ Auto Play';
}

/* ============================================================
   RESOURCE REQUEST SIMULATOR
   ============================================================ */
function setupRequestForm() {
  if (!S.initialized || S.isSafe === null) return;
  hide(EL.requestNotice); show(EL.requestForm);
  const { n, m } = S;
  const labels = resourceLabels(m);

  // Populate process select
  EL.requestProcess.innerHTML = Array.from({ length: n }, (_, i) => `<option value="${i}">P${i}</option>`).join('');

  // Populate request vector
  EL.requestVector.innerHTML = '';
  labels.forEach((l, j) => {
    const g = document.createElement('div');
    g.className = 'req-input-group';
    g.innerHTML = `<span class="req-label">${l}</span>
      <input class="req-input" type="number" min="0" max="99" id="reqvec_${j}" value="0" />`;
    EL.requestVector.appendChild(g);
  });
  hide(EL.requestResult);
}

function handleResourceRequest() {
  if (!S.initialized) { showToast('⚠ Initialize and run safety check first.', 'warning'); return; }
  readMatrices();
  const pid = +EL.requestProcess.value;
  const { m, allocation, maximum, need, available } = S;
  const labels = resourceLabels(m);

  // Read request vector
  const request = Array.from({ length: m }, (_, j) => +($(`reqvec_${j}`)?.value || 0) || 0);

  const steps = [];

  // Step 1: Request ≤ Need?
  const exceedsNeed = request.some((req, j) => req > need[pid][j]);
  steps.push({
    num: 1, status: exceedsNeed ? 'fail' : 'pass',
    text: `Check Request[P${pid}] ≤ Need[P${pid}]:\n` +
      `Request = [${request.join(', ')}], Need[P${pid}] = [${need[pid].join(', ')}]\n` +
      (exceedsNeed
        ? `❌ Request exceeds maximum claim — error!`
        : `✅ Request within Need bounds.`),
  });
  if (exceedsNeed) { showRequestResult('denied', `❌ Request denied: P${pid} requests more than its declared maximum need.`, steps); return; }

  // Step 2: Request ≤ Available?
  const exceedsAvail = request.some((req, j) => req > available[j]);
  steps.push({
    num: 2, status: exceedsAvail ? 'wait' : 'pass',
    text: `Check Request[P${pid}] ≤ Available:\n` +
      `Request = [${request.join(', ')}], Available = [${available.join(', ')}]\n` +
      (exceedsAvail
        ? `⏳ Resources not available — P${pid} must wait.`
        : `✅ Resources are available.`),
  });
  if (exceedsAvail) { showRequestResult('wait', `⏳ P${pid} must wait — requested resources not currently available.`, steps); return; }

  // Step 3: Pretend-allocate
  const tempAvail = available.map((v, j) => v - request[j]);
  const tempAlloc = allocation.map((row, i) => i === pid ? row.map((v, j) => v + request[j]) : [...row]);
  const tempNeed = need.map((row, i) => i === pid ? row.map((v, j) => v - request[j]) : [...row]);
  steps.push({
    num: 3, status: 'pass',
    text: `Tentative allocation:\n` +
      `Available ← [${available.join(', ')}] − [${request.join(', ')}] = [${tempAvail.join(', ')}]\n` +
      `Allocation[P${pid}] ← [${allocation[pid].join(', ')}] + [${request.join(', ')}] = [${tempAlloc[pid].join(', ')}]\n` +
      `Need[P${pid}] ← [${need[pid].join(', ')}] − [${request.join(', ')}] = [${tempNeed[pid].join(', ')}]`,
  });

  // Step 4: Run safety on temporary state
  const oldAlloc = S.allocation, oldNeed = S.need, oldAvail = S.available;
  S.allocation = tempAlloc; S.need = tempNeed; S.available = tempAvail;
  const safeRes = runSafety();
  S.allocation = oldAlloc; S.need = oldNeed; S.available = oldAvail;

  steps.push({
    num: 4, status: safeRes.safe ? 'pass' : 'fail',
    text: `Safety check on tentative state:\n` +
      (safeRes.safe
        ? `✅ System remains safe! Safe sequence: ${safeRes.safeSeq.map(i => `P${i}`).join('→')}`
        : `❌ System becomes UNSAFE — request denied to avoid deadlock.`),
  });

  if (safeRes.safe) {
    showRequestResult('granted',
      `✅ Request GRANTED — P${pid} receives [${request.join(', ')}]. System remains in safe state.\nNew safe sequence: ${safeRes.safeSeq.map(i => `P${i}`).join('→')}`,
      steps);
  } else {
    showRequestResult('denied',
      `❌ Request DENIED — granting [${request.join(', ')}] to P${pid} would lead to unsafe state.`,
      steps);
  }
}

function showRequestResult(type, message, steps) {
  show(EL.requestResult);
  EL.requestResultBanner.className = `request-result-banner ${type}`;
  const icons = { granted: '✅', denied: '❌', wait: '⏳' };
  EL.requestResultBanner.innerHTML = `${icons[type]} ${message.replace(/\n/g, '<br/>')}`;

  EL.requestSteps.innerHTML = steps.map(s => `
    <div class="req-step ${s.status}">
      <span class="req-step-num">${s.num}</span>
      <div style="white-space:pre-line;">${s.text}</div>
    </div>
  `).join('');

  showToast(type === 'granted' ? '✅ Request granted!' : type === 'wait' ? '⏳ Process must wait.' : '❌ Request denied.', type === 'granted' ? 'success' : 'warning');
}

function clearRequest() {
  for (let j = 0; j < S.m; j++) {
    const el = $(`reqvec_${j}`); if (el) el.value = 0;
  }
  hide(EL.requestResult);
}

// Setup request form when user navigates to request tab
document.querySelectorAll('.nav-link[data-section]').forEach(link => {
  if (link.dataset.section === 'request') {
    link.addEventListener('click', () => setTimeout(setupRequestForm, 50));
  }
  if (link.dataset.section === 'trace') {
    link.addEventListener('click', () => {
      if (!S.traceData.length) {
        $('traceContent').innerHTML = '<div class="trace-placeholder"><div class="trace-placeholder-icon">📋</div><div>Run the Safety Check or Step-by-Step simulation first.</div></div>';
      }
    });
  }
});

/* ============================================================
   HEADER STATS
   ============================================================ */
function updateHeaderStats(stateLabel) {
  const n = S.n || '—', m = S.m || '—';
  EL.hstatProcesses.querySelector('.hstat-val').textContent = n;
  EL.hstatResources.querySelector('.hstat-val').textContent = m;
  const sv = EL.hstatState.querySelector('.hstat-val');
  sv.textContent = stateLabel || '—';
  sv.style.color = stateLabel === 'Safe' ? 'var(--neon)' : stateLabel === 'Unsafe' || stateLabel === 'Deadlock' ? 'var(--warn)' : 'var(--neon)';
}

/* ============================================================
   STATUS + TOASTS
   ============================================================ */
function setStatus(text, type) {
  EL.systemStatus.textContent = text;
  EL.systemStatus.className = 'status-badge' + (type ? ` ${type}` : '');
}
function showToast(msg, type = 'info', dur = 3500) {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', warning: '⚠', info: 'ℹ' };
  t.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${msg}</span>`;
  EL.toastContainer.appendChild(t);
  const remove = () => { t.style.animation = 'toastOut .28s ease forwards'; setTimeout(() => t.remove(), 300); };
  setTimeout(remove, dur);
  t.addEventListener('click', remove);
}
const _style = document.createElement('style');
_style.textContent = `@keyframes toastOut{to{opacity:0;transform:translateX(16px)}}`;
document.head.appendChild(_style);

/* ============================================================
   HELPERS
   ============================================================ */
function resourceLabels(m) {
  return Array.from({ length: m }, (_, j) => String.fromCharCode(65 + j));
}
