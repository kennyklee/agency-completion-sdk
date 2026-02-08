// Agency Completion - Background Service Worker

// Poll for available tasks every 30 seconds
chrome.alarms.create('poll-tasks', { periodInMinutes: 0.5 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'poll-tasks') {
    await updateBadge();
  }
});

// Update badge with task count
async function updateBadge() {
  const stored = await chrome.storage.local.get(['operatorKey', 'serverUrl']);
  
  if (!stored.operatorKey) {
    chrome.action.setBadgeText({ text: '' });
    return;
  }
  
  const serverUrl = stored.serverUrl || 'http://localhost:3456';
  
  try {
    const response = await fetch(`${serverUrl}/v1/operator/tasks`, {
      headers: { 'Authorization': `Bearer ${stored.operatorKey}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      const count = data.tasks?.length || 0;
      
      chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
      chrome.action.setBadgeBackgroundColor({ color: '#f97316' });
    }
  } catch (error) {
    console.error('Failed to poll tasks:', error);
  }
}

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TASK_COMPLETED') {
    handleTaskCompletion(message.taskId, message.screenshot);
    sendResponse({ success: true });
  }
  return true;
});

// Complete a task
async function handleTaskCompletion(taskId, screenshot) {
  const stored = await chrome.storage.local.get(['operatorKey', 'serverUrl']);
  const serverUrl = stored.serverUrl || 'http://localhost:3456';
  
  try {
    const response = await fetch(`${serverUrl}/v1/operator/tasks/${taskId}/complete`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stored.operatorKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        screenshot: screenshot,
        completedAt: new Date().toISOString()
      })
    });
    
    if (response.ok) {
      // Clear active task
      await chrome.storage.local.remove(['activeTask']);
      
      // Show notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Task Completed!',
        message: 'Nice work! You earned $0.02'
      });
      
      // Update badge
      await updateBadge();
    }
  } catch (error) {
    console.error('Failed to complete task:', error);
  }
}

// Initial badge update
updateBadge();

// Handle screenshot requests from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'captureScreenshot') {
    chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 70 }, (dataUrl) => {
      sendResponse({ screenshot: dataUrl || null });
    });
    return true; // async response
  }
});
