# Reachy Mini API Reference

## ReachyMini Class

### Constructor

```python
ReachyMini(
    robot_name: str = "reachy_mini",
    localhost_only: bool = True,      # False for wireless
    spawn_daemon: bool = False,
    use_sim: bool = False,
    timeout: float = 5.0,
    automatic_body_yaw: bool = True,
    log_level: str = "INFO",
    media_backend: str = "default"    # "default", "gstreamer", "webrtc", "no_media"
)
```

### Movement Methods

#### goto_target()
Smooth interpolated movement to target position.

```python
mini.goto_target(
    head: np.ndarray = None,           # 4x4 pose matrix
    antennas: list[float] = None,      # [right, left] radians
    body_yaw: float = None,            # Body rotation radians
    duration: float = 0.5,             # Seconds
    method: str = "minjerk"            # linear, minjerk, ease, cartoon
)
```

#### set_target()
Instant position setting (no interpolation). Use for high-frequency control.

```python
mini.set_target(
    head: np.ndarray = None,
    antennas: list[float] = None,
    body_yaw: float = None
)
```

### State Methods

```python
# Get current joint positions
head_joints, antenna_joints = mini.get_current_joint_positions()
# head_joints: list[float] length 7
# antenna_joints: list[float] length 2

# Get current head pose
pose = mini.get_current_head_pose()  # Returns 4x4 numpy array

# Get antenna positions
antennas = mini.get_present_antenna_joint_positions()  # [right, left]
```

### Look-at Methods

```python
# Look at 3D world coordinates (meters)
mini.look_at_world(x, y, z, duration=1.0, perform_movement=True)

# Look at image pixel coordinates
mini.look_at_image(u, v, duration=1.0, perform_movement=True)
```

### Motor Control

```python
mini.enable_motors(ids=None)   # None = all motors
mini.disable_motors(ids=None)
mini.enable_gravity_compensation()
mini.disable_gravity_compensation()
```

### Recording

```python
mini.start_recording()
recorded_data = mini.stop_recording()  # Returns list of dicts with time, head, antennas
```

### Behaviors

```python
mini.wake_up()     # Init pose + wake_up.wav sound
mini.goto_sleep()  # Sleep pose + go_sleep.wav sound
```

### Playing Moves

```python
from reachy_mini.motion import Move, RecordedMove

move = RecordedMove.load("my_move.json")
mini.play_move(move, play_frequency=100.0, initial_goto_duration=0.5)
```

---

## MediaManager (mini.media)

### Camera

```python
frame = mini.media.get_frame()  # Returns BGR numpy array or None
# Resolution: mini.media.camera.resolution
```

### Audio Playback

```python
mini.media.play_sound("filename.wav")  # Plays bundled or path sound

# Streaming output
mini.media.start_playing()
mini.media.push_audio_sample(data)  # np.float32 array, mono or stereo
mini.media.stop_playing()
```

### Audio Recording

```python
mini.media.start_recording()
sample = mini.media.get_audio_sample()  # bytes or np.float32 array
mini.media.stop_recording()

# Get audio properties
samplerate_in = mini.media.get_input_audio_samplerate()
samplerate_out = mini.media.get_output_audio_samplerate()
channels_in = mini.media.get_input_channels()
channels_out = mini.media.get_output_channels()
```

---

## Utilities

### create_head_pose()

```python
from reachy_mini.utils import create_head_pose

pose = create_head_pose(
    x=0, y=0, z=0,           # Position
    roll=0, pitch=0, yaw=0,  # Rotation (Euler XYZ)
    mm=False,                # True: position in mm, False: meters
    degrees=True             # True: angles in degrees, False: radians
)
# Returns: 4x4 numpy transformation matrix
```

### Common Poses

```python
# Look directions
look_left = create_head_pose(yaw=25, degrees=True)
look_right = create_head_pose(yaw=-25, degrees=True)
look_up = create_head_pose(pitch=20, degrees=True)
look_down = create_head_pose(pitch=-20, degrees=True)
center = create_head_pose()  # Identity pose

# Tilt
tilt_left = create_head_pose(roll=15, degrees=True)
tilt_right = create_head_pose(roll=-15, degrees=True)
```

---

## Constants

```python
# Antenna limits (radians)
# Right antenna: -3.05 to 0
# Left antenna: 0 to 3.05

# Audio sample rates
SEND_SAMPLE_RATE = 16000   # Mic input
RECEIVE_SAMPLE_RATE = 24000  # Speaker output (Gemini API)
```
