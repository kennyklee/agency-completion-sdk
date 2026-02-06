# Agency Completion — Browser Extension Spec

## Purpose

The browser extension lets human operators complete tasks without:
- Screen sharing (privacy concern)
- Installing desktop software
- Complex setup

Just install extension → see available tasks → complete in your browser → get paid.

---

## User Flow

### 1. Installation & Login
```
1. Install "Agency Completion" from Chrome Web Store
2. Click extension icon → "Login as Operator"
3. Auth via Google/GitHub
4. See badge showing available task count
```

### 2. Claiming a Task
```
1. Badge shows "3" (3 tasks available)
2. Click extension → see task list
3. Click "Claim" on a CAPTCHA task
4. New tab opens to the target URL
5. Floating widget appears with instructions
```

### 3. Completing a Task
```
1. Follow instructions (solve CAPTCHA, click button, etc.)
2. Click "Mark Complete" on floating widget
3. Extension captures screenshot as proof
4. Task marked done → operator gets paid
5. Badge updates, move to next task
```

---

## Extension Components

### 1. Popup (click extension icon)

```
┌────────────────────────────────────┐
│  Agency Completion     [⚙️] [👤]   │
├────────────────────────────────────┤
│  Available Tasks: 7                │
│                                    │
│  ┌─────────────────────────────┐   │
│  │ 🔐 CAPTCHA - $0.03          │   │
│  │ fiverr.com/join             │   │
│  │ [Claim]                     │   │
│  └─────────────────────────────┘   │
│                                    │
│  ┌─────────────────────────────┐   │
│  │ 👆 Click verification       │   │
│  │ stripe.com/verify           │   │
│  │ [Claim]                     │   │
│  └─────────────────────────────┘   │
│                                    │
│  ┌─────────────────────────────┐   │
│  │ 📝 Form fill - $0.05        │   │
│  │ hubspot.com/signup          │   │
│  │ [Claim]                     │   │
│  └─────────────────────────────┘   │
│                                    │
├────────────────────────────────────┤
│  Today: $1.45  |  Total: $89.20    │
└────────────────────────────────────┘
```

### 2. Floating Widget (appears on task page)

```
┌─────────────────────────────────┐
│ 📋 Task Instructions            │
├─────────────────────────────────┤
│ Solve the CAPTCHA and click     │
│ the "Sign Up" button.           │
│                                 │
│ ⏱️ 4:32 remaining               │
├─────────────────────────────────┤
│ [✅ Complete] [❌ Can't Do]     │
└─────────────────────────────────┘
```

Position: Bottom-right corner, draggable, minimize-able.

### 3. Badge
- Shows count of available tasks
- Green = tasks available
- Gray = no tasks / logged out
- Yellow = active task in progress

---

## Technical Architecture

### Manifest V3

```json
{
  "manifest_version": 3,
  "name": "Agency Completion",
  "version": "1.0.0",
  "description": "Complete tasks for AI agents, earn money",
  "permissions": [
    "activeTab",
    "storage",
    "alarms",
    "notifications"
  ],
  "host_permissions": [
    "https://api.agencycompletion.com/*"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": "icons/icon48.png"
  },
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "css": ["widget.css"],
      "run_at": "document_end"
    }
  ]
}
```

### Background Service Worker (`background.js`)

Responsibilities:
- Poll API for available tasks (every 30s)
- Update badge count
- Handle auth state
- Manage task timeouts
- Send notifications

```javascript
// Pseudo-code
chrome.alarms.create('poll-tasks', { periodInMinutes: 0.5 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'poll-tasks') {
    const tasks = await fetchAvailableTasks();
    chrome.action.setBadgeText({ text: String(tasks.length) });
  }
});
```

### Content Script (`content.js`)

Responsibilities:
- Inject floating widget when task is active
- Capture screenshots on completion
- Detect page navigation (task might complete via redirect)
- Send completion status to background

```javascript
// Pseudo-code
if (hasActiveTask() && currentUrlMatchesTask()) {
  injectWidget(taskInstructions);
}

function onComplete() {
  captureScreenshot().then(screenshot => {
    sendCompletion(taskId, screenshot);
    removeWidget();
  });
}
```

### Popup (`popup.html` / `popup.js`)

- React or vanilla JS (keep it simple)
- Fetch available tasks from background
- Handle claim action
- Show earnings

---

## API Endpoints Used

```
GET  /operator/tasks           → List available tasks
POST /operator/tasks/:id/claim → Claim a task (returns task details)
POST /operator/tasks/:id/complete → Submit completion + screenshot
POST /operator/tasks/:id/fail  → Mark as can't complete
GET  /operator/earnings        → Get earnings breakdown
```

---

## Screenshot Capture

On task completion:
1. Use `chrome.tabs.captureVisibleTab()` for full page
2. Compress to JPEG (quality 80%)
3. Upload to API with completion request
4. Store for dispute resolution

Privacy consideration: Only capture when operator clicks "Complete".

---

## Security Considerations

1. **Auth tokens** stored in `chrome.storage.local` (encrypted)
2. **No credential capture** — extension never reads form inputs
3. **Screenshot consent** — only on explicit "Complete" click
4. **URL validation** — only show widget on matched task URLs
5. **CSP compliance** — no inline scripts, Manifest V3 compliant

---

## Monetization UX

### Earnings Display
- Real-time earnings counter in popup
- Weekly summary notification
- Threshold alerts ("You've earned $50 this week!")

### Payout
- "Withdraw" button when balance > $10
- Connect PayPal/Stripe in settings
- Crypto option (USDC) for international operators

---

## Gamification (Future)

- **Streaks** — Complete 10 tasks in a day = bonus
- **Speed bonus** — Finish under 30s = 10% extra
- **Reliability score** — High completion rate = priority access
- **Levels** — Unlock higher-paying tasks as you level up

---

## MVP Scope

### v0.1 (This week)
- [ ] Login/logout
- [ ] View available tasks
- [ ] Claim task → open tab
- [ ] Floating widget with instructions
- [ ] Complete/fail buttons
- [ ] Badge count

### v0.2 (Next week)
- [ ] Screenshot capture
- [ ] Earnings display
- [ ] Notifications
- [ ] Basic settings

### v1.0 (Launch)
- [ ] Payout integration
- [ ] Reliability scoring
- [ ] Mobile-friendly popup
- [ ] Chrome Web Store listing

---

## Alternative: Firefox Add-on

Same architecture, minor manifest differences:
- `browser.*` instead of `chrome.*`
- Manifest V2 still supported (easier)
- Smaller market but less competition

Ship Chrome first, port to Firefox after validation.

---

## Open Questions

1. **Multi-task support** — Can operators have multiple tasks claimed at once?
2. **Partial completion** — What if they solve the CAPTCHA but don't click the button?
3. **Verification** — How do we verify the task was actually completed? (Screenshot + URL check?)
4. **Disputes** — What if agent claims task wasn't done properly?
