# Agency Completion — Server API Spec

## Overview

The server handles three concerns:
1. **Client API** — AI agents submit tasks, check status, receive results
2. **Worker API** — Humans claim tasks, submit completions, get paid
3. **Admin API** — Dashboard, analytics, billing

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   AI Agent      │────▶│   API Server    │────▶│  Human Worker   │
│ (SDK Client)    │◀────│                 │◀────│  (Dashboard)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │   PostgreSQL    │
                        │   (Tasks, Users,│
                        │    Payments)    │
                        └─────────────────┘
```

---

## Client API (for AI Agents)

Base URL: `https://api.agencycompletion.com/v1`

### Authentication
All requests require `Authorization: Bearer <api_key>` header.

### Endpoints

#### POST /tasks
Submit a new task for human completion.

**Request:**
```json
{
  "type": "captcha|click|form-fill|verification|screenshot|custom",
  "url": "https://example.com/signup",
  "instructions": "Solve the CAPTCHA and click Submit",
  "context": {
    "field_values": { "email": "agent@example.com" }
  },
  "priority": 5,
  "timeout": 300,
  "callbackUrl": "https://my-agent.com/webhook"
}
```

**Response:**
```json
{
  "id": "task_abc123xyz",
  "status": "pending",
  "createdAt": "2026-02-06T16:45:00Z",
  "estimatedWaitSeconds": 30,
  "queuePosition": 3
}
```

#### GET /tasks/:id
Check task status.

**Response:**
```json
{
  "id": "task_abc123xyz",
  "status": "completed",
  "createdAt": "2026-02-06T16:45:00Z",
  "assignedAt": "2026-02-06T16:45:15Z",
  "completedAt": "2026-02-06T16:45:45Z",
  "workerId": "worker_def456",
  "data": {
    "captchaSolved": true,
    "screenshot": "https://cdn.agencycompletion.com/screenshots/abc123.png"
  }
}
```

#### DELETE /tasks/:id
Cancel a pending task.

#### GET /account
Get account balance and usage.

```json
{
  "balance": 45.50,
  "tasksToday": 23,
  "tasksThisMonth": 412,
  "averageWaitSeconds": 28
}
```

---

## Worker API (for Humans)

Base URL: `https://api.agencycompletion.com/v1/worker`

### Authentication
Workers authenticate via OAuth (Google/GitHub) or email magic link.

### Endpoints

#### GET /tasks/available
List available tasks to claim.

**Query params:**
- `type` — Filter by task type
- `minPayout` — Minimum payout filter

**Response:**
```json
{
  "tasks": [
    {
      "id": "task_abc123",
      "type": "captcha",
      "url": "https://example.com/signup",
      "instructions": "Solve the CAPTCHA and click Submit",
      "payout": 0.03,
      "expiresIn": 240,
      "difficulty": "easy"
    }
  ]
}
```

#### POST /tasks/:id/claim
Claim a task. Returns task details + opens browser session.

**Response:**
```json
{
  "id": "task_abc123",
  "sessionUrl": "https://work.agencycompletion.com/session/xyz789",
  "expiresAt": "2026-02-06T16:50:00Z",
  "instructions": "Solve the CAPTCHA and click Submit"
}
```

#### POST /tasks/:id/complete
Mark task as completed.

**Request:**
```json
{
  "success": true,
  "screenshot": "base64...",
  "notes": "Completed successfully"
}
```

#### POST /tasks/:id/fail
Report task as unable to complete.

**Request:**
```json
{
  "reason": "Page requires login credentials not provided"
}
```

#### GET /earnings
Get worker earnings.

```json
{
  "today": 12.50,
  "thisWeek": 89.25,
  "thisMonth": 312.00,
  "pending": 15.00,
  "available": 297.00
}
```

#### POST /withdraw
Request payout (Stripe, PayPal, or crypto).

---

## Worker Dashboard UI

### Task Queue View
- List of available tasks with type, payout, difficulty
- Claim button → opens task in embedded browser
- Timer showing time remaining
- Complete/Fail buttons

### Active Task View
- Embedded browser iframe showing target URL
- Instructions panel on side
- Screenshot capture button
- "Mark Complete" / "Can't Complete" buttons
- Live countdown timer

### Earnings View
- Daily/weekly/monthly breakdown
- Pending vs available balance
- Withdrawal button
- Transaction history

---

## Task Lifecycle

```
┌─────────┐   submit   ┌─────────┐   claim   ┌───────────┐
│ PENDING │──────────▶ │ QUEUED  │─────────▶ │ ASSIGNED  │
└─────────┘            └─────────┘           └───────────┘
                                                   │
                            ┌──────────────────────┼──────────────────────┐
                            ▼                      ▼                      ▼
                     ┌───────────┐          ┌───────────┐          ┌───────────┐
                     │ COMPLETED │          │  FAILED   │          │  EXPIRED  │
                     └───────────┘          └───────────┘          └───────────┘
```

**Status definitions:**
- `pending` — Task received, waiting for available worker
- `queued` — In worker queue, waiting for claim
- `assigned` — Worker claimed, in progress
- `completed` — Worker finished successfully
- `failed` — Worker couldn't complete (refunded)
- `expired` — Timeout reached (refunded)

---

## Pricing Model

### Client Pricing (what AI agents pay)
| Task Type | Base Price | Priority Boost |
|-----------|------------|----------------|
| CAPTCHA | $0.02 | +$0.01 per level |
| Click | $0.01 | +$0.005 per level |
| Form Fill | $0.05 | +$0.02 per level |
| Verification | $0.02 | +$0.01 per level |
| Screenshot | $0.01 | +$0.005 per level |
| Custom | $0.10 | +$0.05 per level |

### Worker Payout (what humans earn)
Workers receive 70% of task price. Platform takes 30%.

Example: $0.05 CAPTCHA task → Worker gets $0.035

### Volume Discounts
- 1,000+ tasks/month: 10% off
- 10,000+ tasks/month: 20% off
- Enterprise: Custom pricing

---

## Webhook Events

POST to client's `callbackUrl` when task status changes:

```json
{
  "event": "task.completed",
  "task": {
    "id": "task_abc123",
    "status": "completed",
    "completedAt": "2026-02-06T16:45:45Z",
    "data": { ... }
  },
  "signature": "sha256=..."
}
```

Events:
- `task.assigned` — Worker claimed the task
- `task.completed` — Task finished successfully
- `task.failed` — Task couldn't be completed
- `task.expired` — Task timed out

---

## Tech Stack (Proposed)

- **API:** Node.js + Fastify (or Hono for edge)
- **Database:** PostgreSQL (Neon or Supabase)
- **Auth:** Clerk or Auth.js
- **Payments:** Stripe
- **Browser sessions:** Browserbase or custom Playwright pool
- **Hosting:** Vercel/Railway/Fly.io
- **CDN:** Cloudflare (screenshots, assets)

---

## MVP Scope

### Phase 1 (Week 1)
- [ ] Client API: submit, status, cancel
- [ ] Basic worker dashboard
- [ ] Manual task queue (no browser automation)
- [ ] Stripe payment integration

### Phase 2 (Week 2)
- [ ] Embedded browser for workers
- [ ] Webhook notifications
- [ ] Worker payout system
- [ ] Priority queue

### Phase 3 (Week 3+)
- [ ] Mobile worker app
- [ ] API rate limiting
- [ ] Analytics dashboard
- [ ] Worker reputation system

---

## Security Considerations

- API keys hashed in database (bcrypt)
- Webhook signatures for authenticity
- Worker browser sessions isolated (no cross-task access)
- Rate limiting per API key
- Fraud detection for workers (task completion patterns)
- No storage of sensitive data (passwords, payment info beyond what Stripe needs)

---

## Questions to Resolve

1. **Browser sessions:** Build our own Playwright pool or use Browserbase?
2. **Worker sourcing:** Start with Mechanical Turk integration or build own pool?
3. **International:** Support workers globally or US-first?
4. **Crypto payments:** Worth the complexity for worker payouts?
