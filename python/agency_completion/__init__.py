"""
Agency Completion SDK for Python

A client library for AI agents to queue tasks requiring human completion.
"""

from .client import AgencyClient, TaskType, TaskStatus, Task, TaskResult

__version__ = "0.1.0"
__all__ = ["AgencyClient", "TaskType", "TaskStatus", "Task", "TaskResult"]
