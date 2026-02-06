/**
 * Agency Completion SDK
 * 
 * A client library for AI agents to queue tasks that require human completion.
 * CAPTCHAs, account signups, verification clicks, form fills — anything an AI can't do alone.
 * 
 * @example
 * ```typescript
 * const client = new AgencyClient({ apiKey: 'your-key' });
 * 
 * const ticket = await client.submit({
 *   type: 'captcha',
 *   url: 'https://example.com/signup',
 *   instructions: 'Solve the CAPTCHA and click Submit'
 * });
 * 
 * const result = await client.wait(ticket.id);
 * console.log(result.status); // 'completed'
 * ```
 */

export type TaskType = 'captcha' | 'click' | 'form-fill' | 'verification' | 'screenshot' | 'custom';

export type TaskStatus = 'pending' | 'assigned' | 'in-progress' | 'completed' | 'failed' | 'expired';

export interface TaskRequest {
  /** Type of task to complete */
  type: TaskType;
  /** URL where the task should be performed */
  url: string;
  /** Human-readable instructions for the worker */
  instructions: string;
  /** Optional context/metadata */
  context?: Record<string, unknown>;
  /** Callback URL for webhook notification (optional) */
  callbackUrl?: string;
  /** Priority level (1-10, higher = faster) */
  priority?: number;
  /** Max time to wait for completion (seconds) */
  timeout?: number;
}

export interface Ticket {
  id: string;
  status: TaskStatus;
  createdAt: string;
  estimatedWaitSeconds?: number;
}

export interface TaskResult {
  ticketId: string;
  status: TaskStatus;
  completedAt?: string;
  /** Data returned by the worker (e.g., extracted text, screenshot URL) */
  data?: Record<string, unknown>;
  /** Error message if failed */
  error?: string;
}

export interface AgencyClientOptions {
  /** API key for authentication */
  apiKey: string;
  /** Base URL of the Agency Completion service */
  baseUrl?: string;
  /** Enable mock mode for local testing (no real API calls) */
  mockMode?: boolean;
  /** Default timeout for tasks (seconds) */
  defaultTimeout?: number;
}

export class AgencyClient {
  private apiKey: string;
  private baseUrl: string;
  private mockMode: boolean;
  private defaultTimeout: number;
  private mockTasks: Map<string, { request: TaskRequest; status: TaskStatus; createdAt: Date }>;

  constructor(options: AgencyClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl || 'https://api.agencycompletion.com';
    this.mockMode = options.mockMode || false;
    this.defaultTimeout = options.defaultTimeout || 300; // 5 minutes
    this.mockTasks = new Map();
  }

  /**
   * Submit a task for human completion
   */
  async submit(request: TaskRequest): Promise<Ticket> {
    if (this.mockMode) {
      return this.mockSubmit(request);
    }

    const response = await fetch(`${this.baseUrl}/v1/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        ...request,
        timeout: request.timeout || this.defaultTimeout,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to submit task: ${error}`);
    }

    return response.json();
  }

  /**
   * Check the status of a submitted task
   */
  async status(ticketId: string): Promise<TaskResult> {
    if (this.mockMode) {
      return this.mockStatus(ticketId);
    }

    const response = await fetch(`${this.baseUrl}/v1/tasks/${ticketId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get task status: ${error}`);
    }

    return response.json();
  }

  /**
   * Wait for a task to complete (polling)
   */
  async wait(ticketId: string, options?: { pollInterval?: number; timeout?: number }): Promise<TaskResult> {
    const pollInterval = options?.pollInterval || 2000; // 2 seconds
    const timeout = options?.timeout || this.defaultTimeout * 1000;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const result = await this.status(ticketId);

      if (result.status === 'completed' || result.status === 'failed' || result.status === 'expired') {
        return result;
      }

      await this.sleep(pollInterval);
    }

    throw new Error(`Task ${ticketId} timed out after ${timeout}ms`);
  }

  /**
   * Cancel a pending task
   */
  async cancel(ticketId: string): Promise<void> {
    if (this.mockMode) {
      this.mockTasks.delete(ticketId);
      return;
    }

    const response = await fetch(`${this.baseUrl}/v1/tasks/${ticketId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to cancel task: ${error}`);
    }
  }

  /**
   * Convenience method: Submit and wait in one call
   */
  async submitAndWait(request: TaskRequest, waitOptions?: { pollInterval?: number }): Promise<TaskResult> {
    const ticket = await this.submit(request);
    return this.wait(ticket.id, { ...waitOptions, timeout: (request.timeout || this.defaultTimeout) * 1000 });
  }

  // --- Mock Mode Implementation ---

  private mockSubmit(request: TaskRequest): Ticket {
    const id = `mock_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    this.mockTasks.set(id, {
      request,
      status: 'pending',
      createdAt: new Date(),
    });

    // Simulate completion after 3 seconds in mock mode
    setTimeout(() => {
      const task = this.mockTasks.get(id);
      if (task && task.status === 'pending') {
        task.status = 'completed';
      }
    }, 3000);

    return {
      id,
      status: 'pending',
      createdAt: new Date().toISOString(),
      estimatedWaitSeconds: 3,
    };
  }

  private mockStatus(ticketId: string): TaskResult {
    const task = this.mockTasks.get(ticketId);
    if (!task) {
      throw new Error(`Task ${ticketId} not found`);
    }

    return {
      ticketId,
      status: task.status,
      completedAt: task.status === 'completed' ? new Date().toISOString() : undefined,
      data: task.status === 'completed' ? { mock: true, message: 'Task completed in mock mode' } : undefined,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export default instance factory
export function createClient(options: AgencyClientOptions): AgencyClient {
  return new AgencyClient(options);
}

export default AgencyClient;
