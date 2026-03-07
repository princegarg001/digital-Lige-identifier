# Avatar Directory

All Ready Player Me `.glb` avatar files live here.

## How to Add a New Avatar

1. **Go to** [Ready Player Me](https://readyplayer.me/) and create/select your avatar.
2. **Copy** the avatar's `.glb` URL from the dashboard.
3. **Append** `?morphTargets=ARKit` to the URL so facial expressions work:
   ```
   https://models.readyplayer.me/<AVATAR_ID>.glb?morphTargets=ARKit
   ```
4. **Download** the file and save it into this `public/avatars/` folder.
5. **Register** the avatar in `src/lib/avatars.ts` — add an entry to the `AVATAR_REGISTRY` array:
   ```ts
   {
     id: "my-new-avatar",
     label: "My Avatar",
     file: "my-avatar-id.glb",
   }
   ```
6. **Validate** (optional):
   ```bash
   npm run validate-avatar
   ```
7. **Select** the new avatar from the Config Panel dropdown — it persists automatically.

## Current Avatars

| File                            | Description               |
| ------------------------------- | ------------------------- |
| `avatar-transformed.glb`        | Default (optimised)       |
| `avatar.glb`                    | Original un-optimised     |
| `69aaa1126e4b038c0e57c67a.glb`  | RPM avatar with ARKit     |

## Notes

- Animations are stored separately in `public/animations/` and applied at runtime.
- The `?morphTargets=ARKit` parameter is **required** for lip-sync and expressions.
- You can run `npm run setup-avatar` to download the standard Idle & Wave animations.
