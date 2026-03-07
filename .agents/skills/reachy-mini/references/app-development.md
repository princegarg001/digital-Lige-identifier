# Reachy Mini App Development

## Project Structure

```
my_reachy_app/
├── pyproject.toml
├── src/
│   └── my_reachy_app/
│       ├── __init__.py
│       └── main.py
├── static/              # Optional web UI
│   └── index.html
└── .env                 # API keys
```

## pyproject.toml

```toml
[project]
name = "my_reachy_app"
version = "0.1.0"
dependencies = [
    "reachy_mini",
    # Add other deps
]

[project.scripts]
my-app = "my_reachy_app.main:main"

[project.entry-points."reachy_mini.apps"]
my_app = "my_reachy_app.main:MyReachyApp"
```

## App Class

```python
from reachy_mini import ReachyMini
from reachy_mini.apps import ReachyMiniApp
import threading

class MyReachyApp(ReachyMiniApp):
    # Optional: Web dashboard URL (None = no dashboard)
    custom_app_url = "http://0.0.0.0:8042"

    # Optional: Skip web server even if custom_app_url is set
    dont_start_webserver = False

    # Optional: Request specific media backend
    # "default", "gstreamer", "no_media"
    request_media_backend = None

    def run(self, reachy_mini: ReachyMini, stop_event: threading.Event):
        """Main app logic. Called by the daemon."""

        # Initialization
        reachy_mini.wake_up()

        # Main loop
        while not stop_event.is_set():
            # Your logic here
            frame = reachy_mini.media.get_frame()
            # Process frame, handle audio, etc.
            pass

        # Cleanup
        reachy_mini.goto_sleep()
```

## CLI Entry Point

```python
def main():
    """Standalone CLI entry point."""
    from reachy_mini import ReachyMini
    import threading

    robot = ReachyMini(media_backend="default")
    stop_event = threading.Event()

    try:
        # Your app logic
        with robot:
            while not stop_event.is_set():
                pass
    except KeyboardInterrupt:
        stop_event.set()
```

## Async Pattern (for LLM APIs)

```python
import asyncio
import threading

class AsyncApp(ReachyMiniApp):
    def run(self, reachy_mini: ReachyMini, stop_event: threading.Event):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(self.async_run(reachy_mini, stop_event))
        finally:
            loop.close()

    async def async_run(self, robot: ReachyMini, stop_event: threading.Event):
        # Async logic here
        while not stop_event.is_set():
            await asyncio.sleep(0.1)
```

## Wireless Reachy Mini

For wireless robots, the daemon runs on the Raspberry Pi. Your app connects remotely:

```python
# Connect to wireless Reachy Mini
robot = ReachyMini(
    localhost_only=False,           # Allow remote connection
    media_backend="no_media"        # Use local mic/speaker instead
)
```

To use the robot's camera/mic/speaker over WebRTC:
```python
robot = ReachyMini(
    localhost_only=False,
    media_backend="webrtc"  # Requires gst_signalling module
)
```

## Publishing to Hugging Face

1. Create a Hugging Face Space
2. Add your app code
3. Include proper `pyproject.toml` with entry point
4. Use `reachy-mini-app publish` command

```bash
reachy-mini-app create my_app ./my_app  # Create from template
reachy-mini-app check ./my_app          # Validate structure
reachy-mini-app publish ./my_app        # Publish to HF
```
