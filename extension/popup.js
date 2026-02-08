// Agency Completion - Popup Script

const TASK_ICONS = {
  'captcha': '🔐',
  'click': '👆',
  'form-fill': '📝',
  'verification': '✅',
  'screenshot': '📸',
  'custom': '🔧'
};

let serverUrl = 'http://localhost:3456';
let operatorKey = '';

// DOM Elements
const loginSection = document.getElementById('loginSection');
const mainSection = document.getElementById('mainSection');
const apiKeyInput = document.getElementById('apiKeyInput');
const serverInput = document.getElementById('serverInput');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const taskList = document.getElementById('taskList');
const availableCount = document.getElementById('availableCount');
const completedCount = document.getElementById('completedCount');
const todayEarnings = document.getElementById('todayEarnings');
const statusDot = document.getElementById('statusDot');

// Initialize
async function init() {
  const stored = await chrome.storage.local.get(['operatorKey', 'serverUrl']);
  if (stored.operatorKey) {
    operatorKey = stored.operatorKey;
    serverUrl = stored.serverUrl || serverUrl;
    showMainSection();
    loadTasks();
  }
}

// Login
loginBtn.addEventListener('click', async () => {
  const key = apiKeyInput.value.trim();
  const server = serverInput.value.trim() || 'http://localhost:3456';
  
  if (!key) {
    alert('Please enter your operator key');
    return;
  }
  
  operatorKey = key;
  serverUrl = server;
  
  await chrome.storage.local.set({ operatorKey: key, serverUrl: server });
  showMainSection();
  loadTasks();
});

// Logout
logoutBtn.addEventListener('click', async () => {
  await chrome.storage.local.remove(['operatorKey', 'serverUrl']);
  operatorKey = '';
  showLoginSection();
});

function showLoginSection() {
  loginSection.style.display = 'block';
  mainSection.style.display = 'none';
}

function showMainSection() {
  loginSection.style.display = 'none';
  mainSection.style.display = 'block';
}

// Load available tasks
async function loadTasks() {
  try {
    const response = await fetch(`${serverUrl}/v1/operator/tasks`, {
      headers: { 'Authorization': `Bearer ${operatorKey}` }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch tasks');
    }
    
    const data = await response.json();
    const tasks = data.tasks || [];
    
    availableCount.textContent = tasks.length;
    statusDot.classList.remove('offline');
    
    if (tasks.length === 0) {
      taskList.innerHTML = `
        <div class="empty-state">
          <div class="icon">☕</div>
          <p>No tasks available right now.<br>Check back soon!</p>
        </div>
      `;
      return;
    }
    
    taskList.innerHTML = tasks.map(task => `
      <div class="task-item" data-id="${task.id}">
        <div class="task-header">
          <span class="task-type">${TASK_ICONS[task.type] || '🔧'} ${task.type}</span>
          <span class="task-payout">$${(task.payout || 0.02).toFixed(2)}</span>
        </div>
        <div class="task-url" title="${task.url}">${task.url}</div>
        <button class="claim-btn" onclick="claimTask('${task.id}', '${task.url}')">Claim Task</button>
      </div>
    `).join('');
    
  } catch (error) {
    console.error('Failed to load tasks:', error);
    statusDot.classList.add('offline');
    taskList.innerHTML = `
      <div class="empty-state">
        <div class="icon">⚠️</div>
        <p>Failed to connect to server.<br>Check your connection.</p>
      </div>
    `;
  }
}

// Claim a task
async function claimTask(taskId, url) {
  try {
    const response = await fetch(`${serverUrl}/v1/operator/tasks/${taskId}/claim`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${operatorKey}` }
    });
    
    if (!response.ok) {
      const error = await response.json();
      alert(error.error || 'Failed to claim task');
      return;
    }
    
    const result = await response.json();
    
    // Store active task
    await chrome.storage.local.set({
      activeTask: {
        id: taskId,
        url: url,
        instructions: result.task?.instructions || 'Complete the task on this page',
        claimedAt: Date.now()
      }
    });
    
    // Open the URL in a new tab
    chrome.tabs.create({ url: url });
    
    // Close popup
    window.close();
    
  } catch (error) {
    console.error('Failed to claim task:', error);
    alert('Failed to claim task');
  }
}

// Make claimTask available globally for onclick
window.claimTask = claimTask;

// Load earnings
async function loadEarnings() {
  try {
    const response = await fetch(`${serverUrl}/v1/operator/earnings`, {
      headers: { 'Authorization': `Bearer ${operatorKey}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      todayEarnings.textContent = `$${(data.today || 0).toFixed(2)}`;
      completedCount.textContent = data.completedToday || 0;
    }
  } catch (error) {
    console.error('Failed to load earnings:', error);
  }
}

// Poll for updates every 30 seconds
setInterval(() => {
  if (operatorKey) {
    loadTasks();
    loadEarnings();
  }
}, 30000);

// Initialize on load
init();
