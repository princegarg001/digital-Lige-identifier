---
name: reachy-mini
description: Control Reachy Mini robots by Pollen Robotics. Use when building apps, controlling robot movement (head, antennas, body), accessing camera/audio, or integrating with LLMs. Triggers on requests involving Reachy Mini SDK, robot control, head pose matrices, or ReachyMiniApp development.
---

# Reachy Mini

Control Reachy Mini robots using the Python SDK. Supports both real hardware and MuJoCo simulation.

## Quick Start

```python
from reachy_mini import ReachyMini
from reachy_mini.utils import create_head_pose
import numpy as np

with ReachyMini() as mini:
    # Smooth movement
    mini.goto_target(
        head=create_head_pose(pitch=15, degrees=True),  # Look up
        antennas=np.deg2rad([30, 30]),                  # Antennas out
        duration=1.0
    )
```

## Connection Options

| Scenario | Code |
|----------|------|
| Local wired | `ReachyMini()` |
| Wireless | `ReachyMini(localhost_only=False)` |
| No camera/audio | `ReachyMini(media_backend="no_media")` |
| Simulation | Start daemon with `--sim`, then `ReachyMini()` |

## Movement

### Head Control

Head pose is a 4x4 transformation matrix. Use `create_head_pose()` helper:

```python
from reachy_mini.utils import create_head_pose

# Parameters: x, y, z (position), roll, pitch, yaw (rotation)
pose = create_head_pose(
    z=10, pitch=15,     # Up 10mm, pitch 15 degrees
    mm=True,            # Position in mm (default: meters)
    degrees=True        # Angles in degrees (default: True)
)
mini.goto_target(head=pose, duration=1.0)
```

### Antennas

Two antennas controlled by angles in radians: `[right, left]`

```python
mini.goto_target(antennas=np.deg2rad([45, -45]), duration=0.5)
```

### Movement Methods

| Method | Use Case |
|--------|----------|
| `goto_target()` | Smooth interpolated movement |
| `set_target()` | Instant position (high-frequency control) |

Interpolation methods: `linear`, `minjerk` (default), `ease`, `cartoon`

### Built-in Behaviors

```python
mini.wake_up()      # Init pose + sound
mini.goto_sleep()   # Sleep pose + sound
mini.look_at_world(x, y, z, duration=1.0)  # Look at 3D point
mini.look_at_image(u, v, duration=1.0)     # Look at pixel coordinate
```

## Camera & Audio

Access via `mini.media`:

```python
# Camera (returns BGR numpy array)
frame = mini.media.get_frame()

# Play sound (bundled or path)
mini.media.play_sound("wake_up.wav")

# Record audio
mini.media.start_recording()
sample = mini.media.get_audio_sample()  # Returns bytes or numpy array
mini.media.stop_recording()

# Stream audio output
mini.media.start_playing()
mini.media.push_audio_sample(audio_data)  # numpy float32 array
mini.media.stop_playing()
```

## Building Apps

Subclass `ReachyMiniApp` to create installable apps:

```python
from reachy_mini import ReachyMini
from reachy_mini.apps import ReachyMiniApp
import threading

class MyApp(ReachyMiniApp):
    custom_app_url = "http://0.0.0.0:8042"  # Optional web UI

    def run(self, reachy_mini: ReachyMini, stop_event: threading.Event):
        while not stop_event.is_set():
            # App logic here
            pass
```

For detailed app development: See [references/app-development.md](references/app-development.md)

## LLM Integration Pattern

For voice/chat apps with tool calling:

```python
# Define tools the LLM can call
tools = [
    {"name": "move_head", "params": {"direction": "left|right|up|down|center"}},
    {"name": "express_emotion", "params": {"emotion": "happy|sad|surprised"}}
]

# Execute tool calls
async def handle_tool(name, args):
    if name == "move_head":
        direction = args["direction"]
        poses = {
            "left": create_head_pose(yaw=20, degrees=True),
            "right": create_head_pose(yaw=-20, degrees=True),
            "up": create_head_pose(pitch=15, degrees=True),
            "down": create_head_pose(pitch=-15, degrees=True),
            "center": create_head_pose()
        }
        mini.goto_target(head=poses[direction], duration=0.5)
```

## Resources

- [references/api.md](references/api.md) - Complete API reference
- [references/app-development.md](references/app-development.md) - App development guide
