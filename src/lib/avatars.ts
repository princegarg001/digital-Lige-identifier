/**
 * Avatar Registry — types and helpers for the avatar system.
 *
 * The source of truth is `public/avatars/index.json`.
 * At runtime the app fetches that file so any new entries
 * added there automatically appear in the UI dropdown.
 *
 * To add a new avatar:
 *   1. Drop the .glb file into public/avatars/
 *   2. Add an entry to public/avatars/index.json
 *   3. Done — restart dev server if needed.
 */

export interface AvatarEntry {
  /** Unique key used in config persistence */
  id: string;
  /** Human-readable name shown in the UI dropdown */
  label: string;
  /** Filename inside public/avatars/ (e.g. "avatar.glb") */
  file: string;
}

/** Fallback used before the fetch completes or if it fails */
export const DEFAULT_AVATARS: AvatarEntry[] = [
  { id: "female", label: "Female", file: "69aaa1126e4b038c0e57c67a.glb" },
];

/** Fetch the avatar registry from public/avatars/index.json */
export async function fetchAvatarRegistry(): Promise<AvatarEntry[]> {
  try {
    const res = await fetch("/avatars/index.json");
    if (!res.ok) return DEFAULT_AVATARS;
    return await res.json();
  } catch {
    return DEFAULT_AVATARS;
  }
}

/** Resolve an avatar ID to the full public URL path */
export function getAvatarUrl(id: string, registry: AvatarEntry[]): string {
  const entry = registry.find((a) => a.id === id);
  const file = entry?.file ?? registry[0]?.file ?? DEFAULT_AVATARS[0].file;
  
  if (file.startsWith("http://") || file.startsWith("https://")) {
    try {
      const url = new URL(file);
      // Ensure morphTargets are requested for ARKit blendshapes
      url.searchParams.set("morphTargets", "ARKit");
      // Cache buster for inconsistent browsers
      url.searchParams.set("random", Math.random().toString(36).substring(7));
      return url.toString();
    } catch {
      return file;
    }
  }
  
  return `/avatars/${file}`;
}

/** Resolve an avatar ID to its registry entry (falls back to first) */
export function getAvatarEntry(id: string, registry: AvatarEntry[]): AvatarEntry {
  return registry.find((a) => a.id === id) ?? registry[0] ?? DEFAULT_AVATARS[0];
}
