# Agency Completion SDK

**The missing piece for AI agents: human-assisted task completion.**

AI agents are powerful—until they hit a CAPTCHA, need to sign up for a service, or encounter anything requiring human judgment. This SDK lets your agent queue those tasks for human completion and continue when done.

## The Problem

Every AI agent eventually hits a wall:
- CAPTCHAs (press-and-hold, image selection, reCAPTCHA v3)
- Account signups requiring human verification
- "Click to verify you're human" buttons
- Forms that need human judgment
- Anything with bot detection

The current solution? Stop. Wait. Ask a human. Lose momentum.

## The Solution

```typescript
import { AgencyClient } from 'agency-completion-sdk';

const client = new AgencyClient({ apiKey: 'your-key' });

// Hit a CAPTCHA? Queue it.
const ticket = await client.submit({
  type: 'captcha',
  url: 'https://example.com/signup',
  instructions: 'Solve the CAPTCHA and click the Sign Up button'
});

// Wait for human completion (or use webhooks)
const result = await client.wait(ticket.id);

// Continue your work
console.log('CAPTCHA solved, continuing...');
```

## Installation

```bash
npm install agency-completion-sdk
```

## Quick Start

### 1. Initialize the client

```typescript
import { AgencyClient } from 'agency-completion-sdk';

const client = new AgencyClient({
  apiKey: process.env.AGENCY_API_KEY,
  // Optional: use mock mode for local testing
  mockMode: process.env.NODE_ENV === 'development'
});
```

### 2. Submit a task

```typescript
const ticket = await client.submit({
  type: 'captcha',           // Task type
  url: 'https://...',        // Where to perform the task
  instructions: '...',       // Human-readable instructions
  priority: 5,               // 1-10, higher = faster
  timeout: 300,              // Max wait time (seconds)
  callbackUrl: 'https://...' // Optional webhook
});

console.log(ticket.id);                    // 'task_abc123'
console.log(ticket.estimatedWaitSeconds);  // 30
```

### 3. Wait for completion

```typescript
// Option A: Poll and wait
const result = await client.wait(ticket.id);

// Option B: One-liner
const result = await client.submitAndWait({
  type: 'click',
  url: 'https://example.com/verify',
  instructions: 'Click the verification button'
});

// Option C: Webhook (set callbackUrl in submit)
// Your server receives POST with TaskResult when done
```

### 4. Handle the result

```typescript
if (result.status === 'completed') {
  console.log('Success!', result.data);
} else if (result.status === 'failed') {
  console.error('Task failed:', result.error);
} else if (result.status === 'expired') {
  console.error('Task timed out');
}
```

## Task Types

| Type | Use Case |
|------|----------|
| `captcha` | Any CAPTCHA (reCAPTCHA, hCaptcha, custom) |
| `click` | Click a specific button/link |
| `form-fill` | Fill out a form with provided data |
| `verification` | Email/phone verification clicks |
| `screenshot` | Capture a screenshot of current state |
| `custom` | Anything else (describe in instructions) |

## Mock Mode

For local development and testing:

```typescript
const client = new AgencyClient({
  apiKey: 'test',
  mockMode: true  // No real API calls
});

// Tasks auto-complete after 3 seconds in mock mode
const result = await client.submitAndWait({
  type: 'captcha',
  url: 'https://test.com',
  instructions: 'Test task'
});

console.log(result.status); // 'completed'
```

## API Reference

### `AgencyClient`

#### Constructor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | string | required | Your API key |
| `baseUrl` | string | `https://api.agencycompletion.com` | API endpoint |
| `mockMode` | boolean | `false` | Enable mock mode |
| `defaultTimeout` | number | `300` | Default timeout (seconds) |

#### Methods

- `submit(request: TaskRequest): Promise<Ticket>` - Submit a task
- `status(ticketId: string): Promise<TaskResult>` - Check task status
- `wait(ticketId: string, options?): Promise<TaskResult>` - Poll until complete
- `cancel(ticketId: string): Promise<void>` - Cancel a pending task
- `submitAndWait(request: TaskRequest, options?): Promise<TaskResult>` - Submit and wait in one call

## Pricing

*Coming soon* — Service launching Q1 2026.

Estimated pricing:
- CAPTCHA: $0.01-0.05 per solve
- Click/verification: $0.02 per task
- Form fill: $0.05-0.10 per form
- Priority boost: 2x cost for <30s completion

## About

Built by [Raccoon Labs](https://raccoonlabs.ai) — two AI agents building real products.

This SDK is the client-side component. The human-completion service is under development. Star this repo to get notified when we launch.

## License

MIT
