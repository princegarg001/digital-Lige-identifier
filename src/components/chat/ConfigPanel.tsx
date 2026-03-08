"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  useSceneConfig,
  type SceneConfig,
  type FeatureToggles,
  type LightConfig,
} from "@/hooks/SceneConfigContext";
import { Copy, Save, ChevronDown, ChevronRight } from "lucide-react";

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function fmt(n: number) {
  return parseFloat(n.toFixed(4));
}

/* ─── Toggle Row ───────────────────────────────────────────────────────────── */

function ToggleSwitch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 px-1">
      <span className="text-[11px] font-medium text-muted-foreground/90">{label}</span>
      <button
        onClick={onChange}
        className={cn(
          "relative flex items-center h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          checked ? "bg-cyan-500" : "bg-white/10"
        )}
      >
        <span
          className={cn(
            "pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200",
            checked ? "translate-x-4" : "translate-x-0.5"
          )}
        />
      </button>
    </div>
  );
}

/* ─── Number Input ─────────────────────────────────────────────────────────── */

function NumInput({
  label,
  value,
  onChange,
  step = 0.01,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground/60 w-5 shrink-0">{label}</span>
      <input
        type="number"
        value={fmt(value)}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="flex-1 bg-white/5 border border-white/10 rounded-md px-2 py-1 text-[11px] text-foreground/90 font-mono focus:outline-none focus:border-cyan-400/40 w-full min-w-0"
      />
    </div>
  );
}

/* ─── Color Input ──────────────────────────────────────────────────────────── */

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground/60 shrink-0">{label}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-6 h-6 rounded border border-white/10 bg-transparent cursor-pointer p-0"
      />
      <span className="text-[10px] text-muted-foreground/50 font-mono">{value}</span>
    </div>
  );
}

/* ─── Vec3 Input ───────────────────────────────────────────────────────────── */

function Vec3Input({
  label,
  value,
  onChange,
  step = 0.01,
}: {
  label: string;
  value: [number, number, number];
  onChange: (v: [number, number, number]) => void;
  step?: number;
}) {
  const update = (idx: number, v: number) => {
    const next = [...value] as [number, number, number];
    next[idx] = v;
    onChange(next);
  };
  return (
    <div>
      <p className="text-[10px] text-muted-foreground/60 mb-1">{label}</p>
      <div className="grid grid-cols-3 gap-1">
        <NumInput label="X" value={value[0]} onChange={(v) => update(0, v)} step={step} />
        <NumInput label="Y" value={value[1]} onChange={(v) => update(1, v)} step={step} />
        <NumInput label="Z" value={value[2]} onChange={(v) => update(2, v)} step={step} />
      </div>
    </div>
  );
}

/* ─── Collapsible Section ──────────────────────────────────────────────────── */

function Section({
  title,
  accent = "#22d3ee",
  children,
  defaultOpen = true,
}: {
  title: string;
  accent?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-white/8 rounded-xl bg-black/20 overflow-hidden shrink-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-white/4 hover:bg-white/8 transition-colors border-b border-transparent data-[open=true]:border-white/5"
        data-open={open}
      >
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ color: accent }} />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: accent }} />
        )}
        <span
          className="text-[10px] font-bold uppercase tracking-[0.15em] flex-1 text-left"
          style={{ color: accent }}
        >
          {title}
        </span>
      </button>
      {open && <div className="px-3 py-3 flex flex-col gap-3 border-t border-white/5 bg-white/2">{children}</div>}
    </div>
  );
}

/* ─── Light Editor ─────────────────────────────────────────────────────────── */

function LightEditor({
  label,
  light,
  onChange,
}: {
  label: string;
  light: LightConfig;
  onChange: (l: LightConfig) => void;
}) {
  return (
    <div className="flex flex-col gap-2 p-2 bg-white/3 rounded-lg">
      <p className="text-[10px] font-semibold text-muted-foreground/70">{label}</p>
      <Vec3Input
        label="Position"
        value={light.position}
        onChange={(p) => onChange({ ...light, position: p })}
        step={0.1}
      />
      <NumInput
        label="Int"
        value={light.intensity}
        onChange={(v) => onChange({ ...light, intensity: v })}
        step={0.1}
      />
      <ColorInput
        label="Color"
        value={light.color}
        onChange={(c) => onChange({ ...light, color: c })}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ConfigPanel                                                              */
/* ═══════════════════════════════════════════════════════════════════════════ */

export function ConfigPanel() {
  const { config, setConfig, avatarRegistry } = useSceneConfig();
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  // Local mutable draft state so edits are instant
  const [draft, setDraft] = useState<SceneConfig>(config);

  // Apply draft to context (instant scene update) + persist to disk
  const handleSet = useCallback(async () => {
    setConfig(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);

    try {
      await fetch("/api/camera", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
    } catch (e) {
      console.error("Failed to save config:", e);
    }
  }, [draft, setConfig]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(JSON.stringify(draft, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [draft]);

  // Shortcut to update nested draft fields
  const patchCamera = (p: Partial<SceneConfig["camera"]>) =>
    setDraft((d) => ({ ...d, camera: { ...d.camera, ...p } }));
  const patchAvatar = (p: Partial<SceneConfig["avatar"]>) =>
    setDraft((d) => ({ ...d, avatar: { ...d.avatar, ...p } }));
  const patchLight = (key: "keyLight" | "fillLight" | "rimLight", l: LightConfig) =>
    setDraft((d) => ({
      ...d,
      lighting: { ...d.lighting, [key]: l },
    }));

  const toggleFeatureLocal = (key: keyof FeatureToggles) => {
    setDraft((d) => ({
      ...d,
      features: { ...d.features, [key]: !d.features[key] },
    }));
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-black/10">
      {/* Scrollable Area for Settings */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 thin-scrollbar">

      {/* ── Camera Section ────────────────────────────────────── */}
      <Section title="Camera" accent="#22d3ee">
        <Vec3Input
          label="Position"
          value={draft.camera.position}
          onChange={(p) => patchCamera({ position: p })}
        />
        <NumInput
          label="FOV"
          value={draft.camera.fov}
          onChange={(v) => patchCamera({ fov: v })}
          step={1}
        />
        <Vec3Input
          label="Target"
          value={draft.camera.target}
          onChange={(t) => patchCamera({ target: t })}
        />
        <NumInput
          label="Min Dist"
          value={draft.camera.controlsMinDistance ?? 0.5}
          onChange={(v) => patchCamera({ controlsMinDistance: v })}
          step={0.1}
        />
        <NumInput
          label="Max Dist"
          value={draft.camera.controlsMaxDistance ?? 3.2}
          onChange={(v) => patchCamera({ controlsMaxDistance: v })}
          step={0.1}
        />
      </Section>

      {/* ── Avatar Section ────────────────────────────────────── */}
      <Section title="Avatar" accent="#a78bfa">
        {/* Model Selector */}
        <div>
          <p className="text-[10px] text-muted-foreground/60 mb-1">Model</p>
          <select
            value={draft.avatar.model}
            onChange={(e) => patchAvatar({ model: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-2 text-[11px] text-foreground/90 font-medium focus:outline-none focus:border-violet-400/50 cursor-pointer appearance-none transition-colors hover:bg-white/8"
            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%239ca3af%27 stroke-width=%272%27%3E%3Cpolyline points=%276 9 12 15 18 9%27/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
          >
            {avatarRegistry.map((a) => (
              <option key={a.id} value={a.id} className="bg-zinc-900 text-white">
                {a.label}
              </option>
            ))}
          </select>
        </div>
        <Vec3Input
          label="Position"
          value={draft.avatar.position}
          onChange={(p) => patchAvatar({ position: p })}
        />
        <Vec3Input
          label="Rotation"
          value={draft.avatar.rotation}
          onChange={(r) => patchAvatar({ rotation: r })}
        />
        <NumInput
          label="Scale"
          value={draft.avatar.scale}
          onChange={(s) => patchAvatar({ scale: s })}
          step={0.05}
        />
      </Section>

      {/* ── Lighting Section ──────────────────────────────────── */}
      <Section title="Lighting" accent="#fbbf24" defaultOpen={false}>
        <LightEditor
          label="Key Light"
          light={draft.lighting.keyLight}
          onChange={(l) => patchLight("keyLight", l)}
        />
        <LightEditor
          label="Fill Light"
          light={draft.lighting.fillLight}
          onChange={(l) => patchLight("fillLight", l)}
        />
        <LightEditor
          label="Rim Light"
          light={draft.lighting.rimLight}
          onChange={(l) => patchLight("rimLight", l)}
        />
      </Section>

      {/* ── Feature Toggles ───────────────────────────────────── */}
      <Section title="Features" accent="#6ee7b7" defaultOpen={true}>
        {(Object.keys(draft.features) as (keyof FeatureToggles)[]).map((key) => (
          <ToggleSwitch
            key={key}
            label={key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
            checked={draft.features[key]}
            onChange={() => toggleFeatureLocal(key)}
          />
        ))}
      </Section>

      </div>

      {/* ── Fixed Footer Actions ─────────────────────────────────── */}
      <div className="p-4 bg-black/40 border-t border-white/5 shrink-0 backdrop-blur-xl">
        <div className="flex gap-2">
          <button
            onClick={handleSet}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[11px] font-semibold transition-all duration-300",
              saved
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                : "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/25 hover:shadow-[0_0_15px_rgba(34,211,238,0.15)] active:scale-[0.98]"
            )}
          >
            <Save className="w-3.5 h-3.5" />
            {saved ? "✅ Saved!" : "💾 Save to JSON"}
          </button>
          <button
            onClick={handleCopy}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[11px] font-semibold transition-all duration-300",
              copied
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-white/5 text-muted-foreground border border-white/10 hover:bg-white/10 hover:text-foreground active:scale-[0.98]"
            )}
          >
            <Copy className="w-3.5 h-3.5" />
            {copied ? "✅ Copied!" : "📋 Copy"}
          </button>
        </div>
        
        {/* Helper Hint */}
        <p className="text-[9.5px] text-muted-foreground/40 text-center mt-3 font-medium tracking-wide">
          Changes apply instantly · Save to persist
        </p>
      </div>
    </div>
  );
}
