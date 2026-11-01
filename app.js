// State Management with LocalStorage
const STORAGE_KEY = 'plandiary_data_v2';

const defaultState = {
  theme: 'light',
  step: 1, // 1: Tasks, 2: Period, 3: Planner, 4: Finished Analytics
  tasks: [],
  period: 'Week', // Day, Week, Month, Year
  gridData: {},
  diary: {},
  reflection: { positive: '', improvement: '' },
  history: []
};

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : defaultState;
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();

function updateTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
}

// App Renderer
function render() {
  updateTheme();
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="container">
      <header class="header">
        <div class="brand">PlanDiary</div>
        <div class="header-actions">
          <button class="btn" onclick="toggleTheme()">Mode: ${state.theme.toUpperCase()}</button>
          ${state.step > 1 ? `<button class="btn" onclick="resetPlan()">New Plan</button>` : ''}
        </div>
      </header>

      ${renderCurrentStep()}
    </div>
  `;
}

function renderCurrentStep() {
  if (state.step === 1) return renderStep1();
  if (state.step === 2) return renderStep2();
  if (state.step === 3) return renderStep3();
  if (state.step === 4) return renderStep4();
  return '';
}

// STEP 1: Add Tasks
function renderStep1() {
  return `
    <div class="card">
      <h2>Step 1: What do you want to achieve?</h2>
      <p style="color: var(--text-secondary); margin-bottom: 16px;">Add your main tasks and goals for this planning cycle.</p>
      
      <div style="display: flex; gap: 8px;">
        <input type="text" id="taskInput" class="input-field" placeholder="Enter task name..." onkeydown="if(event.key==='Enter') addTask()" />
        <select id="taskPriority" class="input-field" style="width: 130px;">
          <option value="Low">Low</option>
          <option value="Medium" selected>Medium</option>
          <option value="High">High</option>
        </select>
        <button class="btn btn-primary" onclick="addTask()">Add Task</button>
      </div>

      <div class="chip-container">
        ${state.tasks.map((task, index) => `
          <div class="chip">
            <span>${task.title}</span>
            <span class="badge badge-${task.priority.toLowerCase()}">${task.priority}</span>
            <button onclick="removeTask(${index})">x</button>
          </div>
        `).join('')}
      </div>

      <div style="margin-top: 24px; text-align: right;">
        <button class="btn btn-primary" ${state.tasks.length === 0 ? 'disabled style="opacity:0.5;"' : ''} onclick="goToStep(2)">Next: Choose Time Frame</button>
      </div>
    </div>
  `;
}

// STEP 2: Choose Period
function renderStep2() {
  return `
    <div class="card">
      <h2>Step 2: Choose Planning Period</h2>
      <p style="color: var(--text-secondary);">Select the time window for tracking your goals.</p>

      <div class="period-grid">
        <button class="period-btn" onclick="selectPeriod('Day')">Day</button>
        <button class="period-btn" onclick="selectPeriod('Week')">Week</button>
        <button class="period-btn" onclick="selectPeriod('Month')">Month</button>
        <button class="period-btn" onclick="selectPeriod('Year')">Year</button>
      </div>

      <div style="margin-top: 24px; display: flex; justify-content: space-between;">
        <button class="btn" onclick="goToStep(1)">Back</button>
      </div>
    </div>
  `;
}

// STEP 3: Planner Grid & Diary
function renderStep3() {
  const columns = getColumnsForPeriod(state.period);
  const totalCheckboxes = state.tasks.length * columns.length;
  let completedCount = 0;

  state.tasks.forEach(task => {
    columns.forEach(col => {
      const key = `${task.id}_${col}`;
      if (state.gridData[key]) completedCount++;
    });
  });

  const progress = totalCheckboxes > 0 ? Math.round((completedCount / totalCheckboxes) * 100) : 0;

  return `
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h2>${state.period} Planner</h2>
        <button class="btn btn-success" onclick="finishPlan()">Finish Period & View Analytics</button>
      </div>

      <div style="margin: 16px 0;">
        <div style="display: flex; justify-content: space-between; font-size: 0.9rem; font-weight: 600;">
          <span>Progress</span>
          <span>${progress}% Completed</span>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar-fill" style="width: ${progress}%;"></div>
        </div>
      </div>

      <table class="grid-table">
        <thead>
          <tr>
            <th style="text-align: left;">Task</th>
            <th style="width: 90px;">Priority</th>
            ${columns.map(col => `<th>${col}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${state.tasks.map(task => `
            <tr>
              <td style="text-align: left; font-weight: 500;">${task.title}</td>
              <td><span class="badge badge-${task.priority.toLowerCase()}">${task.priority}</span></td>
              ${columns.map(col => {
                const key = `${task.id}_${col}`;
                const checked = state.gridData[key] ? 'checked' : '';
                return `<td><input type="checkbox" ${checked} onchange="toggleGrid('${key}')" /></td>`;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Diary Section -->
    <div class="card">
      <h2>Diary & Notes</h2>
      <p style="color: var(--text-secondary); margin-bottom: 12px;">Log your thoughts, observations, and key achievements for this period.</p>
      
      <div style="margin-bottom: 12px;">
        <label style="font-weight: 600; font-size: 0.9rem;">Period Overall Status / Mood:</label>
        <select class="input-field" style="width: 180px; margin-left: 8px;" onchange="updateDiaryMood(this.value)">
          <option value="Great" ${state.diary.mood === 'Great' ? 'selected' : ''}>Status: Great</option>
          <option value="Good" ${state.diary.mood === 'Good' ? 'selected' : ''}>Status: Good</option>
          <option value="Neutral" ${state.diary.mood === 'Neutral' ? 'selected' : ''}>Status: Neutral</option>
          <option value="Challenging" ${state.diary.mood === 'Challenging' ? 'selected' : ''}>Status: Challenging</option>
        </select>
      </div>

      <textarea class="diary-input" placeholder="Write your diary entry here..." oninput="updateDiaryText(this.value)">${state.diary.text || ''}</textarea>
    </div>

    <!-- Reflection Section -->
    <div class="card">
      <h2>Reflection</h2>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 12px;">
        <div>
          <label style="font-weight: 600; font-size: 0.9rem;">What went well?</label>
          <textarea class="diary-input" placeholder="Highlights and wins..." oninput="updateReflection('positive', this.value)">${state.reflection.positive || ''}</textarea>
        </div>
        <div>
          <label style="font-weight: 600; font-size: 0.9rem;">What can be improved?</label>
          <textarea class="diary-input" placeholder="Areas for growth..." oninput="updateReflection('improvement', this.value)">${state.reflection.improvement || ''}</textarea>
        </div>
      </div>
    </div>
  `;
}

// STEP 4: Finished Analytics
function renderStep4() {
  const columns = getColumnsForPeriod(state.period);
  const totalCheckboxes = state.tasks.length * columns.length;
  let completedCount = 0;

  state.tasks.forEach(task => {
    columns.forEach(col => {
      const key = `${task.id}_${col}`;
      if (state.gridData[key]) completedCount++;
    });
  });

  const progress = totalCheckboxes > 0 ? Math.round((completedCount / totalCheckboxes) * 100) : 0;

  return `
    <div class="card" style="border-top: 4px solid var(--success);">
      <h2>Period Summary & Data Analytics</h2>
      <p style="color: var(--text-secondary); margin-bottom: 16px;">Here is your performance breakdown and record for this finished cycle.</p>

      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-value">${progress}%</div>
          <div class="metric-label">Completion Rate</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${completedCount} / ${totalCheckboxes}</div>
          <div class="metric-label">Completed Action Items</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${state.tasks.length}</div>
          <div class="metric-label">Total Planned Tasks</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${state.diary.mood || 'Not Set'}</div>
          <div class="metric-label">Overall Status</div>
        </div>
      </div>
    </div>

    <div class="card">
      <h3>Logged Diary Entry</h3>
      <p style="margin-top: 8px; color: var(--text-primary); white-space: pre-wrap;">${state.diary.text || 'No diary entries recorded for this period.'}</p>
    </div>

    <div class="card">
      <h3>Reflections</h3>
      <div style="margin-top: 12px;">
        <p><strong>What Went Well:</strong></p>
        <p style="color: var(--text-secondary); margin-bottom: 12px;">${state.reflection.positive || 'None recorded.'}</p>
        <p><strong>Areas to Improve:</strong></p>
        <p style="color: var(--text-secondary);">${state.reflection.improvement || 'None recorded.'}</p>
      </div>
    </div>

    <div style="display: flex; gap: 12px; justify-content: flex-end;">
      <button class="btn" onclick="goToStep(3)">Return to Editor</button>
      <button class="btn btn-primary" onclick="window.print()">Export / Print PDF</button>
    </div>
  `;
}

// Utility Functions
function getColumnsForPeriod(period) {
  if (period === 'Day') return ['Morning', 'Afternoon', 'Evening'];
  if (period === 'Week') return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  if (period === 'Month') return ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
  if (period === 'Year') return ['Q1', 'Q2', 'Q3', 'Q4'];
  return [];
}

// Event Handlers
function addTask() {
  const input = document.getElementById('taskInput');
  const prioritySelect = document.getElementById('taskPriority');
  const title = input.value.trim();

  if (title) {
    state.tasks.push({ id: Date.now().toString(), title, priority: prioritySelect.value });
    input.value = '';
    saveState(state);
    render();
  }
}

function removeTask(index) {
  state.tasks.splice(index, 1);
  saveState(state);
  render();
}

function goToStep(stepNum) {
  state.step = stepNum;
  saveState(state);
  render();
}

function selectPeriod(p) {
  state.period = p;
  state.step = 3;
  saveState(state);
  render();
}

function toggleGrid(key) {
  state.gridData[key] = !state.gridData[key];
  saveState(state);
  render();
}

function updateDiaryMood(val) {
  state.diary.mood = val;
  saveState(state);
}

function updateDiaryText(val) {
  state.diary.text = val;
  saveState(state);
}

function updateReflection(type, val) {
  state.reflection[type] = val;
  saveState(state);
}

function finishPlan() {
  state.step = 4;
  saveState(state);
  render();
}

function resetPlan() {
  if (confirm("Start a new plan? Current task configuration will reset.")) {
    state.step = 1;
    state.tasks = [];
    state.gridData = {};
    state.diary = {};
    state.reflection = { positive: '', improvement: '' };
    saveState(state);
    render();
  }
}

function toggleTheme() {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  saveState(state);
  render();
}

// Initial render
render();
