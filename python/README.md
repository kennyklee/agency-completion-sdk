# Agency Completion SDK for Python

Python client for AI agents to queue tasks requiring human completion.

## Installation

```bash
pip install agency-completion
```

## Quick Start

```python
from agency_completion import AgencyClient, TaskRequest, TaskType

# Initialize client
client = AgencyClient(
    api_key="your-api-key",
    mock_mode=True  # Use mock mode for testing
)

# Submit a CAPTCHA task
task = client.submit(TaskRequest(
    type=TaskType.CAPTCHA,
    url="https://example.com/signup",
    instructions="Solve the CAPTCHA and click Submit"
))

print(f"Task submitted: {task.id}")

# Wait for human to complete it
result = client.wait(task.id)

if result.status.value == "completed":
    print("Success!", result.data)
else:
    print("Failed:", result.error)
```

## One-liner

```python
result = client.submit_and_wait(TaskRequest(
    type=TaskType.CAPTCHA,
    url="https://example.com",
    instructions="Solve the CAPTCHA"
))
```

## Task Types

- `TaskType.CAPTCHA` - Any CAPTCHA (reCAPTCHA, hCaptcha, etc.)
- `TaskType.CLICK` - Click a specific button/link
- `TaskType.FORM_FILL` - Fill out a form
- `TaskType.VERIFICATION` - Email/phone verification
- `TaskType.SCREENSHOT` - Capture current state
- `TaskType.CUSTOM` - Anything else

## Status Callbacks

```python
def on_status_change(result):
    print(f"Status: {result.status.value}")

result = client.wait(task.id, on_status_change=on_status_change)
```

## License

MIT - Built by [Raccoon Labs](https://raccoonlabs.ai)
