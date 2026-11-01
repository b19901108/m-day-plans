const STORAGE_KEY = 'plandiary_data_v3';

const defaultState = {
  theme: 'light',
  step: 1, // 1: Tasks, 2: Period, 3: Planner, 4: Finished Analytics
  tasks: [],
  period: 'Week',
  gridData: {},
  diaries: {}, // Keyed by day slot: { "Mon": { text: '', mood: 'Good' }, ... }
  selectedDiaryKey: 'Mon',
  reflection: { positive: '', improvement: '' }
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

      <div style="margin-top: 24px;">
        <button class="btn" onclick="goToStep(1)">Back</button>
      </div>
    </div>
  `;
}

function renderStep3() {
  const columns = getColumnsForPeriod(state.period);
  if (!columns.includes(state.selectedDiaryKey)) {
    state.selectedDiaryKey = columns[0];
  }

  const totalCheckboxes = state.tasks.length * columns.length;
  let completedCount = 0;

  state.tasks.forEach(task => {
    columns.forEach(col => {
      const key = `${task.id}_${col}`;
      if (state.gridData[key]) completedCount++;
    });
  });

  const progress = totalCheckboxes > 0 ? Math.round((completedCount / totalCheckboxes) * 100) : 0;
  const activeDiary = state.diaries[state.selectedDiaryKey] || { text: '', mood: 'Good' };

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

    <!-- Daily Diary Section (1 Day = 1 Diary) -->
    <div class="card">
      <h2>Daily Diary Entries</h2>
      <p style="color: var(--text-secondary); margin-bottom: 12px;">Select a day to write and save a specific diary entry for that day.</p>
      
      <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px;">
        ${columns.map(col => `
          <button class="btn ${state.selectedDiaryKey === col ? 'btn-primary' : ''}" onclick="selectDiaryDay('${col}')">
            ${col} ${(state.diaries[col] && state.diaries[col].text.trim()) ? '•' : ''}
          </button>
        `).join('')}
      </div>

      <div style="background: var(--accent-light); padding: 16px; border-radius: 8px; border: 1px solid var(--border-color);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="font-size: 1.05rem;">Diary for <u>${state.selectedDiaryKey}</u></h3>
          <div>
            <label style="font-weight: 600; font-size: 0.85rem; margin-right: 6px;">Status:</label>
            <select class="input-field" style="width: 140px; display: inline-block;" onchange="updateDiaryMood('${state.selectedDiaryKey}', this.value)">
              <option value="Great" ${activeDiary.mood === 'Great' ? 'selected' : ''}>Great</option>
              <option value="Good" ${activeDiary.mood === 'Good' ? 'selected' : ''}>Good</option>
              <option value="Neutral" ${activeDiary.mood === 'Neutral' ? 'selected' : ''}>Neutral</option>
              <option value="Challenging" ${activeDiary.mood === 'Challenging' ? 'selected' : ''}>Challenging</option>
            </select>
          </div>
        </div>

        <textarea class="diary-input" placeholder="Write your diary entry for ${state.selectedDiaryKey}..." oninput="updateDiaryText('${state.selectedDiaryKey}', this.value)">${activeDiary.text || ''}</textarea>
      </div>
    </div>

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
  const loggedDaysCount = Object.keys(state.diaries).filter(k => state.diaries[k].text && state.diaries[k].text.trim()).length;

  return `
    <div class="card" style="border-top: 4px solid var(--success);">
      <h2>Period Summary & Data Analytics</h2>
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
          <div class="metric-value">${loggedDaysCount} / ${columns.length}</div>
          <div class="metric-label">Days Logged</div>
        </div>
      </div>
    </div>

    <div class="card">
      <h3>All Daily Diary Entries</h3>
      <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 12px;">
        ${columns.map(col => {
          const entry = state.diaries[col];
          const hasText = entry && entry.text.trim();
          return `
            <div style="border: 1px solid var(--border-color); padding: 12px; border-radius: 8px; background: var(--card-bg);">
              <div style="display: flex; justify-content: space-between; font-weight: 600; margin-bottom: 4px;">
                <span>${col}</span>
                <span style="font-size: 0.85rem; color: var(--text-secondary);">Status: ${entry ? entry.mood : 'Not Set'}</span>
              </div>
              <p style="color: var(--text-primary); white-space: pre-wrap; font-size: 0.95rem;">${hasText ? entry.text : '<span style="color:var(--text-secondary); font-style:italic;">No diary entry recorded for this day.</span>'}</p>
            </div>
          `;
        }).join('')}
      </div>
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

function getColumnsForPeriod(period) {
  if (period === 'Day') return ['Morning', 'Afternoon', 'Evening'];
  if (period === 'Week') return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  if (period === 'Month') return ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
  if (period === 'Year') return ['Q1', 'Q2', 'Q3', 'Q4'];
  return [];
}

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
  state.selectedDiaryKey = getColumnsForPeriod(p)[0];
  saveState(state);
  render();
}

function toggleGrid(key) {
  state.gridData[key] = !state.gridData[key];
  saveState(state);
  render();
}

function selectDiaryDay(dayKey) {
  state.selectedDiaryKey = dayKey;
  saveState(state);
  render();
}

function updateDiaryMood(dayKey, val) {
  if (!state.diaries[dayKey]) state.diaries[dayKey] = { text: '', mood: 'Good' };
  state.diaries[dayKey].mood = val;
  saveState(state);
}

function updateDiaryText(dayKey, val) {
  if (!state.diaries[dayKey]) state.diaries[dayKey] = { text: '', mood: 'Good' };
  state.diaries[dayKey].text = val;
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
    state.diaries = {};
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

render();
