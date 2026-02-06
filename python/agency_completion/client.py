"""
Agency Completion Client

Submit tasks for human completion and wait for results.
"""

import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Optional
from urllib.request import Request, urlopen
from urllib.error import HTTPError
import json


class TaskType(Enum):
    """Types of tasks that can be submitted."""
    CAPTCHA = "captcha"
    CLICK = "click"
    FORM_FILL = "form-fill"
    VERIFICATION = "verification"
    SCREENSHOT = "screenshot"
    CUSTOM = "custom"


class TaskStatus(Enum):
    """Possible states of a task."""
    PENDING = "pending"
    QUEUED = "queued"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in-progress"
    COMPLETED = "completed"
    FAILED = "failed"
    EXPIRED = "expired"


@dataclass
class Task:
    """A task submitted for human completion."""
    id: str
    status: TaskStatus
    created_at: str
    estimated_wait_seconds: Optional[int] = None
    queue_position: Optional[int] = None


@dataclass
class TaskResult:
    """Result of a completed task."""
    task_id: str
    status: TaskStatus
    completed_at: Optional[str] = None
    data: Optional[dict[str, Any]] = None
    error: Optional[str] = None


@dataclass
class TaskRequest:
    """Request to create a new task."""
    type: TaskType
    url: str
    instructions: str
    context: Optional[dict[str, Any]] = None
    callback_url: Optional[str] = None
    priority: int = 5
    timeout: int = 300


class AgencyClient:
    """
    Client for the Agency Completion service.
    
    Example:
        >>> client = AgencyClient(api_key="your-key")
        >>> task = client.submit(TaskRequest(
        ...     type=TaskType.CAPTCHA,
        ...     url="https://example.com/signup",
        ...     instructions="Solve the CAPTCHA and click Submit"
        ... ))
        >>> result = client.wait(task.id)
        >>> print(result.status)
    """
    
    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.agencycompletion.com",
        mock_mode: bool = False,
        default_timeout: int = 300,
    ):
        """
        Initialize the Agency Completion client.
        
        Args:
            api_key: Your API key for authentication
            base_url: Base URL of the Agency Completion service
            mock_mode: If True, simulate responses without real API calls
            default_timeout: Default timeout for tasks in seconds
        """
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.mock_mode = mock_mode
        self.default_timeout = default_timeout
        self._mock_tasks: dict[str, dict] = {}
    
    def submit(self, request: TaskRequest) -> Task:
        """
        Submit a task for human completion.
        
        Args:
            request: The task request with type, URL, and instructions
            
        Returns:
            A Task object with ID and initial status
        """
        if self.mock_mode:
            return self._mock_submit(request)
        
        payload = {
            "type": request.type.value,
            "url": request.url,
            "instructions": request.instructions,
            "context": request.context,
            "callbackUrl": request.callback_url,
            "priority": request.priority,
            "timeout": request.timeout or self.default_timeout,
        }
        
        response = self._request("POST", "/v1/tasks", payload)
        
        return Task(
            id=response["id"],
            status=TaskStatus(response["status"]),
            created_at=response["createdAt"],
            estimated_wait_seconds=response.get("estimatedWaitSeconds"),
            queue_position=response.get("queuePosition"),
        )
    
    def status(self, task_id: str) -> TaskResult:
        """
        Check the status of a submitted task.
        
        Args:
            task_id: The ID of the task to check
            
        Returns:
            A TaskResult with current status and data if completed
        """
        if self.mock_mode:
            return self._mock_status(task_id)
        
        response = self._request("GET", f"/v1/tasks/{task_id}")
        
        return TaskResult(
            task_id=response["id"],
            status=TaskStatus(response["status"]),
            completed_at=response.get("completedAt"),
            data=response.get("data"),
            error=response.get("error"),
        )
    
    def wait(
        self,
        task_id: str,
        poll_interval: float = 2.0,
        timeout: Optional[float] = None,
        on_status_change: Optional[Callable[[TaskResult], None]] = None,
    ) -> TaskResult:
        """
        Wait for a task to complete by polling.
        
        Args:
            task_id: The ID of the task to wait for
            poll_interval: Seconds between status checks
            timeout: Maximum seconds to wait (None = use default)
            on_status_change: Optional callback for status updates
            
        Returns:
            The final TaskResult when completed, failed, or expired
            
        Raises:
            TimeoutError: If the task doesn't complete within timeout
        """
        timeout = timeout or self.default_timeout
        start_time = time.time()
        last_status = None
        
        while time.time() - start_time < timeout:
            result = self.status(task_id)
            
            if on_status_change and result.status != last_status:
                on_status_change(result)
                last_status = result.status
            
            if result.status in (TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.EXPIRED):
                return result
            
            time.sleep(poll_interval)
        
        raise TimeoutError(f"Task {task_id} did not complete within {timeout} seconds")
    
    def cancel(self, task_id: str) -> None:
        """
        Cancel a pending task.
        
        Args:
            task_id: The ID of the task to cancel
        """
        if self.mock_mode:
            self._mock_tasks.pop(task_id, None)
            return
        
        self._request("DELETE", f"/v1/tasks/{task_id}")
    
    def submit_and_wait(
        self,
        request: TaskRequest,
        poll_interval: float = 2.0,
        on_status_change: Optional[Callable[[TaskResult], None]] = None,
    ) -> TaskResult:
        """
        Submit a task and wait for completion in one call.
        
        Args:
            request: The task request
            poll_interval: Seconds between status checks
            on_status_change: Optional callback for status updates
            
        Returns:
            The final TaskResult
        """
        task = self.submit(request)
        return self.wait(
            task.id,
            poll_interval=poll_interval,
            timeout=request.timeout or self.default_timeout,
            on_status_change=on_status_change,
        )
    
    # --- Private methods ---
    
    def _request(self, method: str, path: str, payload: Optional[dict] = None) -> dict:
        """Make an HTTP request to the API."""
        url = f"{self.base_url}{path}"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        
        data = json.dumps(payload).encode() if payload else None
        request = Request(url, data=data, headers=headers, method=method)
        
        try:
            with urlopen(request) as response:
                return json.loads(response.read().decode())
        except HTTPError as e:
            error_body = e.read().decode() if e.fp else str(e)
            raise RuntimeError(f"API request failed: {e.code} {error_body}")
    
    def _mock_submit(self, request: TaskRequest) -> Task:
        """Submit a task in mock mode."""
        task_id = f"mock_{uuid.uuid4().hex[:12]}"
        created_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        
        self._mock_tasks[task_id] = {
            "request": request,
            "status": TaskStatus.PENDING,
            "created_at": created_at,
            "complete_at": time.time() + 3,  # Complete after 3 seconds
        }
        
        return Task(
            id=task_id,
            status=TaskStatus.PENDING,
            created_at=created_at,
            estimated_wait_seconds=3,
        )
    
    def _mock_status(self, task_id: str) -> TaskResult:
        """Check status in mock mode."""
        task = self._mock_tasks.get(task_id)
        if not task:
            raise RuntimeError(f"Task {task_id} not found")
        
        # Auto-complete after the scheduled time
        if time.time() >= task["complete_at"]:
            task["status"] = TaskStatus.COMPLETED
        
        return TaskResult(
            task_id=task_id,
            status=task["status"],
            completed_at=time.strftime("%Y-%m-%dT%H:%M:%SZ") if task["status"] == TaskStatus.COMPLETED else None,
            data={"mock": True, "message": "Completed in mock mode"} if task["status"] == TaskStatus.COMPLETED else None,
        )


# Convenience function
def create_client(
    api_key: str,
    mock_mode: bool = False,
    **kwargs
) -> AgencyClient:
    """Create an AgencyClient instance."""
    return AgencyClient(api_key=api_key, mock_mode=mock_mode, **kwargs)
