// Agency Completion - Content Script
// Injects floating widget when operator has an active task

let widget = null;
let activeTask = null;

// Check for active task on page load
async function init() {
  const stored = await chrome.storage.local.get(['activeTask']);
  
  if (stored.activeTask && isTaskUrl(stored.activeTask.url)) {
    activeTask = stored.activeTask;
    injectWidget();
  }
}

// Check if current URL matches task URL
function isTaskUrl(taskUrl) {
  try {
    const current = new URL(window.location.href);
    const task = new URL(taskUrl);
    return current.hostname === task.hostname;
  } catch {
    return false;
  }
}

// Inject the floating widget
function injectWidget() {
  if (widget) return;
  
  widget = document.createElement('div');
  widget.id = 'agency-completion-widget';
  widget.innerHTML = `
    <div class="ac-widget-header">
      <span class="ac-widget-logo">🔓</span>
      <span class="ac-widget-title">Agency Task</span>
      <button class="ac-widget-minimize" id="acMinimize">−</button>
    </div>
    <div class="ac-widget-body" id="acWidgetBody">
      <div class="ac-widget-instructions">
        ${activeTask.instructions || 'Complete the task on this page.'}
      </div>
      <div class="ac-widget-timer" id="acTimer">
        ⏱️ <span id="acTimeLeft">5:00</span> remaining
      </div>
      <div class="ac-widget-actions">
        <button class="ac-btn ac-btn-complete" id="acComplete">✅ Complete</button>
        <button class="ac-btn ac-btn-fail" id="acFail">❌ Can't Do</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(widget);
  
  // Add event listeners
  document.getElementById('acMinimize').addEventListener('click', toggleMinimize);
  document.getElementById('acComplete').addEventListener('click', completeTask);
  document.getElementById('acFail').addEventListener('click', failTask);
  
  // Start timer
  startTimer();
}

// Toggle minimize
function toggleMinimize() {
  const body = document.getElementById('acWidgetBody');
  const btn = document.getElementById('acMinimize');
  
  if (body.style.display === 'none') {
    body.style.display = 'block';
    btn.textContent = '−';
  } else {
    body.style.display = 'none';
    btn.textContent = '+';
  }
}

// Timer countdown
let timerInterval = null;
let timeLeft = 300; // 5 minutes

function startTimer() {
  timerInterval = setInterval(() => {
    timeLeft--;
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.getElementById('acTimeLeft').textContent = 
      `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      failTask();
    }
  }, 1000);
}

// Complete task
async function completeTask() {
  // Capture screenshot
  const screenshot = await captureScreenshot();
  
  // Send to background
  chrome.runtime.sendMessage({
    type: 'TASK_COMPLETED',
    taskId: activeTask.id,
    screenshot: screenshot
  });
  
  // Remove widget
  removeWidget();
  
  // Show success message
  showToast('✅ Task completed! Nice work.');
}

// Fail task
async function failTask() {
  const stored = await chrome.storage.local.get(['operatorKey', 'serverUrl']);
  const serverUrl = stored.serverUrl || 'http://localhost:3456';
  
  try {
    await fetch(`${serverUrl}/operator/tasks/${activeTask.id}/fail`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stored.operatorKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reason: 'Operator could not complete task'
      })
    });
  } catch (error) {
    console.error('Failed to report task failure:', error);
  }
  
  await chrome.storage.local.remove(['activeTask']);
  removeWidget();
  showToast('Task returned to queue.');
}

// Capture visible tab screenshot via background script
async function captureScreenshot() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'captureScreenshot' });
    return response?.screenshot || null;
  } catch (e) {
    console.warn('Screenshot capture failed:', e);
    return null;
  }
}

// Remove widget
function removeWidget() {
  if (widget) {
    widget.remove();
    widget = null;
  }
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  activeTask = null;
}

// Show toast notification
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'ac-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('ac-toast-show');
  }, 100);
  
  setTimeout(() => {
    toast.classList.remove('ac-toast-show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Listen for storage changes (task updates)
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.activeTask) {
    if (changes.activeTask.newValue && isTaskUrl(changes.activeTask.newValue.url)) {
      activeTask = changes.activeTask.newValue;
      if (!widget) {
        injectWidget();
      }
    } else if (!changes.activeTask.newValue) {
      removeWidget();
    }
  }
});

// Initialize
init();
